const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { initTestParser, parse } = require("./helper");
const {
  createWorkspaceIndex,
  indexFile,
  removeFile,
  resolveDefinition,
  findReferences,
  allBlockNames,
  getFields,
} = require("../dist/workspace-index");

before(async () => { await initTestParser(); });

/** Build an index from a map of { uri: source }. */
function buildIndex(files) {
  const idx = createWorkspaceIndex();
  for (const [uri, source] of Object.entries(files)) {
    indexFile(idx, uri, parse(source));
  }
  return idx;
}

describe("createWorkspaceIndex", () => {
  it("returns an empty index", () => {
    const idx = createWorkspaceIndex();
    assert.equal(idx.definitions.size, 0);
    assert.equal(idx.references.size, 0);
    assert.equal(idx.imports.size, 0);
    assert.equal(idx.indexedFiles.size, 0);
  });
});

describe("indexFile", () => {
  it("indexes schema definitions", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers {\n  id UUID (pk)\n  name VARCHAR\n}",
    });
    const defs = idx.definitions.get("customers");
    assert.ok(defs);
    assert.equal(defs.length, 1);
    assert.equal(defs[0].kind, "schema");
    assert.equal(defs[0].namespace, null);
    assert.equal(defs[0].uri, "file:///a.stm");
  });

  it("indexes fragment definitions", () => {
    const idx = buildIndex({
      "file:///a.stm": "fragment `audit fields` {\n  created_at TIMESTAMP\n  updated_at TIMESTAMP\n}",
    });
    const defs = idx.definitions.get("audit fields");
    assert.ok(defs);
    assert.equal(defs[0].kind, "fragment");
  });

  it("indexes transform definitions", () => {
    const idx = buildIndex({
      "file:///a.stm": "transform `clean email` {\n  trim | lowercase\n}",
    });
    const defs = idx.definitions.get("clean email");
    assert.ok(defs);
    assert.equal(defs[0].kind, "transform");
  });

  it("indexes mapping definitions", () => {
    const idx = buildIndex({
      "file:///a.stm": `mapping \`customer migration\` {
  source { customers }
  target { dim_customers }
  id -> id
}`,
    });
    const defs = idx.definitions.get("customer migration");
    assert.ok(defs);
    assert.equal(defs[0].kind, "mapping");
  });

  it("indexes metric definitions", () => {
    const idx = buildIndex({
      "file:///a.stm": `metric monthly_revenue "MRR" (source orders) {\n  amount DECIMAL\n}`,
    });
    const defs = idx.definitions.get("monthly_revenue");
    assert.ok(defs);
    assert.equal(defs[0].kind, "metric");
  });

  it("indexes namespace definitions with qualified children", () => {
    const idx = buildIndex({
      "file:///a.stm": `namespace warehouse {
  schema hub_store {
    store_id UUID (pk)
  }
  fragment common_fields {
    updated_at TIMESTAMP
  }
}`,
    });
    // Namespace itself
    const nsDefs = idx.definitions.get("warehouse");
    assert.ok(nsDefs);
    assert.equal(nsDefs[0].kind, "namespace");

    // Qualified schema
    const schemaDefs = idx.definitions.get("warehouse::hub_store");
    assert.ok(schemaDefs);
    assert.equal(schemaDefs[0].kind, "schema");
    assert.equal(schemaDefs[0].namespace, "warehouse");

    // Qualified fragment
    const fragDefs = idx.definitions.get("warehouse::common_fields");
    assert.ok(fragDefs);
    assert.equal(fragDefs[0].kind, "fragment");
  });

  it("extracts fields for schema blocks", () => {
    const idx = buildIndex({
      "file:///a.stm": `schema customers {
  id UUID (pk)
  name VARCHAR(200)
  address record {
    street VARCHAR
    city VARCHAR
  }
}`,
    });
    const defs = idx.definitions.get("customers");
    assert.ok(defs);
    const fields = defs[0].fields;
    assert.equal(fields.length, 3);
    assert.equal(fields[0].name, "id");
    assert.equal(fields[0].type, "UUID");
    assert.equal(fields[1].name, "name");
    assert.equal(fields[2].name, "address");
    assert.equal(fields[2].type, "record");
    assert.equal(fields[2].children.length, 2);
    assert.equal(fields[2].children[0].name, "street");
  });

  it("extracts fields with list_of types", () => {
    const idx = buildIndex({
      "file:///a.stm": `schema orders {
  id UUID (pk)
  tags list_of VARCHAR
  items list_of record {
    sku VARCHAR
    qty INT
  }
}`,
    });
    const fields = idx.definitions.get("orders")[0].fields;
    assert.equal(fields.length, 3);
    assert.equal(fields[1].name, "tags");
    assert.equal(fields[1].type, "list_of VARCHAR");
    assert.equal(fields[2].name, "items");
    assert.equal(fields[2].type, "list_of record");
    assert.equal(fields[2].children.length, 2);
  });

  it("indexes source/target references from mappings", () => {
    const idx = buildIndex({
      "file:///a.stm": `mapping \`migrate\` {
  source { customers }
  target { dim_customers }
  id -> id
}`,
    });
    const srcRefs = idx.references.get("customers");
    assert.ok(srcRefs);
    assert.equal(srcRefs.length, 1);
    assert.equal(srcRefs[0].context, "source");

    const tgtRefs = idx.references.get("dim_customers");
    assert.ok(tgtRefs);
    assert.equal(tgtRefs[0].context, "target");
  });

  it("indexes backtick source references", () => {
    const idx = buildIndex({
      "file:///a.stm": "mapping `test` {\n  source { `raw_customers` }\n  target { dim_customers }\n  id -> id\n}",
    });
    const refs = idx.references.get("raw_customers");
    assert.ok(refs);
    assert.equal(refs[0].context, "source");
  });

  it("indexes qualified name source references", () => {
    const idx = buildIndex({
      "file:///a.stm": "mapping `test` {\n  source { crm::customers }\n  target { dim_customers }\n  id -> id\n}",
    });
    const refs = idx.references.get("crm::customers");
    assert.ok(refs);
    assert.equal(refs[0].context, "source");
  });

  it("indexes fragment spread references from schemas", () => {
    const idx = buildIndex({
      "file:///a.stm": `schema customers {
  id UUID (pk)
  ...audit_fields
}`,
    });
    const refs = idx.references.get("audit_fields");
    assert.ok(refs);
    assert.equal(refs.length, 1);
    assert.equal(refs[0].context, "spread");
  });

  it("indexes import declarations", () => {
    const idx = buildIndex({
      "file:///a.stm": 'import { customers, crm::orders } from "lib/common.stm"',
    });
    const imports = idx.imports.get("file:///a.stm");
    assert.ok(imports);
    assert.equal(imports.length, 1);
    assert.deepEqual(imports[0].names, ["customers", "crm::orders"]);
    assert.equal(imports[0].pathText, "lib/common.stm");

    // Import names registered as references
    const custRefs = idx.references.get("customers");
    assert.ok(custRefs);
    assert.equal(custRefs[0].context, "import");

    const orderRefs = idx.references.get("crm::orders");
    assert.ok(orderRefs);
    assert.equal(orderRefs[0].context, "import");
  });

  it("tracks indexed files", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema a { id UUID }",
      "file:///b.stm": "schema b { id UUID }",
    });
    assert.equal(idx.indexedFiles.size, 2);
    assert.ok(idx.indexedFiles.has("file:///a.stm"));
    assert.ok(idx.indexedFiles.has("file:///b.stm"));
  });
});

describe("removeFile", () => {
  it("removes definitions for a file", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }",
      "file:///b.stm": "schema orders { id UUID }",
    });
    assert.ok(idx.definitions.get("customers"));
    removeFile(idx, "file:///a.stm");
    assert.equal(idx.definitions.get("customers"), undefined);
    assert.ok(idx.definitions.get("orders"));
  });

  it("removes references for a file", () => {
    const idx = buildIndex({
      "file:///a.stm": "mapping `test` {\n  source { customers }\n  target { dim }\n  id -> id\n}",
    });
    assert.ok(idx.references.get("customers"));
    removeFile(idx, "file:///a.stm");
    assert.equal(idx.references.get("customers"), undefined);
  });

  it("removes from indexedFiles set", () => {
    const idx = buildIndex({ "file:///a.stm": "schema a { id UUID }" });
    assert.ok(idx.indexedFiles.has("file:///a.stm"));
    removeFile(idx, "file:///a.stm");
    assert.ok(!idx.indexedFiles.has("file:///a.stm"));
  });
});

describe("resolveDefinition", () => {
  it("resolves bare name in global scope", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }",
    });
    const defs = resolveDefinition(idx, "customers", null);
    assert.equal(defs.length, 1);
    assert.equal(defs[0].kind, "schema");
  });

  it("resolves qualified name directly", () => {
    const idx = buildIndex({
      "file:///a.stm": "namespace crm {\n  schema customers { id UUID }\n}",
    });
    const defs = resolveDefinition(idx, "crm::customers", null);
    assert.equal(defs.length, 1);
    assert.equal(defs[0].kind, "schema");
  });

  it("prefers namespace-scoped over global when in namespace context", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }",
      "file:///b.stm": "namespace crm {\n  schema customers { id UUID }\n}",
    });
    const defs = resolveDefinition(idx, "customers", "crm");
    assert.equal(defs.length, 1);
    assert.equal(defs[0].namespace, "crm");
  });

  it("falls back to global when namespace-scoped not found", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }",
    });
    const defs = resolveDefinition(idx, "customers", "crm");
    assert.equal(defs.length, 1);
    assert.equal(defs[0].namespace, null);
  });

  it("returns empty for unknown name", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }",
    });
    const defs = resolveDefinition(idx, "nonexistent", null);
    assert.equal(defs.length, 0);
  });
});

describe("findReferences", () => {
  it("finds direct references", () => {
    const idx = buildIndex({
      "file:///a.stm": "mapping `test` {\n  source { customers }\n  target { dim }\n  id -> id\n}",
    });
    const refs = findReferences(idx, "customers");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].context, "source");
  });

  it("finds references across multiple files", () => {
    const idx = buildIndex({
      "file:///a.stm": "mapping `a` {\n  source { customers }\n  target { dim }\n  id -> id\n}",
      "file:///b.stm": "mapping `b` {\n  source { customers }\n  target { fact }\n  id -> id\n}",
    });
    const refs = findReferences(idx, "customers");
    assert.equal(refs.length, 2);
  });

  it("returns empty for unreferenced name", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }",
    });
    const refs = findReferences(idx, "customers");
    assert.equal(refs.length, 0);
  });
});

describe("allBlockNames", () => {
  it("returns all block names", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }\nfragment audit { ts TIMESTAMP }",
    });
    const names = allBlockNames(idx);
    assert.ok(names.length >= 2);
    assert.ok(names.some((n) => n.name === "customers"));
    assert.ok(names.some((n) => n.name === "audit"));
  });

  it("filters by kind", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }\nfragment audit { ts TIMESTAMP }",
    });
    const schemas = allBlockNames(idx, "schema");
    assert.equal(schemas.length, 1);
    assert.equal(schemas[0].name, "customers");
  });
});

describe("getFields", () => {
  it("returns fields for a schema", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers {\n  id UUID (pk)\n  name VARCHAR\n}",
    });
    const fields = getFields(idx, "customers", null);
    assert.equal(fields.length, 2);
    assert.equal(fields[0].name, "id");
    assert.equal(fields[1].name, "name");
  });

  it("returns nested fields", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers {\n  address record {\n    street VARCHAR\n    city VARCHAR\n  }\n}",
    });
    const fields = getFields(idx, "customers", null);
    assert.equal(fields[0].name, "address");
    assert.equal(fields[0].children.length, 2);
  });

  it("resolves namespaced schema fields", () => {
    const idx = buildIndex({
      "file:///a.stm": "namespace crm {\n  schema customers {\n    id UUID\n  }\n}",
    });
    const fields = getFields(idx, "customers", "crm");
    assert.equal(fields.length, 1);
    assert.equal(fields[0].name, "id");
  });

  it("returns empty for unknown schema", () => {
    const idx = buildIndex({
      "file:///a.stm": "schema customers { id UUID }",
    });
    const fields = getFields(idx, "nonexistent", null);
    assert.equal(fields.length, 0);
  });
});

describe("re-indexing", () => {
  it("replaces old entries when re-indexing a file", () => {
    const idx = createWorkspaceIndex();
    indexFile(idx, "file:///a.stm", parse("schema old_name { id UUID }"));
    assert.ok(idx.definitions.get("old_name"));

    // Re-index with different content
    indexFile(idx, "file:///a.stm", parse("schema new_name { id UUID }"));
    assert.equal(idx.definitions.get("old_name"), undefined);
    assert.ok(idx.definitions.get("new_name"));
  });
});
