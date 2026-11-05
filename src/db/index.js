"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('配置错误: 环境变量 DATABASE_URL 未定义');
}
exports.db = new pg_1.Pool({
    connectionString,
    // 数据库连接池配置
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
//# sourceMappingURL=index.js.map