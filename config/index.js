const fs = require('fs');
const path = require('path');

const ENV = {
  DEV: 'development',
  PROD: 'production',
  SOLO: 'solo'
};

const SOLO_CONFIG_PATH = path.join(__dirname, '..', 'solo.config.json');
const BACKEND_SPEC_PATH = path.join(__dirname, '..', 'docs', 'BACKEND_SPEC.md');

function loadSoloConfig() {
  try {
    if (fs.existsSync(SOLO_CONFIG_PATH)) {
      const content = fs.readFileSync(SOLO_CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Solo] Failed to load solo config:', e.message);
  }
  return null;
}

function parseBackendSpec() {
  try {
    if (!fs.existsSync(BACKEND_SPEC_PATH)) {
      return null;
    }

    const content = fs.readFileSync(BACKEND_SPEC_PATH, 'utf-8');
    const spec = {
      endpoints: {},
      apis: {},
      errorCodes: {}
    };

    const jsonRegex = /```json\s*\n([\s\S]*?)\n```/g;
    let match;

    while ((match = jsonRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.endpoints) spec.endpoints = parsed.endpoints;
        if (parsed.apis) spec.apis = { ...spec.apis, ...parsed.apis };
        if (parsed.errorCodes) spec.errorCodes = parsed.errorCodes;
        if (parsed.authentication) spec.authentication = parsed.authentication;
        if (parsed.authorization) spec.authorization = parsed.authorization;
        if (parsed.responseFormat) spec.responseFormat = parsed.responseFormat;
        if (parsed.frontendConfig) spec.frontendConfig = parsed.frontendConfig;
      } catch (e) {
        // Skip invalid JSON blocks
      }
    }

    return spec;
  } catch (e) {
    console.warn('[Solo] Failed to parse backend spec:', e.message);
    return null;
  }
}

const soloConfig = loadSoloConfig();
const backendSpec = soloConfig?.soloMode?.enabled ? parseBackendSpec() : null;

const currentEnv = typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'develop'
  ? ENV.DEV
  : ENV.PROD;

const isSoloMode = soloConfig?.soloMode?.enabled === true;

const envConfig = {
  [ENV.DEV]: {
    baseUrl: backendSpec?.endpoints?.development?.baseUrl || 'http://111.229.107.123:3000',
    timeout: backendSpec?.endpoints?.development?.timeout || 30000,
    debug: true,
  },
  [ENV.PROD]: {
    baseUrl: backendSpec?.endpoints?.production?.baseUrl || 'https://warblood.online',
    timeout: backendSpec?.endpoints?.production?.timeout || 15000,
    debug: false,
  },
  [ENV.SOLO]: {
    baseUrl: backendSpec?.endpoints?.production?.baseUrl || 'https://warblood.online',
    timeout: 15000,
    debug: true,
    specPath: BACKEND_SPEC_PATH,
    autoSync: soloConfig?.soloMode?.backendSpec?.autoSync || true,
  }
};

const activeEnv = isSoloMode ? ENV.SOLO : currentEnv;

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'daily_report',
  waitForConnections: true,
  connectionLimit: 5,
  timezone: '+08:00',
};

function generateApiPaths() {
  if (backendSpec?.apis) {
    const apiPaths = {};
    for (const [name, config] of Object.entries(backendSpec.apis)) {
      const module = getApiModule(name);
      if (!apiPaths[module]) apiPaths[module] = {};
      apiPaths[module][name.replace(`${module}_`, '')] = config.path;
    }
    return apiPaths;
  }

  return {
    report: {
      submit: '/api/report/submit',
      list: '/api/report/list',
      detail: '/api/review/detail',
    },
    project: {
      list: '/api/project/list',
      detail: '/api/project/detail',
      submit: '/api/project/submit',
      stats: '/api/project/stats',
      lastRecord: '/api/project/last-record',
      resubmitStatus: '/api/project/resubmit-status',
      delete: '/api/project/delete',
      reviewList: '/api/project/review-list',
      reviewDetail: '/api/project/review-detail',
      reviewStats: '/api/project/review-stats',
      reviewAction: '/api/project/review-action',
    },
    admin: {
      users: '/api/admin/users',
      list: '/api/admin/list',
      setAdmin: '/api/admin/set-admin',
      initFirst: '/api/admin/init-first',
    },
    auth: {
      login: '/api/auth/login',
    },
  };
}

function getApiModule(apiName) {
  if (apiName.startsWith('login') || apiName.startsWith('auth')) return 'auth';
  if (apiName.startsWith('report')) return 'report';
  if (apiName.startsWith('project')) return 'project';
  if (apiName.startsWith('review')) return 'review';
  if (apiName.startsWith('admin')) return 'admin';
  if (apiName.startsWith('health')) return 'health';
  return 'common';
}

const apiPaths = generateApiPaths();

const storageKeys = backendSpec?.frontendConfig?.storageKeys || {
  userInfo: 'user_info',
  accessToken: 'access_token',
  reportDraft: 'report_draft',
  projectDraft: 'project_draft',
};

const errorCodes = backendSpec?.errorCodes || {
  success: { code: 0, message: '成功' },
  general_error: { code: -1, message: '通用错误' },
  bad_request: { code: 400, message: '参数错误' },
  unauthorized: { code: 401, message: '未登录' },
  forbidden: { code: 403, message: '无权限' },
  not_found: { code: 404, message: '资源不存在' },
  server_error: { code: 500, message: '服务器错误' },
};

const getConfig = () => envConfig[activeEnv];

const getFullUrl = (path) => `${getConfig().baseUrl}${path}`;

const getApiConfig = (apiName) => {
  if (backendSpec?.apis?.[apiName]) {
    return backendSpec.apis[apiName];
  }
  return null;
};

const validateRequest = (apiName, data) => {
  const apiConfig = getApiConfig(apiName);
  if (!apiConfig || !apiConfig.request?.body) {
    return { valid: true, errors: [] };
  }

  const errors = [];
  const schema = apiConfig.request.body;

  for (const [field, config] of Object.entries(schema)) {
    if (config.required && !data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
    if (config.enum && data[field] && !config.enum.includes(data[field])) {
      errors.push(`Invalid value for ${field}, must be one of: ${config.enum.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

const getErrorCode = (code) => {
  for (const [name, config] of Object.entries(errorCodes)) {
    if (config.code === code) {
      return { name, ...config };
    }
  }
  return { name: 'unknown', code, message: 'Unknown error' };
};

module.exports = {
  ENV,
  currentEnv: activeEnv,
  isSoloMode,
  envConfig,
  dbConfig,
  apiPaths,
  storageKeys,
  errorCodes,
  getConfig,
  getFullUrl,
  getApiConfig,
  validateRequest,
  getErrorCode,
  BASE_URL: getConfig().baseUrl,
  DEBUG: getConfig().debug,
  TIMEOUT: getConfig().timeout,
  soloConfig: soloConfig?.soloMode || null,
  backendSpec,
};
