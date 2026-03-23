import { join } from "path";
import { ExtensionContext, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

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
  };

  client = new LanguageClient(
    "satsumaLanguageServer",
    "Satsuma Language Server",
    serverOptions,
    clientOptions,
  );

  client.start();
  context.subscriptions.push({ dispose: () => client?.stop() });
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
