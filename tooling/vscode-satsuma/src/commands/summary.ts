import * as vscode from "vscode";
import { runCli } from "./cli-runner";

export function registerSummaryCommand(
  context: vscode.ExtensionContext,
  cliPath: string,
  outputChannel: vscode.OutputChannel,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.showSummary", async () => {
      const result = await runCli(cliPath, ["summary", "--json"]);

      if (result.exitCode !== 0) {
        vscode.window.showWarningMessage(
          `Summary failed: ${result.stderr.trim() || "unknown error"}`,
        );
        return;
      }

      try {
        const data = JSON.parse(result.stdout);
        outputChannel.clear();
        outputChannel.appendLine("Satsuma Workspace Summary");
        outputChannel.appendLine("=".repeat(40));
        outputChannel.appendLine("");

        if (data.files !== undefined) {
          outputChannel.appendLine(`Files: ${data.files}`);
        }
        if (data.schemas !== undefined) {
          outputChannel.appendLine(`Schemas: ${data.schemas}`);
        }
        if (data.mappings !== undefined) {
          outputChannel.appendLine(`Mappings: ${data.mappings}`);
        }
        if (data.fragments !== undefined) {
          outputChannel.appendLine(`Fragments: ${data.fragments}`);
        }
        if (data.transforms !== undefined) {
          outputChannel.appendLine(`Transforms: ${data.transforms}`);
        }
        if (data.metrics !== undefined) {
          outputChannel.appendLine(`Metrics: ${data.metrics}`);
        }
        if (data.notes !== undefined) {
          outputChannel.appendLine(`Notes: ${data.notes}`);
        }
        if (data.arrows !== undefined) {
          outputChannel.appendLine(`Arrows: ${data.arrows}`);
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
