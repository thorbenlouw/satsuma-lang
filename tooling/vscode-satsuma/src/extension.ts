import { join } from "path";
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
      fileEvents: workspace.createFileSystemWatcher("**/*.stm"),
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

  // Graph and lineage webview commands are registered in later steps
  // (satsuma.showGraph, satsuma.traceFieldLineage, satsuma.showCoverage)
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
