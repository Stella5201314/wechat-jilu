// 新增素材（文本-only：忽略任何 attachments 字段）
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'materials';

exports.main = async (event) => {
  try {
    const now = Date.now();
    // 只接受文本字段与标签，忽略 attachments
    const payload = {
      title: event.title || '',
      source: event.source || '',
      tags: Array.isArray(event.tags) ? event.tags : [],
      content: event.content || '',
      contentRich: event.contentRich || '',
      // attachments intentionally ignored to enforce text-only policy
      author: event.author || '',
      created_at: now,
      updated_at: now,
      score: event.score || 0
    };
    const res = await db.collection(COLLECTION).add({ data: payload });
    return { success: true, data: { id: res._id } };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'material-create failed' };
  }
};