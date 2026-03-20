---
id: stm-8k6p
status: closed
deps: []
links: []
created: 2026-03-19T20:04:30Z
type: bug
priority: 1
assignee: Thorben Louw
parent: stm-7rz4
tags: [cli, imports, lineage, graph, summary]
---
# CLI commands ignore imported definitions when run on a platform entry file

# Problem
When `stm` is pointed at a single STM entry file that imports namespaced schemas from sibling files, most commands only index the entry file itself and ignore the imported definitions. This breaks the documented platform-entry workflow in AGENTS.md and features/15-namespaces/PRD.md.

# Minimal repro
Create two files:

`/tmp/stm-explore/import-base.stm`
```stm
namespace src {
  schema customers (note "Imported source schema") {
    customer_id STRING (pk)
    email       STRING (pii)
  }
}

namespace mart {
  schema dim_customers (note "Imported target schema") {
    customer_id STRING (pk)
    email       STRING
  }
}
```

`/tmp/stm-explore/import-platform.stm`
```stm
import { src::customers, mart::dim_customers } from "import-base.stm"

mapping 'build dim_customers' {
  source { `src::customers` }
  target { `mart::dim_customers` }

  customer_id -> customer_id
  email -> email { trim | lowercase }
}
```

Run:
```bash
stm summary /tmp/stm-explore/import-platform.stm
stm schema src::customers /tmp/stm-explore/import-platform.stm
stm where-used src::customers /tmp/stm-explore/import-platform.stm
stm graph /tmp/stm-explore/import-platform.stm --json
stm validate /tmp/stm-explore/import-platform.stm
```

# Actual
- `summary` reports only the mapping and zero schemas.
- `schema src::customers` says the schema is not found.
- `where-used src::customers` says the name is not found.
- `graph --json` emits edges that mention `src::customers` and `mart::dim_customers`, but `stats.schemas` is 0 and there are no schema nodes.
- `validate` emits false `undefined-ref` warnings for the imported source and target.
- `lineage --from src::customers` partially works only because it walks mapping source/target strings, not because the imported schema was actually loaded.

# Expected
Pointing the CLI at a platform entry file should resolve its relative imports and include imported definitions in the workspace index. Commands should behave the same as if the imported files were passed as a workspace directory: summary/schema/where-used/graph/validate/lineage should all see the imported schemas.

# Notes
This overlaps with `stm-bym9` and `stm-gde5` for validate, but the bug is broader than validation: the workspace loader/indexer used by read commands is import-blind for entry files.

## Acceptance Criteria

1. Given the two-file repro above, `stm summary /tmp/stm-explore/import-platform.stm` includes both imported schemas and the mapping.
2. `stm schema src::customers /tmp/stm-explore/import-platform.stm` renders the imported schema.
3. `stm where-used src::customers /tmp/stm-explore/import-platform.stm` reports the mapping reference.
4. `stm graph /tmp/stm-explore/import-platform.stm --json` contains schema nodes for `src::customers` and `mart::dim_customers` and `stats.schemas == 2`.
5. `stm validate /tmp/stm-explore/import-platform.stm` does not emit `undefined-ref` for imported names.
6. Relative import resolution is recursive and remains bounded or safe for cycles or missing files.

## Notes

**2026-03-20T11:57:43Z**

Fixed. workspace.js resolveInput now follows import declarations when given a single file, discovering all transitively imported files. Missing targets warn on stderr. Cycle-safe via visited set.
