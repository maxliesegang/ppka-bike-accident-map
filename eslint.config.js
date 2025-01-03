import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...tseslint.configs.recommended,
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    ignores: ['node_modules', 'dist'], // Ignore unnecessary folders
  },
  {
    languageOptions: {
      ecmaVersion: 'latest', // Use the latest ECMAScript standard
      sourceType: 'module', // Set source type as ES Module
    },
  },
];
