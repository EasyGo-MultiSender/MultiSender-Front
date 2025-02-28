// .eslintrc.js (Flat Config 用)
import { FlatCompat } from '@eslint/eslintrc';
import tsParser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import unusedImports from 'eslint-plugin-unused-imports';

const compat = new FlatCompat();

export default [
  // 不要ファイル・ディレクトリの除外
  {
    ignores: ['dist'],
  },

  // まず推奨設定を extends (react-hooks, @typescript-eslint/recommended, import, jsx-a11y, prettier)
  ...compat.extends(
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ),

  // 追加・上書き設定
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser, // パーサはオブジェクトとして指定
    },
    plugins: {
      // 必要なプラグインを列挙
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    // TypeScript の型チェックを伴う設定 (project) は不要なら削除
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript の unused-vars を無効化して、unused-imports で一元管理
      '@typescript-eslint/no-unused-vars': 'off',

      // 未使用の import を自動削除
      'unused-imports/no-unused-imports': 'error',

      // 未使用の変数は先頭アンダースコア (_var) を許可
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // インポートの並びを自動修正
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          // 空行に関するエラーを出さない
          'newlines-between': 'ignore',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // パス解決エラーが出る場合は off
      'import/no-unresolved': 'off',
    },
  },
];
