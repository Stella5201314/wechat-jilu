// Prompt 生成器（服务端渲染）
// 支持两种模式：
//  - 本地聚合模板渲染（默认）
//  - 调用外部 LLM（若在云环境变量中配置 EXTERNAL_LLM=1 与 EXTERNAL_LLM_API_KEY）
// 输入： { theme, template, materials: [ {title, source, content, tags} ], options }
// 输出： { success: true, data: { prompt: '...' } }
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init();

function buildLocalPrompt({ theme = '', template = 'default', materials = [] } = {}) {
  let p = `写作任务：请基于下列主题与参考素材，生成一份结构清晰、引用翔实的${template}草稿。\n\n主题：${theme}\n\n参考素材：\n`;
  materials.forEach((m, i) => {
    p += `\n[${i+1}] 标题：${m.title || ''}\n来源：${m.source || ''}\n摘录：${(m.content || '').slice(0, 400)}\n`;
  });
  p += `\n请给出：\n1）详细提纲\n2）800-1200字正文（包含必要引用与出处）\n3）适合用于AI调用的精简 prompt\n`;
  return p;
}

// optional: simple wrapper to call an external LLM via HTTPS POST (示例 for OpenAI-compatible)
// NOTE: if you enable, put EXTERNAL_LLM=1 and EXTERNAL_LLM_API_KEY in 云函数环境变量
function callExternalLLM(apiKey, prompt) {
  const postData = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          // extract assistant content from response (OpenAI chat completion)
          const text = (parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content) || '';
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

exports.main = async (event) => {
  try {
    const theme = event.theme || '';
    const template = event.template || 'official-report';
    const materials = Array.isArray(event.materials) ? event.materials : [];

    const useExternal = !!cloud.getWXContext && (process.env.EXTERNAL_LLM === '1') && process.env.EXTERNAL_LLM_API_KEY;
    const prompt = buildLocalPrompt({ theme, template, materials });

    if (useExternal) {
      // 调用外部 LLM
      const apiKey = process.env.EXTERNAL_LLM_API_KEY;
      try {
        const resp = await callExternalLLM(apiKey, prompt);
        return { success: true, data: { prompt: resp } };
      } catch (e) {
        console.error('external LLM error', e);
        // fallback to local
      }
    }

    // 本地返回
    return { success: true, data: { prompt } };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err && err.message) || 'prompt-generator failed' };
  }
};