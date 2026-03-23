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

async function build() {
  if (watch) {
    const [clientCtx, serverCtx] = await Promise.all([
      esbuild.context(clientConfig),
      esbuild.context(serverConfig),
    ]);
    await Promise.all([clientCtx.watch(), serverCtx.watch()]);
    console.log("Watching for changes...");
  } else {
    await Promise.all([
      esbuild.build(clientConfig),
      esbuild.build(serverConfig),
    ]);
    console.log("Build complete.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
