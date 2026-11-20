// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // New in the React Compiler-era hooks plugin; ~10 existing effects (auth, sync, vault and
      // cash-session contexts among them) predate it. Kept visible as a warning until they're
      // reworked one by one with device testing, instead of failing every lint run.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
