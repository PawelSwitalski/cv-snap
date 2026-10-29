// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * "No TODO without a reference": a TODO/FIXME comment must name a story ID (e.g. `003-…`) or an
 * issue (`#12`) right after it, as in `TODO(006-deterministic-validator): …`.
 * @type {import("eslint").Rule.RuleModule}
 */
const todoNeedsReference = {
  meta: {
    type: "suggestion",
    messages: { missing: "TODO/FIXME needs a reference: TODO(<story-id>) or TODO(#<issue>)." },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const isMarker = /\b(TODO|FIXME)\b/.test(comment.value);
          const hasReference = /\b(TODO|FIXME)\((\d{3}-[a-z0-9-]+|#\d+)\)/.test(comment.value);
          if (isMarker && !hasReference) {
            context.report({ loc: comment.loc ?? { line: 1, column: 0 }, messageId: "missing" });
          }
        }
      },
    };
  },
};

/** JSX attributes whose text is read or shown to the user. */
const USER_FACING_ATTRIBUTES = new Set(["aria-label", "title", "placeholder", "alt"]);
/** Anything with a letter is words; punctuation, numbers and symbols ("•", " *", ": ") are not. */
const HAS_LETTER = /\p{L}/u;

/**
 * "No hard-coded user-facing strings" (FR-19): UI text must come from `_locales` through `t()`.
 * Flags JSX text with letters and string literals in user-facing attributes.
 * @type {import("eslint").Rule.RuleModule}
 */
const noHardcodedUiStrings = {
  meta: {
    type: "problem",
    messages: {
      text: "Hard-coded UI text: put it in _locales/{en,pl}/messages.json and use t().",
    },
    schema: [],
  },
  create(context) {
    /** @param {import("estree").Node} node */
    const report = (node) => {
      context.report({ node, messageId: "text" });
    };
    return {
      /** @param {any} node */
      JSXText(node) {
        if (HAS_LETTER.test(node.value)) report(node);
      },
      /** @param {any} node */
      JSXAttribute(node) {
        const name = node.name?.name;
        if (typeof name !== "string" || !USER_FACING_ATTRIBUTES.has(name)) return;
        const value = node.value;
        const literal =
          value?.type === "Literal"
            ? value.value
            : value?.type === "JSXExpressionContainer" && value.expression.type === "Literal"
              ? value.expression.value
              : null;
        if (typeof literal === "string" && HAS_LETTER.test(literal)) report(value);
      },
      /** @param {any} node */
      "JSXExpressionContainer > Literal"(node) {
        if (node.parent.parent?.type !== "JSXAttribute" && typeof node.value === "string") {
          if (HAS_LETTER.test(node.value)) report(node);
        }
      },
    };
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.output/**",
      "**/.wxt/**",
      ".specsmd/**",
      ".claude/**",
      "memory-bank/**",
      "exampleCV/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    plugins: {
      local: {
        rules: {
          "todo-needs-reference": todoNeedsReference,
          "no-hardcoded-ui-strings": noHardcodedUiStrings,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": "error",
      "local/todo-needs-reference": "error",
    },
  },
  {
    files: ["extension/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    // UI code: every user-facing string comes from _locales (FR-19). The CV PDF template renders
    // CV content and its own heading tables (bolt 009), not panel UI, so it is excluded.
    files: [
      "extension/src/entrypoints/sidepanel/**/*.tsx",
      "extension/src/features/**/*.tsx",
      "extension/src/components/**/*.tsx",
    ],
    ignores: ["**/*.test.tsx", "extension/src/features/cv-pdf/**"],
    rules: { "local/no-hardcoded-ui-strings": "error" },
  },
  {
    // Config files are plain JS outside any tsconfig: lint them without type information.
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
);
