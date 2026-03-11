module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { customExportConditions: [''] },
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverage: true,
  coverageReporters: ['lcov', 'text'],
  coverageDirectory: 'coverage'
};
