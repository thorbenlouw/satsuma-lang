import * as vscode from "vscode";
import { join } from "path";
import type { LanguageClient } from "vscode-languageclient/node";
import { FieldLineagePanel } from "../field-lineage/panel";

export class VizPanel {
  static currentPanel: VizPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly client: LanguageClient;
  private readonly cliPath: string;
  private disposables: vscode.Disposable[] = [];
  /** URI of the last successfully loaded .stm file — used by Refresh to reload without requiring focus. */
  private _lastUri: string | undefined;

  static createOrShow(
    extensionUri: vscode.Uri,
    client: LanguageClient,
    cliPath: string,
  ): void {
    if (VizPanel.currentPanel) {
      VizPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      VizPanel.currentPanel.refresh();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "satsumaViz",
      "Satsuma: Mapping Visualization",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(join(extensionUri.fsPath, "dist", "webview")),
        ],
      },
    );

    VizPanel.currentPanel = new VizPanel(panel, extensionUri, client, cliPath);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    client: LanguageClient,
    cliPath: string,
  ) {
    this.panel = panel;
    this.cliPath = cliPath;
    this.extensionUri = extensionUri;
    this.client = client;

    this.panel.webview.html = this.getHtml();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables,
    );

    // Refresh on save
    const saveWatcher = vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.fileName.endsWith(".stm") || doc.fileName.endsWith(".satsuma")) {
        this.refresh();
      }
    });
    this.disposables.push(saveWatcher);

    // Refresh when active editor changes to an .stm file
    const editorWatcher = vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor?.document.languageId === "satsuma") {
          this.refresh();
        }
      },
    );
    this.disposables.push(editorWatcher);

    // Clean up on dispose
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Initial data load
    this.refresh();
  }

  async refresh(): Promise<void> {
    // Prefer last loaded URI so Refresh works even when the webview has focus
    // and the .stm editor is no longer the active editor.
    const editor = vscode.window.activeTextEditor;
    const activeUri =
      editor?.document.languageId === "satsuma"
        ? editor.document.uri.toString()
        : undefined;
    const uri = activeUri ?? this._lastUri;

    if (!uri) {
      this.panel.webview.postMessage({
        type: "error",
        message: "Open a .stm file to see its mapping visualization",
      });
      return;
    }

    try {
      const model = await this.client.sendRequest("satsuma/vizModel", { uri });
      if (!model) {
        this.panel.webview.postMessage({
          type: "error",
          message: "No visualization data available for this file",
        });
        return;
      }

      // Remember this URI so Refresh can reload it even without editor focus
      this._lastUri = uri;

      // Detect theme kind and send alongside model
      const themeKind = vscode.window.activeColorTheme.kind;
      const isDark =
        themeKind === vscode.ColorThemeKind.Dark ||
        themeKind === vscode.ColorThemeKind.HighContrast;

      this.panel.webview.postMessage({
        type: "vizModel",
        payload: model,
        isDark,
      });
    } catch (err) {
      this.panel.webview.postMessage({
        type: "error",
        message: `Failed to load VizModel: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private handleMessage(message: {
    type: string;
    uri?: string;
    line?: number;
    character?: number;
    schemaId?: string;
    fieldPath?: string;
    content?: string;
    format?: string;
  }): void {
    if (message.type === "navigate" && message.uri) {
      const uri = vscode.Uri.parse(message.uri);
      const line = message.line ?? 0;
      const char = message.character ?? 0;
      vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(line, char, line, char),
      });
    } else if (message.type === "refresh") {
      this.refresh();
    } else if (message.type === "expandLineage" && message.schemaId) {
      this.expandLineage(message.schemaId);
    } else if (message.type === "fieldLineage" && message.fieldPath) {
      const workspacePath =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? ".";
      FieldLineagePanel.createOrShow(
        this.extensionUri,
        this.cliPath,
        workspacePath,
        message.fieldPath,
      );
    } else if (message.type === "export" && message.content) {
      this.exportSvg(message.content as string);
    }
  }

  private async exportSvg(content: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file("mapping-viz.svg"),
      filters: { "SVG files": ["svg"] },
    });
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
      vscode.window.showInformationMessage(`Saved SVG to ${uri.fsPath}`);
    }
  }

  private async expandLineage(schemaId: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    const currentUri = editor?.document.uri.toString() ?? "";

    try {
      const linkedUris: string[] = await this.client.sendRequest(
        "satsuma/vizLinkedFiles",
        { schemaId, currentUri },
      );

      if (linkedUris.length === 0) {
        return;
      }

      // Fetch VizModels for all linked files
      const models = await Promise.all(
        linkedUris.map((uri) =>
          this.client.sendRequest("satsuma/vizModel", { uri }),
        ),
      );

      const themeKind = vscode.window.activeColorTheme.kind;
      const isDark =
        themeKind === vscode.ColorThemeKind.Dark ||
        themeKind === vscode.ColorThemeKind.HighContrast;

      // Send expanded models to the webview
      this.panel.webview.postMessage({
        type: "expandedModels",
        schemaId,
        models: models.filter(Boolean),
        isDark,
      });
    } catch (err) {
      this.panel.webview.postMessage({
        type: "error",
        message: `Failed to expand lineage: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  dispose(): void {
    VizPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  private getHtml(): string {
    const vizScriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        join(
          this.extensionUri.fsPath,
          "dist",
          "webview",
          "viz",
          "viz.js",
        ),
      ),
    );
    const styleUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        join(
          this.extensionUri.fsPath,
          "dist",
          "webview",
          "viz",
          "viz.css",
        ),
      ),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>Satsuma Mapping Visualization</title>
</head>
<body>
  <div id="viz-root"></div>
  <script nonce="${nonce}" src="${vizScriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
