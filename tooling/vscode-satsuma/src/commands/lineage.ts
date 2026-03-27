import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { runCli } from "./cli-runner";
import { getEditorActionContext } from "./action-context";

interface ShowLineageArgs {
  schemaName?: string;
  direction?: "from" | "to";
}

export function registerLineageCommand(
  context: vscode.ExtensionContext,
  cliPath: string,
  client: LanguageClient,
  outputChannel: vscode.OutputChannel,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.showLineage", async (args?: ShowLineageArgs) => {
      const direction = args?.direction === "to" ? "to" : "from";
      let selected = args?.schemaName;

      if (!selected) {
        const actionContext = await getEditorActionContext(client);
        selected = actionContext.schemaName ?? undefined;
      }

      // Get block names from the LSP server
      let names: Array<{ name: string; kind: string }>;
      try {
        names = await client.sendRequest("satsuma/blockNames");
      } catch {
        names = [];
      }

      const schemaNames = names
        .filter((n) => n.kind === "schema")
        .map((n) => n.name);

      if (schemaNames.length === 0) {
        vscode.window.showInformationMessage("No schemas found in workspace.");
        return;
      }

      if (!selected) {
        selected = await vscode.window.showQuickPick(schemaNames, {
          placeHolder: `Select a schema to trace lineage ${direction}`,
        });
      }
      if (!selected) return;

      const result = await runCli(cliPath, [
        "lineage",
        `--${direction}`,
        selected,
        "--json",
      ]);

      if (result.exitCode !== 0) {
        vscode.window.showWarningMessage(
          `Lineage failed: ${result.stderr.trim() || "unknown error"}`,
        );
        return;
      }

      try {
        const dag = JSON.parse(result.stdout);
        outputChannel.clear();
        outputChannel.appendLine(`Lineage ${direction} ${selected}:`);
        outputChannel.appendLine("");
        if (dag.nodes) {
          for (const node of dag.nodes) {
            outputChannel.appendLine(`  ${node.name}${node.type ? ` (${node.type})` : ""}`);
          }
        }
        if (dag.edges) {
          outputChannel.appendLine("");
          outputChannel.appendLine("Edges:");
          for (const edge of dag.edges) {
            outputChannel.appendLine(`  ${edge.src} → ${edge.tgt}`);
          }
        }
        outputChannel.show();
      } catch {
        outputChannel.clear();
        outputChannel.appendLine(result.stdout);
        outputChannel.show();
      }
    }),
  );
}
