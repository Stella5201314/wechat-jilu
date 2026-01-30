// 更新素材（文本-only：忽略任何 attachments 字段）
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'materials';

exports.main = async (event) => {
  try {
    const id = event.id;
    if (!id) return { success: false, message: 'missing id' };

    // 只允许更新文本相关字段
    const update = {};
    ['title','source','tags','content','contentRich','score'].forEach(k => {
      if (typeof event[k] !== 'undefined') update[k] = event[k];
    });
    update.updated_at = Date.now();

    await db.collection(COLLECTION).doc(id).update({ data: update });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'material-update failed' };
  }
};