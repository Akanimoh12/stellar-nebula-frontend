// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'node_modules',
    'coverage',
    'storybook-static',
    'playwright-report',
    'test-results',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // `_`-prefixed names are intentionally unused everywhere, not only arguments.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // `application` is the ARIA role for widgets that manage their own keyboard
      // input (the 3D canvas); like `tabpanel`, it must be focusable.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'application'], allowExpressionValues: true },
      ],
      // Enforce accessible names for buttons and interactive controls
      'jsx-a11y/control-has-associated-label': [
        'error',
        {
          labelAttributes: ['aria-label', 'aria-labelledby'],
          controlComponents: ['IconButton'],
          depth: 3,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  ...storybook.configs['flat/recommended'],
])
