import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
    "analysis/.venv/**",
    "analysis/.pytest_cache/**",
    "analysis/.ruff_cache/**",
    "analysis/build/**",
    "analysis/reports/latest/**",
    "analysis/src/*.egg-info/**",
    "analysis/notebooks/layouts/**",
    "analysis/notebooks/__marimo__/**",
  ]),
]);

export default eslintConfig;
