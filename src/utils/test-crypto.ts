import { encryptField, decryptField, getBlindIndex } from './crypto';

const rawPhone = '13812345678';

// 1. 加密测试
const encrypted = encryptField(rawPhone);
console.log('加密结果 (存数据库 phone_encrypted):', encrypted);

// 2. 解密测试
const decrypted = decryptField(encrypted);
console.log('解密结果 (还原明文):', decrypted);

// 3. 盲索引测试
const blindIndex1 = getBlindIndex('13812345678');
const blindIndex2 = getBlindIndex(' 13812345678 '); // 验证带空格的情况
console.log('盲索引 (存数据库 phone_blind_index):', blindIndex1);
console.log('索引匹配验证:', blindIndex1 === blindIndex2 ? '成功 (完全对齐)' : '失败');