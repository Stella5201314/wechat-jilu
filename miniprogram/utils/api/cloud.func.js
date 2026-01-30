// miniprogram/utils/api/cloud.func.js
const call = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    if (!wx || !wx.cloud) {
      return reject(new Error('wx.cloud 未初始化，请在 app.js 中调用 wx.cloud.init() 并确保 env 正确'));
    }
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('云函数调用超时'));
      }
    }, 30000);

    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(res.result);
      },
      fail: (err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
};

module.exports = { call };