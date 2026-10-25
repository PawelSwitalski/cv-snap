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
    plugins: { local: { rules: { "todo-needs-reference": todoNeedsReference } } },
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
    // Config files are plain JS outside any tsconfig: lint them without type information.
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
);
