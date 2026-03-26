// @ts-nocheck — runs in webview context, no VS Code types
// Webview entry point for Satsuma Mapping Visualization.
// Loads the @satsuma/viz web component and wires it to VS Code messaging.

import "@satsuma/viz";

const vscode = acquireVsCodeApi();

// Mount the <satsuma-viz> element
const root = document.getElementById("viz-root")!;
const vizEl = document.createElement("satsuma-viz") as any;
root.appendChild(vizEl);

// Listen for navigate events from the component
vizEl.addEventListener("navigate", (ev: CustomEvent) => {
  const loc = ev.location ?? ev.detail?.location;
  if (loc) {
    vscode.postMessage({
      type: "navigate",
      uri: loc.uri,
      line: loc.line,
      character: loc.character,
    });
  }
});

// Listen for refresh events from the toolbar
vizEl.addEventListener("refresh", () => {
  vscode.postMessage({ type: "refresh" });
});

// Listen for export events from the toolbar
vizEl.addEventListener("export", (ev: CustomEvent) => {
  const detail = ev.detail ?? {};
  vscode.postMessage({ type: "export", format: detail.format, content: detail.content });
});

// Listen for expand-lineage events from schema cards
vizEl.addEventListener("expand-lineage", (ev: CustomEvent) => {
  const schemaId = ev.schemaId ?? ev.detail?.schemaId;
  if (schemaId) {
    vscode.postMessage({ type: "expandLineage", schemaId });
  }
});

// Receive messages from the extension host
window.addEventListener("message", (event) => {
  const msg = event.data;

  if (msg.type === "vizModel") {
    // Apply theme
    if (msg.isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    // Set model on the component
    vizEl.model = msg.payload;
  } else if (msg.type === "expandedModels") {
    vizEl.addExpandedModels(msg.schemaId, msg.models);
  } else if (msg.type === "error") {
    root.textContent = "";
    const div = document.createElement("div");
    div.className = "error-message";
    div.textContent = msg.message;
    root.appendChild(div);
  }
});
