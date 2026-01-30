// 应用模板：返回模板详情或根据模板生成默认输出（这里仅返回模板内容）
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'writing_templates';

exports.main = async (event) => {
  try {
    const id = event.id;
    if (!id) return { success: false, message: 'missing id' };
    const res = await db.collection(COLLECTION).doc(id).get();
    return { success: true, data: res.data };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'template-apply failed' };
  }
};