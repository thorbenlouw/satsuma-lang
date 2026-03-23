import * as vscode from "vscode";
import { join } from "path";
import { LanguageClient } from "vscode-languageclient/node";
import { runCli } from "./cli-runner";

let mappedDecoration: vscode.TextEditorDecorationType | undefined;
let unmappedDecoration: vscode.TextEditorDecorationType | undefined;
let coverageBar: vscode.StatusBarItem | undefined;
let _activeTargetUri: string | undefined;

export function registerCoverageCommand(
  context: vscode.ExtensionContext,
  cliPath: string,
  client: LanguageClient,
): void {
  mappedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: join(context.extensionPath, "src", "icons", "mapped.svg"),
    gutterIconSize: "80%",
    overviewRulerColor: "#4caf50",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });

  unmappedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: join(context.extensionPath, "src", "icons", "unmapped.svg"),
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

      // Find the mapping name and target schema from the document
      const text = editor.document.getText();
      const info = extractMappingInfo(text, editor.selection.active.line);

      if (!info) {
        vscode.window.showWarningMessage(
          "Place cursor inside a mapping block to show coverage.",
        );
        return;
      }

      const { mappingName, targetSchema } = info;

      // Get unmapped fields via CLI
      const result = await runCli(cliPath, [
        "fields",
        targetSchema,
        "--unmapped-by",
        mappingName,
        "--json",
      ]);

      let unmappedFields: string[];
      try {
        const fields = JSON.parse(result.stdout);
        if (!Array.isArray(fields)) {
          vscode.window.showWarningMessage("Unexpected CLI output format.");
          return;
        }
        unmappedFields = fields.map((f: { name: string }) => f.name);
      } catch {
        vscode.window.showWarningMessage(
          `Coverage failed: ${result.stderr.trim() || "unknown error"}`,
        );
        return;
      }

      // Get field locations from LSP
      let fieldLocations: Array<{ name: string; uri: string; line: number }>;
      try {
        fieldLocations = await client.sendRequest("satsuma/fieldLocations", {
          name: targetSchema,
        });
      } catch {
        vscode.window.showWarningMessage("Could not locate target schema fields.");
        return;
      }

      if (fieldLocations.length === 0) {
        vscode.window.showInformationMessage(
          `No fields found for schema '${targetSchema}'.`,
        );
        return;
      }

      // Open the target schema file if not already open
      const targetUri = fieldLocations[0]!.uri;
      _activeTargetUri = targetUri;
      const targetDoc = await vscode.workspace.openTextDocument(
        vscode.Uri.parse(targetUri),
      );
      const targetEditor = await vscode.window.showTextDocument(
        targetDoc,
        { preserveFocus: true },
      );

      // Apply decorations
      const unmappedSet = new Set(unmappedFields);
      const mappedRanges: vscode.DecorationOptions[] = [];
      const unmappedRanges: vscode.DecorationOptions[] = [];

      for (const field of fieldLocations) {
        const range = new vscode.Range(field.line, 0, field.line, 0);
        if (unmappedSet.has(field.name)) {
          unmappedRanges.push({
            range,
            hoverMessage: `**${field.name}** — unmapped`,
          });
        } else {
          mappedRanges.push({
            range,
            hoverMessage: `**${field.name}** — mapped`,
          });
        }
      }

      targetEditor.setDecorations(mappedDecoration!, mappedRanges);
      targetEditor.setDecorations(unmappedDecoration!, unmappedRanges);

      // Update status bar
      const total = fieldLocations.length;
      const mapped = total - unmappedFields.length;
      const pct = total > 0 ? Math.round((mapped / total) * 100) : 0;
      coverageBar!.text = `$(check) Coverage: ${pct}%`;
      coverageBar!.tooltip = `${mapped}/${total} fields mapped by '${mappingName}'`;
      coverageBar!.show();
    }),
  );

  // Clear decorations when switching editors
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      if (coverageBar) coverageBar.hide();
    }),
  );
}

/** Extract mapping name and target schema from document text near cursor. */
function extractMappingInfo(
  text: string,
  cursorLine: number,
): { mappingName: string; targetSchema: string } | null {
  const lines = text.split("\n");

  // Walk backwards from cursor to find "mapping" keyword
  let mappingName: string | null = null;
  for (let i = cursorLine; i >= 0; i--) {
    const match = lines[i]?.match(/^mapping\s+(?:'([^']+)'|(\S+))/);
    if (match) {
      mappingName = match[1] ?? match[2] ?? null;
      break;
    }
  }
  if (!mappingName) return null;

  // Find target block within the mapping
  let targetSchema: string | null = null;
  let inMapping = false;
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.match(/^mapping\s/)) {
      inMapping = line.includes(mappingName);
      braceDepth = 0;
    }
    if (inMapping) {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      const targetMatch = line.match(/target\s*\{\s*(?:`([^`]+)`|(\S+))/);
      if (targetMatch) {
        targetSchema = targetMatch[1] ?? targetMatch[2] ?? null;
      }
      if (braceDepth <= 0 && i > cursorLine) break;
    }
  }

  if (!targetSchema) return null;
  return { mappingName, targetSchema };
}
