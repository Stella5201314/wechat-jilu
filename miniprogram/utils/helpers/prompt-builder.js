// 简单 prompt 组装器：将主题、素材和模板拼成一个 prompt 字符串
const buildPrompt = ({ theme = '', materials = [], template = 'default', options = '' } = {}) => {
  let prompt = `写作任务：基于以下主题与参考素材，生成一份结构清晰、引用翔实的${template}草稿。\n\n主题：${theme}\n`;
  if (options) prompt += `附加要求：${options}\n`;
  prompt += `\n参考素材：\n`;
  materials.forEach((m, idx) => {
    prompt += `\n[${idx + 1}] 标题：${m.title || ''}\n来源：${m.source || ''}\n摘录：${(m.content || '').slice(0, 400)}\n`;
  });
  prompt += `\n请给出：\n1）详细提纲\n2）800-1200字正文（包含必要引用与出处）\n3）适用于 AI 调用的精简 prompt\n`;
  return prompt;
};

module.exports = { buildPrompt };