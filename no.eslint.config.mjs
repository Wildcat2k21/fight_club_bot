import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        process: "readonly", // Add this line,
        __dirname: "readonly", // Add this line
      },
    },
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
]);
