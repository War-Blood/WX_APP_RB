// jest.config.js - Jest 测试配置
module.exports = {
  testEnvironment: 'node',

  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.js',
  ],

  collectCoverage: true,
  coverageDirectory: 'reports/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  collectCoverageFrom: [
    'miniapp/utils/**/*.js',
    'cloudfunctions/common/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/tests/**',
  ],

  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  moduleDirectories: ['node_modules', '.'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
