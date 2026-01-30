Component({
  properties: {
    tags: { type: Array, value: [] },
    selected: { type: Array, value: [] },
    maxSelect: { type: Number, value: 0 } // 0 表示不限
  },
  methods: {
    isSelected(tag) {
      return (this.data.selected || []).indexOf(tag) !== -1;
    },
    toggleTag(e) {
      const tag = e.currentTarget.dataset.tag;
      const selected = new Set(this.data.selected || []);
      if (selected.has(tag)) selected.delete(tag);
      else {
        if (this.data.maxSelect > 0 && selected.size >= this.data.maxSelect) {
          wx.showToast({ title: `最多选择 ${this.data.maxSelect} 个标签`, icon: 'none' });
          return;
        }
        selected.add(tag);
      }
      const arr = Array.from(selected);
      this.setData({ selected: arr });
      this.triggerEvent('change', { selected: arr });
    }
  }
});