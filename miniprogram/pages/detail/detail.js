const cloudFunc = require('../../utils/api/cloud.func.js');
const promptBuilder = require('../../utils/helpers/prompt-builder.js');

Page({
  data: {
    material: {},
    promptVisible: false,
    currentPrompt: ''
  },

  onLoad(options) {
    if (options && options.id) {
      this.fetchMaterial(options.id);
    }
  },

  async fetchMaterial(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await cloudFunc.call('material-get', { id });
      if (res && res.success) {
        this.setData({ material: res.data || {} });
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

  formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  },

  onEdit() {
    const id = this.data.material._id;
    wx.navigateTo({ url: `/pages/collect/collect?id=${id}` });
  },

  async onDelete() {
    const id = this.data.material._id;
    const that = this;
    wx.showModal({
      title: '确认',
      content: '是否删除该素材？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            const r = await cloudFunc.call('material-delete', { id });
            if (r && r.success) {
              wx.showToast({ title: '已删除' });
              setTimeout(() => wx.navigateBack(), 600);
            } else {
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          } catch (err) {
            console.error(err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  onCopy() {
    const text = this.data.material.content || '';
    wx.setClipboardData({ data: text, success() { wx.showToast({ title: '已复制' }); } });
  },

  onGeneratePrompt() {
    const prompt = promptBuilder.buildPrompt({ theme: '', materials: [this.data.material], template: '官方报告' });
    this.setData({ currentPrompt: prompt, promptVisible: true });
  },

  onClosePrompt() {
    this.setData({ promptVisible: false });
  }
});