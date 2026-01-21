// pages/guide/guide.js

const app = getApp();

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 引导状态
    currentIndex: 0,
    totalPages: 6,
    dontShowAgain: false,
    
    // 引导完成状态
    hasCompletedGuide: false,
    
    // 动画状态
    isAnimating: false,
    animationDirection: 'next'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // 检查是否需要显示引导页
    const hasSeenGuide = wx.getStorageSync('hasSeenGuide') || false;
    const forceShow = options.force === 'true';
    
    if (hasSeenGuide && !forceShow) {
      // 已经看过引导，直接跳转到首页
      this.redirectToHome();
      return;
    }
    
    // 加载用户设置
    const dontShowAgain = wx.getStorageSync('dontShowGuideAgain') || false;
    
    this.setData({
      hasCompletedGuide: hasSeenGuide,
      dontShowAgain: dontShowAgain
    });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '使用引导'
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 页面显示时确保导航栏颜色
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#1890ff',
      animation: {
        duration: 300,
        timingFunc: 'easeIn'
      }
    });
  },

  /**
   * 跳转到首页
   */
  redirectToHome: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 轮播图变化事件
   */
  onSwiperChange: function(e) {
    const current = e.detail.current;
    const source = e.detail.source;
    
    // 如果是手动滑动，更新当前索引
    if (source === 'touch') {
      this.setData({
        currentIndex: current,
        animationDirection: current > this.data.currentIndex ? 'next' : 'prev'
      });
    }
  },

  /**
   * 上一页
   */
  prevPage: function() {
    if (this.data.currentIndex === 0 || this.data.isAnimating) {
      return;
    }
    
    this.setData({
      isAnimating: true,
      animationDirection: 'prev'
    });
    
    const newIndex = this.data.currentIndex - 1;
    
    this.animatePageTransition(newIndex, () => {
      this.setData({
        currentIndex: newIndex,
        isAnimating: false
      });
    });
  },

  /**
   * 下一页
   */
  nextPage: function() {
    if (this.data.currentIndex >= this.data.totalPages - 1 || this.data.isAnimating) {
      return;
    }
    
    this.setData({
      isAnimating: true,
      animationDirection: 'next'
    });
    
    const newIndex = this.data.currentIndex + 1;
    
    this.animatePageTransition(newIndex, () => {
      this.setData({
        currentIndex: newIndex,
        isAnimating: false
      });
      
      // 如果是最后一页，标记引导完成
      if (newIndex === this.data.totalPages - 1) {
        this.markGuideAsCompleted();
      }
    });
  },

  /**
   * 跳转到指定页面
   */
  goToPage: function(e) {
    const targetIndex = e.currentTarget.dataset.index;
    
    if (targetIndex === this.data.currentIndex || this.data.isAnimating) {
      return;
    }
    
    this.setData({
      isAnimating: true,
      animationDirection: targetIndex > this.data.currentIndex ? 'next' : 'prev'
    });
    
    this.animatePageTransition(targetIndex, () => {
      this.setData({
        currentIndex: targetIndex,
        isAnimating: false
      });
      
      // 如果是最后一页，标记引导完成
      if (targetIndex === this.data.totalPages - 1) {
        this.markGuideAsCompleted();
      }
    });
  },

  /**
   * 页面切换动画
   */
  animatePageTransition: function(targetIndex, callback) {
    // 使用微信小程序的动画API
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in-out'
    });
    
    if (targetIndex > this.data.currentIndex) {
      // 下一页动画
      animation.translateX('-100%').step();
    } else {
      // 上一页动画
      animation.translateX('100%').step();
    }
    
    this.setData({
      pageAnimation: animation.export()
    });
    
    setTimeout(() => {
      if (callback) callback();
      
      // 重置动画
      const resetAnimation = wx.createAnimation({
        duration: 0
      });
      resetAnimation.translateX('0').step();
      
      this.setData({
        pageAnimation: resetAnimation.export()
      });
    }, 300);
  },

  /**
   * 标记引导已完成
   */
  markGuideAsCompleted: function() {
    wx.setStorageSync('hasSeenGuide', true);
    this.setData({
      hasCompletedGuide: true
    });
  },

  /**
   * 不再显示引导页选项变化
   */
  onDontShowAgainChange: function(e) {
    const checked = e.detail.value;
    
    this.setData({
      dontShowAgain: checked
    });
    
    // 保存用户选择
    wx.setStorageSync('dontShowGuideAgain', checked);
  },

  /**
   * 完成引导
   */
  completeGuide: function() {
    // 保存引导完成状态
    wx.setStorageSync('hasSeenGuide', true);
    
    // 如果用户选择了不再显示，保存设置
    if (this.data.dontShowAgain) {
      wx.setStorageSync('dontShowGuideAgain', true);
    }
    
    // 跳转到首页
    this.redirectToHome();
  },

  /**
   * 跳过引导
   */
  skipGuide: function() {
    wx.showModal({
      title: '跳过引导',
      content: '确定要跳过引导吗？建议新手用户完成引导以了解核心功能。',
      confirmText: '跳过',
      cancelText: '继续学习',
      success: (res) => {
        if (res.confirm) {
          this.completeGuide();
        }
      }
    });
  },

  /**
   * 重新开始引导
   */
  restartGuide: function() {
    this.setData({
      currentIndex: 0,
      hasCompletedGuide: false
    });
  },

  /**
   * 立即收集素材
   */
  startCollecting: function() {
    wx.navigateTo({
      url: '/pages/collect/collect'
    });
  },

  /**
   * 开始写作
   */
  startWriting: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 浏览模板库
   */
  exploreTemplates: function() {
    wx.navigateTo({
      url: '/pages/template/template'
    });
  },

  /**
   * 显示帮助提示
   */
  showHelpTip: function(tipType) {
    const tips = {
      collect: '您可以在任何阅读场景中，将有用的文字复制后，打开灵材智库即可自动识别并保存。',
      organize: '系统会根据您的使用习惯，智能推荐标签和分类，帮助您更好地组织素材。',
      write: '写作时，系统会从您的素材库中智能匹配相关内容，并提供跨界灵感参考。'
    };
    
    wx.showModal({
      title: '使用提示',
      content: tips[tipType] || '更多功能等待您探索！',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return {
      title: '灵材智库 - AI写作助手',
      path: '/pages/guide/guide',
      imageUrl: '/assets/images/share-guide.jpg'
    };
  },

  /**
   * 页面滚动触发
   * 由于页面禁止滚动，这里不需要处理
   */
  onPageScroll: function() {
    // 引导页禁止滚动，这里保持空白
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    // 如果用户没有完成引导就离开，记录当前进度
    if (!this.data.hasCompletedGuide && this.data.currentIndex > 0) {
      wx.setStorageSync('guideLastPage', this.data.currentIndex);
    }
  },

  /**
   * 显示操作反馈
   */
  showFeedback: function(message, type = 'success') {
    wx.showToast({
      title: message,
      icon: type,
      duration: 2000
    });
  },

  /**
   * 播放引导音效（可选）
   */
  playGuideSound: function(soundType) {
    // 由于小程序音效限制，这里可以留空或使用简单的震动反馈
    if (soundType === 'page_turn') {
      wx.vibrateShort({
        type: 'light'
      });
    } else if (soundType === 'complete') {
      wx.vibrateShort();
    }
  }
});