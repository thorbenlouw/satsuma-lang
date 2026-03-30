/**
 * dom-shim.js — Node.js DOM globals for Lit web component tests.
 *
 * Installs the minimal browser globals (HTMLElement, customElements, Event, …)
 * that Lit requires when running in Node.js. Uses @lit-labs/ssr-dom-shim
 * (zero dependencies) instead of the full @lit-labs/ssr package, which
 * transitively pulls in node-fetch → fetch-blob → node-domexception
 * for a fetch polyfill that tests do not need.
 *
 * Must be imported before any Lit module.
 */
import {
  HTMLElement,
  Element,
  Event,
  CustomEvent,
  EventTarget,
  CSSStyleSheet,
  CustomElementRegistry,
} from "@lit-labs/ssr-dom-shim";
import "@lit-labs/ssr-dom-shim/register-css-hook.js";

// Mirror the globals that @lit-labs/ssr's installWindowOnGlobal() sets,
// but omit the node-fetch polyfill — Node.js 18+ has native fetch and
// our components do not make network requests during tests.
if (globalThis.window === undefined) {
  class ShadowRoot {}
  class Document {
    get adoptedStyleSheets() {
      return [];
    }
    createTreeWalker() {
      return {};
    }
    createTextNode() {
      return {};
    }
    createElement() {
      return {};
    }
  }
  Object.assign(globalThis, {
    EventTarget,
    Event: globalThis.Event ?? Event,
    CustomEvent: globalThis.CustomEvent ?? CustomEvent,
    Element,
    HTMLElement,
    Document,
    document: new Document(),
    CSSStyleSheet,
    ShadowRoot,
    CustomElementRegistry,
    customElements: new CustomElementRegistry(),
  });
}
