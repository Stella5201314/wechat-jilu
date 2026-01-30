Component({
  properties: {
    material: { type: Object, value: {} },
    selected: { type: Boolean, value: false },
    snippetLength: { type: Number, value: 240 }
  },
  data: {
    snippetText: ''
  },
  observers: {
    'material, snippetLength': function(material) {
      const content = (material && (material.contentRich || material.content)) || '';
      const s = content.replace(/\s+/g, ' ').trim();
      const len = this.data.snippetLength || 240;
      this.setData({ snippetText: s.length > len ? s.slice(0, len) + '...' : s });
    }
  },
  methods: {
    onView() {
      this.triggerEvent('view', { material: this.data.material });
    },
    onSelect(e) {
      e.stopPropagation();
      this.triggerEvent('select', { material: this.data.material });
    },
    formatTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    }
  }
});