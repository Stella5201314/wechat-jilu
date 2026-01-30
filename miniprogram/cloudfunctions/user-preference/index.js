// 简单的用户偏好接口：支持 action = 'sync' | 'get' | 'set'
// collection: user_profiles
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'user_profiles';

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const uid = wxContext.OPENID || (event.userId) || null;
    if (!uid) return { success: false, message: 'no user id' };

    const action = event.action || 'get';
    if (action === 'get') {
      const r = await db.collection(COLLECTION).where({ openid: uid }).limit(1).get();
      return { success: true, data: (r.data && r.data[0]) || {} };
    } else if (action === 'set') {
      const payload = event.payload || {};
      const r = await db.collection(COLLECTION).where({ openid: uid }).limit(1).get();
      if (r.data && r.data.length) {
        await db.collection(COLLECTION).doc(r.data[0]._id).update({ data: { ...payload, updated_at: Date.now() } });
      } else {
        await db.collection(COLLECTION).add({ data: { openid: uid, ...payload, created_at: Date.now(), updated_at: Date.now() } });
      }
      return { success: true };
    } else if (action === 'sync') {
      // 示例：触发一次偏好学习或同步（可扩展为异步任务队列）
      // 这里仅返回 success，前端可进一步调用 get 获取最新数据
      return { success: true, data: {} };
    } else {
      return { success: false, message: 'unknown action' };
    }
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'user-preference failed' };
  }
};