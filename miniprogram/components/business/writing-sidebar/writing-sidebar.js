Component({
  properties: {
    templates: { type: Array, value: ['官方报告', '商业计划', '创意文案'] },
    defaultTemplateIdx: { type: Number, value: 0 }
  },
  data: {
    theme: '',
    selectedTemplateIdx: 0,
    optionsText: '',
    selectedTemplateName: ''
  },
  lifetimes: {
    attached() {
      // 初始化 selectedTemplateIdx 与 selectedTemplateName（优先使用 properties）
      const idx = Number(this.properties.defaultTemplateIdx) || 0;
      const templates = this.properties.templates || [];
      const name = templates[idx] || templates[0] || '请选择';
      this.setData({
        selectedTemplateIdx: idx,
        selectedTemplateName: name
      });
    }
  },
  observers: {
    // 当外部传入的 templates 发生变化时，更新 selectedTemplateName（容错）
    'templates': function (templates) {
      const idx = Number(this.data.selectedTemplateIdx) || Number(this.properties.defaultTemplateIdx) || 0;
      const name = (templates && templates[idx]) || (templates && templates[0]) || '请选择';
      this.setData({ selectedTemplateName: name });
    }
  },
  methods: {
    onThemeInput(e) {
      this.setData({ theme: e.detail.value });
    },
    onOptsInput(e) {
      this.setData({ optionsText: e.detail.value });
    },
    onTemplateChange(e) {
      const idx = Number(e.detail.value);
      const templates = this.properties.templates || [];
      const name = templates[idx] || '请选择';
      this.setData({ selectedTemplateIdx: idx, selectedTemplateName: name });
      this.triggerEvent('change', { template: name, index: idx });
    },
    onSubmit() {
      this.triggerEvent('submit', {
        theme: this.data.theme,
        template: this.data.selectedTemplateName,
        options: this.data.optionsText
      });
    },
    onAiSuggest() {
      this.triggerEvent('aiSuggest', {});
    }
  }
});