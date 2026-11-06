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

  // 2. 统计范围配置
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/scripts/**',
    '!src/server.ts',
    '!src/**/__tests__/**'
  ],

  // 3. 显式告知 ts-jest 输出 sourceMap
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          sourceMap: true
        }
      }
    ]
  },

  // 4. 覆盖率硬性门槛
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};