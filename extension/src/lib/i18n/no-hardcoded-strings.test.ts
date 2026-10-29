// @vitest-environment node
import { RuleTester, type Rule } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";
// @ts-expect-error -- the repo ESLint config is plain JavaScript without type declarations
import config from "../../../../eslint.config.js";

/** The local rule from the repo's ESLint config (FR-19: no hard-coded user-facing strings). */
function findRule(): Rule.RuleModule {
  for (const entry of config as {
    plugins?: Record<string, { rules?: Record<string, unknown> }>;
  }[]) {
    const rule = entry.plugins?.local?.rules?.["no-hardcoded-ui-strings"];
    if (rule) return rule as Rule.RuleModule;
  }
  throw new Error("rule local/no-hardcoded-ui-strings not found in eslint.config.js");
}

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("no-hardcoded-ui-strings", findRule(), {
  valid: [
    { code: 'const A = () => <p>{t("upload_title")}</p>;' },
    { code: 'const A = () => <p className="text-sm font-medium">{" *"}</p>;' },
    { code: 'const A = () => <p>{": "}</p>;' },
    { code: 'const A = () => <input aria-label={t("field_email")} type="email" />;' },
  ],
  invalid: [
    { code: "const A = () => <p>Upload your CV</p>;", errors: 1 },
    { code: 'const A = () => <button aria-label="Close">x</button>;', errors: 2 },
    { code: 'const A = () => <p>{"Hard-coded"}</p>;', errors: 1 },
    { code: 'const A = () => <img alt="Profile photo" />;', errors: 1 },
  ],
});
