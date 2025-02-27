import { FlatCompat } from '@eslint/eslintrc';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from '@typescript-eslint/eslint-plugin';

const compat = new FlatCompat();

export default [
  {
    ignores: ['dist'], // 無視するファイル・ディレクトリ
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'], // 適用するファイル
    languageOptions: {
      ecmaVersion: 2020,
      parser: '@typescript-eslint/parser',
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': tseslint,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {}, // TypeScriptのresolverを有効化
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...tseslint.configs.recommended.rules, // TypeScript ESLintルールの適用
      'no-restricted-imports': ['error', { patterns: ['./', '../'] }],
    },
  },
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ),
];
