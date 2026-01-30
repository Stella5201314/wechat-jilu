const cloudFunc = require('../../utils/api/cloud.func.js');

Page({
  data: { templates: [], query: '' },

  onLoad() { this.fetchTemplates(); },

  onSearchInput(e) { this.setData({ query: e.detail.value }); },
  onSearch() { this.fetchTemplates(true); },

  async fetchTemplates() {
    wx.showLoading({ title: '加载模板...' });
    try {
      const res = await cloudFunc.call('template-list', { query: this.data.query });
      if (res && res.success) {
        this.setData({ templates: res.data || [] });
      } else {
        wx.showToast({ title: '获取失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onPreview(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  async onApply(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '应用中...' });
    try {
      const res = await cloudFunc.call('template-apply', { id });
      if (res && res.success) {
        wx.showToast({ title: '已应用模板' });
      } else {
        wx.showToast({ title: '应用失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});