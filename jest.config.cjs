require('dotenv').config();

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  forceExit: true,
  clearMocks: true,
  detectOpenHandles: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }]
  },

  // 1. 开启测试覆盖率收集
  collectCoverage: true,

  // 2. 指定统计范围（排除类型文件与脚本）
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/scripts/**',
    '!src/server.ts'
  ],

  // 3. 设置覆盖率通过门槛
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};