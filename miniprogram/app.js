// miniprogram/app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false
  },

  onLaunch: function() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-7grm9g6829d6405e', // 替换为你的云环境ID
        traceUser: true,
      })
      
      // 获取用户openid
      this.getOpenId()
    }
    
    // 检查新版本
    this.checkUpdate()
  },

  // 获取用户openid
  getOpenId: function() {
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        this.globalData.openid = res.result.openid
        console.log('获取openid成功:', res.result.openid)
      },
      fail: err => {
        console.error('获取openid失败:', err)
      }
    })
  },

  // 检查小程序更新
  checkUpdate: function() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate(function(res) {
        console.log('检查更新结果:', res.hasUpdate)
      })
      
      updateManager.onUpdateReady(function() {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: function(res) {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      
      updateManager.onUpdateFailed(function() {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      })
    }
  },

  // 全局错误处理
  onError: function(msg) {
    console.error('小程序错误:', msg)
    // 可以上报错误到服务器
  }
})