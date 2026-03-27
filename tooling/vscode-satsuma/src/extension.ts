import { join } from "path";
import * as vscode from "vscode";
import { ExtensionContext, window, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { registerValidateCommand } from "./commands/validate";
import { registerLineageCommand } from "./commands/lineage";
import { registerWhereUsedCommand } from "./commands/where-used";
import { registerWarningsCommand } from "./commands/warnings";
import { registerSummaryCommand } from "./commands/summary";
import { registerArrowsCommand } from "./commands/arrows";
import { registerCoverageCommand } from "./commands/coverage";
import { getEditorActionContext } from "./commands/action-context";
import { LineagePanel } from "./webview/lineage/panel";
import { VizPanel } from "./webview/viz/panel";

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext): void {
  const serverModule = context.asAbsolutePath(
    join("server", "dist", "server.js"),
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  const config = workspace.getConfiguration("satsuma");
  const cliPath = config.get<string>("cliPath") || "satsuma";

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "satsuma" }],
    initializationOptions: {
      cliPath,
    },
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher("**/*.stm"),
        workspace.createFileSystemWatcher("**/*.satsuma"),
      ],
    },
  };

  client = new LanguageClient(
    "satsumaLanguageServer",
    "Satsuma Language Server",
    serverOptions,
    clientOptions,
  );

  client.start();
  context.subscriptions.push({ dispose: () => client?.stop() });

  // Output channel for command results
  const outputChannel = window.createOutputChannel("Satsuma");
  context.subscriptions.push(outputChannel);

  // Register commands
  registerValidateCommand(context, cliPath);
  registerLineageCommand(context, cliPath, client, outputChannel);
  registerWhereUsedCommand(context, cliPath);
  registerWarningsCommand(context, cliPath);
  registerSummaryCommand(context, cliPath, outputChannel);
  registerArrowsCommand(context, cliPath, outputChannel);

  registerCoverageCommand(context, cliPath, client);

  // Mapping visualization webview
  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.showViz", () => {
      if (client) {
        VizPanel.createOrShow(context.extensionUri, client);
      }
    }),
  );

  // Lineage webview
  context.subscriptions.push(
    vscode.commands.registerCommand("satsuma.traceFieldLineage", async (args?: { fieldPath?: string }) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "satsuma") return;

      const actionContext = client
        ? await getEditorActionContext(client)
        : { schemaName: null, fieldPath: null };
      const word = editor.document.getText(
        editor.document.getWordRangeAtPosition(editor.selection.active),
      );

      const fieldPath = await vscode.window.showInputBox({
        prompt: "Enter field reference (schema.field)",
        value: args?.fieldPath ?? actionContext.fieldPath ?? (word?.includes(".") ? word : `${word ?? ""}.`),
        placeHolder: "customers.email",
      });
      if (!fieldPath) return;

      LineagePanel.createOrShow(context.extensionUri, cliPath, fieldPath);
    }),
  );
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
