// 简单的智能标签推荐：
//  - 优先尝试从预置标签库中匹配关键词
//  - 如果云环境配置了 EXTERNAL_LLM_API_KEY 会尝试调用 LLM（可选）
// 输入： { text: '...' }
// 输出： { success: true, data: [ { tag: '政策', score: 0.92 }, ... ] }
const cloud = require('wx-server-sdk');
cloud.init();

const TAG_LIB = [
  { tag: '政策', keys: ['政策', '规划', '文件', '条例', '办法'] },
  { tag: '案例', keys: ['案例', '实践', '试点', '经验'] },
  { tag: '产业', keys: ['产业', '经济', '行业', '企业'] },
  { tag: '数据', keys: ['数据', '统计', '指标', '数值'] },
  { tag: '方法论', keys: ['方法', '办法', '路径', '手段'] }
];

// 轻量关键词匹配
function candidateTagsFromText(text = '') {
  const lower = (text || '').toLowerCase();
  const results = [];
  for (const entry of TAG_LIB) {
    let score = 0;
    for (const k of entry.keys) {
      if (lower.indexOf(k.toLowerCase()) !== -1) score += 1;
    }
    if (score > 0) results.push({ tag: entry.tag, score: Math.min(1, score / entry.keys.length) });
  }
  // sort by score desc
  results.sort((a,b) => b.score - a.score);
  return results;
}

exports.main = async (event) => {
  try {
    const text = event.text || '';
    if (!text) return { success: true, data: [] };

    // local heuristic
    const local = candidateTagsFromText(text);
    if (local && local.length) return { success: true, data: local };

    // 如果没有匹配，返回 top generic tags
    return { success: true, data: TAG_LIB.map(t => ({ tag: t.tag, score: 0.2 })) };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'ai-tag-suggestion failed' };
  }
};