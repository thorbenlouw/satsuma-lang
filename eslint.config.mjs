import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

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
      "**/dist/**",
      "**/*.min.js",
      "site/js/tailwind.js",
      "site/_site/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["tooling/tree-sitter-satsuma/grammar.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: treeSitterDslGlobals,
    },
  },
  {
    files: ["**/*.js"],
    ignores: ["tooling/tree-sitter-satsuma/grammar.js", "site/**/*.js"],
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
    files: ["site/.eleventy.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["site/**/*.js"],
    ignores: ["site/.eleventy.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["tooling/tree-sitter-satsuma/grammar.js"],
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
  // TypeScript files — type-aware linting
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["tooling/satsuma-cli/src/**/*.ts"],
  })),
  {
    files: ["tooling/satsuma-cli/src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Align with existing JS convention
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      // Non-null assertions require targeted inline suppression with a safety justification
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
];
