module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.js'],
  // helpers.js y setup.js son utilidades, no archivos de pruebas
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/helpers.js', '<rootDir>/tests/setup.js'],
  collectCoverageFrom: ['src/**/*.js'],
}
