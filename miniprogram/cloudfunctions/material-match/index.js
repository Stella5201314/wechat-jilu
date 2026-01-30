// 素材检索与匹配（支持 query / tags / pagination / sorting）
// 返回格式: { success: true, data: [ ... ] }
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const COLLECTION = 'materials';

exports.main = async (event) => {
  try {
    const query = (event.query || '').trim();
    const tags = Array.isArray(event.tags) ? event.tags : [];
    const page = Math.max(parseInt(event.page, 10) || 1, 1);
    const pageSize = Math.min(parseInt(event.pageSize, 10) || 12, 100);
    const skip = (page - 1) * pageSize;

    let _query = db.collection(COLLECTION);

    // text search on title/content using regex (注意性能：建议为常用字段建立索引或使用云上搜索服务)
    if (query) {
      const reg = db.RegExp({ regexp: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' });
      _query = _query.where(db.command.or([
        { title: reg },
        { content: reg },
        { contentRich: reg }
      ]));
    }

    // tags: require that all provided tags are contained (AND)
    if (tags.length) {
      _query = _query.where({ tags: db.command.all(tags) });
    }

    // sort by score desc then updated_at desc
    const res = await _query.orderBy('score', 'desc').orderBy('updated_at', 'desc')
      .skip(skip).limit(pageSize).get();

    return { success: true, data: res.data || [] };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'material-match failed' };
  }
};