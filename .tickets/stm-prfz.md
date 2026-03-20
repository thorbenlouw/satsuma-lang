---
id: stm-prfz
status: closed
deps: []
links: []
created: 2026-03-19T20:04:30Z
type: bug
priority: 0
assignee: Thorben Louw
parent: stm-7rz4
tags: [cli, namespaces, validate, lineage, graph]
---
# Namespace-local resolution falls back to bare labels and corrupts qualified lookups

# Problem
Several CLI paths resolve namespace-qualified identities only partially. Unqualified references inside a namespace are not rebound to the current namespace, and multiple commands later match CST nodes by bare label only. In a workspace where two namespaces intentionally reuse the same local names, commands return mixed data from the wrong namespace, and validate emits false warnings.

# Minimal repro
Create `/tmp/stm-explore/namespace-collision.stm`:
```stm
namespace alpha {
  schema customer (note "Alpha customer schema") {
    customer_id STRING (pk)
    alpha_flag  STRING (default alpha)
  }

  schema customer_out (note "Alpha projection") {
    customer_id STRING (pk)
    alpha_flag  STRING
  }

  mapping load_customer (note "Alpha mapping") {
    source { `customer` }
    target { `customer_out` }

    customer_id -> customer_id
    alpha_flag  -> alpha_flag
  }

  metric customer_health "Alpha Health" (source customer_out, grain daily) {
    score NUMBER (measure additive)
  }
}

namespace beta {
  schema customer (note "Beta customer schema") {
    customer_id STRING (pk)
    beta_score  NUMBER (default 7)
  }

  schema customer_out (note "Beta projection") {
    customer_id STRING (pk)
    beta_score  NUMBER
  }

  mapping load_customer (note "Beta mapping") {
    source { `customer` }
    target { `customer_out` }

    customer_id -> customer_id
    beta_score  -> beta_score { round(0) }
  }

  metric customer_health "Beta Health" (source customer_out, grain weekly) {
    score NUMBER (measure non_additive)
  }
}
```

Run:
```bash
stm validate /tmp/stm-explore/namespace-collision.stm
stm schema beta::customer /tmp/stm-explore/namespace-collision.stm
stm mapping beta::load_customer /tmp/stm-explore/namespace-collision.stm
stm metric beta::customer_health /tmp/stm-explore/namespace-collision.stm
stm nl beta::load_customer /tmp/stm-explore/namespace-collision.stm --json
stm find --tag default /tmp/stm-explore/namespace-collision.stm --json
stm lineage --from beta::customer /tmp/stm-explore/namespace-collision.stm --json
stm graph /tmp/stm-explore/namespace-collision.stm --json
```

# Actual
- `validate` reports `alpha_flag` as missing from `beta::customer` and `beta_score` as missing from `alpha::customer`; it is cross-wiring mappings to the wrong namespace.
- `schema beta::customer` prints the beta note but the alpha field body (`alpha_flag`).
- `mapping beta::load_customer` prints the alpha arrows.
- `metric beta::customer_health` prints the beta display name but alpha metadata/body (`grain daily`, `measure additive`).
- `nl beta::load_customer --json` returns both the alpha and beta mapping notes.
- `find --tag default --json` reports `beta::customer.alpha_flag` at the alpha row instead of `beta::customer.beta_score`.
- `lineage --from beta::customer --json` returns only the start node with no downstream edges.
- `graph --json` stores local sources/metric sources as bare `customer` / `customer_out` instead of `alpha::...` or `beta::...`, so graph edges are not namespace-safe.

# Expected
- Inside `namespace beta`, unqualified `customer` and `customer_out` references should resolve to `beta::customer` and `beta::customer_out`, not some other namespace and not bare global names.
- Once a qualified identity is resolved, commands must keep matching on the qualified identity, not by stripping to the bare label for CST lookup.
- Rendered output, validation, lineage, graph export, and find/nl/meta style lookups must stay namespace-stable even when the same bare name exists in multiple namespaces.

# Suspected root cause
There appear to be two related issues:
1. reference resolution for local names inside namespace blocks is not applying the "current namespace, then global" rule from features/15-namespaces/PRD.md;
2. several commands resolve a qualified key, then search the CST again using only `split("::").pop()`, which aliases different blocks together.

## Acceptance Criteria

1. In the repro fixture, `stm validate` reports no false `field-not-in-schema` warnings.
2. `stm schema beta::customer` renders the beta field body (`beta_score`) and not alpha fields.
3. `stm mapping beta::load_customer` renders the beta arrows and transform body.
4. `stm metric beta::customer_health` renders `grain weekly` and `measure non_additive`.
5. `stm nl beta::load_customer --json` returns only the beta note.
6. `stm find --tag default --json` reports `alpha::customer.alpha_flag` and `beta::customer.beta_score` at their correct rows.
7. `stm lineage --from beta::customer --json` reaches `beta::load_customer` and `beta::customer_out`.
8. `stm graph --json` emits namespace-qualified `from`/`to` schema ids for all schema and metric source edges.

