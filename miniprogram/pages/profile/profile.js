// pages/profile/profile.js

const app = getApp();
const dateUtils = require('../../utils/helpers/date-utils');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 用户信息
    userInfo: {},
    hasLogin: false,
    isVIP: false,
    vipExpireDate: '',
    
    // 统计信息
    statistics: {
      materialCount: 0,
      materialTrend: 0,
      usageCount: 0,
      usageTrend: 0,
      tagCount: 0,
      tagTrend: 0,
      writingCount: 0,
      writingTrend: 0
    },
    lastUpdateTime: '',
    
    // 存储信息
    storage: {
      used: '0 MB',
      total: '1024 MB',
      usedBytes: 0,
      totalBytes: 1073741824, // 1GB
      percent: 0,
      status: 'normal',
      materials: '0 MB',
      materialsPercent: 0,
      templates: '0 MB',
      templatesPercent: 0,
      cache: '0 MB',
      cachePercent: 0,
      others: '0 MB',
      othersPercent: 0
    },
    
    // 设置数据
    writingTypes: ['工作报告', '方案计划', '宣传文案', '学术文章', '邮件通知', '演讲稿', '其他'],
    audienceTypes: ['上级领导', '同级同事', '下属团队', '公众读者', '客户伙伴', '专家学者', '其他'],
    styleTypes: ['严谨正式', '生动活泼', '简洁有力', '专业深度', '亲和温暖', '创新前瞻', '其他'],
    defaultWritingType: 0,
    defaultAudienceType: 0,
    defaultStyleType: 0,
    promptDetailLevel: 3,
    defaultMaterialCount: 5,
    
    // 通知设置
    notification: {
      collectReminder: true,
      organizeReminder: true,
      writingNotification: true,
      updateNotification: true,
      timeRangeStart: '09:00',
      timeRangeEnd: '21:00'
    },
    
    // 隐私设置
    privacy: {
      cloudSync: true,
      anonymousShare: false,
      contributeData: true,
      autoCleanup: 0,
      exportFormat: 0
    },
    cleanupOptions: ['永不清理', '3个月', '6个月', '1年'],
    exportFormats: ['TXT文本', 'JSON数据', 'Markdown', 'Word文档'],
    
    // 应用信息
    appVersion: '1.0.0',
    appBuild: '20240101',
    
    // 模态框状态
    showLoginModal: false,
    showSettingsModal: false,
    showClearCacheModal: false,
    showSuccessToast: false,
    
    // 设置模态框
    settingsModalTitle: '',
    settingsType: '', // 'writing' | 'notification' | 'privacy'
    
    // 登录相关
    agreeAgreement: false,
    
    // 缓存清理
    isClearingCache: false,
    cacheSizes: {
      temp: 0,
      logs: 0,
      images: 0,
      total: 0
    },
    
    // 成功提示
    successMessage: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('个人中心页面加载');
    
    // 初始化数据
    this.initUserInfo();
    this.initStatistics();
    this.initSettings();
    this.initStorageInfo();
    this.initCacheInfo();
    
    // 获取应用版本
    this.getAppVersion();
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 刷新统计数据
    this.refreshStatistics();
    
    // 刷新存储信息
    this.refreshStorageInfo();
  },

  /**
   * 初始化用户信息
   */
  initUserInfo: function() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const hasLogin = !!userInfo.nickName;
    const isVIP = wx.getStorageSync('isVIP') || false;
    const vipExpireDate = wx.getStorageSync('vipExpireDate') || '';
    
    this.setData({
      userInfo: userInfo,
      hasLogin: hasLogin,
      isVIP: isVIP,
      vipExpireDate: vipExpireDate
    });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function() {
    const hasLogin = this.data.hasLogin;
    
    // 如果未登录且超过3天未显示登录弹窗，显示登录引导
    if (!hasLogin) {
      const lastShowTime = wx.getStorageSync('lastLoginModalTime') || 0;
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      
      if (now - lastShowTime > threeDays) {
        setTimeout(() => {
          this.showLoginModal();
          wx.setStorageSync('lastLoginModalTime', now);
        }, 2000);
      }
    }
  },

  /**
   * 初始化统计数据
   */
  initStatistics: function() {
    const stats = wx.getStorageSync('userStatistics') || {};
    const lastUpdateTime = stats.lastUpdateTime || new Date().getTime();
    
    this.setData({
      statistics: {
        materialCount: stats.materialCount || 0,
        materialTrend: stats.materialTrend || 0,
        usageCount: stats.usageCount || 0,
        usageTrend: stats.usageTrend || 0,
        tagCount: stats.tagCount || 0,
        tagTrend: stats.tagTrend || 0,
        writingCount: stats.writingCount || 0,
        writingTrend: stats.writingTrend || 0
      },
      lastUpdateTime: dateUtils.formatRelativeTime(lastUpdateTime)
    });
  },

  /**
   * 刷新统计数据
   */
  refreshStatistics: function() {
    if (!this.data.hasLogin) return;
    
    wx.showLoading({
      title: '更新中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'getUserStatistics',
      data: {}
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const stats = res.result.statistics;
        const lastUpdateTime = Date.now();
        
        // 保存到本地
        wx.setStorageSync('userStatistics', {
          ...stats,
          lastUpdateTime: lastUpdateTime
        });
        
        this.setData({
          statistics: stats,
          lastUpdateTime: dateUtils.formatRelativeTime(lastUpdateTime)
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('获取统计数据失败:', err);
    });
  },

  /**
   * 初始化设置
   */
  initSettings: function() {
    const settings = wx.getStorageSync('userSettings') || {};
    
    // 写作设置
    const writingSettings = settings.writing || {};
    this.setData({
      defaultWritingType: writingSettings.defaultWritingType || 0,
      defaultAudienceType: writingSettings.defaultAudienceType || 0,
      defaultStyleType: writingSettings.defaultStyleType || 0,
      promptDetailLevel: writingSettings.promptDetailLevel || 3,
      defaultMaterialCount: writingSettings.defaultMaterialCount || 5
    });
    
    // 通知设置
    const notificationSettings = settings.notification || {};
    this.setData({
      'notification.collectReminder': notificationSettings.collectReminder !== false,
      'notification.organizeReminder': notificationSettings.organizeReminder !== false,
      'notification.writingNotification': notificationSettings.writingNotification !== false,
      'notification.updateNotification': notificationSettings.updateNotification !== false,
      'notification.timeRangeStart': notificationSettings.timeRangeStart || '09:00',
      'notification.timeRangeEnd': notificationSettings.timeRangeEnd || '21:00'
    });
    
    // 隐私设置
    const privacySettings = settings.privacy || {};
    this.setData({
      'privacy.cloudSync': privacySettings.cloudSync !== false,
      'privacy.anonymousShare': privacySettings.anonymousShare || false,
      'privacy.contributeData': privacySettings.contributeData !== false,
      'privacy.autoCleanup': privacySettings.autoCleanup || 0,
      'privacy.exportFormat': privacySettings.exportFormat || 0
    });
  },

  /**
   * 初始化存储信息
   */
  initStorageInfo: function() {
    // 获取本地存储信息
    const storageInfo = wx.getStorageInfoSync();
    const usedSize = storageInfo.currentSize || 0;
    const totalSize = storageInfo.limitSize || 10240; // 10MB默认值
    
    // 计算百分比
    const percent = Math.min(Math.round((usedSize / totalSize) * 100), 100);
    
    // 获取存储详情
    this.getStorageDetails(usedSize, totalSize, percent);
  },

  /**
   * 获取存储详情
   */
  getStorageDetails: function(usedSize, totalSize, percent) {
    const usedMB = (usedSize / 1024).toFixed(2);
    const totalMB = (totalSize / 1024).toFixed(2);
    
    // 模拟各部分占比（实际应从数据库统计）
    const materialsPercent = 60;
    const templatesPercent = 20;
    const cachePercent = 15;
    const othersPercent = 5;
    
    this.setData({
      storage: {
        used: `${usedMB} MB`,
        total: `${totalMB} MB`,
        usedBytes: usedSize * 1024,
        totalBytes: totalSize * 1024,
        percent: percent,
        status: percent > 90 ? 'danger' : percent > 70 ? 'warning' : 'normal',
        materials: `${(usedSize * materialsPercent / 100 / 1024).toFixed(2)} MB`,
        materialsPercent: materialsPercent,
        templates: `${(usedSize * templatesPercent / 100 / 1024).toFixed(2)} MB`,
        templatesPercent: templatesPercent,
        cache: `${(usedSize * cachePercent / 100 / 1024).toFixed(2)} MB`,
        cachePercent: cachePercent,
        others: `${(usedSize * othersPercent / 100 / 1024).toFixed(2)} MB`,
        othersPercent: othersPercent
      }
    });
  },

  /**
   * 刷新存储信息
   */
  refreshStorageInfo: function() {
    this.initStorageInfo();
  },

  /**
   * 初始化缓存信息
   */
  initCacheInfo: function() {
    // 模拟缓存数据（实际应从文件系统统计）
    this.setData({
      cacheSizes: {
        temp: 12.5,
        logs: 3.2,
        images: 8.7,
        total: 24.4
      }
    });
  },

  /**
   * 获取应用版本
   */
  getAppVersion: function() {
    const accountInfo = wx.getAccountInfoSync();
    const version = accountInfo.miniProgram.version || '1.0.0';
    
    this.setData({
      appVersion: version
    });
  },

  /**
   * 事件处理函数
   */
  
  // 登录
  login: function() {
    this.showLoginModal();
  },

  // 显示登录模态框
  showLoginModal: function() {
    this.setData({
      showLoginModal: true
    });
  },

  // 隐藏登录模态框
  hideLoginModal: function() {
    this.setData({
      showLoginModal: false,
      agreeAgreement: false
    });
  },

  // 获取用户信息
  onGetUserInfo: function(e) {
    if (!this.data.agreeAgreement) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    const userInfo = e.detail.userInfo;
    if (userInfo) {
      // 保存用户信息
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('hasLogin', true);
      
      // 调用云函数注册用户
      wx.cloud.callFunction({
        name: 'registerUser',
        data: { userInfo: userInfo }
      }).then(res => {
        if (res.result && res.result.success) {
          // 登录成功
          this.setData({
            userInfo: userInfo,
            hasLogin: true,
            showLoginModal: false
          });
          
          this.showSuccessToast('登录成功');
          
          // 刷新数据
          this.refreshStatistics();
          
          // 设置全局登录状态
          app.globalData.hasLogin = true;
        }
      }).catch(err => {
        console.error('注册用户失败:', err);
        wx.showToast({
          title: '登录失败',
          icon: 'error',
          duration: 2000
        });
      });
    }
  },

  // 手机号登录
  loginWithPhone: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 邮箱登录
  loginWithEmail: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 协议同意状态变化
  onAgreementChange: function(e) {
    this.setData({
      agreeAgreement: e.detail.value
    });
  },

  // 查看用户协议
  viewUserAgreement: function() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=https://example.com/user-agreement'
    });
  },

  // 查看隐私政策
  viewPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=https://example.com/privacy-policy'
    });
  },

  // 跳过登录
  skipLogin: function() {
    this.hideLoginModal();
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后将无法同步数据到云端',
      confirmText: '退出',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('hasLogin');
          wx.removeStorageSync('userStatistics');
          
          this.setData({
            userInfo: {},
            hasLogin: false,
            isVIP: false,
            statistics: {
              materialCount: 0,
              materialTrend: 0,
              usageCount: 0,
              usageTrend: 0,
              tagCount: 0,
              tagTrend: 0,
              writingCount: 0,
              writingTrend: 0
            }
          });
          
          app.globalData.hasLogin = false;
          
          this.showSuccessToast('已退出登录');
        }
      }
    });
  },

  // 查看素材统计
  viewMaterialStats: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics?type=materials'
    });
  },

  // 查看使用统计
  viewUsageStats: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics?type=usage'
    });
  },

  // 查看标签统计
  viewTagStats: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics?type=tags'
    });
  },

  // 查看写作统计
  viewWritingStats: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics?type=writing'
    });
  },

  // 跳转到详细统计
  gotoStatistics: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  // 编辑写作设置
  editWritingSettings: function() {
    this.setData({
      showSettingsModal: true,
      settingsModalTitle: '写作偏好设置',
      settingsType: 'writing'
    });
  },

  // 管理标签
  manageTags: function() {
    wx.navigateTo({
      url: '/pages/tag/tag'
    });
  },

  // 管理分类
  manageCategories: function() {
    wx.navigateTo({
      url: '/pages/category/category'
    });
  },

  // 管理模板
  manageTemplates: function() {
    wx.navigateTo({
      url: '/pages/template/template'
    });
  },

  // 编辑通知设置
  editNotificationSettings: function() {
    this.setData({
      showSettingsModal: true,
      settingsModalTitle: '通知设置',
      settingsType: 'notification'
    });
  },

  // 编辑隐私设置
  editPrivacySettings: function() {
    this.setData({
      showSettingsModal: true,
      settingsModalTitle: '隐私设置',
      settingsType: 'privacy'
    });
  },

  // 隐藏设置模态框
  hideSettingsModal: function() {
    this.setData({
      showSettingsModal: false,
      settingsType: ''
    });
  },

  // 保存设置
  saveSettings: function() {
    const settingsType = this.data.settingsType;
    let settings = wx.getStorageSync('userSettings') || {};
    
    if (settingsType === 'writing') {
      settings.writing = {
        defaultWritingType: this.data.defaultWritingType,
        defaultAudienceType: this.data.defaultAudienceType,
        defaultStyleType: this.data.defaultStyleType,
        promptDetailLevel: this.data.promptDetailLevel,
        defaultMaterialCount: this.data.defaultMaterialCount
      };
    } else if (settingsType === 'notification') {
      settings.notification = this.data.notification;
    } else if (settingsType === 'privacy') {
      settings.privacy = this.data.privacy;
    }
    
    wx.setStorageSync('userSettings', settings);
    
    this.hideSettingsModal();
    this.showSuccessToast('设置已保存');
  },

  // 写作类型变化
  onWritingTypeChange: function(e) {
    this.setData({
      defaultWritingType: e.detail.value
    });
  },

  // 读者类型变化
  onAudienceTypeChange: function(e) {
    this.setData({
      defaultAudienceType: e.detail.value
    });
  },

  // 风格类型变化
  onStyleTypeChange: function(e) {
    this.setData({
      defaultStyleType: e.detail.value
    });
  },

  // 指令详细度变化
  onPromptDetailChange: function(e) {
    this.setData({
      promptDetailLevel: e.detail.value
    });
  },

  // 素材数量变化
  onMaterialCountChange: function(e) {
    this.setData({
      defaultMaterialCount: e.detail.value
    });
  },

  // 收集提醒变化
  onCollectReminderChange: function(e) {
    this.setData({
      'notification.collectReminder': e.detail.value
    });
  },

  // 整理提醒变化
  onOrganizeReminderChange: function(e) {
    this.setData({
      'notification.organizeReminder': e.detail.value
    });
  },

  // 写作通知变化
  onWritingNotificationChange: function(e) {
    this.setData({
      'notification.writingNotification': e.detail.value
    });
  },

  // 更新通知变化
  onUpdateNotificationChange: function(e) {
    this.setData({
      'notification.updateNotification': e.detail.value
    });
  },

  // 时间范围开始变化
  onTimeRangeStartChange: function(e) {
    const startTime = e.detail.value;
    const endTime = this.data.notification.timeRangeEnd;
    
    this.setData({
      'notification.timeRangeStart': startTime
    });
  },

  // 云同步变化
  onCloudSyncChange: function(e) {
    this.setData({
      'privacy.cloudSync': e.detail.value
    });
  },

  // 匿名分享变化
  onAnonymousShareChange: function(e) {
    this.setData({
      'privacy.anonymousShare': e.detail.value
    });
  },

  // 贡献数据变化
  onContributeDataChange: function(e) {
    this.setData({
      'privacy.contributeData': e.detail.value
    });
  },

  // 自动清理变化
  onAutoCleanupChange: function(e) {
    this.setData({
      'privacy.autoCleanup': e.detail.value
    });
  },

  // 导出格式变化
  onExportFormatChange: function(e) {
    this.setData({
      'privacy.exportFormat': e.detail.value
    });
  },

  // 查看账号信息
  viewAccountInfo: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 查看安全设置
  viewSecurity: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 查看订阅管理
  viewSubscription: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 清理缓存
  clearCache: function() {
    this.setData({
      showClearCacheModal: true
    });
  },

  // 隐藏清理缓存模态框
  hideClearCacheModal: function() {
    this.setData({
      showClearCacheModal: false
    });
  },

  // 确认清理缓存
  confirmClearCache: function() {
    this.setData({
      isClearingCache: true
    });
    
    // 模拟清理过程
    setTimeout(() => {
      // 实际清理缓存操作
      wx.clearStorageSync();
      
      this.setData({
        isClearingCache: false,
        showClearCacheModal: false
      });
      
      this.showSuccessToast('缓存清理完成');
      
      // 刷新存储信息
      this.refreshStorageInfo();
    }, 1500);
  },

  // 导出所有数据
  exportAllData: function() {
    if (!this.data.hasLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.showLoading({
      title: '准备导出...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'exportAllData',
      data: {
        format: this.data.privacy.exportFormat
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const fileUrl = res.result.fileUrl;
        
        wx.downloadFile({
          url: fileUrl,
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              wx.saveFileToDisk({
                filePath: downloadRes.tempFilePath,
                success: () => {
                  this.showSuccessToast('数据导出成功');
                },
                fail: (err) => {
                  console.error('保存文件失败:', err);
                  wx.showToast({
                    title: '保存失败',
                    icon: 'error',
                    duration: 2000
                  });
                }
              });
            }
          },
          fail: (err) => {
            console.error('下载文件失败:', err);
            wx.showToast({
              title: '下载失败',
              icon: 'error',
              duration: 2000
            });
          }
        });
      } else {
        wx.showToast({
          title: '导出失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('导出数据失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  // 扩容空间
  upgradeStorage: function() {
    wx.showModal({
      title: '扩容存储空间',
      content: '升级到VIP可获得10GB云存储空间',
      confirmText: '立即升级',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/vip/vip'
          });
        }
      }
    });
  },

  // 显示使用指南
  showUserGuide: function() {
    wx.navigateTo({
      url: '/pages/guide/guide?force=true'
    });
  },

  // 显示视频教程
  showTutorials: function() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=https://example.com/tutorials'
    });
  },

  // 查看常见问题
  viewFAQ: function() {
    wx.navigateTo({
      url: '/pages/faq/faq'
    });
  },

  // 意见反馈
  feedback: function() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  // 联系我们
  contactUs: function() {
    wx.showModal({
      title: '联系我们',
      content: '客服邮箱: support@lingcaizhiku.com\n客服时间: 工作日 9:00-18:00',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 关于应用
  aboutApp: function() {
    wx.showModal({
      title: '关于灵材智库',
      content: '版本: ' + this.data.appVersion + '\n\n灵材智库 - 您的专属AI写作策源地\n\n将零散阅读转化为系统知识\n将灵感碎片编织成专业文稿',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 检查更新
  checkUpdate: function() {
    const updateManager = wx.getUpdateManager();
    
    updateManager.onCheckForUpdate(function(res) {
      // 请求完新版本信息的回调
      console.log('检查更新结果:', res.hasUpdate);
    });
    
    updateManager.onUpdateReady(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: function(res) {
          if (res.confirm) {
            // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
            updateManager.applyUpdate();
          }
        }
      });
    });
    
    updateManager.onUpdateFailed(function() {
      // 新版本下载失败
      wx.showToast({
        title: '更新失败',
        icon: 'error',
        duration: 2000
      });
    });
  },

  // 快捷反馈
  quickFeedback: function() {
    wx.navigateTo({
      url: '/pages/feedback/feedback?type=quick'
    });
  },

  // 分享应用
  shareApp: function() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 支持我们
  supportUs: function() {
    wx.navigateTo({
      url: '/pages/donate/donate'
    });
  },

  // 显示成功提示
  showSuccessToast: function(message) {
    this.setData({
      showSuccessToast: true,
      successMessage: message
    });
    
    setTimeout(() => {
      this.setData({
        showSuccessToast: false
      });
    }, 2000);
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return {
      title: '灵材智库 - AI写作助手',
      path: '/pages/profile/profile',
      imageUrl: '/assets/images/share-profile.jpg'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline: function() {
    return {
      title: '灵材智库 - 您的专属AI写作策源地',
      query: '',
      imageUrl: '/assets/images/share-timeline.jpg'
    };
  }
});