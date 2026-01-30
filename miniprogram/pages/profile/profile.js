const cloudFunc = require('../../utils/api/cloud.func.js');

Page({
  data: { user: {} },

  onLoad() {
    const ud = wx.getStorageSync('userInfo') || {};
    this.setData({ user: ud });
  },

  async onSyncPreference() {
    wx.showLoading({ title: '同步中...' });
    try {
      const res = await cloudFunc.call('user-preference', { action: 'sync' });
      if (res && res.success) wx.showToast({ title: '已同步' });
      else wx.showToast({ title: '同步失败', icon: 'none' });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onOpenTemplate() { wx.navigateTo({ url: '/pages/template/template' }); },

  onLogout() { wx.clearStorageSync(); wx.showToast({ title: '已退出' }); this.setData({ user: {} }); }
});