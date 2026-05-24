// utils/request.js - 统一网络请求封装
// 策略模式实现：支持多种请求策略 + 统一错误处理

const { BASE_URL, TIMEOUT, storageKeys } = require('../config/index');

// ==================== 错误处理策略 ====================

/**
 * 错误处理策略基类
 */
class ErrorHandlerStrategy {
  handle(error, options) {
    throw new Error('ErrorHandlerStrategy.handle must be implemented');
  }
}

/**
 * 默认错误处理策略
 */
class DefaultErrorHandler extends ErrorHandlerStrategy {
  handle(error, options) {
    if (options.showError !== false) {
      wx.showToast({ title: error.message || '请求失败', icon: 'none' });
    }
    return error;
  }
}

/**
 * 静默错误处理策略（不显示提示）
 */
class SilentErrorHandler extends ErrorHandlerStrategy {
  handle(error, options) {
    return error;
  }
}

/**
 * 重试错误处理策略
 */
class RetryErrorHandler extends ErrorHandlerStrategy {
  constructor(maxRetries = 3, retryDelay = 1000) {
    super();
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.retryCount = 0;
  }

  async handle(error, options) {
    if (this.retryCount < this.maxRetries && this._shouldRetry(error)) {
      this.retryCount++;
      await this._delay(this.retryDelay);
      return { shouldRetry: true, retryCount: this.retryCount };
    }
    if (options.showError !== false) {
      wx.showToast({ title: error.message || '请求失败', icon: 'none' });
    }
    return { shouldRetry: false, error };
  }

  _shouldRetry(error) {
    // 网络错误或服务器错误可重试
    return error.code === -1 || error.code >= 500;
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ==================== 缓存策略 ====================

/**
 * 缓存策略基类
 */
class CacheStrategy {
  getKey(url, data) {
    return `cache_${url}_${JSON.stringify(data || {})}`;
  }

  get(key) {
    throw new Error('CacheStrategy.get must be implemented');
  }

  set(key, data, ttl) {
    throw new Error('CacheStrategy.set must be implemented');
  }
}

/**
 * 内存缓存策略
 */
class MemoryCacheStrategy extends CacheStrategy {
  constructor() {
    super();
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data, ttl = 60000) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * 本地存储缓存策略
 */
class StorageCacheStrategy extends CacheStrategy {
  get(key) {
    try {
      const item = wx.getStorageSync(key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiry) {
        wx.removeStorageSync(key);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  set(key, data, ttl = 60000) {
    try {
      wx.setStorageSync(
        key,
        JSON.stringify({
          data,
          expiry: Date.now() + ttl,
        })
      );
    } catch {
      // 存储失败时静默处理
    }
  }

  clear() {
    try {
      const keys = wx.getStorageInfoSync().keys;
      keys.forEach((key) => {
        if (key.startsWith('cache_')) {
          wx.removeStorageSync(key);
        }
      });
    } catch {
      // 清理失败时静默处理
    }
  }
}

/**
 * 无缓存策略
 */
class NoCacheStrategy extends CacheStrategy {
  get(key) {
    return null;
  }

  set(key, data, ttl) {
    // 不缓存
  }
}

// ==================== 认证策略 ====================

/**
 * 认证策略基类
 */
class AuthStrategy {
  getHeaders() {
    throw new Error('AuthStrategy.getHeaders must be implemented');
  }
}

/**
 * Bearer Token 认证策略
 */
class BearerAuthStrategy extends AuthStrategy {
  constructor() {
    super();
    this.getToken = () => wx.getStorageSync(storageKeys.accessToken) || '';
  }

  getHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

/**
 * 无认证策略
 */
class NoAuthStrategy extends AuthStrategy {
  getHeaders() {
    return {};
  }
}

/**
 * 自定义认证策略
 */
class CustomAuthStrategy extends AuthStrategy {
  constructor(headerGenerator) {
    super();
    this.headerGenerator = headerGenerator;
  }

  getHeaders() {
    return this.headerGenerator() || {};
  }
}

// ==================== 请求上下文 ====================

/**
 * 请求上下文，管理策略组合
 */
class RequestContext {
  constructor() {
    this.authStrategy = new BearerAuthStrategy();
    this.cacheStrategy = new NoCacheStrategy();
    this.errorHandler = new DefaultErrorHandler();
    this.retryHandler = null;
  }

  setAuthStrategy(strategy) {
    this.authStrategy = strategy;
    return this;
  }

  setCacheStrategy(strategy) {
    this.cacheStrategy = strategy;
    return this;
  }

  setErrorHandler(handler) {
    this.errorHandler = handler;
    return this;
  }

  enableRetry(maxRetries = 3, retryDelay = 1000) {
    this.retryHandler = new RetryErrorHandler(maxRetries, retryDelay);
    return this;
  }
}

// ==================== 请求执行器 ====================

/**
 * 获取用户信息
 * @returns {Object} 用户信息对象
 */
const getUserInfo = () => wx.getStorageSync(storageKeys.userInfo) || {};

/**
 * 获取 Token
 * @returns {string} access token
 */
const getToken = () => wx.getStorageSync(storageKeys.accessToken) || '';

/**
 * 执行实际请求
 * @param {Object} options - 请求配置
 * @param {RequestContext} context - 请求上下文
 * @returns {Promise<Object>} 请求结果
 */
const executeRequest = (options, context) => {
  return new Promise((resolve, reject) => {
    const authHeaders = context.authStrategy.getHeaders();
    const userInfo = getUserInfo();

    wx.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || TIMEOUT,
      header: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.header || {}),
      },
      success: (res) => {
        // 401 未授权处理
        if (res.statusCode === 401) {
          wx.removeStorageSync(storageKeys.accessToken);
          wx.removeStorageSync(storageKeys.userInfo);
          wx.reLaunch({ url: '/pages/login/index' });
          return reject({ code: 401, message: '登录已过期' });
        }

        // 成功响应处理
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data;
          if (data.code === 0 || data.success) {
            const result = data.data || data;
            // 缓存成功的 GET 请求
            if (options.method === 'GET' && options.cacheTTL) {
              const cacheKey = context.cacheStrategy.getKey(options.url, options.data);
              context.cacheStrategy.set(cacheKey, result, options.cacheTTL);
            }
            resolve(result);
          } else {
            const error = { code: data.code, message: data.message || '请求失败' };
            const handledError = context.errorHandler.handle(error, options);
            reject(handledError);
          }
        } else {
          const error = {
            code: res.statusCode,
            message: (res.data && res.data.message) || '服务器错误',
          };
          const handledError = context.errorHandler.handle(error, options);
          reject(handledError);
        }
      },
      fail: (err) => {
        const error = { code: -1, message: '网络错误，请检查网络', detail: err };
        const handledError = context.errorHandler.handle(error, options);
        reject(handledError);
      },
    });
  });
};

/**
 * 带重试的请求执行
 * @param {Object} options - 请求配置
 * @param {RequestContext} context - 请求上下文
 * @returns {Promise<Object>} 请求结果
 */
const executeWithRetry = async (options, context) => {
  if (!context.retryHandler) {
    return executeRequest(options, context);
  }

  let lastError;
  while (true) {
    try {
      return await executeRequest(options, context);
    } catch (error) {
      lastError = error;
      const result = await context.retryHandler.handle(error, options);
      if (!result.shouldRetry) {
        throw result.error || error;
      }
    }
  }
};

// ==================== 公共 API ====================

/**
 * 创建请求上下文
 * @returns {RequestContext}
 */
const createRequestContext = () => new RequestContext();

/**
 * 统一请求函数，支持 Promise
 * @param {Object} options - 请求配置
 * @param {string} options.url - 接口路径（相对路径）
 * @param {string} [options.method='GET'] - 请求方法
 * @param {Object} [options.data] - 请求数据
 * @param {Object} [options.header] - 自定义请求头
 * @param {boolean} [options.skipAuth=false] - 是否跳过 token 验证
 * @param {boolean} [options.showError=true] - 是否显示错误提示
 * @param {number} [options.cacheTTL] - 缓存时间（毫秒）
 * @param {number} [options.retryCount] - 重试次数
 * @returns {Promise<Object>} 请求结果
 */
const request = async (options) => {
  const context = createRequestContext();

  // 配置认证策略
  if (options.skipAuth) {
    context.setAuthStrategy(new NoAuthStrategy());
  }

  // 配置缓存策略
  if (options.cacheTTL && options.method !== 'POST') {
    context.setCacheStrategy(new MemoryCacheStrategy());
    const cacheKey = context.cacheStrategy.getKey(options.url, options.data);
    const cached = context.cacheStrategy.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 配置重试
  if (options.retryCount) {
    context.enableRetry(options.retryCount);
  }

  // 配置错误处理
  if (options.showError === false) {
    context.setErrorHandler(new SilentErrorHandler());
  }

  // 执行请求
  if (context.retryHandler) {
    return executeWithRetry(options, context);
  }
  return executeRequest(options, context);
};

/**
 * GET 请求快捷方法
 * @param {string} url - 接口路径
 * @param {Object} [data] - 查询参数
 * @param {Object} [options] - 其他配置
 * @returns {Promise<Object>} 请求结果
 */
const get = (url, data = {}, options = {}) => {
  return request({ url, method: 'GET', data, ...options });
};

/**
 * POST 请求快捷方法
 * @param {string} url - 接口路径
 * @param {Object} [data] - 请求数据
 * @param {Object} [options] - 其他配置
 * @returns {Promise<Object>} 请求结果
 */
const post = (url, data = {}, options = {}) => {
  return request({ url, method: 'POST', data, ...options });
};

/**
 * 带缓存的 GET 请求
 * @param {string} url - 接口路径
 * @param {Object} [data] - 查询参数
 * @param {number} [ttl=60000] - 缓存时间（毫秒）
 * @returns {Promise<Object>} 请求结果
 */
const getWithCache = (url, data = {}, ttl = 60000) => {
  return get(url, data, { cacheTTL: ttl });
};

/**
 * 带重试的请求
 * @param {Object} options - 请求配置
 * @param {number} [retryCount=3] - 重试次数
 * @returns {Promise<Object>} 请求结果
 */
const requestWithRetry = (options, retryCount = 3) => {
  return request({ ...options, retryCount });
};

/**
 * 带用户信息的请求（自动附加 openid）
 * @param {Object} options - 请求配置
 * @param {string} options.url - 接口路径
 * @param {string} [options.method='GET'] - 请求方法
 * @param {Object} [options.data] - 请求数据
 * @returns {Promise<Object>} 请求结果
 */
const requestWithUser = (options) => {
  const userInfo = getUserInfo();
  return request({
    ...options,
    data: {
      ...options.data,
      openid: userInfo.openid,
    },
  });
};

/**
 * 带用户信息的 POST 请求
 * @param {string} url - 接口路径
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 请求结果
 */
const postWithUser = (url, data = {}) => {
  const userInfo = getUserInfo();
  return post(url, {
    ...data,
    openid: userInfo.openid,
    userName: userInfo.userName || userInfo.nickName || '',
  });
};

// ==================== 导出 ====================

module.exports = {
  // 核心请求方法
  request,
  get,
  post,
  getWithCache,
  requestWithRetry,
  requestWithUser,
  postWithUser,
  getUserInfo,
  getToken,
  BASE_URL,

  // 策略类
  ErrorHandlerStrategy,
  DefaultErrorHandler,
  SilentErrorHandler,
  RetryErrorHandler,
  CacheStrategy,
  MemoryCacheStrategy,
  StorageCacheStrategy,
  NoCacheStrategy,
  AuthStrategy,
  BearerAuthStrategy,
  NoAuthStrategy,
  CustomAuthStrategy,

  // 上下文
  RequestContext,
  createRequestContext,
};
