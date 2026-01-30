// 小程序入口
App({
  onLaunch(options) {
    // 初始化云能力（如果你启用了云开发）
     // 初始化云开发
     if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-7grm9g6829d6405e', // 替换为你的云环境ID
        traceUser: true,
      })
      
      
    }

    

    // 可在此做全局数据加载（例如读取本地缓存的用户信息或偏好）
    const userInfo = wx.getStorageSync('userInfo') || null;
    this.globalData.userInfo = userInfo;

    // 简单的版本与环境信息（可在 CI 中替换）
    this.globalData.env = {
      mode: 'development',
      appId: 'wx7927879c07e6a671'
    };

    // 若需根据 options.scene 处理扫码或小程序参数可在此处处理
    this._handleLaunchOptions(options);
  },

  _handleLaunchOptions(options = {}) {
    // 例如：options.query 可包含从外部打开的小程序参数（分享、二维码等）
    if (options && options.query) {
      this.globalData.launchQuery = options.query;
    }
  },

  globalData: {
    userInfo: null,
    launchQuery: null,
    env: {}
  },

  // 供页面调用的简单工具：获取用户信息（若未登录则触发 getUserProfile）
  async ensureUserProfile() {
    if (this.globalData.userInfo) return this.globalData.userInfo;
    return new Promise((resolve, reject) => {
      // 推荐使用 wx.getUserProfile 获取用户信息（需要用户交互）
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          this.globalData.userInfo = res.userInfo;
          wx.setStorageSync('userInfo', res.userInfo);
          resolve(res.userInfo);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
});