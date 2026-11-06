require('dotenv').config();

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  forceExit: true,
  clearMocks: true,
  detectOpenHandles: true,

  // 1. 指定使用 babel (Istanbul) 收集 TypeScript 覆盖率，解决 0% 问题
  coverageProvider: 'babel',

  // 2. 开启测试覆盖率收集
  collectCoverage: true,

  // 3. 使用 <rootDir> 锚定源文件，并排除测试文件本身与脚本
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/scripts/**',
    '!<rootDir>/src/server.ts',
    '!<rootDir>/src/**/__tests__/**'
  ],

  // 4. 设置覆盖率通过门槛
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};