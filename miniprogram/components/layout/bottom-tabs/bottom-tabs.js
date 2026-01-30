Component({
  properties: {
    current: { type: String, value: 'home' }
  },
  methods: {
    onSwitch(e) {
      const path = e.currentTarget.dataset.path;
      const current = this.data.current || '';
      // 触发事件
      this.triggerEvent('change', { path });
      // 使用 switchTab 仅当路径是 tabBar 配置页
      const tabPaths = ['/pages/index/index', '/pages/collect/collect', '/pages/library/library', '/pages/profile/profile'];
      if (tabPaths.includes(path)) {
        wx.switchTab({ url: path });
      } else {
        wx.navigateTo({ url: path });
      }
    }
  }
});