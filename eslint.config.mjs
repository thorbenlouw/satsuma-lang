import js from "@eslint/js";
import globals from "globals";

const treeSitterDslGlobals = {
  grammar: "readonly",
  seq: "readonly",
  choice: "readonly",
  repeat: "readonly",
  optional: "readonly",
  token: "readonly",
  prec: "readonly",
  alias: "readonly",
  field: "readonly",
  repeat1: "readonly",
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.worktrees/**",
      "**/.claude/**",
      "**/.tickets/**",
      "**/src/grammar.json",
      "**/bindings/**",
      "**/build/**",
      "**/*.min.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["tooling/tree-sitter-stm/grammar.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: treeSitterDslGlobals,
    },
  },
  {
    files: ["**/*.js"],
    ignores: ["tooling/tree-sitter-stm/grammar.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["tooling/tree-sitter-stm/grammar.js"],
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
];
