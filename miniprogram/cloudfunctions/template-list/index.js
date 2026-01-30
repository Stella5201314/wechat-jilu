// 获取模板列表（简单实现）
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'writing_templates';

exports.main = async (event) => {
  try {
    const q = (event.query || '').trim();
    let _query = db.collection(COLLECTION);
    if (q) {
      const reg = db.RegExp({ regexp: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' });
      _query = _query.where(db.command.or([{ name: reg }, { description: reg }, { content: reg }]));
    }
    const res = await _query.orderBy('type', 'asc').limit(100).get();
    return { success: true, data: res.data || [] };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'template-list failed' };
  }
};