// pages/collect/collect.js

// 引入工具函数
const app = getApp();
const utils = require('../../utils/helpers/text-analyzer');
const materialValidator = require('../../utils/validators/material-validator');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 编辑状态
    isEditing: false,
    editingMaterialId: null,
    
    // 素材内容
    content: '',
    originalContent: '',
    
    // OCR相关
    showOCR: false,
    ocrText: '',
    ocrImages: [],
    
    // 印象标签
    impressionTags: [
      {
        value: 'insight',
        name: '观点新颖',
        description: '角度独特、见解深刻、启发思考'
      },
      {
        value: 'logic',
        name: '论述有力',
        description: '逻辑严谨、论证充分、说服力强'
      },
      {
        value: 'expression',
        name: '表达生动',
        description: '文笔优美、比喻精妙、感染力强'
      },
      {
        value: 'data',
        name: '数据权威',
        description: '数据详实、来源可靠、论证有力'
      },
      {
        value: 'style',
        name: '风格典范',
        description: '结构清晰、语感优秀、可作范例'
      }
    ],
    selectedImpressionTags: [],
    
    // 来源信息
    showSourceSection: false,
    sourceType: 'unknown',
    sourceTitle: '',
    sourceAuthor: '',
    sourceUrl: '',
    sourceDate: '',
    sourceNote: '',
    sourceHint: '',
    
    // 智能识别
    showSmartRecognition: false,
    smartSuggestions: [],
    
    // 分类管理
    userCategories: [],
    selectedCategories: [],
    newCategory: '',
    categorySuggestions: [],
    
    // 高级选项
    showAdvancedSection: false,
    privacy: 'private',
    autoAnalyze: true,
    setReminder: false,
    reminderDate: '',
    today: '',
    maxReminderDate: '',
    
    // 操作状态
    isSaving: false,
    isAnalyzing: false,
    canSave: false,
    scrollToView: '',
    
    // 保存状态
    saveStatus: null,
    
    // 模态框
    showSuccessModal: false,
    showConfirmClear: false,
    successMessage: '',
    
    // 分享来源数据
    shareData: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('收集页加载，参数:', options);
    
    // 初始化日期
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    
    this.setData({
      today: this.formatDate(today),
      maxReminderDate: this.formatDate(maxDate),
      reminderDate: this.formatDate(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000))
    });
    
    // 加载用户分类
    this.loadUserCategories();
    
    // 检查是否为编辑模式
    if (options.materialId) {
      this.loadMaterialForEdit(options.materialId);
    }
    
    // 检查是否有分享数据
    if (options.share) {
      this.handleSharedData(options);
    }
    
    // 检查剪贴板内容
    this.checkClipboardContent();
    
    // 设置自动保存监听
    this.setupAutoSave();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 更新用户分类（可能在其他页面修改过）
    this.loadUserCategories();
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 加载用户分类
   */
  loadUserCategories: function() {
    const userPrefs = wx.getStorageSync('userPreferences') || {};
    const categories = userPrefs.categories || ['政策文件', '行业报告', '案例分析', '数据统计', '优秀文案'];
    
    this.setData({
      userCategories: categories
    });
  },

  /**
   * 加载要编辑的素材
   */
  loadMaterialForEdit: function(materialId) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    // 调用云函数获取素材详情
    wx.cloud.callFunction({
      name: 'getMaterialDetail',
      data: { materialId: materialId }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const material = res.result.material;
        this.populateFormWithMaterial(material);
      } else {
        wx.showToast({
          title: '加载素材失败',
          icon: 'error',
          duration: 2000
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('加载素材失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 用素材数据填充表单
   */
  populateFormWithMaterial: function(material) {
    // 解析标签
    const impressionTags = material.impressionTags || [];
    const selectedImpressionTags = this.data.impressionTags
      .filter(tag => impressionTags.includes(tag.value))
      .map(tag => tag.value);
    
    // 解析来源信息
    const sourceInfo = material.sourceInfo || {};
    
    // 解析分类
    const selectedCategories = material.categories || [];
    
    // 设置表单数据
    this.setData({
      isEditing: true,
      editingMaterialId: material._id,
      content: material.content,
      originalContent: material.content,
      selectedImpressionTags: selectedImpressionTags,
      sourceType: sourceInfo.type || 'unknown',
      sourceTitle: sourceInfo.title || '',
      sourceAuthor: sourceInfo.author || '',
      sourceUrl: sourceInfo.url || '',
      sourceDate: sourceInfo.date || '',
      sourceNote: sourceInfo.note || '',
      selectedCategories: selectedCategories,
      showSourceSection: !!sourceInfo.title || !!sourceInfo.type,
      privacy: material.privacy || 'private',
      autoAnalyze: false, // 编辑时不自动分析
      canSave: true
    });
    
    // 显示来源提示
    if (sourceInfo.title) {
      this.setData({
        sourceHint: `正在编辑素材：${sourceInfo.title}`
      });
    }
    
    // 滚动到顶部
    this.setData({
      scrollToView: 'tagSection'
    });
  },

  /**
   * 处理分享数据
   */
  handleSharedData: function(options) {
    try {
      const shareData = JSON.parse(decodeURIComponent(options.share));
      this.setData({
        shareData: shareData,
        sourceHint: `检测到来自${shareData.appName || '其他应用'}的分享`
      });
      
      // 自动填充分享内容
      if (shareData.content) {
        this.setData({
          content: shareData.content
        });
      }
      
      // 自动识别来源
      this.analyzeSharedSource(shareData);
      
    } catch (error) {
      console.error('解析分享数据失败:', error);
    }
  },

  /**
   * 分析分享来源
   */
  analyzeSharedSource: function(shareData) {
    const suggestions = [];
    
    if (shareData.title) {
      suggestions.push({
        field: '标题',
        value: shareData.title
      });
    }
    
    if (shareData.source) {
      suggestions.push({
        field: '来源',
        value: shareData.source
      });
    }
    
    if (shareData.url) {
      suggestions.push({
        field: '链接',
        value: shareData.url
      });
    }
    
    if (suggestions.length > 0) {
      this.setData({
        smartSuggestions: suggestions,
        showSmartRecognition: true,
        showSourceSection: true
      });
    }
  },

  /**
   * 检查剪贴板内容
   */
  checkClipboardContent: function() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data.trim();
        if (text && text.length > 20 && text.length < 1000) {
          // 提示用户是否使用剪贴板内容
          wx.showModal({
            title: '检测到剪贴板内容',
            content: '是否使用剪贴板中的内容作为素材？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.setData({
                  content: text,
                  sourceHint: '已使用剪贴板内容'
                });
                
                // 自动分析文本
                this.analyzeTextForSuggestions(text);
              }
            }
          });
        }
      }
    });
  },

  /**
   * 设置自动保存
   */
  setupAutoSave: function() {
    // 每30秒自动保存草稿
    this.autoSaveTimer = setInterval(() => {
      if (this.data.content && !this.data.isSaving && !this.data.isEditing) {
        this.saveAsDraft();
      }
    }, 30000);
  },

  /**
   * 分析文本获取建议
   */
  analyzeTextForSuggestions: function(text) {
    if (!text || text.length < 50) return;
    
    // 调用工具函数分析文本
    const analysis = utils.analyzeText(text);
    
    // 生成分类建议
    const categorySuggestions = this.generateCategorySuggestions(analysis);
    
    this.setData({
      categorySuggestions: categorySuggestions
    });
    
    // 更新保存状态
    this.updateSaveStatus();
  },

  /**
   * 生成分类建议
   */
  generateCategorySuggestions: function(analysis) {
    const suggestions = [];
    
    // 基于关键词匹配分类
    const keywordCategories = {
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
      '宣传': '优秀文案'
    };
    
    // 检查分析结果中的关键词
    if (analysis.keywords) {
      analysis.keywords.forEach(keyword => {
        for (const [key, category] of Object.entries(keywordCategories)) {
          if (keyword.includes(key) && !suggestions.includes(category)) {
            suggestions.push(category);
          }
        }
      });
    }
    
    return suggestions.slice(0, 3); // 最多返回3个建议
  },

  /**
   * 事件处理函数
   */
  
  // 返回上一页
  goBack: function() {
    if (this.hasUnsavedChanges()) {
      wx.showModal({
        title: '确认离开',
        content: '当前内容尚未保存，确定要离开吗？',
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

  // 检查是否有未保存的更改
  hasUnsavedChanges: function() {
    if (this.data.isEditing) {
      return this.data.content !== this.data.originalContent;
    }
    return this.data.content.trim().length > 0;
  },

  // 内容变化
  onContentChange: function(e) {
    const content = e.detail.value;
    this.setData({
      content: content
    });
    
    // 更新保存状态
    this.updateSaveStatus();
    
    // 内容变化时自动分析（防抖处理）
    if (this.contentTimer) {
      clearTimeout(this.contentTimer);
    }
    
    this.contentTimer = setTimeout(() => {
      if (content.length > 50) {
        this.analyzeTextForSuggestions(content);
      }
    }, 1000);
  },

  // 内容失去焦点
  onContentBlur: function() {
    // 触发自动分析
    if (this.data.content.length > 50 && this.data.autoAnalyze) {
      this.analyzeTextForSuggestions(this.data.content);
    }
  },

  // 更新保存状态
  updateSaveStatus: function() {
    const hasContent = this.data.content.trim().length > 0;
    const hasImpressionTags = this.data.selectedImpressionTags.length > 0;
    
    this.setData({
      canSave: hasContent && hasImpressionTags
    });
  },

  // 切换OCR显示
  toggleOCR: function() {
    this.setData({
      showOCR: !this.data.showOCR
    });
  },

  // 从剪贴板粘贴
  pasteFromClipboard: function() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data.trim();
        if (text) {
          this.setData({
            content: text,
            sourceHint: '已从剪贴板粘贴内容'
          });
          
          // 更新保存状态
          this.updateSaveStatus();
          
          // 自动分析文本
          this.analyzeTextForSuggestions(text);
          
          wx.showToast({
            title: '粘贴成功',
            icon: 'success',
            duration: 1500
          });
        } else {
          wx.showToast({
            title: '剪贴板为空',
            icon: 'none',
            duration: 1500
          });
        }
      },
      fail: (err) => {
        console.error('获取剪贴板失败:', err);
        wx.showToast({
          title: '粘贴失败',
          icon: 'error',
          duration: 1500
        });
      }
    });
  },

  // 清空内容
  clearContent: function() {
    if (this.data.content.trim().length === 0) {
      return;
    }
    
    this.setData({
      showConfirmClear: true
    });
  },

  // 隐藏确认清除对话框
  hideConfirmClear: function() {
    this.setData({
      showConfirmClear: false
    });
  },

  // 确认清除内容
  confirmClear: function() {
    this.setData({
      content: '',
      ocrText: '',
      selectedImpressionTags: [],
      selectedCategories: [],
      categorySuggestions: [],
      canSave: false,
      showConfirmClear: false
    });
    
    wx.showToast({
      title: '已清空',
      icon: 'success',
      duration: 1500
    });
  },

  // OCR识别完成
  onOCRComplete: function(e) {
    const { text, images } = e.detail;
    
    this.setData({
      ocrText: text,
      ocrImages: images,
      showOCR: false
    });
    
    // 滚动到OCR结果区域
    this.setData({
      scrollToView: 'tagSection'
    });
  },

  // OCR取消
  onOCRCancel: function() {
    this.setData({
      showOCR: false
    });
  },

  // 使用OCR文本
  useOCRText: function() {
    this.setData({
      content: this.data.ocrText,
      ocrText: ''
    });
    
    // 更新保存状态
    this.updateSaveStatus();
    
    // 自动分析文本
    this.analyzeTextForSuggestions(this.data.content);
    
    wx.showToast({
      title: '已使用识别文本',
      icon: 'success',
      duration: 1500
    });
  },

  // 追加OCR文本
  appendOCRText: function() {
    const newContent = this.data.content + '\n\n' + this.data.ocrText;
    this.setData({
      content: newContent,
      ocrText: ''
    });
    
    // 更新保存状态
    this.updateSaveStatus();
    
    wx.showToast({
      title: '已追加到末尾',
      icon: 'success',
      duration: 1500
    });
  },

  // 清除OCR文本
  clearOCRText: function() {
    this.setData({
      ocrText: '',
      ocrImages: []
    });
  },

  // 印象标签变化
  onImpressionTagChange: function(e) {
    const selectedTags = e.detail.selectedTags;
    this.setData({
      selectedImpressionTags: selectedTags
    });
    
    // 更新保存状态
    this.updateSaveStatus();
  },

  // 切换来源区域
  toggleSourceSection: function() {
    this.setData({
      showSourceSection: !this.data.showSourceSection
    });
    
    // 如果需要滚动
    if (!this.data.showSourceSection) {
      this.setData({
        scrollToView: 'categorySection'
      });
    }
  },

  // 来源信息变化
  onSourceChange: function(e) {
    const sourceData = e.detail;
    
    this.setData({
      sourceType: sourceData.sourceType,
      sourceTitle: sourceData.sourceTitle,
      sourceAuthor: sourceData.sourceAuthor,
      sourceUrl: sourceData.sourceUrl,
      sourceDate: sourceData.sourceDate,
      sourceNote: sourceData.sourceNote
    });
    
    // 自动识别来源类型
    if (sourceData.sourceUrl && !sourceData.sourceType) {
      this.autoDetectSourceType(sourceData.sourceUrl);
    }
  },

  // 自动检测来源类型
  autoDetectSourceType: function(url) {
    const urlPatterns = {
      'gov.cn': 'policy',
      'edu.cn': 'academic',
      'news.': 'news',
      'weixin.qq.com': 'wechat',
      'zhihu.com': 'forum',
      'douban.com': 'review'
    };
    
    let detectedType = 'website';
    
    for (const [pattern, type] of Object.entries(urlPatterns)) {
      if (url.includes(pattern)) {
        detectedType = type;
        break;
      }
    }
    
    this.setData({
      sourceType: detectedType
    });
  },

  // 应用智能建议
  applySuggestion: function(e) {
    const { field, value } = e.currentTarget.dataset;
    
    switch (field) {
      case '标题':
        this.setData({ sourceTitle: value });
        break;
      case '来源':
        this.setData({ sourceAuthor: value });
        break;
      case '链接':
        this.setData({ sourceUrl: value });
        break;
    }
    
    // 移除已应用的建议
    const newSuggestions = this.data.smartSuggestions.filter(
      item => item.field !== field
    );
    
    this.setData({
      smartSuggestions: newSuggestions,
      showSmartRecognition: newSuggestions.length > 0
    });
    
    wx.showToast({
      title: '已应用',
      icon: 'success',
      duration: 1500
    });
  },

  // 清除来源提示
  clearSourceHint: function() {
    this.setData({
      sourceHint: ''
    });
  },

  // 分类变化
  onCategoryChange: function(e) {
    const selectedCategories = e.detail.selectedCategories;
    this.setData({
      selectedCategories: selectedCategories
    });
  },

  // 新分类输入变化
  onNewCategoryChange: function(e) {
    this.setData({
      newCategory: e.detail.value
    });
  },

  // 添加新分类
  addNewCategory: function() {
    const newCategory = this.data.newCategory.trim();
    
    if (!newCategory) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    if (this.data.userCategories.includes(newCategory)) {
      wx.showToast({
        title: '分类已存在',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    const userCategories = [...this.data.userCategories, newCategory];
    const selectedCategories = [...this.data.selectedCategories, newCategory];
    
    // 更新本地存储
    const userPrefs = wx.getStorageSync('userPreferences') || {};
    userPrefs.categories = userCategories;
    wx.setStorageSync('userPreferences', userPrefs);
    
    this.setData({
      userCategories: userCategories,
      selectedCategories: selectedCategories,
      newCategory: ''
    });
    
    wx.showToast({
      title: '添加成功',
      icon: 'success',
      duration: 1500
    });
  },

  // 删除分类
  removeCategory: function(e) {
    const category = e.detail.category;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除分类"${category}"吗？该操作将同时从所有素材中移除此分类。`,
      success: (res) => {
        if (res.confirm) {
          const userCategories = this.data.userCategories.filter(
            item => item !== category
          );
          
          const selectedCategories = this.data.selectedCategories.filter(
            item => item !== category
          );
          
          // 更新本地存储
          const userPrefs = wx.getStorageSync('userPreferences') || {};
          userPrefs.categories = userCategories;
          wx.setStorageSync('userPreferences', userPrefs);
          
          this.setData({
            userCategories: userCategories,
            selectedCategories: selectedCategories
          });
          
          // 调用云函数更新所有相关素材
          wx.cloud.callFunction({
            name: 'updateMaterialCategories',
            data: {
              action: 'remove',
              category: category
            }
          });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

  // 切换分类建议
  toggleSuggestion: function(e) {
    const category = e.currentTarget.dataset.category;
    const selectedCategories = [...this.data.selectedCategories];
    const index = selectedCategories.indexOf(category);
    
    if (index === -1) {
      selectedCategories.push(category);
    } else {
      selectedCategories.splice(index, 1);
    }
    
    this.setData({
      selectedCategories: selectedCategories
    });
  },

  // 切换高级选项
  toggleAdvancedSection: function() {
    this.setData({
      showAdvancedSection: !this.data.showAdvancedSection
    });
  },

  // 隐私设置变化
  onPrivacyChange: function(e) {
    this.setData({
      privacy: e.detail.value
    });
  },

  // 自动分析变化
  onAutoAnalyzeChange: function(e) {
    this.setData({
      autoAnalyze: e.detail.value
    });
  },

  // 提醒设置变化
  onReminderChange: function(e) {
    this.setData({
      setReminder: e.detail.value
    });
  },

  // 提醒日期变化
  onReminderDateChange: function(e) {
    this.setData({
      reminderDate: e.detail.value
    });
  },

  /**
   * 保存素材
   */
  saveMaterial: function() {
    if (!this.data.canSave || this.data.isSaving) {
      return;
    }
    
    // 验证数据
    const validation = materialValidator.validate({
      content: this.data.content,
      impressionTags: this.data.selectedImpressionTags,
      categories: this.data.selectedCategories
    });
    
    if (!validation.valid) {
      wx.showToast({
        title: validation.message,
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    this.setData({
      isSaving: true
    });
    
    // 准备保存数据
    const materialData = {
      content: this.data.content.trim(),
      impressionTags: this.data.selectedImpressionTags,
      categories: this.data.selectedCategories,
      sourceInfo: {
        type: this.data.sourceType,
        title: this.data.sourceTitle.trim(),
        author: this.data.sourceAuthor.trim(),
        url: this.data.sourceUrl.trim(),
        date: this.data.sourceDate,
        note: this.data.sourceNote.trim()
      },
      privacy: this.data.privacy,
      reminderDate: this.data.setReminder ? this.data.reminderDate : null,
      autoAnalyze: this.data.autoAnalyze
    };
    
    // 调用云函数保存素材
    const cloudFunction = this.data.isEditing ? 'updateMaterial' : 'saveMaterial';
    const actionData = this.data.isEditing 
      ? { materialId: this.data.editingMaterialId, material: materialData }
      : { material: materialData };
    
    wx.cloud.callFunction({
      name: cloudFunction,
      data: actionData
    }).then(res => {
      this.setData({
        isSaving: false
      });
      
      if (res.result && res.result.success) {
        this.showSaveSuccess(res.result.materialId);
        
        // 设置全局刷新标志
        app.globalData.shouldRefreshMaterials = true;
      } else {
        this.showSaveError(res.result.message || '保存失败');
      }
    }).catch(err => {
      this.setData({
        isSaving: false
      });
      
      console.error('保存素材失败:', err);
      this.showSaveError('网络错误，请稍后重试');
    });
  },

  /**
   * 保存并智能分析
   */
  saveAndAnalyze: function() {
    if (!this.data.canSave || this.data.isAnalyzing) {
      return;
    }
    
    this.setData({
      isAnalyzing: true
    });
    
    // 先保存素材
    this.saveMaterial();
    
    // 然后触发智能分析
    setTimeout(() => {
      if (this.data.autoAnalyze) {
        this.triggerSmartAnalysis();
      }
    }, 1000);
  },

  /**
   * 触发智能分析
   */
  triggerSmartAnalysis: function() {
    wx.cloud.callFunction({
      name: 'aiTagSuggestion',
      data: {
        content: this.data.content,
        impressionTags: this.data.selectedImpressionTags
      }
    }).then(res => {
      this.setData({
        isAnalyzing: false
      });
      
      if (res.result && res.result.success) {
        this.showAnalysisResult(res.result.suggestions);
      }
    }).catch(err => {
      this.setData({
        isAnalyzing: false
      });
      console.error('智能分析失败:', err);
    });
  },

  /**
   * 显示分析结果
   */
  showAnalysisResult: function(suggestions) {
    wx.showModal({
      title: '智能分析结果',
      content: `系统为您推荐了 ${suggestions.length} 个结构标签，是否查看详情？`,
      confirmText: '查看',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) {
          // 跳转到素材详情页查看分析结果
          wx.navigateTo({
            url: `/pages/detail/detail?materialId=${this.data.editingMaterialId}&showAnalysis=true`
          });
        }
      }
    });
  },

  /**
   * 显示保存成功
   */
  showSaveSuccess: function(materialId) {
    const message = this.data.isEditing 
      ? '素材更新成功！' 
      : '新素材保存成功！';
    
    this.setData({
      showSuccessModal: true,
      successMessage: message,
      editingMaterialId: materialId
    });
    
    // 清除草稿
    this.clearDraft();
  },

  /**
   * 显示保存错误
   */
  showSaveError: function(message) {
    this.setData({
      saveStatus: {
        icon: 'error',
        message: message
      }
    });
    
    // 3秒后清除状态提示
    setTimeout(() => {
      this.setData({
        saveStatus: null
      });
    }, 3000);
  },

  /**
   * 保存为草稿
   */
  saveAsDraft: function() {
    if (!this.data.content.trim()) {
      return;
    }
    
    const draftData = {
      content: this.data.content,
      selectedImpressionTags: this.data.selectedImpressionTags,
      selectedCategories: this.data.selectedCategories,
      sourceInfo: {
        type: this.data.sourceType,
        title: this.data.sourceTitle,
        author: this.data.sourceAuthor,
        url: this.data.sourceUrl,
        date: this.data.sourceDate,
        note: this.data.sourceNote
      },
      timestamp: new Date().getTime()
    };
    
    wx.setStorageSync('materialDraft', draftData);
    
    this.setData({
      saveStatus: {
        icon: 'save',
        message: '草稿已自动保存'
      }
    });
    
    // 2秒后清除状态提示
    setTimeout(() => {
      this.setData({
        saveStatus: null
      });
    }, 2000);
  },

  /**
   * 清除草稿
   */
  clearDraft: function() {
    wx.removeStorageSync('materialDraft');
  },

  /**
   * 加载草稿
   */
  loadDraft: function() {
    const draft = wx.getStorageSync('materialDraft');
    if (draft && draft.content) {
      wx.showModal({
        title: '发现草稿',
        content: '是否恢复上次未保存的草稿？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              content: draft.content,
              selectedImpressionTags: draft.selectedImpressionTags || [],
              selectedCategories: draft.selectedCategories || [],
              sourceType: draft.sourceInfo?.type || 'unknown',
              sourceTitle: draft.sourceInfo?.title || '',
              sourceAuthor: draft.sourceInfo?.author || '',
              sourceUrl: draft.sourceInfo?.url || '',
              sourceDate: draft.sourceInfo?.date || '',
              sourceNote: draft.sourceInfo?.note || ''
            });
            
            this.updateSaveStatus();
          }
        }
      });
    }
  },

  /**
   * 取消操作
   */
  cancel: function() {
    this.goBack();
  },

  /**
   * 成功模态框操作
   */
  
  // 返回写作页面
  goToIndex: function() {
    this.setData({
      showSuccessModal: false
    });
    
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 查看素材库
  goToLibrary: function() {
    this.setData({
      showSuccessModal: false
    });
    
    wx.switchTab({
      url: '/pages/library/library'
    });
  },

  // 继续收集
  continueCollect: function() {
    this.setData({
      showSuccessModal: false,
      content: '',
      selectedImpressionTags: [],
      selectedCategories: [],
      sourceTitle: '',
      sourceUrl: '',
      sourceNote: '',
      canSave: false
    });
    
    // 滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    // 清除定时器
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    if (this.contentTimer) {
      clearTimeout(this.contentTimer);
    }
    
    // 如果有未保存的内容，询问是否保存草稿
    if (this.hasUnsavedChanges() && !this.data.isEditing) {
      this.saveAsDraft();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return {
      title: '分享素材收集',
      path: '/pages/collect/collect',
      imageUrl: '/assets/images/share-collect.jpg'
    };
  }
});