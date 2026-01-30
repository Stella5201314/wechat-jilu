const cloudFunc = require('../../utils/api/cloud.func.js');
const promptBuilder = require('../../utils/helpers/prompt-builder.js');

Page({
  data: {
    materials: [],
    // tagPool: 每项包含 name, desc, selected
    tagPool: [
      { name: '政策', desc: '包含政府文件、政策解读、法规条款等', selected: false },
      { name: '案例', desc: '实践案例、试点经验与成功示范', selected: false },
      { name: '产业', desc: '行业动态、产业结构与企业信息', selected: false },
      { name: '数据', desc: '统计数据、指标、报告中的数值', selected: false },
      { name: '方法论', desc: '方法、路径、研究或分析框架', selected: false }
    ],
    selectedTags: [], // 仅字符串数组供后端查询
    currentPrompt: '',
    promptVisible: false
  },

  onLoad() {
    this.fetchMaterials();
  },

  // 切换标签选中状态（使用 data-name）
  toggleTag(e) {
    const name = e.currentTarget.dataset.name;
    if (!name) return;

    // 遍历 tagPool 找到对应项并切换 selected
    const pool = (this.data.tagPool || []).map(item => {
      if (item.name === name) {
        return Object.assign({}, item, { selected: !item.selected });
      }
      return item;
    });

    // 计算 selectedTags（字符串数组）
    const selectedTags = pool.filter(t => t.selected).map(t => t.name);

    this.setData({ tagPool: pool, selectedTags }, () => {
      // 自动刷新结果
      this.fetchMaterials();
    });
  },

  // 点击 info 图标显示标签说明，阻止冒泡避免触发 toggleTag
  onTagInfoTap(e) {
    e.stopPropagation && e.stopPropagation();
    const name = e.currentTarget.dataset.name;
    const entry = (this.data.tagPool || []).find(t => t.name === name) || { desc: '暂无说明' };
    wx.showModal({
      title: entry.name || name,
      content: entry.desc || '暂无说明',
      showCancel: false
    });
  },

  async fetchMaterials() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await cloudFunc.call('material-match', { tags: this.data.selectedTags, page: 1, pageSize: 20 });
      if (res && res.success) {
        this.setData({ materials: res.data || [] });
      } else {
        wx.showToast({ title: res && res.message ? res.message : '获取素材失败', icon: 'none' });
      }
    } catch (err) {
      console.error('fetchMaterials error', err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onViewMaterial(e) {
    const material = e.detail.material;
    wx.navigateTo({ url: `/pages/detail/detail?id=${material._id}` });
  },

  onSelectMaterial(e) {
    const material = e.detail.material;
    const materials = this.data.materials.map(m => (m._id === material._id ? Object.assign({}, m, { _selected: !m._selected }) : m));
    this.setData({ materials });
  },

  onGeneratePrompt() {
    const selectedMaterials = this.data.materials.filter(m => m._selected);
    const prompt = promptBuilder.buildPrompt({ theme: '', materials: selectedMaterials, template: '官方报告' });
    this.setData({ currentPrompt: prompt, promptVisible: true });
  },

  onClosePrompt() {
    this.setData({ promptVisible: false });
  },

  onAiSuggest() {
    wx.showToast({ title: '正在获取灵感...', icon: 'none' });
    // 可以在此调用云函数 inspiration-recommend
  }
});