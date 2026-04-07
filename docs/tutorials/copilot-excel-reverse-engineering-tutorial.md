# Reverse-Engineering Legacy Excel Mapping Specs with Satsuma, VS Code, and GitHub Copilot

This tutorial walks through a real workflow for taking a stack of legacy Excel
data-mapping documents (DMDs) and reverse-engineering them into a clean Satsuma
workspace, using VS Code with GitHub Copilot in agent mode. It's written for the
common situation where you have:

- a directory full of inconsistent Excel mapping spreadsheets that have
  accumulated over years (some current, some templates, some speculative,
  some deprecated),
- a small team that needs to understand, query, and modernise those mappings,
- a desire to pilot Satsuma without first cloning the Satsuma repo or learning
  every CLI command.

The end result is a workspace where the original spreadsheets are version-
controlled alongside generated `.stm` files, your AI agent knows how to talk to
the Satsuma CLI idiomatically, and you can run a single chat command to convert
a batch of spreadsheets at once.

This is a *workflow* tutorial. If you want to learn the Satsuma language first,
read the [BA tutorial](ba-tutorial.md) before you start.

---

## What you'll need

- **VS Code** with the **GitHub Copilot** extension, signed in.
- **Copilot agent mode** enabled, with at least one strong reasoning model
  available (e.g. Claude Opus 4.6 or GPT-5.4). The workflow works with either,
  but the reasoning step matters for the harder spreadsheets.
- **The Satsuma VS Code extension** installed (see repo instructions). This gives
  you syntax highlighting, diagnostics, hover, go-to-definition, and the
  Satsuma LSP — without it the generated `.stm` files are much harder to
  review.
- **The Satsuma CLI** on your `PATH`. You don't need to clone the Satsuma
  source repository — install the CLI from the published release artifacts
  and confirm it works with `satsuma --version`.
- **Python 3.10+** with `openpyxl` (the Excel-to-Satsuma skill manages its
  own venv, but Python itself must be available).

You do *not* need to clone `satsuma-lang`. You only need three things from
that repo, and they all live under `skills/` and `AI-AGENT-REFERENCE.md` —
we'll lift them into the new project in step 1.

---

## Step 1 — Create the project skeleton

Make a fresh folder for the project, drop your spreadsheets into a
`legacy-mappings/` subdirectory, and remove anything that isn't a current
spec: templates, archived versions, "future" speculative specs, drafts.
The point is to start with a corpus you actually trust.

```
my-mapping-project/
├── legacy-mappings/        ← only the real, current spreadsheets
│   ├── dimensions/
│   ├── facts/
│   └── reference/
└── output/                 ← generated .stm files will land here
```

Open the folder in VS Code.

### Pull in the Satsuma agent assets

From a checkout (or a `git archive`) of `satsuma-lang`, copy two things into
your project:

1. The skills you want to use, into a `skills/` folder. For this workflow you
   want at least:
   - `excel-to-satsuma` — the spreadsheet → `.stm` converter (Python helper
     plus a Claude Code slash command), and
   - `satsuma-to-excel` — the round-trip generator, useful when you want to
     hand a polished workbook back to a stakeholder.
   You can also drop in `satsuma-explainer` and `satsuma-sample-data` if you
   want plain-English walkthroughs and synthetic test data later.

2. The agent reference file, written into the project root as `AGENTS.md`:

   ```bash
   satsuma agent-reference > AGENTS.md
   ```

   This is the same content as `AI-AGENT-REFERENCE.md` in the Satsuma repo,
   but the `agent-reference` CLI command guarantees you get the version that
   matches your installed CLI. Your AI agent will read this file to learn
   the Satsuma grammar, conventions, common pitfalls, and the full CLI
   command catalogue.

> **Why `AGENTS.md` and not the original filename?** `AGENTS.md` is the
> emerging convention for "instructions any coding agent should read first."
> Both Claude Code and GitHub Copilot pick it up automatically, alongside
> their own `.github/copilot-instructions.md` and `CLAUDE.md` files.

---

## Step 2 — Bootstrap the workspace with Copilot

Open Copilot Chat in **Agent Mode** with a strong model selected, and run a
single bootstrap prompt that tells the agent what you have and what you
want:

> We want to explore the legacy source-to-target mapping spreadsheets in
> `legacy-mappings/` using the Satsuma tool and skills. The agent skills
> are in `skills/`. Please set them up so VS Code with GitHub Copilot can
> use them idiomatically, and create a `copilot-instructions.md` that
> describes this project and its conventions.

A reasoning-heavy model will:

- inspect `AGENTS.md` to learn the Satsuma command catalogue,
- read the `SKILL.md` files under `skills/` to understand each skill's
  contract,
- create `.github/copilot-instructions.md` with a project overview,
  directory layout, key tools, conventions, and the standard workflow,
- verify the `satsuma` CLI works (`satsuma --version`, `satsuma summary`),
- verify the Excel helper script runs and that `openpyxl` is installed.

After this step you should have:

```
my-mapping-project/
├── .github/
│   └── copilot-instructions.md   ← created by the agent
├── AGENTS.md
├── skills/
│   ├── excel-to-satsuma/
│   └── satsuma-to-excel/
├── legacy-mappings/
└── output/
```

### Customise the workspace

Once the bootstrap is done, ask Copilot to add a few project-specific
helpers. These are the things that turn out to matter on every real
project. You can ask for them all at once with a single prompt:

> Please add the following to this workspace so we can work productively
> with the Satsuma skills:
>
> 1. A reusable Copilot prompt under `.github/prompts/convert-one.prompt.md`
>    that takes a spreadsheet path as input and runs the full
>    `excel-to-satsuma` skill end-to-end: survey, generate the `.stm`
>    file under `output/`, run `satsuma fmt`, then `satsuma validate`,
>    then `satsuma lint --fix`, and finally write a per-file review
>    report (suffixed with the input filename so it doesn't clobber
>    other reports).
>
> 2. A second prompt at `.github/prompts/convert-batch.prompt.md` that
>    takes a glob (e.g. `legacy-mappings/dimensions/*.xlsx`), surveys
>    every matching file in one planning pass, then runs the same
>    convert → fmt → validate → lint pipeline for each one. At the end
>    it should print a summary of which files succeeded, which failed,
>    and append the successful filenames with timestamps to a top-level
>    `files-we-have-done.md`.
>
> 3. An auto-validate instruction at
>    `.github/instructions/satsuma-on-save.instructions.md` with
>    `applyTo: "output/**/*.stm"` that runs `satsuma validate` and
>    `satsuma lint` against any `.stm` file under `output/` and surfaces
>    the diagnostics inline.
>
> 4. A custom Copilot agent under `.github/agents/satsuma-explainer.md`
>    aimed at Business Analysts: it should assume no CLI knowledge,
>    explain a `.stm` file in plain English using business terms, focus
>    on the meaning of each mapping rather than its syntax, and never
>    suggest CLI commands to the user.
>
> Use the `satsuma agent-reference` output in `AGENTS.md` and the
> `SKILL.md` files under `skills/` as the source of truth for which
> commands and skill invocations to call.

Why each one matters:

- **`convert-one`** turns the full convert → validate → lint pipeline
  into one chat command, so you stop retyping the same flag soup.
- **`convert-batch`** is the productivity unlock — most of the latency
  in a single-file conversion is the model's planning pass, and that
  cost is amortised across the whole batch when you convert many files
  in one go. It also prevents the agent from forgetting halfway through
  a long run, because the progress log is durable.
- **The on-save instruction** means a stale `.stm` file with broken
  references can never sit unnoticed in the workspace — every save
  re-runs validation in the background.
- **The BA-friendly agent** is what you switch to when a stakeholder
  is in the room. The default Copilot persona will happily talk about
  CST nodes and lint rules; this one stays in business language.

---

## Step 3 — Convert your first spreadsheet (dry run)

Pick the smallest, cleanest spreadsheet in `legacy-mappings/` and run the
skill in **dry-run mode** first. In Copilot Chat:

> @excel-to-satsuma `legacy-mappings/dimensions/customer.xlsx` `output/` --dry-run

What you should expect:

1. Copilot recognises the skill and loads `SKILL.md`.
2. It runs the Python helper to **survey** the spreadsheet — every sheet,
   every header row, sample values, formatting clues, merged cells.
3. It writes a *discovery report* to `output/.excel-to-satsuma/` describing
   what it found. This is the most valuable artifact of the dry run: it
   tells you what shape the spreadsheet really has, and surfaces any data
   quality flags it noticed (length mismatches between source and target
   columns, undocumented enum values, SCD-2 patterns, suspicious header
   labels, etc.).
4. Because you passed `--dry-run`, no `.stm` file is written.

Read the discovery report. It will tell you, in concrete terms, whether
the spreadsheet's structure matches what the skill expects, or whether
it's a one-of-a-kind layout that needs manual intervention.

> **Approval prompts.** The first time you run a skill, Copilot will ask
> you to approve the Python invocation, the venv creation, and the file
> reads. Click through them — for the rest of the session you can switch
> Copilot to "Allow All Commands in this session" so the agent doesn't
> have to keep stopping for permission.

---

## Step 4 — Convert for real, then review

Once the dry run looks reasonable, run the full conversion either as a
direct skill invocation or via the reusable prompt you created in step 2:

> /convert-one-spreadsheet `legacy-mappings/dimensions/customer.xlsx`

The agent will:

1. Re-survey the spreadsheet,
2. Generate a `.stm` file under `output/`,
3. Run `satsuma fmt` to apply canonical formatting,
4. Run `satsuma validate` to catch parse errors and unresolved references,
5. Run `satsuma lint --fix` to apply safe auto-corrections,
6. Write a per-file review report in `output/` describing what was
   generated and what assumptions it made.

A *single* spreadsheet can take a few minutes, especially with a heavyweight
reasoning model. This is normal — the model is reading every row, deciding
which transforms are deterministic pipelines and which need natural-language
descriptions, and double-checking against the rules in `AGENTS.md`. **Batch
mode is much more efficient** because the agent can survey many sheets in
one planning pass before generating any output.

### Review the result

Open the generated `.stm` file. Because you have the Satsuma VS Code
extension installed, you get:

- syntax highlighting and folding,
- inline diagnostics from `satsuma validate` / `satsuma lint`,
- hover info on schemas, fields, and `@ref` references,
- the **Satsuma mapping visualisation** panel — this is where the workflow
  really pays off: a single click renders the source/target schemas, every
  arrow, and every transform as an interactive diagram, which is by far
  the easiest way to spot missing fields and questionable transforms.

If something looks wrong, fix it in the `.stm` file directly and re-run
`satsuma validate`. The `.stm` file is the source of truth from this
point on; the original spreadsheet is now a historical artifact.

---

## Step 5 — Batch convert and consolidate

Now switch to the batch prompt:

> /convert-batch `legacy-mappings/dimensions/customer*`

The agent will discover all matching spreadsheets, plan the conversion,
and generate one `.stm` per file. Each file should declare its own
namespace or prefix to avoid duplicate-definition errors when several
spreadsheets describe overlapping source systems.

### Things you'll learn the hard way (so we'll save you the trouble)

These are the rules worth adding to your project's `AGENTS.md` *before*
you run the first batch — they make the difference between a clean run
and an afternoon of cleanup:

- **Always write to `output/`** and never overwrite existing `.stm` files
  silently. If a target file exists, the agent should `STOP` and check
  with you — or at least update the existing file with a comment about
  the new source instead of clobbering it.
- **Per-file review reports must have unique filenames.** A naive batch
  run will write `review.md` for every file and the last one wins. Tell
  the agent to suffix review reports with the input filename.
- **Provenance metadata on every block.** Every generated `schema`,
  `mapping`, and `fragment` should carry a `(note "source: <filename>")`
  or a top-level comment so you can trace any block back to the
  spreadsheet it came from.
- **Check for near-duplicates before writing.** Real-world spreadsheets
  re-document the same source table with slightly different column lists.
  The agent should run `satsuma summary` and `satsuma where-used` against
  the existing `output/` directory and *re-use* an existing schema rather
  than create a near-duplicate.
- **Track progress in a top-level `files-we-have-done.md`** with a
  timestamped list of converted files, so a long-running batch can be
  resumed and so reviewers can see what's done at a glance.
- **Self-contained `.stm` files.** Assume the original spreadsheets will
  be lost, archived, or moved at some point. The Satsuma file must
  *contain* every transform rule it needs — no "see the SQL in the
  original DMD" cop-outs. If the agent finds itself wanting to write
  that, it should write a natural-language transform with `@ref`s
  instead.
- **Multi-source NL transforms should declare their inputs.** When a
  natural-language transform mentions `@a`, `@b`, `@c` from upstream
  schemas, prefer the explicit form `a, b, c -> d { "..." }` over a
  bare `-> d { "..." }`. It makes the lineage traceable.

Add these as bullet points under a `## Converting Excel to Satsuma`
section in your project's `AGENTS.md`. The agent will read them on every
run.

### A note on common syntax pitfalls

There are a handful of Satsuma syntax mistakes that every model — Opus,
GPT, and others — used to fall into repeatedly: confusing `::` (which
joins a namespace to a schema) with `.` (which joins a schema to a
field), preferring `kebab-case` names that need backticks, and dropping
`@ref` markers inside natural-language transform strings (which makes
them invisible to lineage tooling).

The good news is that the `satsuma agent-reference` output you wrote
into `AGENTS.md` in step 1 already calls each of these out — there's a
dedicated *Path syntax — :: vs .* section, a *snake_case is preferred*
note, an `@ref in NL strings (CRITICAL)` section, and they all reappear
in the *Common mistakes* table at the bottom. So as long as your
`AGENTS.md` is current, you don't need to add them again.

If you find yourself fighting one of these recurring mistakes anyway,
the most likely cause is that `AGENTS.md` is out of date. Re-run
`satsuma agent-reference > AGENTS.md` and try again.

---

## Step 6 — Refactor for human readability

After the first batch you'll typically have a folder of `.stm` files
with cryptic legacy table names. Don't try
to fix this in the first pass — get the conversion done first, then run
a *second* pass to refactor for readability.

Ask Copilot:

> For the tables generated in this batch, group them under a sensible
> namespace and rename the schemas to friendly snake_case names that
> reflect their business meaning. Use schema metadata of the form
> `(table_name "ORIGINAL_LEGACY_NAME")` to keep the link back to the
> original. The original legacy name should be an implementation detail,
> not the primary identifier.

The result is a workspace where humans see `customer_dimension` and
tooling can still resolve it back to `TAB_DWH_CUSTOMER_DIM2`.

You can do the same for fields if their legacy names are particularly
unfriendly, but in practice the schema-level rename gives most of the
readability win for far less churn.

---

## Step 7 — Commit, version, and iterate

By the end of this workflow you should have a Git repository with:

- `legacy-mappings/` — the original spreadsheets, ideally `.gitignore`d
  if they contain anything sensitive,
- `output/` — generated `.stm` files (committed),
- `output/review_*.md` — per-file review reports (committed),
- `files-we-have-done.md` — running progress log (committed),
- `AGENTS.md` and `.github/copilot-instructions.md` — the prompts that
  taught the agent how to work in this project (committed).

Once everything is in Git, the round-trip is easy: `satsuma diff old/ new/`
shows structural deltas between snapshots, the VS Code visualisation
panel renders any `.stm` file you click on, and you can ask Copilot to
explain any mapping in plain English using the `satsuma-explainer` skill.

---

## A few hard-won lessons

A handful of things that came out of running this workflow on a real
project, in order of how much pain they saved:

1. **Use the dry-run first, every time.** A 10-second discovery report
   tells you whether the spreadsheet is going to convert cleanly or
   whether you need to hand-prep it. Skipping the dry-run wastes far
   more time than running it.

2. **Batch mode is the productivity unlock.** A single-file conversion
   takes the same wall-clock time whether the model planned for one file
   or for twenty, because most of the latency is in the reasoning pass.
   Always convert in batches when you can.

3. **Try at least two reasoning models.** Different models have
   different blind spots. A model that consistently wants to use
   `schema::field` (wrong) might be fine on transform decomposition,
   while a model that gets the syntax right might cop out and write
   "apply the SQL from the original spreadsheet" instead of a real
   natural-language transform. Pick whichever is wrong less often on
   *your* spreadsheets.

4. **Keep `AGENTS.md` as a living rules file.** Every time the agent
   makes the same mistake twice, add a bullet point to `AGENTS.md`.
   After a week of this, the file becomes the single most valuable
   document in the project — it captures the implicit knowledge that
   would otherwise live only in your head.

5. **The visualisation panel is the review tool.** Reviewing `.stm`
   files as text is fine for engineers; reviewing them as diagrams is
   what makes business stakeholders trust the output. Lead with the
   visualisation when you walk a BA through a generated mapping.

6. **Don't try to make it perfect on the first pass.** Get the
   conversion done; refactor for readability afterwards; consolidate
   duplicates afterwards; rename for friendliness afterwards. Each
   pass is much faster than trying to do everything at once, and the
   intermediate state is always valid Satsuma you can validate, lint,
   and visualise.

---

## Where to go next

- The [Business Analyst tutorial](ba-tutorial.md) — learn the Satsuma
  language itself if you skipped it.
- The [data engineer tutorial](data-engineer-tutorial.md) — once you
  have a clean `.stm` workspace, this shows you how to drive
  implementation from it.
- The [`satsuma-explainer`](../../skills/satsuma-explainer/) skill —
  generates plain-English walkthroughs of any `.stm` file for
  stakeholder reviews.
- The [`satsuma-to-dbt`](../../skills/satsuma-to-dbt/) skill — once
  your mappings are in Satsuma, scaffold a dbt project from them.
- The [`satsuma-sample-data`](../../skills/satsuma-sample-data/) skill —
  generate realistic synthetic test data from your new schemas, useful
  for stress-testing the converted mappings before pointing them at
  production data.
