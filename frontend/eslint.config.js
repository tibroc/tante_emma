import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'design-ref', 'node_modules', 'static', 'dev-dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // react-hooks v7 ships its rules (incl. the React Compiler ruleset) as a flat
  // config; spreading `.recommended.rules` is the legacy (eslintrc) shape.
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Tests use vitest globals.
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
