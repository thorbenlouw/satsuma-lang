const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const clientConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/client/extension.js",
  external: ["vscode"],
  format: "cjs",
  sourcemap: true,
};

/** @type {import("esbuild").BuildOptions} */
const serverConfig = {
  entryPoints: ["server/src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "server/dist/server.js",
  format: "cjs",
  sourcemap: true,
  alias: {
    // Resolve the shared formatter from the CLI package source.
    // esbuild bundles the .ts file directly — no pre-build step needed.
    "satsuma-fmt": "../satsuma-cli/src/format.ts",
  },
};

/** @type {import("esbuild").BuildOptions} */
const webviewGraphConfig = {
  entryPoints: ["src/webview/graph/graph.ts"],
  bundle: true,
  platform: "browser",
  target: "es2020",
  outfile: "dist/webview/graph/graph.js",
  format: "iife",
  sourcemap: true,
};

/** @type {import("esbuild").BuildOptions} */
const webviewLineageConfig = {
  entryPoints: ["src/webview/lineage/lineage.ts"],
  bundle: true,
  platform: "browser",
  target: "es2020",
  outfile: "dist/webview/lineage/lineage.js",
  format: "iife",
  sourcemap: true,
};

// Copy static assets to dist
const { copyFileSync, mkdirSync, existsSync } = require("fs");
const path = require("path");

function copyAssets() {
  const pairs = [
    ["src/webview/graph/graph.css", "dist/webview/graph/graph.css"],
    ["src/webview/lineage/lineage.css", "dist/webview/lineage/lineage.css"],
  ];

  // Copy WASM and highlights.scm into server/dist/ so the server can load them
  // at runtime via __dirname.
  const treeSitterDir = path.resolve(__dirname, "../tree-sitter-satsuma");
  pairs.push(
    [path.join(treeSitterDir, "tree-sitter-satsuma.wasm"), "server/dist/tree-sitter-satsuma.wasm"],
    [path.join(treeSitterDir, "queries/highlights.scm"), "server/dist/highlights.scm"],
    // web-tree-sitter runtime WASM — loaded by the web-tree-sitter module at init
    ["server/node_modules/web-tree-sitter/tree-sitter.wasm", "server/dist/tree-sitter.wasm"],
  );

  for (const [src, dst] of pairs) {
    try {
      const dir = path.dirname(dst);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      copyFileSync(src, dst);
    } catch {
      // Asset may not exist yet (e.g. CSS or WASM not built)
    }
  }
}

async function build() {
  const configs = [clientConfig, serverConfig, webviewGraphConfig];

  // Only include lineage config if the entry point exists
  try {
    require("fs").accessSync("src/webview/lineage/lineage.ts");
    configs.push(webviewLineageConfig);
  } catch {
    // Lineage webview not yet created
  }

  if (watch) {
    const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("Watching for changes...");
  } else {
    await Promise.all(configs.map((c) => esbuild.build(c)));
    copyAssets();
    console.log("Build complete.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
