import 'dotenv/config';
import { config } from '../src/config/env';
import { db } from '../src/db';
import { decryptPii, encryptPii, createBlindIndex } from '../src/utils/crypto';

const BATCH_SIZE = 100;
const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

interface UserPiiRow {
  id: string;
  phone_encrypted: string;
  email_encrypted: string;
}

async function rotateKeys() {
  const targetEncVersion = config.encryptionKeyRing.activeVersion;
  const targetSaltVersion = config.blindIndexSaltRing.activeVersion;
  const targetPrefix = `${targetEncVersion}:%`;

  console.log('==================================================');
  console.log(`🔐 启动 PII 密钥与盲索引轮换任务`);
  console.log(`   - 目标加密密钥版本 : ${targetEncVersion}`);
  console.log(`   - 目标盲索引盐值版本: ${targetSaltVersion}`);
  console.log(`   - 运行模式         : ${isDryRun ? '🧪 DRY-RUN 预演模式（不修改数据库）' : '🚀 正式写入模式'}`);
  if (isForce) {
    console.log(`   - 强制全量重算     : 已开启 (--force)`);
  }
  console.log('==================================================\n');

  let totalProcessed = 0;
  let lastSeenId = '00000000-0000-0000-0000-000000000000';

  while (true) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 筛选尚未升级到目标版本的记录（若加 --force 则全量重算，用于仅轮换盲索引盐值的场景）
      const whereClause = isForce
        ? `WHERE id > $2`
        : `WHERE id > $2 AND (phone_encrypted NOT LIKE $1 OR email_encrypted NOT LIKE $1)`;

      const res = await client.query<UserPiiRow>(
        `SELECT id, phone_encrypted, email_encrypted
         FROM users
         ${whereClause}
         ORDER BY id ASC
         LIMIT $3
         FOR UPDATE SKIP LOCKED`,
        [targetPrefix, lastSeenId, BATCH_SIZE]
      );

      if (res.rows.length === 0) {
        await client.query('COMMIT');
        break;
      }

      for (const row of res.rows) {
        lastSeenId = row.id;

        // 1. 使用密钥环中的对应旧版本密钥解密出明文
        const plainPhone = decryptPii(row.phone_encrypted);
        const plainEmail = decryptPii(row.email_encrypted);

        // 2. 使用当前激活版本（如 v2）重新加密并重算盲索引
        const newPhoneEncrypted = encryptPii(plainPhone);
        const newEmailEncrypted = encryptPii(plainEmail);
        const newPhoneBlindIndex = createBlindIndex(plainPhone);
        const newEmailBlindIndex = createBlindIndex(plainEmail);

        // 3. 仅在非预演模式下写入数据库
        if (!isDryRun) {
          await client.query(
            `UPDATE users
             SET phone_encrypted = $1,
                 phone_blind_index = $2,
                 email_encrypted = $3,
                 email_blind_index = $4
             WHERE id = $5`,
            [
              newPhoneEncrypted,
              newPhoneBlindIndex,
              newEmailEncrypted,
              newEmailBlindIndex,
              row.id,
            ]
          );
        }

        totalProcessed++;
      }

      await client.query('COMMIT');
      console.log(`✅ 已${isDryRun ? '校验' : '轮换'} ${totalProcessed} 条用户记录...`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ 批次处理失败，已回滚当前事务:', error);
      process.exitCode = 1;
      break;
    } finally {
      client.release();
    }
  }

  console.log('\n==================================================');
  if (isDryRun) {
    console.log(`🧪 预演完成！共检测到 ${totalProcessed} 条待轮换记录，所有旧密文均可正常解密。`);
    console.log(`👉 确认无误后，请去掉 --dry-run 参数正式执行轮换。`);
  } else {
    console.log(`🎉 密钥轮换全部完成！共成功升级 ${totalProcessed} 条用户记录至 ${targetEncVersion}。`);
  }
  console.log('==================================================');

  await db.end();
}

rotateKeys().catch((err) => {
  console.error('致命错误:', err);
  process.exit(1);
});