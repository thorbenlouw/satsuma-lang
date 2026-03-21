---
id: sl-zqqu
status: open
deps: [sl-ck20, sl-1ugo]
links: [sl-jt7q, sl-cyen]
created: 2026-03-21T08:01:04Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, diff, exploratory-testing]
---
# diff: nested record/list field changes are not detected

Fields added to or removed from nested record {} or list {} blocks inside a schema are not detected by the diff command. Only top-level fields are compared.

What I did:
  satsuma diff /tmp/satsuma-test-diff/a_nested.stm /tmp/satsuma-test-diff/b_nested_field_added.stm

In a_nested.stm:
  schema order {
    id       INT    (pk)
    record address {
      street   STRING(200)
      city     STRING(100)
    }
    list items {
      sku      STRING(20)
      qty      INT
    }
  }

In b_nested_field_added.stm (zip added to address, price added to items):
  schema order {
    id       INT    (pk)
    record address {
      street   STRING(200)
      city     STRING(100)
      zip      STRING(10)
    }
    list items {
      sku      STRING(20)
      qty      INT
      price    DECIMAL(10,2)
    }
  }

Expected: Diff should report field additions in nested blocks (e.g. address.zip added, items.price added).
Actual: 'No structural differences.'

Note: Adding a whole new top-level nested block (e.g. record payment {}) IS detected, but only as a flat field-added entry — the nested structure is lost.

Root cause: diffSchema() in diff.ts iterates a.fields and b.fields which are top-level FieldDecl arrays. FieldDecl has a children property for nested fields, but diffSchema never recurses into it.

Reproduction files:
  /tmp/satsuma-test-diff/a_nested.stm vs /tmp/satsuma-test-diff/b_nested_field_added.stm
  /tmp/satsuma-test-diff/a_nested.stm vs /tmp/satsuma-test-diff/b_nested_block_added.stm

