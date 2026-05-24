const { BackendSpecParser, createParser } = require('./backend-spec-parser');
const db = require('./db');
const path = require('path');

class TraeIntegration {
  constructor(options = {}) {
    this.specPath = options.specPath || path.join(__dirname, '..', 'docs', 'BACKEND_SPEC.md');
    this.parser = createParser(this.specPath);
    this.spec = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this.spec;

    try {
      this.spec = this.parser.load();
      this.initialized = true;
      console.log('[Trae] Backend spec loaded successfully');
      return this.spec;
    } catch (err) {
      console.error('[Trae] Failed to load backend spec:', err.message);
      throw err;
    }
  }

  async getApiConfig(apiName) {
    await this.initialize();
    return this.parser.getApiConfig(apiName);
  }

  async getEndpoint(environment = 'production') {
    await this.initialize();
    return this.parser.getEndpoint(environment);
  }

  async getDataModel(modelName) {
    await this.initialize();
    return this.parser.getDataModel(modelName);
  }

  async getAuthConfig() {
    await this.initialize();
    return this.parser.getAuthConfig();
  }

  async getAuthorizationConfig() {
    await this.initialize();
    return this.parser.getAuthorizationConfig();
  }

  async getEnvironmentVariables() {
    await this.initialize();
    return this.parser.getEnvironmentVariables();
  }

  async validateRequest(apiName, data) {
    await this.initialize();
    return this.parser.validateRequest(apiName, data);
  }

  async generateResponse(apiName, data, isError = false) {
    await this.initialize();
    return this.parser.generateResponse(apiName, data, isError);
  }

  async generateFrontendConfig() {
    await this.initialize();
    return this.parser.generateFrontendConfig();
  }

  async checkPermission(userOpenid, requiredLevel) {
    await this.initialize();

    if (requiredLevel === 'public') {
      return true;
    }

    if (!userOpenid) {
      return false;
    }

    try {
      const user = await db.queryOne(
        'SELECT openid, is_admin FROM users WHERE openid = ?',
        [userOpenid]
      );

      if (!user) {
        return false;
      }

      if (requiredLevel === 'user') {
        return true;
      }

      if (requiredLevel === 'admin') {
        return user.is_admin === 1;
      }

      return false;
    } catch (err) {
      console.error('[Trae] Permission check failed:', err.message);
      return false;
    }
  }

  async executeWithSpec(apiName, handler) {
    await this.initialize();

    const apiConfig = await this.getApiConfig(apiName);
    if (!apiConfig) {
      return {
        code: 404,
        message: `API "${apiName}" not found in spec`,
        data: null
      };
    }

    return async (req, res) => {
      const authLevel = apiConfig.auth || 'public';

      const userOpenid = req.body?.openid || req.query?.openid;
      const hasPermission = await this.checkPermission(userOpenid, authLevel);

      if (!hasPermission) {
        return res.json({
          code: 403,
          message: '无权限访问此接口',
          data: null
        });
      }

      if (apiConfig.request?.body) {
        const validation = await this.validateRequest(apiName, req.body);
        if (!validation.valid) {
          return res.json({
            code: 400,
            message: validation.errors.join('; '),
            data: null
          });
        }
      }

      try {
        const result = await handler(req, res, apiConfig);
        return result;
      } catch (err) {
        console.error(`[Trae] Handler error for ${apiName}:`, err.message);
        return res.json({
          code: 500,
          message: '服务器错误',
          data: null
        });
      }
    };
  }

  async syncToFrontend() {
    await this.initialize();

    const frontendConfig = await this.generateFrontendConfig();
    const configPath = path.join(__dirname, '..', 'config', 'solo-generated.json');

    const fs = require('fs');
    fs.writeFileSync(configPath, JSON.stringify(frontendConfig, null, 2));

    console.log('[Trae] Frontend config synced to:', configPath);
    return frontendConfig;
  }

  async getHealthStatus() {
    await this.initialize();

    const healthCheck = this.parser.getHealthCheckConfig();
    const status = {
      spec: 'ok',
      time: new Date().toISOString()
    };

    if (healthCheck?.checks) {
      for (const check of healthCheck.checks) {
        if (check.name === 'mysql') {
          try {
            await db.testConnection();
            status.mysql = 'ok';
          } catch (err) {
            status.mysql = 'error: ' + err.message;
          }
        }
      }
    }

    return status;
  }

  async exportSpec() {
    await this.initialize();
    return this.parser.exportToJson();
  }

  async getApiList() {
    await this.initialize();
    const apis = this.spec?.apis || {};
    return Object.entries(apis).map(([name, config]) => ({
      name,
      method: config.method,
      path: config.path,
      auth: config.auth,
      description: config.description
    }));
  }

  async getDataModelList() {
    await this.initialize();
    const models = this.spec?.dataModels || {};
    return Object.entries(models).map(([name, config]) => ({
      name,
      tableName: config.tableName,
      primaryKey: config.primaryKey,
      fieldCount: Object.keys(config.fields || {}).length
    }));
  }
}

const traeIntegration = new TraeIntegration();

function createTraeMiddleware() {
  return async (req, res, next) => {
    req.trae = traeIntegration;
    next();
  };
}

module.exports = {
  TraeIntegration,
  traeIntegration,
  createTraeMiddleware,
  BackendSpecParser,
  createParser
};
