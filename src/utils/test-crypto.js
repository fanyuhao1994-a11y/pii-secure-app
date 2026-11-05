"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("./crypto");
const rawPhone = '13812345678';
// 1. 加密测试
const encrypted = (0, crypto_1.encryptField)(rawPhone);
console.log('加密结果 (存数据库 phone_encrypted):', encrypted);
// 2. 解密测试
const decrypted = (0, crypto_1.decryptField)(encrypted);
console.log('解密结果 (还原明文):', decrypted);
// 3. 盲索引测试
const blindIndex1 = (0, crypto_1.getBlindIndex)('13812345678');
const blindIndex2 = (0, crypto_1.getBlindIndex)(' 13812345678 '); // 验证带空格的情况
console.log('盲索引 (存数据库 phone_blind_index):', blindIndex1);
console.log('索引匹配验证:', blindIndex1 === blindIndex2 ? '成功 (完全对齐)' : '失败');
//# sourceMappingURL=test-crypto.js.map