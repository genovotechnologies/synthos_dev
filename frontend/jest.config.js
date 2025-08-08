/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(@testing-library|@babel|jest-runtime)/)',
  ],
  // Allow tests to pass even if no tests are found
  passWithNoTests: true,
  // Set coverage threshold to 0 for now
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
}

module.exports = config 