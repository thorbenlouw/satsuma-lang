import * as vscode from "vscode";
import { runCli } from "./cli-runner";

export function registerWarningsCommand(
  context: vscode.ExtensionContext,
  cliPath: string,
): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("satsuma-warnings-cmd");
  context.subscriptions.push(diagnostics);

  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.showWarnings", async () => {
      const result = await runCli(cliPath, ["warnings", "--json"]);
      diagnostics.clear();

      try {
        const data = JSON.parse(result.stdout);
        if (!data.items || data.items.length === 0) {
          vscode.window.showInformationMessage("No warnings found.");
          return;
        }

        const grouped = new Map<string, vscode.Diagnostic[]>();
        for (const item of data.items) {
          if (!item.file) continue;
          const uri = vscode.Uri.file(item.file).toString();
          const diag = new vscode.Diagnostic(
            new vscode.Range(item.row ?? 0, 0, item.row ?? 0, 0),
            item.text,
            vscode.DiagnosticSeverity.Warning,
          );
          diag.source = "satsuma-warnings";
          if (!grouped.has(uri)) grouped.set(uri, []);
          grouped.get(uri)!.push(diag);
        }

        for (const [uriStr, diags] of grouped) {
          diagnostics.set(vscode.Uri.parse(uriStr), diags);
        }

        vscode.window.showInformationMessage(
          `Satsuma: ${data.count} warning(s) found.`,
        );
      } catch {
        if (result.stderr) {
          vscode.window.showWarningMessage(result.stderr.trim());
        }
      }
    }),
  );
}
