const cloudFunc = require('../../utils/api/cloud.func.js');

Page({
  data: {
    materials: [],
    page: 1,
    pageSize: 12,
    loading: false,
    hasMore: true,
    query: '',
    tagPool: ['政策', '案例', '产业', '数据', '方法论'],
    selectedTags: []
  },

  onLoad() {
    this.fetchMaterials(true);
  },

  onSearchInput(e) { this.setData({ query: e.detail.value }); },

  onSearch() { this.fetchMaterials(true); },

  onTagChange(e) {
    const selected = e.detail.selected || [];
    this.setData({ selectedTags: selected }, () => this.fetchMaterials(true));
  },

  async fetchMaterials(reset = false) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const res = await cloudFunc.call('material-match', {
        query: this.data.query,
        tags: this.data.selectedTags,
        page,
        pageSize: this.data.pageSize
      });
      if (res && res.success) {
        const list = res.data || [];
        const nextList = reset ? list : (this.data.materials.concat(list));
        const hasMore = list.length === this.data.pageSize;
        this.setData({ materials: nextList, page: page + 1, hasMore });
      } else {
        wx.showToast({ title: '获取失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    if (!this.data.hasMore) return;
    this.fetchMaterials(false);
  },

  onPullDownRefresh() {
    this.fetchMaterials(true).then(() => wx.stopPullDownRefresh());
  },

  onViewMaterial(e) {
    const material = e.detail.material;
    wx.navigateTo({ url: `/pages/detail/detail?id=${material._id}` });
  },

  onSelectMaterial(e) {
    const material = e.detail.material;
    wx.showToast({ title: `选中：${material.title}`, icon: 'none' });
  }
});