import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '[A-Z_]', argsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' }],
    },
  },
  {
    // Intentional mixes of helpers/constants + components (contexts, shared
    // widget kits, module registries). Splitting them would churn dozens of
    // import sites for no runtime benefit — HMR falls back to full reload
    // for these files only.
    files: [
      'src/context/**',
      'src/components/Common.jsx',
      'src/components/NotificationToast.jsx',
      'src/components/PremiumRoleSelector.jsx',
      'src/components/ambulance/AmbulanceSidebar.jsx',
      'src/components/ambulance/shared/**',
      'src/components/gov/MissionBoards.jsx',
      'src/components/government/shared/**',
      'src/pages/public/PublicShell.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
