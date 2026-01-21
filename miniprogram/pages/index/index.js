// pages/index/index.js

// 引入工具函数
const app = getApp();
const utils = require('../../utils/helpers/tag-processor');
const promptBuilder = require('../../utils/helpers/prompt-builder');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 设备信息
    isMobile: true,
    screenWidth: 375,
    
    // 写作配置
    requirement: '',
    writingTypeIndex: 0,
    audienceTypeIndex: 0,
    styleTypeIndex: 0,
    
    // 提纲状态
    outline: [],
    currentOutlineNode: 0,
    isGeneratingOutline: false,
    
    // 素材状态
    activeTab: 'materials',
    matchedMaterials: [],
    selectedMaterials: [],
    selectedCount: 0,
    crossInspirations: [],
    
    // 生成配置
    promptDetailLevel: 3,
    materialCount: 5,
    
    // 生成结果
    finalPrompt: '',
    promptLength: 0,
    isGeneratingPrompt: false,
    generationTime: 0,
    
    // 模板相关
    showTemplateModal: false,
    templateName: '',
    templateDescription: '',
    templateSelectedTags: [],
    
    // 配置数据
    writingTypes: ['工作报告', '方案计划', '宣传文案', '学术文章', '邮件通知', '演讲稿', '其他'],
    audienceTypes: ['上级领导', '同级同事', '下属团队', '公众读者', '客户伙伴', '专家学者', '其他'],
    styleTypes: ['严谨正式', '生动活泼', '简洁有力', '专业深度', '亲和温暖', '创新前瞻', '其他'],
    structureTypes: ['问题-对策', '是什么-为什么-怎么做', '现状-分析-展望', '案例-数据-结论', '总分总', '时间顺序', '空间顺序'],
    templateTags: ['工作报告', '项目方案', '宣传推广', '分析报告', '计划总结', '通用模板']
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    this.initScreenInfo();
    this.loadUserPreferences();
    
    // 如果有传入的模板ID，加载模板
    if (options.templateId) {
      this.loadTemplateById(options.templateId);
    }
    
    // 如果有传入的素材ID，加载并选中素材
    if (options.materialId) {
      this.loadAndSelectMaterial(options.materialId);
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {
    // 检查网络状态
    this.checkNetworkStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 如果是从素材收集页返回，刷新素材列表
    if (app.globalData.shouldRefreshMaterials) {
      this.refreshMaterialList();
      app.globalData.shouldRefreshMaterials = false;
    }
  },

  /**
   * 初始化屏幕信息
   */
  initScreenInfo: function() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      screenWidth: systemInfo.screenWidth,
      isMobile: systemInfo.screenWidth < 768
    });
  },

  /**
   * 加载用户偏好设置
   */
  loadUserPreferences: function() {
    const userPrefs = wx.getStorageSync('userPreferences') || {};
    this.setData({
      writingTypeIndex: userPrefs.defaultWritingType || 0,
      audienceTypeIndex: userPrefs.defaultAudienceType || 0,
      styleTypeIndex: userPrefs.defaultStyleType || 0,
      promptDetailLevel: userPrefs.defaultPromptDetail || 3,
      materialCount: userPrefs.defaultMaterialCount || 5
    });
  },

  /**
   * 检查网络状态
   */
  checkNetworkStatus: function() {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络连接已断开',
            icon: 'none',
            duration: 3000
          });
        }
      }
    });
  },

  /**
   * 刷新素材列表
   */
  refreshMaterialList: function() {
    if (this.data.outline.length > 0 && this.data.currentOutlineNode >= 0) {
      this.matchMaterialsForCurrentNode();
    }
  },

  /**
   * 为当前提纲节点匹配素材
   */
  matchMaterialsForCurrentNode: function() {
    if (this.data.outline.length === 0 || this.data.currentOutlineNode < 0) {
      return;
    }

    const currentNode = this.data.outline[this.data.currentOutlineNode];
    
    // 显示加载状态
    wx.showLoading({
      title: '匹配素材中...',
      mask: true
    });

    // 调用云函数匹配素材
    wx.cloud.callFunction({
      name: 'matchMaterials',
      data: {
        nodeTitle: currentNode.title,
        nodeKeywords: currentNode.keywords || [],
        materialCount: this.data.materialCount,
        includeInspirations: this.data.activeTab === 'inspiration'
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        this.setData({
          matchedMaterials: res.result.materials || [],
          crossInspirations: res.result.inspirations || []
        });
      } else {
        wx.showToast({
          title: '素材匹配失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('匹配素材失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  /**
   * 事件处理函数
   */
  
  // 需求输入变化
  onRequirementChange: function(e) {
    this.setData({
      requirement: e.detail.value
    });
  },

  // 写作类型变化
  onWritingTypeChange: function(e) {
    this.setData({
      writingTypeIndex: e.detail.value
    });
  },

  // 读者类型变化
  onAudienceTypeChange: function(e) {
    this.setData({
      audienceTypeIndex: e.detail.value
    });
  },

  // 风格类型变化
  onStyleTypeChange: function(e) {
    this.setData({
      styleTypeIndex: e.detail.value
    });
  },

  // 指令详细度变化
  onPromptDetailChange: function(e) {
    this.setData({
      promptDetailLevel: e.detail.value
    });
  },

  // 素材数量变化
  onMaterialCountChange: function(e) {
    this.setData({
      materialCount: e.detail.value
    });
  },

  // 生成提纲
  generateOutline: function() {
    if (!this.data.requirement.trim()) {
      wx.showToast({
        title: '请先输入写作要求',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      isGeneratingOutline: true
    });

    // 调用云函数生成提纲
    wx.cloud.callFunction({
      name: 'generateOutline',
      data: {
        requirement: this.data.requirement,
        writingType: this.data.writingTypes[this.data.writingTypeIndex],
        audienceType: this.data.audienceTypes[this.data.audienceTypeIndex],
        styleType: this.data.styleTypes[this.data.styleTypeIndex]
      }
    }).then(res => {
      this.setData({
        isGeneratingOutline: false
      });

      if (res.result && res.result.success) {
        this.setData({
          outline: res.result.outline,
          currentOutlineNode: 0
        });
        
        // 自动匹配素材
        setTimeout(() => {
          this.matchMaterialsForCurrentNode();
        }, 500);
        
        wx.showToast({
          title: '提纲生成成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: res.result.message || '提纲生成失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      this.setData({
        isGeneratingOutline: false
      });
      console.error('生成提纲失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  // 清空提纲
  clearOutline: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有提纲吗？这将同时清空已选择的素材。',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            outline: [],
            currentOutlineNode: 0,
            matchedMaterials: [],
            selectedMaterials: [],
            selectedCount: 0,
            finalPrompt: '',
            promptLength: 0
          });
        }
      }
    });
  },

  // 提纲节点点击
  onOutlineNodeClick: function(e) {
    const nodeIndex = e.detail.index;
    this.setData({
      currentOutlineNode: nodeIndex
    });
    
    // 匹配该节点的素材
    this.matchMaterialsForCurrentNode();
  },

  // 提纲节点编辑
  onOutlineNodeEdit: function(e) {
    const { index, title } = e.detail;
    const newOutline = [...this.data.outline];
    newOutline[index].title = title;
    
    this.setData({
      outline: newOutline
    });
  },

  // 提纲节点删除
  onOutlineNodeDelete: function(e) {
    const index = e.detail.index;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个提纲节点吗？',
      success: (res) => {
        if (res.confirm) {
          const newOutline = [...this.data.outline];
          newOutline.splice(index, 1);
          
          this.setData({
            outline: newOutline,
            currentOutlineNode: Math.min(this.data.currentOutlineNode, newOutline.length - 1)
          });
        }
      }
    });
  },

  // 标签页切换
  onTabChange: function(e) {
    const tab = e.detail.tab;
    this.setData({
      activeTab: tab
    });
    
    // 如果切换到跨界灵感且当前没有灵感数据，重新匹配
    if (tab === 'inspiration' && this.data.crossInspirations.length === 0) {
      this.matchMaterialsForCurrentNode();
    }
  },

  // 素材选择
  onMaterialSelect: function(e) {
    const material = e.detail.material;
    const selectedMaterials = [...this.data.selectedMaterials];
    
    // 检查是否已选择
    const existingIndex = selectedMaterials.findIndex(m => m._id === material._id);
    if (existingIndex === -1) {
      selectedMaterials.push(material);
      
      this.setData({
        selectedMaterials: selectedMaterials,
        selectedCount: selectedMaterials.length
      });
      
      // 触发提示
      wx.showToast({
        title: '已添加素材',
        icon: 'success',
        duration: 1500
      });
    }
  },

  // 素材取消选择
  onMaterialDeselect: function(e) {
    const materialId = e.detail.materialId;
    const selectedMaterials = this.data.selectedMaterials.filter(m => m._id !== materialId);
    
    this.setData({
      selectedMaterials: selectedMaterials,
      selectedCount: selectedMaterials.length
    });
  },

  // 应用跨界灵感
  onInspirationApply: function(e) {
    const inspiration = e.detail.inspiration;
    
    // 将灵感转化为提纲节点的提示
    const currentNode = this.data.outline[this.data.currentOutlineNode];
    if (currentNode) {
      currentNode.inspiration = inspiration.migrationGuide;
      
      this.setData({
        outline: [...this.data.outline]
      });
      
      wx.showToast({
        title: '已应用灵感',
        icon: 'success',
        duration: 2000
      });
    }
  },

  // 过滤器变化
  onFilterChange: function(e) {
    const filter = e.detail.filter;
    // 根据过滤器重新匹配素材
    console.log('过滤器变化:', filter);
  },

  // 生成最终指令
  generateFinalPrompt: function() {
    if (this.data.outline.length === 0) {
      wx.showToast({
        title: '请先生成提纲',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      isGeneratingPrompt: true,
      generationTime: 0
    });

    const startTime = Date.now();

    // 构建生成参数
    const generationParams = {
      requirement: this.data.requirement,
      outline: this.data.outline,
      selectedMaterials: this.data.selectedMaterials,
      writingType: this.data.writingTypes[this.data.writingTypeIndex],
      audienceType: this.data.audienceTypes[this.data.audienceTypeIndex],
      styleType: this.data.styleTypes[this.data.styleTypeIndex],
      promptDetailLevel: this.data.promptDetailLevel,
      materialCount: this.data.materialCount
    };

    // 调用云函数生成Prompt
    wx.cloud.callFunction({
      name: 'generatePrompt',
      data: generationParams
    }).then(res => {
      const endTime = Date.now();
      const generationTime = Math.round((endTime - startTime) / 1000);
      
      this.setData({
        isGeneratingPrompt: false,
        generationTime: generationTime
      });

      if (res.result && res.result.success) {
        const finalPrompt = res.result.prompt;
        this.setData({
          finalPrompt: finalPrompt,
          promptLength: finalPrompt.length
        });
        
        wx.showToast({
          title: '指令生成成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: res.result.message || '指令生成失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      const endTime = Date.now();
      const generationTime = Math.round((endTime - startTime) / 1000);
      
      this.setData({
        isGeneratingPrompt: false,
        generationTime: generationTime
      });
      
      console.error('生成指令失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  // 复制Prompt
  onCopyPrompt: function() {
    if (!this.data.finalPrompt) {
      wx.showToast({
        title: '请先生成指令',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.setClipboardData({
      data: this.data.finalPrompt,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success',
          duration: 2000
        });
      },
      fail: (err) => {
        console.error('复制失败:', err);
        wx.showToast({
          title: '复制失败',
          icon: 'error',
          duration: 2000
        });
      }
    });
  },

  // 格式化Prompt
  onFormatPrompt: function() {
    // 简单的格式化逻辑
    let formatted = this.data.finalPrompt
      .replace(/\n\s*\n/g, '\n\n')  // 压缩多个空行
      .replace(/^\s+|\s+$/g, '');   // 去除首尾空格
    
    this.setData({
      finalPrompt: formatted,
      promptLength: formatted.length
    });
    
    wx.showToast({
      title: '已优化格式',
      icon: 'success',
      duration: 1500
    });
  },

  // 导出Prompt
  onExportPrompt: function() {
    if (!this.data.finalPrompt) {
      return;
    }

    const timestamp = new Date().getTime();
    const filename = `灵材智库_指令_${timestamp}.txt`;
    
    // 创建临时文件路径
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/${filename}`;
    
    fs.writeFile({
      filePath: filePath,
      data: this.data.finalPrompt,
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
            console.error('保存到磁盘失败:', err);
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

  // 一键复制
  quickCopy: function() {
    this.onCopyPrompt();
  },

  // 保存为模板
  saveAsTemplate: function() {
    if (!this.data.finalPrompt) {
      wx.showToast({
        title: '请先生成指令',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 生成默认模板名称
    const defaultName = `${this.data.writingTypes[this.data.writingTypeIndex]}_${new Date().toLocaleDateString()}`;
    
    this.setData({
      showTemplateModal: true,
      templateName: defaultName,
      templateDescription: '',
      templateSelectedTags: [this.data.writingTypes[this.data.writingTypeIndex]]
    });
  },

  // 关闭模板对话框
  closeTemplateModal: function() {
    this.setData({
      showTemplateModal: false
    });
  },

  // 模板名称变化
  onTemplateNameChange: function(e) {
    this.setData({
      templateName: e.detail.value
    });
  },

  // 模板描述变化
  onTemplateDescChange: function(e) {
    this.setData({
      templateDescription: e.detail.value
    });
  },

  // 切换模板标签
  toggleTemplateTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    const selectedTags = [...this.data.templateSelectedTags];
    const index = selectedTags.indexOf(tag);
    
    if (index === -1) {
      selectedTags.push(tag);
    } else {
      selectedTags.splice(index, 1);
    }
    
    this.setData({
      templateSelectedTags: selectedTags
    });
  },

  // 确认保存模板
  confirmSaveTemplate: function() {
    if (!this.data.templateName.trim()) {
      wx.showToast({
        title: '请输入模板名称',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const templateData = {
      name: this.data.templateName,
      description: this.data.templateDescription,
      tags: this.data.templateSelectedTags,
      content: {
        requirement: this.data.requirement,
        outline: this.data.outline,
        writingType: this.data.writingTypes[this.data.writingTypeIndex],
        audienceType: this.data.audienceTypes[this.data.audienceTypeIndex],
        styleType: this.data.styleTypes[this.data.styleTypeIndex],
        promptDetailLevel: this.data.promptDetailLevel,
        materialCount: this.data.materialCount
      },
      createdTime: new Date().getTime()
    };

    // 调用云函数保存模板
    wx.cloud.callFunction({
      name: 'templateManager',
      data: {
        action: 'save',
        template: templateData
      }
    }).then(res => {
      if (res.result && res.result.success) {
        this.setData({
          showTemplateModal: false,
          templateName: '',
          templateDescription: '',
          templateSelectedTags: []
        });
        
        wx.showToast({
          title: '模板保存成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: res.result.message || '保存失败',
          icon: 'error',
          duration: 2000
        });
      }
    }).catch(err => {
      console.error('保存模板失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
    });
  },

  // 清空所有
  clearAll: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有内容吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            requirement: '',
            outline: [],
            currentOutlineNode: 0,
            matchedMaterials: [],
            selectedMaterials: [],
            selectedCount: 0,
            crossInspirations: [],
            finalPrompt: '',
            promptLength: 0,
            generationTime: 0
          });
          
          wx.showToast({
            title: '已清空',
            icon: 'success',
            duration: 2000
          });
        }
      }
    });
  },

  // 导航到模板库
  gotoTemplate: function() {
    wx.navigateTo({
      url: '/pages/template/template'
    });
  },

  // 导航到素材收集页
  gotoCollect: function() {
    wx.navigateTo({
      url: '/pages/collect/collect'
    });
  },

  // 新建写作
  onNewWriting: function() {
    this.clearAll();
  },

  /**
   * 加载模板
   */
  loadTemplateById: function(templateId) {
    // 调用云函数加载模板
    wx.cloud.callFunction({
      name: 'templateManager',
      data: {
        action: 'get',
        templateId: templateId
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const template = res.result.template;
        
        // 设置模板数据
        this.setData({
          requirement: template.content.requirement || '',
          outline: template.content.outline || [],
          writingTypeIndex: this.data.writingTypes.indexOf(template.content.writingType) || 0,
          audienceTypeIndex: this.data.audienceTypes.indexOf(template.content.audienceType) || 0,
          styleTypeIndex: this.data.styleTypes.indexOf(template.content.styleType) || 0,
          promptDetailLevel: template.content.promptDetailLevel || 3,
          materialCount: template.content.materialCount || 5,
          currentOutlineNode: 0
        });
        
        // 匹配素材
        setTimeout(() => {
          this.matchMaterialsForCurrentNode();
        }, 500);
      }
    }).catch(err => {
      console.error('加载模板失败:', err);
    });
  },

  /**
   * 加载并选中素材
   */
  loadAndSelectMaterial: function(materialId) {
    // 调用云函数获取素材详情
    wx.cloud.callFunction({
      name: 'getMaterialDetail',
      data: { materialId: materialId }
    }).then(res => {
      if (res.result && res.result.success) {
        const material = res.result.material;
        const selectedMaterials = [...this.data.selectedMaterials, material];
        
        this.setData({
          selectedMaterials: selectedMaterials,
          selectedCount: selectedMaterials.length
        });
      }
    }).catch(err => {
      console.error('加载素材失败:', err);
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    // 刷新素材列表
    this.refreshMaterialList();
    
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {
    // 加载更多素材
    console.log('触底，加载更多...');
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return {
      title: '灵材智库 - AI写作助手',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-banner.jpg'
    };
  }
});