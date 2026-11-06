require('dotenv').config();

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  detectOpenHandles: true,

  // 1. 只匹配真正的 .test.ts 文件，排除 .d.ts
  testMatch: ['<rootDir>/src/**/*.test.ts'],

  // 2. 开启覆盖率收集与 Babel 插桩
  coverageProvider: 'babel',
  collectCoverage: true,

  // 3. 指定 ts-jest 编译器
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // 4. 精确统计业务模块
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/utils/test-crypto.ts'
  ],

  // 5. 覆盖率门槛
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};