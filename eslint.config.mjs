import nextConfig from "eslint-config-next/core-web-vitals";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const config = [
  ...nextConfig,
  prettierConfig,
  {
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Scripts and seed files legitimately use console.log for CLI output
    files: ["scripts/**", "lib/db/seed/**", "lib/db/seed.ts", "lib/search/reindex.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
