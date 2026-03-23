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
  external: ["tree-sitter", "tree-sitter-satsuma"],
  format: "cjs",
  sourcemap: true,
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

// Copy CSS to dist
const { copyFileSync, mkdirSync, existsSync } = require("fs");

function copyCss() {
  const pairs = [
    ["src/webview/graph/graph.css", "dist/webview/graph/graph.css"],
    ["src/webview/lineage/lineage.css", "dist/webview/lineage/lineage.css"],
  ];
  for (const [src, dst] of pairs) {
    try {
      const dir = require("path").dirname(dst);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      copyFileSync(src, dst);
    } catch {
      // CSS file may not exist yet
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
    copyCss();
    console.log("Build complete.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
