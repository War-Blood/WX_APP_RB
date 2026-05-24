// components/status-tag/index.js
// 状态标签组件 - 使用工厂模式

const { StatusTagFactory, TagFactory } = require('../../utils/component-factory');

Component({
  properties: {
    // 状态类型
    status: {
      type: String,
      value: 'pending',
    },
    // 自定义文本（覆盖默认文本）
    customText: {
      type: String,
      value: '',
    },
    // 自定义颜色
    customColor: {
      type: String,
      value: '',
    },
    // 尺寸：small / medium / large
    size: {
      type: String,
      value: 'medium',
    },
    // 是否显示圆点
    showDot: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    statusText: '',
    statusConfig: null,
  },

  observers: {
    'status, customText, customColor, size': function (status, customText, customColor, size) {
      this._updateConfig(status, customText, customColor, size);
    },
  },

  lifetimes: {
    attached() {
      this._updateConfig(this.data.status, this.data.customText, this.data.customColor, this.data.size);
    },
  },

  methods: {
    /**
     * 更新组件配置
     * @param {string} status - 状态类型
     * @param {string} customText - 自定义文本
     * @param {string} customColor - 自定义颜色
     * @param {string} size - 尺寸
     */
    _updateConfig(status, customText, customColor, size) {
      let config;

      if (customColor) {
        // 使用自定义颜色
        config = TagFactory.create({
          type: status,
          text: customText,
          color: customColor,
          size,
        });
      } else {
        // 使用预设配置
        config = StatusTagFactory.create(status);
      }

      // 尺寸配置
      const sizeConfig = this._getSizeConfig(size);

      this.setData({
        statusText: customText || config.text || status,
        statusConfig: {
          ...config,
          ...sizeConfig,
        },
      });
    },

    /**
     * 获取尺寸配置
     * @param {string} size - 尺寸
     * @returns {Object} 尺寸配置
     */
    _getSizeConfig(size) {
      const sizeMap = {
        small: { padding: '4rpx 12rpx', fontSize: '20rpx', dotSize: '8rpx' },
        medium: { padding: '6rpx 16rpx', fontSize: '22rpx', dotSize: '10rpx' },
        large: { padding: '8rpx 20rpx', fontSize: '24rpx', dotSize: '12rpx' },
      };
      return sizeMap[size] || sizeMap.medium;
    },

    /**
     * 注册新的状态类型（静态方法代理）
     * @param {string} status - 状态类型
     * @param {Object} config - 配置对象
     */
    registerStatus(status, config) {
      StatusTagFactory.register(status, config);
    },
  },
});

// 导出工厂方法供外部使用
module.exports.StatusTagFactory = StatusTagFactory;
module.exports.TagFactory = TagFactory;
