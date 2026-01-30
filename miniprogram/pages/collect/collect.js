const cloudFunc = require('../../utils/api/cloud.func.js');

Page({
  data: {
    title: '',
    source: '',
    tagText: '',
    content: '',
    isEdit: false,
    editId: ''
  },

  onLoad(options) {
    if (options && options.id) {
      this.setData({ isEdit: true, editId: options.id });
      this.fetchMaterial(options.id);
    }
  },

  async fetchMaterial(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await cloudFunc.call('material-get', { id });
      if (res && res.success && res.data) {
        const m = res.data;
        this.setData({
          title: m.title || '',
          source: m.source || '',
          tagText: (m.tags || []).join(','),
          content: m.content || ''
        });
      } else {
        wx.showToast({ title: '未找到素材', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '获取失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onSourceInput(e) { this.setData({ source: e.detail.value }); },
  onTagInput(e) { this.setData({ tagText: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },

  async onSave() {
    const { title, source, tagText, content, isEdit, editId } = this.data;
    if (!content && !title) {
      wx.showToast({ title: '请填写标题或内容', icon: 'none' });
      return;
    }
    const payload = {
      title,
      source,
      tags: tagText ? tagText.split(',').map(s => s.trim()).filter(Boolean) : [],
      content
    };
    wx.showLoading({ title: '保存中...' });
    try {
      const fn = isEdit ? 'material-update' : 'material-create';
      if (isEdit) payload.id = editId;
      const res = await cloudFunc.call(fn, payload);
      if (res && res.success) {
        wx.showToast({ title: '保存成功' });
        setTimeout(() => { wx.navigateBack(); }, 700);
      } else {
        wx.showToast({ title: res && res.message ? res.message : '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onCancel() {
    wx.navigateBack();
  }
});