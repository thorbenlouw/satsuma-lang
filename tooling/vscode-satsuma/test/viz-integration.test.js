const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  isDarkTheme,
  loadFullLineageModel,
  loadExpandedModels,
  buildFieldLineagePath,
} = require("../dist/client/webview/viz/integration.js");

const ColorThemeKind = {
  Light: 1,
  Dark: 2,
  HighContrast: 3,
  HighContrastLight: 4,
};

describe("isDarkTheme", () => {
  it("treats dark and high-contrast themes as dark renderer themes", () => {
    assert.equal(isDarkTheme(ColorThemeKind.Dark), true);
    assert.equal(isDarkTheme(ColorThemeKind.HighContrast), true);
  });

  it("keeps light themes out of dark renderer mode", () => {
    assert.equal(isDarkTheme(ColorThemeKind.Light), false);
    assert.equal(isDarkTheme(ColorThemeKind.HighContrastLight), false);
  });
});

describe("loadFullLineageModel", () => {
  it("wraps the LSP full-lineage request result for the webview", async () => {
    const calls = [];
    const client = {
      async sendRequest(method, params) {
        calls.push({ method, params });
        return { uri: params.uri, namespaces: [] };
      },
    };

    const envelope = await loadFullLineageModel(
      client,
      "file:///platform.stm",
      ColorThemeKind.Dark,
    );

    assert.deepEqual(calls, [
      {
        method: "satsuma/vizFullLineage",
        params: { uri: "file:///platform.stm" },
      },
    ]);
    assert.deepEqual(envelope, {
      payload: { uri: "file:///platform.stm", namespaces: [] },
      isDark: true,
    });
  });

  it("returns null when the LSP has no VizModel for the file", async () => {
    const client = {
      async sendRequest() {
        return null;
      },
    };

    const envelope = await loadFullLineageModel(
      client,
      "file:///missing.stm",
      ColorThemeKind.Light,
    );

    assert.equal(envelope, null);
  });
});

describe("loadExpandedModels", () => {
  it("loads linked file models through the shared LSP viz requests", async () => {
    const calls = [];
    const client = {
      async sendRequest(method, params) {
        calls.push({ method, params });
        if (method === "satsuma/vizLinkedFiles") {
          return ["file:///crm.stm", "file:///warehouse.stm"];
        }
        if (method === "satsuma/vizModel" && params.uri === "file:///crm.stm") {
          return { uri: "file:///crm.stm" };
        }
        if (method === "satsuma/vizModel" && params.uri === "file:///warehouse.stm") {
          return null;
        }
        throw new Error(`Unexpected request: ${method}`);
      },
    };

    const envelope = await loadExpandedModels(
      client,
      "customers",
      "file:///platform.stm",
      ColorThemeKind.Light,
    );

    assert.deepEqual(calls, [
      {
        method: "satsuma/vizLinkedFiles",
        params: { schemaId: "customers", currentUri: "file:///platform.stm" },
      },
      {
        method: "satsuma/vizModel",
        params: { uri: "file:///crm.stm" },
      },
      {
        method: "satsuma/vizModel",
        params: { uri: "file:///warehouse.stm" },
      },
    ]);
    assert.deepEqual(envelope, {
      schemaId: "customers",
      models: [{ uri: "file:///crm.stm" }],
      isDark: false,
    });
  });

  it("returns an empty expansion payload when no linked files exist", async () => {
    const client = {
      async sendRequest(method) {
        assert.equal(method, "satsuma/vizLinkedFiles");
        return [];
      },
    };

    const envelope = await loadExpandedModels(
      client,
      "customers",
      "file:///platform.stm",
      ColorThemeKind.Dark,
    );

    assert.deepEqual(envelope, {
      schemaId: "customers",
      models: [],
      isDark: true,
    });
  });
});

describe("buildFieldLineagePath", () => {
  it("builds the schema.field path emitted from a viz field-lineage action", () => {
    assert.equal(buildFieldLineagePath("customers", "email"), "customers.email");
  });
});
