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
  } else if (msg.type === "error") {
    root.textContent = "";
    const div = document.createElement("div");
    div.className = "error-message";
    div.textContent = msg.message;
    root.appendChild(div);
  }
});
