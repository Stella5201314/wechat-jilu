Component({
  properties: {
    title: { type: String, value: '灵材智库' },
    subtitle: { type: String, value: '' },
    showBack: { type: Boolean, value: true },
    showRight: { type: Boolean, value: false },
    rightText: { type: String, value: '' },
    backIcon: { type: String, value: '/assets/icons/back.png' } // 请确保资源存在或替换为合适路径
  },
  methods: {
    onBack() {
      // 触发事件给父级，如果父级没有处理则默认回退
      const handled = this.triggerEvent('back', {});
      // 小程序 triggerEvent 不返回值；这里直接尝试回退
      wx.navigateBack({ delta: 1 });
    },
    onRight() {
      this.triggerEvent('right', {});
    },
    noop() {
      // 防止冒泡用占位
    }
  }
});