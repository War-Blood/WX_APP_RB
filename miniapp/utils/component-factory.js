// utils/component-factory.js - 组件配置工厂
// 工厂模式实现：支持动态组件配置创建

/**
 * 组件配置基类
 */
class ComponentConfig {
  constructor(type) {
    this.type = type;
    this.text = '';
    this.className = '';
    this.dotColor = '';
    this.bgColor = '';
    this.textColor = '';
  }

  /**
   * 获取配置
   * @returns {Object} 组件配置
   */
  getConfig() {
    return {
      type: this.type,
      text: this.text,
      className: this.className,
      dotColor: this.dotColor,
      bgColor: this.bgColor,
      textColor: this.textColor,
    };
  }
}

/**
 * 状态标签配置工厂
 */
class StatusTagFactory {
  // 状态配置注册表
  static registry = new Map();

  /**
   * 注册状态配置
   * @param {string} status - 状态类型
   * @param {Object} config - 配置对象
   */
  static register(status, config) {
    StatusTagFactory.registry.set(status, {
      text: config.text || status,
      className: config.className || `status-${status}`,
      dotColor: config.dotColor || '#999',
      bgColor: config.bgColor || '#f5f5f5',
      textColor: config.textColor || '#999',
    });
  }

  /**
   * 批量注册状态配置
   * @param {Object} configs - 配置对象 { status: config }
   */
  static registerBatch(configs) {
    Object.entries(configs).forEach(([status, config]) => {
      StatusTagFactory.register(status, config);
    });
  }

  /**
   * 创建状态配置
   * @param {string} status - 状态类型
   * @returns {Object} 状态配置
   */
  static create(status) {
    // 检查注册表
    if (StatusTagFactory.registry.has(status)) {
      return StatusTagFactory.registry.get(status);
    }

    // 返回默认配置
    return StatusTagFactory.getDefaultConfig(status);
  }

  /**
   * 获取默认配置
   * @param {string} status - 状态类型
   * @returns {Object} 默认配置
   */
  static getDefaultConfig(status) {
    return {
      text: status,
      className: `status-${status}`,
      dotColor: '#999',
      bgColor: '#f5f5f5',
      textColor: '#999',
    };
  }

  /**
   * 获取所有已注册的状态
   * @returns {Array<string>} 状态列表
   */
  static getRegisteredStatuses() {
    return Array.from(StatusTagFactory.registry.keys());
  }

  /**
   * 清除注册表
   */
  static clear() {
    StatusTagFactory.registry.clear();
  }
}

// 初始化默认状态配置
StatusTagFactory.registerBatch({
  pending: {
    text: '待审核',
    className: 'status-pending',
    dotColor: '#fa8c16',
    bgColor: '#fff7e6',
    textColor: '#fa8c16',
  },
  approved: {
    text: '已通过',
    className: 'status-approved',
    dotColor: '#52c41a',
    bgColor: '#f6ffed',
    textColor: '#52c41a',
  },
  rejected: {
    text: '被驳回',
    className: 'status-rejected',
    dotColor: '#ff4d4f',
    bgColor: '#fff1f0',
    textColor: '#ff4d4f',
  },
  draft: {
    text: '草稿',
    className: 'status-draft',
    dotColor: '#bbb',
    bgColor: '#f5f5f5',
    textColor: '#999',
  },
  submitted: {
    text: '已提交',
    className: 'status-submitted',
    dotColor: '#1890ff',
    bgColor: '#e6f7ff',
    textColor: '#1890ff',
  },
  processing: {
    text: '处理中',
    className: 'status-processing',
    dotColor: '#722ed1',
    bgColor: '#f9f0ff',
    textColor: '#722ed1',
  },
  success: {
    text: '成功',
    className: 'status-success',
    dotColor: '#52c41a',
    bgColor: '#f6ffed',
    textColor: '#52c41a',
  },
  failed: {
    text: '失败',
    className: 'status-failed',
    dotColor: '#ff4d4f',
    bgColor: '#fff1f0',
    textColor: '#ff4d4f',
  },
  warning: {
    text: '警告',
    className: 'status-warning',
    dotColor: '#faad14',
    bgColor: '#fffbe6',
    textColor: '#faad14',
  },
  info: {
    text: '信息',
    className: 'status-info',
    dotColor: '#1890ff',
    bgColor: '#e6f7ff',
    textColor: '#1890ff',
  },
});

/**
 * 通用标签工厂
 */
class TagFactory {
  /**
   * 创建标签配置
   * @param {Object} options - 标签选项
   * @param {string} options.type - 标签类型
   * @param {string} options.text - 标签文本
   * @param {string} [options.color] - 自定义颜色
   * @param {string} [options.size] - 尺寸 (small/medium/large)
   * @returns {Object} 标签配置
   */
  static create(options) {
    const { type, text, color, size = 'medium' } = options;

    // 尺寸映射
    const sizeMap = {
      small: { padding: '4rpx 12rpx', fontSize: '20rpx', dotSize: '8rpx' },
      medium: { padding: '6rpx 16rpx', fontSize: '22rpx', dotSize: '10rpx' },
      large: { padding: '8rpx 20rpx', fontSize: '24rpx', dotSize: '12rpx' },
    };

    const sizeConfig = sizeMap[size] || sizeMap.medium;

    // 如果有自定义颜色，生成配置
    if (color) {
      return {
        type,
        text: text || type,
        className: `status-custom status-${type}`,
        dotColor: color,
        bgColor: this._lightenColor(color, 0.9),
        textColor: color,
        ...sizeConfig,
      };
    }

    // 使用预设配置
    const presetConfig = StatusTagFactory.create(type);
    return {
      ...presetConfig,
      ...sizeConfig,
    };
  }

  /**
   * 颜色变亮
   * @param {string} color - 颜色值
   * @param {number} ratio - 变亮比例
   * @returns {string} 变亮后的颜色
   */
  static _lightenColor(color, ratio) {
    // 简单的颜色变亮处理
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      const lr = Math.round(r + (255 - r) * ratio);
      const lg = Math.round(g + (255 - g) * ratio);
      const lb = Math.round(b + (255 - b) * ratio);

      return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
    }
    return color;
  }
}

/**
 * 动态组件工厂
 * 用于创建可复用的组件配置
 */
class DynamicComponentFactory {
  static factories = new Map();

  /**
   * 注册组件工厂
   * @param {string} name - 工厂名称
   * @param {Function} factoryFn - 工厂函数
   */
  static register(name, factoryFn) {
    DynamicComponentFactory.factories.set(name, factoryFn);
  }

  /**
   * 创建组件配置
   * @param {string} name - 工厂名称
   * @param {Object} options - 配置选项
   * @returns {Object} 组件配置
   */
  static create(name, options = {}) {
    const factory = DynamicComponentFactory.factories.get(name);
    if (!factory) {
      throw new Error(`Factory "${name}" not found`);
    }
    return factory(options);
  }

  /**
   * 检查工厂是否存在
   * @param {string} name - 工厂名称
   * @returns {boolean}
   */
  static has(name) {
    return DynamicComponentFactory.factories.has(name);
  }
}

// 注册默认工厂
DynamicComponentFactory.register('statusTag', (options) => StatusTagFactory.create(options.status));
DynamicComponentFactory.register('tag', (options) => TagFactory.create(options));

module.exports = {
  ComponentConfig,
  StatusTagFactory,
  TagFactory,
  DynamicComponentFactory,
};
