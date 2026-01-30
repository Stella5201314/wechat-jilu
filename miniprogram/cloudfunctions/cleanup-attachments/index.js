// One-off 云函数：将 materials 集合中的 attachments 字段清空为 []
// 注意：此函数会修改数据库，请在运行前备份数据或先在测试环境运行。
// 使用方法：在云开发控制台或 CLI 调用该函数（无需参数）
// 返回：{ success: true, updated: n }
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'materials';
const BATCH_SIZE = 100; // 每次读取/更新的文档数

exports.main = async (event) => {
  try {
    // 获取集合总数
    const countResult = await db.collection(COLLECTION).count();
    const total = countResult.total || 0;
    if (total === 0) return { success: true, updated: 0, message: 'no documents' };

    let updated = 0;
    // 分页读取并处理
    for (let skip = 0; skip < total; skip += BATCH_SIZE) {
      const res = await db.collection(COLLECTION).skip(skip).limit(BATCH_SIZE).get();
      const docs = res.data || [];
      // 对于含有 attachments 且数组非空的文档，更新为 []
      const updates = [];
      for (const doc of docs) {
        if (doc.attachments && Array.isArray(doc.attachments) && doc.attachments.length > 0) {
          updates.push({ id: doc._id });
        }
      }

      // 顺序更新（批量更新 API 不支持多 doc 更新一次调用）
      for (const u of updates) {
        try {
          await db.collection(COLLECTION).doc(u.id).update({
            data: {
              attachments: [],
              updated_at: Date.now()
            }
          });
          updated += 1;
        } catch (e) {
          console.warn('update failed for', u.id, e.message || e);
        }
      }
    }

    return { success: true, updated };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'cleanup-attachments failed' };
  }
};