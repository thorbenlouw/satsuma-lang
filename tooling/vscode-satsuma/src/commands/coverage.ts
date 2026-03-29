import * as vscode from "vscode";
import { join } from "path";
import { LanguageClient } from "vscode-languageclient/node";
import { getEditorActionContext } from "./action-context";

let mappedDecoration: vscode.TextEditorDecorationType | undefined;
let unmappedDecoration: vscode.TextEditorDecorationType | undefined;
let coverageBar: vscode.StatusBarItem | undefined;

export function registerCoverageCommand(
  context: vscode.ExtensionContext,
  _cliPath: string,
  client: LanguageClient,
): void {
  mappedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: join(context.extensionPath, "icons", "mapped.svg"),
    gutterIconSize: "80%",
    overviewRulerColor: "#4caf50",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });

  unmappedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: join(context.extensionPath, "icons", "unmapped.svg"),
    gutterIconSize: "80%",
    overviewRulerColor: "#f44336",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });

  coverageBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  context.subscriptions.push(mappedDecoration, unmappedDecoration, coverageBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.showCoverage", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "satsuma") return;

      const actionContext = await getEditorActionContext(client);
      const { mappingName } = actionContext;

      if (!mappingName) {
        vscode.window.showWarningMessage(
          "Place cursor inside a named mapping block to show coverage.",
        );
        return;
      }

      let coverageResult: {
        schemas: Array<{
          schemaId: string;
          role: "source" | "target";
          fields: Array<{ path: string; uri: string; line: number; mapped: boolean }>;
        }>;
      };

      try {
        coverageResult = await client.sendRequest("satsuma/mappingCoverage", {
          uri: editor.document.uri.toString(),
          mappingName,
        });
      } catch {
        vscode.window.showWarningMessage("Could not compute mapping coverage.");
        return;
      }

      if (coverageResult.schemas.length === 0) {
        vscode.window.showInformationMessage(
          `No schemas found for mapping '${mappingName}'.`,
        );
        return;
      }

      // Group fields by file URI so we make one showTextDocument call per file.
      const byUri = new Map<string, {
        mapped: vscode.DecorationOptions[];
        unmapped: vscode.DecorationOptions[];
      }>();

      for (const schema of coverageResult.schemas) {
        const srcLabel = schema.role === "source" ? "used as source" : "mapped";
        const tgtLabel = schema.role === "source" ? "not used as source" : "unmapped";
        for (const f of schema.fields) {
          if (!byUri.has(f.uri)) byUri.set(f.uri, { mapped: [], unmapped: [] });
          const bucket = byUri.get(f.uri)!;
          const range = new vscode.Range(f.line, 0, f.line, 0);
          if (f.mapped) {
            bucket.mapped.push({ range, hoverMessage: `**${f.path}** — ${srcLabel}` });
          } else {
            bucket.unmapped.push({ range, hoverMessage: `**${f.path}** — ${tgtLabel}` });
          }
        }
      }

      // Apply decorations to each affected file.
      for (const [uri, { mapped, unmapped }] of byUri) {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
        const schemaEditor = await vscode.window.showTextDocument(doc, { preserveFocus: true });
        schemaEditor.setDecorations(mappedDecoration!, mapped);
        schemaEditor.setDecorations(unmappedDecoration!, unmapped);
      }

      // Status bar: show target coverage %.
      const targetSchema = coverageResult.schemas.find((s) => s.role === "target");
      if (targetSchema) {
        const total = targetSchema.fields.filter((f) => !f.path.includes(".")).length;
        const mapped = targetSchema.fields.filter((f) => !f.path.includes(".") && f.mapped).length;
        const pct = total > 0 ? Math.round((mapped / total) * 100) : 0;
        coverageBar!.text = `$(check) Coverage: ${pct}%`;
        coverageBar!.tooltip = `${mapped}/${total} target fields mapped by '${mappingName}'`;
        coverageBar!.show();
      }
    }),
  );

  // Clear decorations when switching editors.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      if (coverageBar) coverageBar.hide();
    }),
  );
}
