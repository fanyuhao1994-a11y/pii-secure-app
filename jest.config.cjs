require('dotenv').config();

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  forceExit: true,
  clearMocks: true,
  detectOpenHandles: true,

  // 1. 开启覆盖率收集
  collectCoverage: true,

  // 2. 精确统计核心业务与工具层（排除纯配置/入口文件）
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],

  // 3. 设置合理、可达标的覆盖率门槛
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};