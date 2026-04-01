/**
 * integration.ts — host-side Viz request orchestration for the VS Code webview.
 *
 * Keeps the VS Code panel thin by isolating the LSP request names, theme
 * mapping, and expanded-lineage fetch sequence in one host-only module. The
 * browser webview remains a generic renderer shell that only consumes messages.
 */

import type { LanguageClient } from "vscode-languageclient/node";

const VIZ_MODEL_REQUEST = "satsuma/vizModel";
const VIZ_FULL_LINEAGE_REQUEST = "satsuma/vizFullLineage";
const VIZ_LINKED_FILES_REQUEST = "satsuma/vizLinkedFiles";

export type ThemeKind = number;

const DARK_THEME_KIND = 2;
const HIGH_CONTRAST_THEME_KIND = 3;

export interface VizModelEnvelope<TModel> {
  /** Serialized VizModel payload returned by the LSP. */
  payload: TModel;
  /** Whether the current VS Code theme should use dark renderer tokens. */
  isDark: boolean;
}

export interface ExpandedModelsEnvelope<TModel> {
  /** Schema whose expansion triggered the fetch. */
  schemaId: string;
  /** Additional VizModels from linked files, filtered to non-null results. */
  models: TModel[];
  /** Whether the current VS Code theme should use dark renderer tokens. */
  isDark: boolean;
}

/**
 * Convert the active VS Code theme into the renderer's dark-mode flag.
 */
export function isDarkTheme(kind: ThemeKind): boolean {
  return (
    kind === DARK_THEME_KIND ||
    kind === HIGH_CONTRAST_THEME_KIND
  );
}

/**
 * Load the full-lineage VizModel for a file through the LSP request boundary.
 */
export async function loadFullLineageModel<TModel>(
  client: Pick<LanguageClient, "sendRequest">,
  uri: string,
  themeKind: ThemeKind,
): Promise<VizModelEnvelope<TModel> | null> {
  const model = await client.sendRequest<TModel | null>(VIZ_FULL_LINEAGE_REQUEST, { uri });
  if (!model) return null;
  return {
    payload: model,
    isDark: isDarkTheme(themeKind),
  };
}

/**
 * Load linked-file VizModels for a schema expansion through the LSP boundary.
 */
export async function loadExpandedModels<TModel>(
  client: Pick<LanguageClient, "sendRequest">,
  schemaId: string,
  currentUri: string,
  themeKind: ThemeKind,
): Promise<ExpandedModelsEnvelope<TModel>> {
  const linkedUris = await client.sendRequest<string[]>(VIZ_LINKED_FILES_REQUEST, {
    schemaId,
    currentUri,
  });

  if (linkedUris.length === 0) {
    return {
      schemaId,
      models: [],
      isDark: isDarkTheme(themeKind),
    };
  }

  const models = await Promise.all(
    linkedUris.map((uri) => client.sendRequest<TModel | null>(VIZ_MODEL_REQUEST, { uri })),
  );
  const resolvedModels: TModel[] = [];
  for (const model of models) {
    if (model) resolvedModels.push(model);
  }

  return {
    schemaId,
    models: resolvedModels,
    isDark: isDarkTheme(themeKind),
  };
}

/**
 * Build the field-lineage path emitted from a schema-card field interaction.
 */
export function buildFieldLineagePath(schemaId: string, fieldName: string): string {
  return `${schemaId}.${fieldName}`;
}
