import js from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
    globalIgnores(["**/node_modules/**", "**/dist/**", "**/build/**", "**.json"]),
    {
        ignores: ["eslint.config.mjs", "jest.config.mjs", "jest.setup.mjs", "test/jest.config.e2e.mjs"]
    },
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    {
        files: ["**/*.{js,mjs,cjs,ts}"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            },
            ecmaVersion: 5,
            sourceType: "module",
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    {
        files: ["**/*.{js,mjs,cjs,ts}"],
        plugins: { js },
        extends: ["js/recommended"]
    },
    {
        files: ["**/*.{js,mjs,cjs,ts}"],
        plugins: { perfectionist }
    },
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "perfectionist/sort-imports": "error"
        }
    }
]);
