import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import { config as baseConfig } from "./base.js";
import type { Linter } from "eslint";

/**
 * A custom ESLint configuration for libraries that use React.
 */
export const config: Linter.Config[] = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat!.recommended,
  {
    languageOptions: {
      ...pluginReact.configs.flat!.recommended!.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
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
