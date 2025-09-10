import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import pluginNext from "@next/eslint-plugin-next";
import { config as baseConfig } from "./base.ts";
import type { Linter } from "eslint";

/**
 * A custom ESLint configuration for libraries that use Next.js.
 */
export const nextJsConfig: Linter.Config[] = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat!.recommended,
    languageOptions: {
      ...pluginReact.configs.flat!.recommended!.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      "@next/next": pluginNext as any,
    },
    rules: {
      ...(pluginNext.configs.recommended.rules as any),
      ...(pluginNext.configs["core-web-vitals"].rules as any),
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks as any,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...(pluginReactHooks.configs.recommended.rules as any),
      // React scope no longer necessary with new JSX transform.
      "react/react-in-jsx-scope": "off",
    },
  },
];