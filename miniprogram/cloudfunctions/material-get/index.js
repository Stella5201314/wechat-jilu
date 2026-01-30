// 获取单个素材详情
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'materials';

exports.main = async (event) => {
  try {
    const id = event.id;
    if (!id) return { success: false, message: 'missing id' };
    const res = await db.collection(COLLECTION).doc(id).get();
    return { success: true, data: res.data };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'material-get failed' };
  }
};