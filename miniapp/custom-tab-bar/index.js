// custom-tab-bar/index.js
const { getUserInfo } = require('../utils/auth');

Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/index', text: '首页' },
      { pagePath: '/pages/features/index', text: '功能' },
      { pagePath: '/pages/profile/index', text: '我的' },
    ],
  },

  // 组件所在页面的生命周期
  pageLifetimes: {
    show() {
      this.init();
    },
  },

  methods: {
    /**
     * 初始化 tabBar，确定当前选中索引
     */
    init() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentPath = '/' + currentPage.route;
      const { list } = this.data;
      let idx = list.findIndex((t) => t.pagePath === currentPath);
      if (idx === -1) idx = 0;
      this.setData({ selected: idx });
    },

    switchTab(e) {
      const idx = e.currentTarget.dataset.index;
      const tab = this.data.list[idx];
      if (!tab) return;
      wx.switchTab({ url: tab.pagePath });
    },
  },
});
