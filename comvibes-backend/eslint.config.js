const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  { ignores: ['node_modules/', 'coverage/', 'uploads/', 'backup_uploads/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Los parámetros sin uso que empiezan con _ son intencionales (p. ej. next
      // en los middlewares de error de Express, que debe declararse aunque no se use).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
]
