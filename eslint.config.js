import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules'], // Ignore unnecessary folders
  },
  {
    files: ['**/*.js'], // Apply to all JS files
    languageOptions: {
      ecmaVersion: 'latest', // Use the latest ECMAScript standard
      sourceType: 'module', // Set source type as ES Module
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      'prettier/prettier': 'error', // Prettier formatting as an error
    },
  },
];
