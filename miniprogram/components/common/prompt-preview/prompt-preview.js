Component({
  properties: {
    visible: { type: Boolean, value: false },
    prompt: { type: String, value: '' }
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
    onCopy() {
      const text = this.data.prompt || '';
      wx.setClipboardData({
        data: text,
        success: () => {
          wx.showToast({ title: '已复制到剪贴板' });
          this.triggerEvent('copy');
        }
      });
    },
    onShare() {
      // 简单示例：打开转发面板（仅触发事件，由页面处理具体分享逻辑）
      this.triggerEvent('share', { prompt: this.data.prompt });
      wx.showToast({ title: '分享事件已触发', icon: 'none' });
    }
  }
});