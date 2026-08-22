import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "content/curricula/**",
    "content/inbox/**",
    "content/reports/**",
    "content/seeds/**",
    "content/work/**",
    "public/content/**",
    "next-env.d.ts",
  ]),
]);
