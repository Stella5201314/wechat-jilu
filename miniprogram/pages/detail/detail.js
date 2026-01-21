// pages/detail/detail.js

// 引入工具函数
const app = getApp();
const utils = require('../../utils/helpers/text-analyzer');
const dateUtils = require('../../utils/helpers/date-utils');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 页面状态
    isLoading: true,
    loadError: false,
    errorMessage: '',
    isRefreshing: false,
    
    // 编辑状态
    isEditing: false,
    originalMaterial: null,
    
    // 分析状态
    showAnalysis: false,
    isAnalyzingTags: false,
    
    // 素材数据
    materialId: '',
    material: {
      _id: '',
      content: '',
      title: '',
      preview: '',
      impressionTags: [],
      structureTags: [],
      functionTags: [],
      categories: [],
      sourceInfo: {},
      privacy: 'private',
      createTime: null,
      updateTime: null,
      tagStats: {},
      usageCount: 0
    },
    
    // 相关数据
    usageHistory: [],
    relatedMaterials: [],
    isLoadingRelated: false,
    categorySuggestions: [],
    
    // 验证状态
    verificationResult: null,
    
    // 模态框状态
    showCategoryModal: false,
    showDeleteModal: false,
    availableCategories: [],
    newCategoryIndex: -1,
    newCustomCategory: '',
    
    // 删除选项
    keepUsageRecords: false,
    
    // 提示状态
    showSuccessToast: false,
    successMessage: '',
    
    // 分享数据
    shareData: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('详情页加载，参数:', options);
    
    // 获取素材ID
    const materialId = options.materialId || options.id;
    if (!materialId) {
      this.showLoadError('素材ID不能为空');
      return;
    }
    
    this.setData({
      materialId: materialId
    });
    
    // 加载素材数据
    this.loadMaterialData();
    
    // 加载用户分类
    this.loadAvailableCategories();
    
    // 检查是否需要显示分析面板
    if (options.showAnalysis === 'true') {
      this.setData({
        showAnalysis: true
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 如果从编辑页面返回，刷新数据
    if (app.globalData.shouldRefreshMaterialDetail) {
      this.loadMaterialData();
      app.globalData.shouldRefreshMaterialDetail = false;
    }
  },

  /**
   * 加载素材数据
   */
  loadMaterialData: function() {
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    // 同时加载素材详情和使用历史
    Promise.all([
      this.loadMaterialDetail(),
      this.loadUsageHistory(),
      this.loadRelatedMaterials()
    ]).then(() => {
      this.setData({
        isLoading: false
      });
    }).catch(error => {
      console.error('加载数据失败:', error);
      this.showLoadError('加载失败，请检查网络连接');
      this.setData({
        isLoading: false
      });
    });
  },

  /**
   * 加载素材详情
   */
  loadMaterialDetail: function() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'getMaterialDetail',
        data: {
          materialId: this.data.materialId,
          includeStats: true
        }
      }).then(res => {
        if (res.result && res.result.success) {
          const material = res.result.material;
          
          // 处理素材数据
          this.processMaterialData(material);
          
          // 生成分类建议
          this.generateCategorySuggestions(material);
          
          resolve();
        } else {
          reject(new Error(res.result.message || '获取素材详情失败'));
        }
      }).catch(err => {
        console.error('获取素材详情失败:', err);
        reject(err);
      });
    });
  },

  /**
   * 处理素材数据
   */
  processMaterialData: function(material) {
    // 提取标题和预览
    const content = material.content || '';
    const preview = content.length > 100 
      ? content.substring(0, 100) + '...'
      : content;
    
    const title = material.sourceInfo?.title || 
                  content.split('\n')[0]?.substring(0, 30) || 
                  '未命名素材';
    
    // 处理标签
    const impressionTags = material.impressionTags || [];
    const structureTags = material.structureTags || [];
    const functionTags = material.functionTags || [];
    
    // 处理分类
    const categories = material.categories || [];
    
    // 处理标签统计
    const tagStats = material.tagStats || {};
    
    // 更新数据
    this.setData({
      material: {
        ...material,
        title: title,
        preview: preview,
        impressionTags: impressionTags,
        structureTags: structureTags,
        functionTags: functionTags,
        categories: categories,
        tagStats: tagStats
      },
      originalMaterial: JSON.parse(JSON.stringify(material))
    });
  },

  /**
   * 生成分类建议
   */
  generateCategorySuggestions: function(material) {
    if (material.categories && material.categories.length > 0) {
      return;
    }
    
    const content = material.content || '';
    if (content.length < 50) {
      return;
    }
    
    // 分析内容生成分类建议
    const analysis = utils.analyzeText(content);
    const suggestions = [];
    
    // 基于关键词的简单分类
    const keywordMap = {
      '政策': '政策文件',
      '法规': '政策文件',
      '条例': '政策文件',
      '报告': '行业报告',
      '分析': '行业报告',
      '研究': '行业报告',
      '案例': '案例分析',
      '事例': '案例分析',
      '数据': '数据统计',
      '统计': '数据统计',
      '文案': '优秀文案',
      '广告': '优秀文案',
      '宣传': '优秀文案',
      '学术': '学术文献',
      '论文': '学术文献'
    };
    
    if (analysis.keywords) {
      analysis.keywords.forEach(keyword => {
        for (const [key, category] of Object.entries(keywordMap)) {
          if (keyword.includes(key) && !suggestions.includes(category)) {
            suggestions.push(category);
          }
        }
      });
    }
    
    // 去重并限制数量
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 3);
    
    if (uniqueSuggestions.length > 0) {
      this.setData({
        categorySuggestions: uniqueSuggestions
      });
    }
  },

  /**
   * 加载使用历史
   */
  loadUsageHistory: function() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'getMaterialUsageHistory',
        data: {
          materialId: this.data.materialId
        }
      }).then(res => {
        if (res.result && res.result.success) {
          const history = res.result.history || [];
          
          // 格式化日期
          const formattedHistory = history.map(item => ({
            ...item,
            formattedTime: dateUtils.formatDateTime(item.timestamp)
          }));
          
          this.setData({
            usageHistory: formattedHistory
          });
          
          resolve();
        } else {
          reject(new Error('获取使用历史失败'));
        }
      }).catch(err => {
        console.error('获取使用历史失败:', err);
        reject(err);
      });
    });
  },

  /**
   * 加载相关素材
   */
  loadRelatedMaterials: function() {
    if (this.data.isLoadingRelated) {
      return Promise.resolve();
    }
    
    this.setData({
      isLoadingRelated: true
    });
    
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'getRelatedMaterials',
        data: {
          materialId: this.data.materialId,
          limit: 5
        }
      }).then(res => {
        this.setData({
          isLoadingRelated: false
        });
        
        if (res.result && res.result.success) {
          const related = res.result.materials || [];
          
          // 处理相关素材数据
          const processedRelated = related.map(item => ({
            ...item,
            preview: item.content?.substring(0, 80) + '...' || '',
            similarity: Math.round(item.similarity * 100)
          }));
          
          this.setData({
            relatedMaterials: processedRelated
          });
          
          resolve();
        } else {
          reject(new Error('获取相关素材失败'));
        }
      }).catch(err => {
        this.setData({
          isLoadingRelated: false
        });
        console.error('获取相关素材失败:', err);
        reject(err);
      });
    });
  },

  /**
   * 加载可用分类
   */
  loadAvailableCategories: function() {
    const userPrefs = wx.getStorageSync('userPreferences') || {};
    const categories = userPrefs.categories || [
      '政策文件', '行业报告', '案例分析', 
      '数据统计', '优秀文案', '学术文献'
    ];
    
    this.setData({
      availableCategories: categories
    });
  },

  /**
   * 显示加载错误
   */
  showLoadError: function(message) {
    this.setData({
      loadError: true,
      errorMessage: message,
      isLoading: false
    });
  },

  /**
   * 重试加载
   */
  retryLoad: function() {
    this.loadMaterialData();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function() {
    this.setData({
      isRefreshing: true
    });
    
    this.loadMaterialData().finally(() => {
      setTimeout(() => {
        this.setData({
          isRefreshing: false
        });
        wx.stopPullDownRefresh();
      }, 500);
    });
  },

  /**
   * 返回上一页
   */
  goBack: function() {
    if (this.data.isEditing && this.hasUnsavedChanges()) {
      wx.showModal({
        title: '确认离开',
        content: '当前有未保存的更改，确定要离开吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 检查是否有未保存的更改
   */
  hasUnsavedChanges: function() {
    if (!this.data.originalMaterial || !this.data.isEditing) {
      return false;
    }
    
    const current = this.data.material;
    const original = this.data.originalMaterial;
    
    // 比较关键字段
    return (
      current.content !== original.content ||
      JSON.stringify(current.impressionTags) !== JSON.stringify(original.impressionTags) ||
      JSON.stringify(current.structureTags) !== JSON.stringify(original.structureTags) ||
      JSON.stringify(current.functionTags) !== JSON.stringify(original.functionTags) ||
      JSON.stringify(current.categories) !== JSON.stringify(original.categories) ||
      JSON.stringify(current.sourceInfo) !== JSON.stringify(original.sourceInfo)
    );
  },

  /**
   * 切换编辑模式
   */
  toggleEditMode: function() {
    if (this.data.isEditing) {
      this.saveChanges();
    } else {
      this.setData({
        isEditing: true
      });
    }
  },

  /**
   * 保存更改
   */
  saveChanges: function() {
    if (!this.hasUnsavedChanges()) {
      this.setData({
        isEditing: false
      });
      return;
    }
    
    // 验证数据
    if (!this.validateMaterial()) {
      return;
    }
    
    const updateData = this.prepareUpdateData();
    
    wx.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 调用云函数更新素材
    wx.cloud.callFunction({
      name: 'updateMaterial',
      data: {
        materialId: this.data.materialId,
        material: updateData
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        // 更新成功
        this.setData({
          isEditing: false,
          originalMaterial: JSON.parse(JSON.stringify(this.data.material))
        });
        
        this.showSuccessToast('保存成功');
        
        // 设置全局刷新标志
        app.globalData.shouldRefreshMaterials = true;
        
        // 刷新相关数据
        this.loadRelatedMaterials();
      } else {
        wx.showToast({
          title: res.result.message || '保存失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('保存失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 验证素材数据
   */
  validateMaterial: function() {
    const material = this.data.material;
    
    if (!material.content || material.content.trim().length === 0) {
      wx.showToast({
        title: '内容不能为空',
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    
    if (material.impressionTags.length === 0) {
      wx.showToast({
        title: '请至少选择一个印象标签',
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    
    return true;
  },

  /**
   * 准备更新数据
   */
  prepareUpdateData: function() {
    const material = this.data.material;
    
    return {
      content: material.content,
      impressionTags: material.impressionTags,
      structureTags: material.structureTags,
      functionTags: material.functionTags,
      categories: material.categories,
      sourceInfo: material.sourceInfo,
      updateTime: new Date().getTime()
    };
  },

  /**
   * 切换分析面板
   */
  toggleAnalysis: function() {
    this.setData({
      showAnalysis: !this.data.showAnalysis
    });
  },

  /**
   * 智能分析标签
   */
  analyzeTags: function() {
    if (this.data.isAnalyzingTags) {
      return;
    }
    
    this.setData({
      isAnalyzingTags: true
    });
    
    wx.cloud.callFunction({
      name: 'aiTagSuggestion',
      data: {
        content: this.data.material.content,
        impressionTags: this.data.material.impressionTags
      }
    }).then(res => {
      this.setData({
        isAnalyzingTags: false
      });
      
      if (res.result && res.result.success) {
        const suggestions = res.result.suggestions || {};
        
        // 更新标签
        this.setData({
          'material.structureTags': suggestions.structureTags || [],
          'material.functionTags': suggestions.functionTags || []
        });
        
        this.showSuccessToast('分析完成，已更新标签');
      } else {
        wx.showToast({
          title: '分析失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      this.setData({
        isAnalyzingTags: false
      });
      console.error('分析失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 标签变化事件
   */
  onTagChange: function(e) {
    const { type, tags } = e.detail;
    
    if (type === 'impression') {
      this.setData({
        'material.impressionTags': tags
      });
    } else if (type === 'structure') {
      this.setData({
        'material.structureTags': tags
      });
    } else if (type === 'function') {
      this.setData({
        'material.functionTags': tags
      });
    }
  },

  /**
   * 验证来源链接
   */
  verifySource: function() {
    const sourceInfo = this.data.material.sourceInfo || {};
    const url = sourceInfo.url;
    
    if (!url) {
      wx.showToast({
        title: '无来源链接',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.showLoading({
      title: '验证中...',
      mask: true
    });
    
    // 调用云函数验证链接
    wx.cloud.callFunction({
      name: 'verifySource',
      data: { url: url }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result) {
        this.setData({
          verificationResult: res.result
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('验证失败:', err);
      wx.showToast({
        title: '验证失败',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 来源信息变化
   */
  onSourceChange: function(e) {
    const sourceInfo = e.detail;
    this.setData({
      'material.sourceInfo': sourceInfo,
      verificationResult: null
    });
  },

  /**
   * 添加分类
   */
  addCategory: function() {
    this.setData({
      showCategoryModal: true
    });
  },

  /**
   * 隐藏分类模态框
   */
  hideCategoryModal: function() {
    this.setData({
      showCategoryModal: false,
      newCustomCategory: ''
    });
  },

  /**
   * 选择分类
   */
  selectCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    const currentCategories = this.data.material.categories || [];
    const index = currentCategories.indexOf(category);
    
    if (index === -1) {
      currentCategories.push(category);
    } else {
      currentCategories.splice(index, 1);
    }
    
    this.setData({
      'material.categories': currentCategories
    });
  },

  /**
   * 新分类输入
   */
  onNewCategoryInput: function(e) {
    this.setData({
      newCustomCategory: e.detail.value
    });
  },

  /**
   * 添加自定义分类
   */
  addCustomCategory: function() {
    const newCategory = this.data.newCustomCategory.trim();
    if (!newCategory) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    const currentCategories = this.data.material.categories || [];
    const availableCategories = this.data.availableCategories;
    
    // 添加到当前分类
    if (!currentCategories.includes(newCategory)) {
      currentCategories.push(newCategory);
    }
    
    // 添加到可用分类
    if (!availableCategories.includes(newCategory)) {
      availableCategories.unshift(newCategory);
      
      // 更新本地存储
      const userPrefs = wx.getStorageSync('userPreferences') || {};
      userPrefs.categories = availableCategories;
      wx.setStorageSync('userPreferences', userPrefs);
    }
    
    this.setData({
      'material.categories': currentCategories,
      availableCategories: availableCategories,
      newCustomCategory: ''
    });
    
    wx.showToast({
      title: '添加成功',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 确认分类选择
   */
  confirmCategories: function() {
    this.hideCategoryModal();
    this.showSuccessToast('分类已更新');
  },

  /**
   * 移除分类
   */
  removeCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    const currentCategories = this.data.material.categories || [];
    const index = currentCategories.indexOf(category);
    
    if (index !== -1) {
      currentCategories.splice(index, 1);
      this.setData({
        'material.categories': currentCategories
      });
      
      this.showSuccessToast('已移除分类');
    }
  },

  /**
   * 分类选择器变化
   */
  onCategoryPickerChange: function(e) {
    const index = e.detail.value;
    const category = this.data.availableCategories[index];
    
    if (category) {
      const currentCategories = this.data.material.categories || [];
      if (!currentCategories.includes(category)) {
        currentCategories.push(category);
        this.setData({
          'material.categories': currentCategories,
          newCategoryIndex: -1
        });
      }
    }
  },

  /**
   * 应用分类建议
   */
  applyCategorySuggestion: function(e) {
    const category = e.currentTarget.dataset.category;
    const currentCategories = this.data.material.categories || [];
    
    if (!currentCategories.includes(category)) {
      currentCategories.push(category);
      this.setData({
        'material.categories': currentCategories
      });
      
      this.showSuccessToast('已应用分类建议');
    }
  },

  /**
   * 使用历史项点击
   */
  onHistoryItemClick: function(e) {
    const item = e.detail.item;
    
    // 跳转到对应的写作页面
    if (item.writingId) {
      wx.navigateTo({
        url: `/pages/index/index?writingId=${item.writingId}`
      });
    }
  },

  /**
   * 刷新相关素材
   */
  refreshRelated: function() {
    this.loadRelatedMaterials().then(() => {
      this.showSuccessToast('已刷新相关素材');
    }).catch(() => {
      wx.showToast({
        title: '刷新失败',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 查看相关素材
   */
  viewRelatedMaterial: function(e) {
    const materialId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?materialId=${materialId}`
    });
  },

  /**
   * 查找相关素材
   */
  findRelatedMaterials: function() {
    this.loadRelatedMaterials();
  },

  /**
   * 快速使用素材
   */
  onQuickUse: function(e) {
    const material = e.detail.material;
    
    // 跳转到写作页面并传递素材ID
    wx.navigateTo({
      url: `/pages/index/index?materialId=${material._id}`
    });
  },

  /**
   * 在写作中使用
   */
  useInWriting: function() {
    wx.navigateTo({
      url: `/pages/index/index?materialId=${this.data.materialId}&action=use`
    });
  },

  /**
   * 加入收藏夹
   */
  addToCollection: function() {
    wx.cloud.callFunction({
      name: 'addToCollection',
      data: {
        materialId: this.data.materialId,
        collectionId: 'favorites'
      }
    }).then(res => {
      if (res.result && res.result.success) {
        this.showSuccessToast('已加入收藏夹');
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
   * 分享素材
   */
  shareMaterial: function() {
    const material = this.data.material;
    
    wx.showActionSheet({
      itemList: ['生成分享卡片', '复制分享链接', '分享到微信'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.generateShareCard();
            break;
          case 1:
            this.copyShareLink();
            break;
          case 2:
            this.shareToWechat();
            break;
        }
      }
    });
  },

  /**
   * 生成分享卡片
   */
  generateShareCard: function() {
    wx.showLoading({
      title: '生成中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'generateShareCard',
      data: {
        materialId: this.data.materialId
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const imageUrl = res.result.imageUrl;
        
        // 预览图片
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
  copyShareLink: function() {
    const shareLink = `${app.globalData.shareBaseUrl}/material/${this.data.materialId}`;
    
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
   * 分享到微信
   */
  shareToWechat: function() {
    const material = this.data.material;
    
    wx.shareAppMessage({
      title: material.title || '灵材智库素材分享',
      path: `/pages/detail/detail?materialId=${this.data.materialId}&share=1`,
      imageUrl: '/assets/images/share-material.jpg'
    });
  },

  /**
   * 导出素材
   */
  exportMaterial: function() {
    const material = this.data.material;
    const exportData = {
      标题: material.title || '未命名素材',
      内容: material.content,
      印象标签: material.impressionTags.join(', '),
      结构标签: material.structureTags.join(', '),
      功能标签: material.functionTags.join(', '),
      分类: material.categories.join(', '),
      来源: material.sourceInfo?.title || '无',
      作者: material.sourceInfo?.author || '无',
      链接: material.sourceInfo?.url || '无',
      创建时间: this.formatDate(material.createTime),
      更新时间: this.formatDate(material.updateTime)
    };
    
    // 转换为文本格式
    let textContent = '';
    for (const [key, value] of Object.entries(exportData)) {
      textContent += `${key}: ${value}\n`;
    }
    
    const timestamp = new Date().getTime();
    const filename = `灵材智库_素材_${timestamp}.txt`;
    
    // 创建临时文件
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/${filename}`;
    
    fs.writeFile({
      filePath: filePath,
      data: textContent,
      encoding: 'utf8',
      success: () => {
        wx.saveFileToDisk({
          filePath: filePath,
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
              title: '导出失败',
              icon: 'error',
              duration: 2000
            });
          }
        });
      },
      fail: (err) => {
        console.error('写入文件失败:', err);
        wx.showToast({
          title: '导出失败',
          icon: 'error',
          duration: 2000
        });
      }
    });
  },

  /**
   * 复制素材
   */
  duplicateMaterial: function() {
    wx.showModal({
      title: '复制素材',
      content: '确认复制此素材吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDuplicate();
        }
      }
    });
  },

  /**
   * 执行复制操作
   */
  performDuplicate: function() {
    const material = this.data.material;
    
    const duplicateData = {
      content: material.content,
      impressionTags: material.impressionTags,
      structureTags: material.structureTags,
      functionTags: material.functionTags,
      categories: material.categories,
      sourceInfo: material.sourceInfo,
      privacy: material.privacy
    };
    
    wx.showLoading({
      title: '复制中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'saveMaterial',
      data: { material: duplicateData }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 2000
        });
        
        // 跳转到新素材的详情页
        const newMaterialId = res.result.materialId;
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/detail/detail?materialId=${newMaterialId}`
          });
        }, 1500);
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
   * 删除素材
   */
  deleteMaterial: function() {
    this.setData({
      showDeleteModal: true
    });
  },

  /**
   * 隐藏删除确认框
   */
  hideDeleteModal: function() {
    this.setData({
      showDeleteModal: false,
      keepUsageRecords: false
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
   * 确认删除
   */
  confirmDelete: function() {
    wx.showLoading({
      title: '删除中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'deleteMaterial',
      data: {
        materialId: this.data.materialId,
        keepUsageRecords: this.data.keepUsageRecords
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        });
        
        // 设置全局刷新标志
        app.globalData.shouldRefreshMaterials = true;
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '删除失败',
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
    }).finally(() => {
      this.hideDeleteModal();
    });
  },

  /**
   * 显示成功提示
   */
  showSuccessToast: function(message) {
    this.setData({
      showSuccessToast: true,
      successMessage: message
    });
    
    setTimeout(() => {
      this.setData({
        showSuccessToast: false
      });
    }, 2000);
  },

  /**
   * 格式化日期
   */
  formatDate: function(timestamp) {
    if (!timestamp) return '未知';
    
    const date = new Date(timestamp);
    return dateUtils.formatDateTime(date);
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    const material = this.data.material;
    
    return {
      title: material.title || '灵材智库素材分享',
      path: `/pages/detail/detail?materialId=${this.data.materialId}&share=1`,
      imageUrl: '/assets/images/share-detail.jpg'
    };
  }
});