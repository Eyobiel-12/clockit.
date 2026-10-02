// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
  {
    // De React Compiler-regels wijzen bestaande patronen in onze data-hooks aan
    // (useApi en useFocusEffect roepen setState vanuit een effect). Dat werkt, maar
    // kan netter. Tot die refactor staan ze op "warn" zodat de rest van de lint
    // wél hard faalt in CI. Zie CLO-24 in Linear.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]);
