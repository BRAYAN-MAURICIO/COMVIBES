import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Cada archivo de src/context exporta su Provider (componente) y el hook que
// lo lee (useAuth, useCart...). Es la convención del proyecto: mantener juntos
// el contexto y su hook evita que se usen por separado. La regla de Fast
// Refresh pide que un archivo exporte solo componentes; con esta lista se
// aceptan esos hooks. El único efecto es que, en desarrollo, editar un
// context recarga la página completa en vez de solo ese componente.
const HOOKS_DE_CONTEXTO = [
  'useAddresses', 'useAuth', 'useCart', 'useCategories', 'useEnvios', 'useFacturas',
  'useMetodosPago', 'useNotifications', 'useOrders', 'usePagos', 'useProducts',
  'useProviders', 'useReviews', 'useSupport', 'useTheme', 'useToast', 'useWishlist',
]

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['src/context/**/*.jsx'],
    rules: {
      'react-refresh/only-export-components': ['error', { allowExportNames: HOOKS_DE_CONTEXTO }],
    },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
])
