import * as vscode from "vscode";
import { join } from "path";
import { runCli } from "../../commands/cli-runner";

export class GraphPanel {
  static currentPanel: GraphPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly cliPath: string;
  private disposables: vscode.Disposable[] = [];

  static createOrShow(
    extensionUri: vscode.Uri,
    cliPath: string,
  ): void {
    if (GraphPanel.currentPanel) {
      GraphPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      GraphPanel.currentPanel.refresh();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "satsumaGraph",
      "Satsuma: Workspace Graph",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(join(extensionUri.fsPath, "dist", "webview"))],
      },
    );

    GraphPanel.currentPanel = new GraphPanel(panel, extensionUri, cliPath);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    cliPath: string,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.cliPath = cliPath;

    this.panel.webview.html = this.getHtml();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables,
    );

    // Refresh on save
    const saveWatcher = vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.fileName.endsWith(".stm")) {
        this.refresh();
      }
    });
    this.disposables.push(saveWatcher);

    // Clean up on dispose
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Initial data load
    this.refresh();
  }

  async refresh(): Promise<void> {
    const result = await runCli(this.cliPath, ["graph", "--json"]);
    if (result.exitCode !== 0 && !result.stdout.trim()) {
      this.panel.webview.postMessage({
        type: "error",
        message: result.stderr.trim() || "Failed to load graph data",
      });
      return;
    }

    try {
      const data = JSON.parse(result.stdout);
      this.panel.webview.postMessage({ type: "graphData", payload: data });
    } catch {
      this.panel.webview.postMessage({
        type: "error",
        message: "Failed to parse graph data",
      });
    }
  }

  private handleMessage(message: { type: string; uri?: string; line?: number }): void {
    if (message.type === "navigate" && message.uri) {
      const uri = vscode.Uri.file(message.uri);
      const line = message.line ?? 0;
      vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(line, 0, line, 0),
      });
    }
  }

  dispose(): void {
    GraphPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  private getHtml(): string {
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(join(this.extensionUri.fsPath, "dist", "webview", "graph", "graph.js")),
    );
    const styleUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(join(this.extensionUri.fsPath, "dist", "webview", "graph", "graph.css")),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource}; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>Satsuma Graph</title>
</head>
<body>
  <div id="controls">
    <select id="namespace-filter">
      <option value="">All namespaces</option>
    </select>
    <span id="stats"></span>
  </div>
  <svg id="graph"></svg>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
