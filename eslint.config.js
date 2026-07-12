const globals = require("globals");
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");
const eslintPluginImport = require("eslint-plugin-import");

module.exports = tseslint.config(
  {
    ignores: ["dist/*", ".expo/*", ".idea/*", "node_modules/*", "types/supabase.ts", "**/*.js"],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "import/order": "warn",
    },
  },
  eslintConfigPrettier,
);
