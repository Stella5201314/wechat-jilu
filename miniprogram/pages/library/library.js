// pages/library/library.js

const app = getApp();
const dateUtils = require('../../utils/helpers/date-utils');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 页面状态
    isLoading: true,
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: true,
    
    // 视图模式
    viewMode: 'list', // 'list' | 'grid'
    
    // 搜索状态
    searchKeyword: '',
    searchTimer: null,
    
    // 筛选状态
    showFilterPanel: false,
    filters: {
      timeRange: [
        { label: '今天', value: 'today' },
        { label: '最近7天', value: '7days' },
        { label: '最近30天', value: '30days' },
        { label: '今年', value: 'this_year' },
        { label: '更早', value: 'older' }
      ],
      impressionTags: [
        { label: '观点新颖', value: 'insight' },
        { label: '论述有力', value: 'logic' },
        { label: '表达生动', value: 'expression' },
        { label: '数据权威', value: 'data' },
        { label: '风格典范', value: 'style' }
      ],
      categories: [],
      sourceTypes: [
        { label: '政策文件', value: 'policy' },
        { label: '新闻报道', value: 'news' },
        { label: '学术文章', value: 'academic' },
        { label: '内部资料', value: 'internal' },
        { label: '书籍', value: 'book' },
        { label: '社交媒体', value: 'social' },
        { label: '其他', value: 'other' }
      ],
      usageCount: [
        { label: '从未使用', value: '0' },
        { label: '使用1-5次', value: '1-5' },
        { label: '使用6-10次', value: '6-10' },
        { label: '使用10次以上', value: '10+' }
      ]
    },
    activeFilters: {},
    activeFilterCount: 0,
    activeFiltersDisplay: [],
    
    // 批量操作状态
    isBatchMode: false,
    selectedMaterials: [],
    isSelectAll: false,
    
    // 素材数据
    materials: [],
    totalCount: 0,
    pageSize: 20,
    currentPage: 1,
    
    // 印象标签映射
    impressionTagMap: {
      'insight': '观点新颖',
      'logic': '论述有力',
      'expression': '表达生动',
      'data': '数据权威',
      'style': '风格典范'
    },
    
    // 操作菜单
    showActionsModal: false,
    showQuickActionsModal: false,
    showBatchConfirmModal: false,
    selectedMaterialIndex: -1,
    selectedMaterialId: '',
    
    // 批量操作确认
    batchActionType: '', // 'delete' | 'categorize' | 'tag'
    batchConfirmTitle: '',
    batchConfirmMessage: '',
    batchConfirmButton: '',
    batchConfirmDisabled: false,
    
    // 批量分类操作
    availableCategories: [],
    batchCategoryIndex: -1,
    categoryOperation: 'add', // 'add' | 'replace' | 'remove'
    
    // 批量标签操作
    batchTagInput: '',
    batchSelectedTags: [],
    tagOperation: 'add', // 'add' | 'replace'
    
    // 删除选项
    keepUsageRecords: false,
    
    // 动画
    filterPanelAnimation: null,
    batchBarAnimation: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('素材库页面加载，参数:', options);
    
    // 初始化数据
    this.initFilters();
    this.loadUserCategories();
    
    // 加载素材数据
    this.loadMaterials(true);
    
    // 检查是否有跳转参数
    if (options.search) {
      this.setData({
        searchKeyword: decodeURIComponent(options.search)
      });
    }
    
    if (options.filter) {
      try {
        const filter = JSON.parse(decodeURIComponent(options.filter));
        this.applyExternalFilter(filter);
      } catch (error) {
        console.error('解析筛选参数失败:', error);
      }
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 刷新用户分类
    this.loadUserCategories();
    
    // 如果从其他页面返回，检查是否需要刷新
    if (app.globalData.shouldRefreshLibrary) {
      this.loadMaterials(true);
      app.globalData.shouldRefreshLibrary = false;
    }
  },

  /**
   * 初始化筛选器
   */
  initFilters: function() {
    // 加载用户偏好设置
    const userPrefs = wx.getStorageSync('userPreferences') || {};
    const defaultFilters = userPrefs.defaultLibraryFilters || {};
    
    this.setData({
      activeFilters: defaultFilters
    });
    
    this.updateFilterDisplay();
  },

  /**
   * 加载用户分类
   */
  loadUserCategories: function() {
    const userPrefs = wx.getStorageSync('userPreferences') || {};
    const categories = userPrefs.categories || [
      '政策文件', '行业报告', '案例分析', '数据统计', '优秀文案'
    ];
    
    // 更新筛选器中的分类选项
    const categoryFilters = categories.map(category => ({
      label: category,
      value: category
    }));
    
    this.setData({
      'filters.categories': categoryFilters,
      availableCategories: categories
    });
  },

  /**
   * 加载素材数据
   */
  loadMaterials: function(reset = false) {
    if (reset) {
      this.setData({
        isLoading: true,
        currentPage: 1,
        hasMore: true,
        materials: []
      });
    } else if (this.data.isLoadingMore) {
      return;
    }
    
    const params = {
      page: this.data.currentPage,
      pageSize: this.data.pageSize,
      keyword: this.data.searchKeyword.trim(),
      filters: this.data.activeFilters
    };
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'getMaterials',
      data: params
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const materials = res.result.materials || [];
        const totalCount = res.result.totalCount || 0;
        
        // 处理素材数据
        const processedMaterials = materials.map(material => ({
          ...material,
          title: this.extractMaterialTitle(material),
          preview: this.extractMaterialPreview(material),
          impressionTags: material.impressionTags || []
        }));
        
        // 更新数据
        const newMaterials = reset ? 
          processedMaterials : 
          [...this.data.materials, ...processedMaterials];
        
        this.setData({
          materials: newMaterials,
          totalCount: totalCount,
          isLoading: false,
          isLoadingMore: false,
          hasMore: newMaterials.length < totalCount
        });
      } else {
        this.setData({
          isLoading: false,
          isLoadingMore: false
        });
        
        wx.showToast({
          title: res.result?.message || '加载失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('加载素材失败:', err);
      
      this.setData({
        isLoading: false,
        isLoadingMore: false
      });
      
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 提取素材标题
   */
  extractMaterialTitle: function(material) {
    if (material.sourceInfo?.title) {
      return material.sourceInfo.title;
    }
    
    const content = material.content || '';
    const firstLine = content.split('\n')[0] || '';
    
    if (firstLine.length > 0) {
      return firstLine.length > 30 ? 
        firstLine.substring(0, 30) + '...' : 
        firstLine;
    }
    
    return '';
  },

  /**
   * 提取素材预览
   */
  extractMaterialPreview: function(material) {
    const content = material.content || '';
    
    // 去除标题行
    const lines = content.split('\n');
    const previewLines = lines.length > 1 ? lines.slice(1) : lines;
    const previewText = previewLines.join(' ').trim();
    
    if (previewText.length === 0) {
      return '暂无内容预览';
    }
    
    return previewText.length > 80 ? 
      previewText.substring(0, 80) + '...' : 
      previewText;
  },

  /**
   * 获取印象标签名称
   */
  getImpressionTagName: function(material) {
    const tag = material.impressionTags?.[0];
    return tag ? this.data.impressionTagMap[tag] || tag : '';
  },

  /**
   * 格式化相对时间
   */
  formatRelativeTime: function(timestamp) {
    if (!timestamp) return '未知时间';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}周前`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}个月前`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}年前`;
    }
  },

  /**
   * 搜索输入事件
   */
  onSearchInput: function(e) {
    const keyword = e.detail.value;
    
    this.setData({
      searchKeyword: keyword
    });
    
    // 防抖搜索
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
    
    this.data.searchTimer = setTimeout(() => {
      this.performSearch();
    }, 500);
  },

  /**
   * 搜索确认事件
   */
  onSearchConfirm: function() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
    
    this.performSearch();
  },

  /**
   * 执行搜索
   */
  performSearch: function() {
    this.loadMaterials(true);
  },

  /**
   * 清除搜索
   */
  clearSearch: function() {
    this.setData({
      searchKeyword: ''
    });
    
    this.loadMaterials(true);
  },

  /**
   * 切换筛选面板
   */
  toggleFilterPanel: function() {
    const show = !this.data.showFilterPanel;
    
    // 创建动画
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in-out'
    });
    
    if (show) {
      animation.height('auto').step();
    } else {
      animation.height(0).step();
    }
    
    this.setData({
      showFilterPanel: show,
      filterPanelAnimation: animation.export()
    });
  },

  /**
   * 筛选器变化事件
   */
  onFilterChange: function(e) {
    const { type, value } = e.detail;
    
    const activeFilters = { ...this.data.activeFilters };
    
    if (value && value.length > 0) {
      activeFilters[type] = value;
    } else {
      delete activeFilters[type];
    }
    
    this.setData({
      activeFilters: activeFilters
    });
    
    this.updateFilterDisplay();
  },

  /**
   * 更新筛选器显示
   */
  updateFilterDisplay: function() {
    const activeFilters = this.data.activeFilters;
    const display = [];
    let count = 0;
    
    // 时间范围
    if (activeFilters.timeRange) {
      const filter = this.data.filters.timeRange.find(
        f => f.value === activeFilters.timeRange
      );
      if (filter) {
        display.push({
          key: 'timeRange',
          label: '时间',
          value: filter.label
        });
        count++;
      }
    }
    
    // 印象标签
    if (activeFilters.impressionTags && activeFilters.impressionTags.length > 0) {
      const selectedTags = activeFilters.impressionTags.map(tag => {
        const filter = this.data.filters.impressionTags.find(
          f => f.value === tag
        );
        return filter ? filter.label : tag;
      });
      
      display.push({
        key: 'impressionTags',
        label: '标签',
        value: selectedTags.join('、')
      });
      count++;
    }
    
    // 分类
    if (activeFilters.categories && activeFilters.categories.length > 0) {
      display.push({
        key: 'categories',
        label: '分类',
        value: activeFilters.categories.join('、')
      });
      count++;
    }
    
    // 来源类型
    if (activeFilters.sourceTypes && activeFilters.sourceTypes.length > 0) {
      const selectedTypes = activeFilters.sourceTypes.map(type => {
        const filter = this.data.filters.sourceTypes.find(
          f => f.value === type
        );
        return filter ? filter.label : type;
      });
      
      display.push({
        key: 'sourceTypes',
        label: '来源',
        value: selectedTypes.join('、')
      });
      count++;
    }
    
    // 使用次数
    if (activeFilters.usageCount) {
      const filter = this.data.filters.usageCount.find(
        f => f.value === activeFilters.usageCount
      );
      if (filter) {
        display.push({
          key: 'usageCount',
          label: '使用',
          value: filter.label
        });
        count++;
      }
    }
    
    this.setData({
      activeFiltersDisplay: display,
      activeFilterCount: count
    });
  },

  /**
   * 移除筛选器
   */
  removeFilter: function(e) {
    const key = e.currentTarget.dataset.key;
    const activeFilters = { ...this.data.activeFilters };
    
    delete activeFilters[key];
    
    this.setData({
      activeFilters: activeFilters
    });
    
    this.updateFilterDisplay();
    this.loadMaterials(true);
  },

  /**
   * 重置筛选器
   */
  resetFilters: function() {
    this.setData({
      activeFilters: {}
    });
    
    this.updateFilterDisplay();
    this.toggleFilterPanel();
  },

  /**
   * 应用筛选器
   */
  applyFilters: function() {
    this.toggleFilterPanel();
    this.loadMaterials(true);
  },

  /**
   * 清除所有筛选器
   */
  clearAllFilters: function() {
    this.resetFilters();
    this.loadMaterials(true);
  },

  /**
   * 清除搜索和筛选
   */
  clearSearchAndFilters: function() {
    this.setData({
      searchKeyword: '',
      activeFilters: {}
    });
    
    this.updateFilterDisplay();
    this.loadMaterials(true);
  },

  /**
   * 应用外部筛选器
   */
  applyExternalFilter: function(filter) {
    this.setData({
      activeFilters: filter
    });
    
    this.updateFilterDisplay();
    this.loadMaterials(true);
  },

  /**
   * 切换视图模式
   */
  switchViewMode: function(e) {
    const mode = e.currentTarget.dataset.mode;
    
    if (mode !== this.data.viewMode) {
      this.setData({
        viewMode: mode
      });
      
      // 保存用户偏好
      const userPrefs = wx.getStorageSync('userPreferences') || {};
      userPrefs.libraryViewMode = mode;
      wx.setStorageSync('userPreferences', userPrefs);
    }
  },

  /**
   * 切换批量模式
   */
  toggleBatchMode: function() {
    const isBatchMode = !this.data.isBatchMode;
    
    // 创建动画
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in-out'
    });
    
    if (isBatchMode) {
      animation.translateY(0).opacity(1).step();
    } else {
      animation.translateY(-100).opacity(0).step();
    }
    
    this.setData({
      isBatchMode: isBatchMode,
      selectedMaterials: [],
      isSelectAll: false,
      batchBarAnimation: animation.export()
    });
  },

  /**
   * 退出批量模式
   */
  exitBatchMode: function() {
    this.toggleBatchMode();
  },

  /**
   * 素材点击事件
   */
  onMaterialTap: function(e) {
    if (this.data.isBatchMode) {
      const materialId = e.currentTarget.dataset.id;
      this.toggleMaterialSelection(materialId);
      return;
    }
    
    const materialId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?materialId=${materialId}`
    });
  },

  /**
   * 素材长按事件
   */
  onMaterialLongPress: function(e) {
    if (this.data.isBatchMode) return;
    
    const materialId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 进入批量选择模式并选中当前素材
    if (!this.data.isBatchMode) {
      this.setData({
        isBatchMode: true,
        selectedMaterials: [materialId]
      });
    }
  },

  /**
   * 切换素材选择状态
   */
  toggleMaterialSelection: function(e) {
    const materialId = e.currentTarget?.dataset?.id || e;
    const selectedMaterials = [...this.data.selectedMaterials];
    const index = selectedMaterials.indexOf(materialId);
    
    if (index === -1) {
      selectedMaterials.push(materialId);
    } else {
      selectedMaterials.splice(index, 1);
    }
    
    this.setData({
      selectedMaterials: selectedMaterials,
      isSelectAll: selectedMaterials.length === this.data.materials.length
    });
  },

  /**
   * 切换全选
   */
  toggleSelectAll: function() {
    const isSelectAll = !this.data.isSelectAll;
    let selectedMaterials = [];
    
    if (isSelectAll) {
      selectedMaterials = this.data.materials.map(material => material._id);
    }
    
    this.setData({
      selectedMaterials: selectedMaterials,
      isSelectAll: isSelectAll
    });
  },

  /**
   * 快速使用素材
   */
  quickUseMaterial: function(e) {
    const materialId = e.currentTarget.dataset.id;
    
    // 跳转到写作页面并传递素材ID
    wx.navigateTo({
      url: `/pages/index/index?materialId=${materialId}&action=quickUse`
    });
  },

  /**
   * 显示素材操作菜单
   */
  showMaterialActions: function(e) {
    const index = e.currentTarget.dataset.index;
    const materialId = e.currentTarget.dataset.id;
    
    this.setData({
      showActionsModal: true,
      selectedMaterialIndex: index,
      selectedMaterialId: materialId
    });
  },

  /**
   * 隐藏素材操作菜单
   */
  hideActionsModal: function() {
    this.setData({
      showActionsModal: false,
      selectedMaterialIndex: -1,
      selectedMaterialId: ''
    });
  },

  /**
   * 查看素材详情
   */
  viewMaterialDetail: function() {
    this.hideActionsModal();
    
    wx.navigateTo({
      url: `/pages/detail/detail?materialId=${this.data.selectedMaterialId}`
    });
  },

  /**
   * 编辑素材
   */
  editMaterial: function() {
    this.hideActionsModal();
    
    wx.navigateTo({
      url: `/pages/collect/collect?materialId=${this.data.selectedMaterialId}`
    });
  },

  /**
   * 从模态框快速使用素材
   */
  quickUseMaterialFromModal: function() {
    this.hideActionsModal();
    this.quickUseMaterial({ currentTarget: { dataset: { id: this.data.selectedMaterialId } } });
  },

  /**
   * 从模态框复制素材
   */
  duplicateMaterialFromModal: function() {
    this.hideActionsModal();
    
    wx.showLoading({
      title: '复制中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'duplicateMaterial',
      data: { materialId: this.data.selectedMaterialId }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 2000
        });
        
        // 刷新列表
        this.loadMaterials(true);
      } else {
        wx.showToast({
          title: '复制失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('复制失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 从模态框加入收藏夹
   */
  addToCollectionFromModal: function() {
    this.hideActionsModal();
    
    wx.cloud.callFunction({
      name: 'addToCollection',
      data: {
        materialId: this.data.selectedMaterialId,
        collectionId: 'favorites'
      }
    }).then(res => {
      if (res.result && res.result.success) {
        wx.showToast({
          title: '已加入收藏夹',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '操作失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      console.error('加入收藏夹失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 从模态框分享素材
   */
  shareMaterialFromModal: function() {
    this.hideActionsModal();
    
    const material = this.data.materials[this.data.selectedMaterialIndex];
    
    wx.showActionSheet({
      itemList: ['生成分享卡片', '复制分享链接'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.generateShareCard(material);
        } else if (res.tapIndex === 1) {
          this.copyShareLink(material);
        }
      }
    });
  },

  /**
   * 从模态框删除素材
   */
  deleteMaterialFromModal: function() {
    this.hideActionsModal();
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个素材吗？此操作不可撤销。',
      confirmText: '删除',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteMaterial(this.data.selectedMaterialId);
        }
      }
    });
  },

  /**
   * 执行删除素材
   */
  performDeleteMaterial: function(materialId) {
    wx.showLoading({
      title: '删除中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'deleteMaterial',
      data: { materialId: materialId }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        });
        
        // 刷新列表
        this.loadMaterials(true);
        
        // 设置全局刷新标志
        app.globalData.shouldRefreshMaterials = true;
      } else {
        wx.showToast({
          title: res.result?.message || '删除失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('删除失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 生成分享卡片
   */
  generateShareCard: function(material) {
    wx.showLoading({
      title: '生成中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'generateShareCard',
      data: { materialId: material._id }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const imageUrl = res.result.imageUrl;
        
        wx.previewImage({
          urls: [imageUrl],
          current: imageUrl
        });
      } else {
        wx.showToast({
          title: '生成失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('生成分享卡片失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 复制分享链接
   */
  copyShareLink: function(material) {
    const shareLink = `${app.globalData.shareBaseUrl}/material/${material._id}`;
    
    wx.setClipboardData({
      data: shareLink,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success',
          duration: 2000
        });
      }
    });
  },

  /**
   * 批量操作事件
   */
  onBatchAction: function(e) {
    const action = e.detail.action;
    
    switch (action) {
      case 'delete':
        this.showBatchDeleteConfirm();
        break;
      case 'categorize':
        this.showBatchCategorizeConfirm();
        break;
      case 'tag':
        this.showBatchTagConfirm();
        break;
      case 'export':
        this.exportSelectedMaterials();
        break;
    }
  },

  /**
   * 显示批量删除确认
   */
  showBatchDeleteConfirm: function() {
    this.setData({
      showBatchConfirmModal: true,
      batchActionType: 'delete',
      batchConfirmTitle: '批量删除',
      batchConfirmMessage: `确定要删除选中的 ${this.data.selectedMaterials.length} 条素材吗？此操作不可撤销。`,
      batchConfirmButton: '确认删除',
      batchConfirmDisabled: false,
      keepUsageRecords: false
    });
  },

  /**
   * 显示批量分类确认
   */
  showBatchCategorizeConfirm: function() {
    this.setData({
      showBatchConfirmModal: true,
      batchActionType: 'categorize',
      batchConfirmTitle: '批量分类',
      batchConfirmMessage: `为选中的 ${this.data.selectedMaterials.length} 条素材设置分类`,
      batchConfirmButton: '确认设置',
      batchConfirmDisabled: true,
      batchCategoryIndex: -1,
      categoryOperation: 'add'
    });
  },

  /**
   * 显示批量标签确认
   */
  showBatchTagConfirm: function() {
    this.setData({
      showBatchConfirmModal: true,
      batchActionType: 'tag',
      batchConfirmTitle: '批量标签',
      batchConfirmMessage: `为选中的 ${this.data.selectedMaterials.length} 条素材设置标签`,
      batchConfirmButton: '确认设置',
      batchConfirmDisabled: true,
      batchTagInput: '',
      batchSelectedTags: [],
      tagOperation: 'add'
    });
  },

  /**
   * 隐藏批量确认模态框
   */
  hideBatchConfirmModal: function() {
    this.setData({
      showBatchConfirmModal: false,
      batchActionType: '',
      batchConfirmDisabled: false
    });
  },

  /**
   * 保留记录选项变化
   */
  onKeepRecordsChange: function(e) {
    this.setData({
      keepUsageRecords: e.detail.value
    });
  },

  /**
   * 批量分类选择变化
   */
  onBatchCategoryChange: function(e) {
    const index = e.detail.value;
    
    this.setData({
      batchCategoryIndex: index,
      batchConfirmDisabled: index < 0
    });
  },

  /**
   * 分类操作类型变化
   */
  onCategoryOperationChange: function(e) {
    this.setData({
      categoryOperation: e.detail.value
    });
  },

  /**
   * 批量标签输入
   */
  onBatchTagInput: function(e) {
    this.setData({
      batchTagInput: e.detail.value
    });
  },

  /**
   * 添加批量标签
   */
  addBatchTags: function() {
    const input = this.data.batchTagInput.trim();
    if (!input) return;
    
    // 按逗号分隔标签
    const tags = input.split(/[,，]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    const batchSelectedTags = [...this.data.batchSelectedTags];
    
    tags.forEach(tag => {
      if (!batchSelectedTags.includes(tag)) {
        batchSelectedTags.push(tag);
      }
    });
    
    this.setData({
      batchSelectedTags: batchSelectedTags,
      batchTagInput: '',
      batchConfirmDisabled: batchSelectedTags.length === 0
    });
  },

  /**
   * 移除批量标签
   */
  removeBatchTag: function(e) {
    const index = e.currentTarget.dataset.index;
    const batchSelectedTags = [...this.data.batchSelectedTags];
    
    batchSelectedTags.splice(index, 1);
    
    this.setData({
      batchSelectedTags: batchSelectedTags,
      batchConfirmDisabled: batchSelectedTags.length === 0
    });
  },

  /**
   * 标签操作类型变化
   */
  onTagOperationChange: function(e) {
    this.setData({
      tagOperation: e.detail.value
    });
  },

  /**
   * 确认批量操作
   */
  confirmBatchAction: function() {
    switch (this.data.batchActionType) {
      case 'delete':
        this.performBatchDelete();
        break;
      case 'categorize':
        this.performBatchCategorize();
        break;
      case 'tag':
        this.performBatchTag();
        break;
    }
  },

  /**
   * 执行批量删除
   */
  performBatchDelete: function() {
    wx.showLoading({
      title: '删除中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'batchDeleteMaterials',
      data: {
        materialIds: this.data.selectedMaterials,
        keepUsageRecords: this.data.keepUsageRecords
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: `已删除 ${res.result.deletedCount} 条素材`,
          icon: 'success',
          duration: 2000
        });
        
        // 退出批量模式并刷新列表
        this.setData({
          isBatchMode: false,
          selectedMaterials: []
        });
        
        this.loadMaterials(true);
        
        // 设置全局刷新标志
        app.globalData.shouldRefreshMaterials = true;
      } else {
        wx.showToast({
          title: res.result?.message || '删除失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('批量删除失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    }).finally(() => {
      this.hideBatchConfirmModal();
    });
  },

  /**
   * 执行批量分类
   */
  performBatchCategorize: function() {
    if (this.data.batchCategoryIndex < 0) return;
    
    const category = this.data.availableCategories[this.data.batchCategoryIndex];
    
    wx.showLoading({
      title: '处理中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'batchCategorizeMaterials',
      data: {
        materialIds: this.data.selectedMaterials,
        category: category,
        operation: this.data.categoryOperation
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '分类设置成功',
          icon: 'success',
          duration: 2000
        });
        
        // 退出批量模式并刷新列表
        this.setData({
          isBatchMode: false,
          selectedMaterials: []
        });
        
        this.loadMaterials(true);
      } else {
        wx.showToast({
          title: res.result?.message || '操作失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('批量分类失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    }).finally(() => {
      this.hideBatchConfirmModal();
    });
  },

  /**
   * 执行批量标签
   */
  performBatchTag: function() {
    if (this.data.batchSelectedTags.length === 0) return;
    
    wx.showLoading({
      title: '处理中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'batchTagMaterials',
      data: {
        materialIds: this.data.selectedMaterials,
        tags: this.data.batchSelectedTags,
        operation: this.data.tagOperation,
        tagType: 'impression'
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '标签设置成功',
          icon: 'success',
          duration: 2000
        });
        
        // 退出批量模式并刷新列表
        this.setData({
          isBatchMode: false,
          selectedMaterials: []
        });
        
        this.loadMaterials(true);
      } else {
        wx.showToast({
          title: res.result?.message || '操作失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('批量标签失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    }).finally(() => {
      this.hideBatchConfirmModal();
    });
  },

  /**
   * 导出选中素材
   */
  exportSelectedMaterials: function() {
    wx.showLoading({
      title: '准备导出...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'exportMaterials',
      data: {
        materialIds: this.data.selectedMaterials,
        format: 'txt'
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const fileUrl = res.result.fileUrl;
        
        wx.downloadFile({
          url: fileUrl,
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              wx.saveFileToDisk({
                filePath: downloadRes.tempFilePath,
                success: () => {
                  wx.showToast({
                    title: '导出成功',
                    icon: 'success',
                    duration: 2000
                  });
                },
                fail: (err) => {
                  console.error('保存文件失败:', err);
                  wx.showToast({
                    title: '保存失败',
                    icon: 'error',
                    duration: 2000
                  });
                }
              });
            }
          },
          fail: (err) => {
            console.error('下载文件失败:', err);
            wx.showToast({
              title: '下载失败',
              icon: 'error',
              duration: 2000
            });
          }
        });
      } else {
        wx.showToast({
          title: '导出失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('导出失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 显示快速操作菜单
   */
  showQuickActions: function() {
    this.setData({
      showQuickActionsModal: true
    });
  },

  /**
   * 隐藏快速操作菜单
   */
  hideQuickActionsModal: function() {
    this.setData({
      showQuickActionsModal: false
    });
  },

  /**
   * 导出所有素材
   */
  exportAllMaterials: function() {
    this.hideQuickActionsModal();
    
    wx.showModal({
      title: '导出所有素材',
      content: '确定要导出所有素材吗？这可能需要一些时间。',
      success: (res) => {
        if (res.confirm) {
          // 这里可以实现导出所有素材的逻辑
          wx.showToast({
            title: '导出功能开发中',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  /**
   * 导入素材
   */
  importMaterials: function() {
    this.hideQuickActionsModal();
    
    wx.showActionSheet({
      itemList: ['从文件导入', '从剪贴板导入', '导入示例数据'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.importFromFile();
            break;
          case 1:
            this.importFromClipboard();
            break;
          case 2:
            this.importDemoData();
            break;
        }
      }
    });
  },

  /**
   * 从文件导入
   */
  importFromFile: function() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'json'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].path;
        // 这里可以实现文件导入逻辑
        wx.showToast({
          title: '文件导入功能开发中',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 从剪贴板导入
   */
  importFromClipboard: function() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data.trim();
        if (text) {
          wx.showModal({
            title: '导入确认',
            content: `检测到剪贴板内容，是否作为新素材导入？\n\n${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({
                  url: `/pages/collect/collect?content=${encodeURIComponent(text)}`
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: '剪贴板为空',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  /**
   * 导入示例数据
   */
  importDemoData: function() {
    this.hideQuickActionsModal();
    
    wx.showModal({
      title: '导入示例数据',
      content: '导入示例数据可以帮助您快速了解系统功能。确定要导入吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '导入中...',
            mask: true
          });
          
          wx.cloud.callFunction({
            name: 'importDemoData',
            data: {}
          }).then(res => {
            wx.hideLoading();
            
            if (res.result && res.result.success) {
              wx.showToast({
                title: `已导入 ${res.result.count} 条示例数据`,
                icon: 'success',
                duration: 2000
              });
              
              // 刷新列表
              this.loadMaterials(true);
            } else {
              wx.showToast({
                title: '导入失败',
                icon: 'error',
                duration: 2000
              });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('导入失败:', err);
            wx.showToast({
              title: '网络错误',
              icon: 'error',
              duration: 2000
            });
          });
        }
      }
    });
  },

  /**
   * 管理分类
   */
  manageCategories: function() {
    this.hideQuickActionsModal();
    
    wx.navigateTo({
      url: '/pages/category/category'
    });
  },

  /**
   * 查看统计
   */
  showStatistics: function() {
    this.hideQuickActionsModal();
    
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  /**
   * 清理素材库
   */
  cleanUpMaterials: function() {
    this.hideQuickActionsModal();
    
    wx.showModal({
      title: '清理素材库',
      content: '清理未使用或重复的素材，释放存储空间。确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          // 这里可以实现清理逻辑
          wx.showToast({
            title: '清理功能开发中',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  /**
   * 跳转到收集页面
   */
  gotoCollect: function() {
    wx.navigateTo({
      url: '/pages/collect/collect'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function() {
    this.setData({
      isRefreshing: true
    });
    
    this.loadMaterials(true).finally(() => {
      setTimeout(() => {
        this.setData({
          isRefreshing: false
        });
        wx.stopPullDownRefresh();
      }, 500);
    });
  },

  /**
   * 上拉加载更多
   */
  onReachBottom: function() {
    if (!this.data.hasMore || this.data.isLoadingMore) {
      return;
    }
    
    this.setData({
      isLoadingMore: true,
      currentPage: this.data.currentPage + 1
    });
    
    this.loadMaterials(false);
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return {
      title: '灵材智库 - 素材库',
      path: '/pages/library/library',
      imageUrl: '/assets/images/share-library.jpg'
    };
  }
});