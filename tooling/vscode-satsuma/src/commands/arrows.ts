import * as vscode from "vscode";
import { runCli } from "./cli-runner";

export function registerArrowsCommand(
  context: vscode.ExtensionContext,
  cliPath: string,
  outputChannel: vscode.OutputChannel,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.showArrows", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "satsuma") return;

      // Try to determine the field path from cursor context
      const wordRange = editor.document.getWordRangeAtPosition(
        editor.selection.active,
      );
      if (!wordRange) return;

      // Ask user for the full schema.field reference
      const word = editor.document.getText(wordRange);
      const fieldPath = await vscode.window.showInputBox({
        prompt: "Enter field reference (schema.field)",
        value: word.includes(".") ? word : `${word}.`,
        placeHolder: "customers.email",
      });
      if (!fieldPath) return;

      const result = await runCli(cliPath, [
        "arrows",
        fieldPath,
        "--json",
      ]);

      if (result.exitCode !== 0) {
        vscode.window.showWarningMessage(
          `Arrows failed: ${result.stderr.trim() || "not found"}`,
        );
        return;
      }

      try {
        const arrows = JSON.parse(result.stdout);
        if (!Array.isArray(arrows) || arrows.length === 0) {
          vscode.window.showInformationMessage(
            `No arrows found for '${fieldPath}'.`,
          );
          return;
        }

        outputChannel.clear();
        outputChannel.appendLine(`Arrows for ${fieldPath}:`);
        outputChannel.appendLine("");

        for (const a of arrows) {
          const cls = a.classification ? `[${a.classification}]` : "";
          const src = a.source_qualified ?? a.source ?? "?";
          const tgt = a.target_qualified ?? a.target ?? "?";
          const mapping = a.mapping ?? "";
          const transform = a.transform_raw ?? "";

          outputChannel.appendLine(
            `  ${src} → ${tgt} ${cls} in ${mapping}`,
          );
          if (transform) {
            outputChannel.appendLine(`    transform: ${transform}`);
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
