import * as vscode from "vscode";
import { runCli } from "./cli-runner";

export function registerWhereUsedCommand(
  context: vscode.ExtensionContext,
  cliPath: string,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.whereUsed", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "satsuma") return;

      const wordRange = editor.document.getWordRangeAtPosition(
        editor.selection.active,
        /[@]?[a-zA-Z_][a-zA-Z0-9_-]*(?:::[a-zA-Z_][a-zA-Z0-9_-]*)?(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*/,
      );
      if (!wordRange) return;
      const word = editor.document.getText(wordRange).replace(/^@/, "");

      const result = await runCli(cliPath, [
        "where-used",
        word,
        "--json",
      ]);

      if (result.exitCode !== 0) {
        vscode.window.showWarningMessage(
          `Where-used failed: ${result.stderr.trim() || "not found"}`,
        );
        return;
      }

      try {
        const data = JSON.parse(result.stdout);
        if (!data.refs || data.refs.length === 0) {
          vscode.window.showInformationMessage(
            `No references found for '${word}'.`,
          );
          return;
        }

        const locations: vscode.Location[] = data.refs
          .filter((r: { file?: string }) => r.file)
          .map(
            (r: { file: string; row?: number }) =>
              new vscode.Location(
                vscode.Uri.file(r.file),
                new vscode.Position(r.row ?? 0, 0),
              ),
          );

        await vscode.commands.executeCommand(
          "editor.action.showReferences",
          editor.document.uri,
          editor.selection.active,
          locations,
        );
      } catch {
        vscode.window.showWarningMessage("Failed to parse where-used results.");
      }
    }),
  );
}
