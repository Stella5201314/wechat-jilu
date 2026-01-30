// 删除素材
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'materials';

exports.main = async (event) => {
  try {
    const id = event.id;
    if (!id) return { success: false, message: 'missing id' };
    await db.collection(COLLECTION).doc(id).remove();
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'material-delete failed' };
  }
};