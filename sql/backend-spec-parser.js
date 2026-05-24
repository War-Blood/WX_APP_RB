const fs = require('fs');
const path = require('path');

class BackendSpecParser {
  constructor(specPath) {
    this.specPath = specPath;
    this.spec = null;
    this.lastModified = null;
  }

  load() {
    if (!fs.existsSync(this.specPath)) {
      throw new Error(`Backend spec file not found: ${this.specPath}`);
    }

    const stats = fs.statSync(this.specPath);
    if (this.lastModified && stats.mtimeMs <= this.lastModified) {
      return this.spec;
    }

    const content = fs.readFileSync(this.specPath, 'utf-8');
    this.spec = this.parse(content);
    this.lastModified = stats.mtimeMs;
    return this.spec;
  }

  parse(content) {
    const spec = {
      metadata: {},
      endpoints: {},
      apis: {},
      dataModels: {},
      authentication: {},
      authorization: {},
      errorCodes: {},
      responseFormat: {},
      environmentVariables: {},
      healthCheck: {},
      frontendConfig: {}
    };

    const jsonBlocks = this.extractJsonBlocks(content);

    for (const block of jsonBlocks) {
      try {
        const parsed = JSON.parse(block.content);
        this.mergeSpec(spec, parsed, block.section);
      } catch (e) {
        console.warn(`Failed to parse JSON block in section "${block.section}":`, e.message);
      }
    }

    return spec;
  }

  extractJsonBlocks(content) {
    const blocks = [];
    const jsonRegex = /```json\s*\n([\s\S]*?)\n```/g;
    let match;
    let currentSection = 'unknown';

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^##\s+\d+\.\s+(.+)/)) {
        currentSection = line.replace(/^##\s+\d+\.\s+/, '').trim().toLowerCase().replace(/\s+/g, '_');
      }
    }

    while ((match = jsonRegex.exec(content)) !== null) {
      const beforeMatch = content.substring(0, match.index);
      const sectionMatch = beforeMatch.match(/##\s+\d+\.\s+([^\n]+)/g);
      if (sectionMatch) {
        currentSection = sectionMatch[sectionMatch.length - 1]
          .replace(/##\s+\d+\.\s+/, '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');
      }
      blocks.push({
        section: currentSection,
        content: match[1].trim()
      });
    }

    return blocks;
  }

  mergeSpec(spec, parsed, section) {
    if (parsed.specVersion) {
      spec.metadata = parsed;
      return;
    }

    if (parsed.endpoints) {
      spec.endpoints = parsed.endpoints;
    }

    if (parsed.apis) {
      spec.apis = { ...spec.apis, ...parsed.apis };
    }

    if (parsed.User || parsed.ProjectReport) {
      spec.dataModels = { ...spec.dataModels, ...parsed };
    }

    if (parsed.authentication) {
      spec.authentication = parsed.authentication;
    }

    if (parsed.authorization) {
      spec.authorization = parsed.authorization;
    }

    if (parsed.errorCodes) {
      spec.errorCodes = parsed.errorCodes;
    }

    if (parsed.responseFormat) {
      spec.responseFormat = parsed.responseFormat;
    }

    if (parsed.required || parsed.optional) {
      spec.environmentVariables = parsed;
    }

    if (parsed.healthCheck) {
      spec.healthCheck = parsed.healthCheck;
    }

    if (parsed.frontendConfig) {
      spec.frontendConfig = parsed.frontendConfig;
    }

    for (const key of Object.keys(parsed)) {
      if (!spec[key] || typeof parsed[key] === 'object') {
        spec[key] = { ...spec[key], ...parsed[key] };
      }
    }
  }

  getApiConfig(apiName) {
    const spec = this.load();
    return spec.apis[apiName] || null;
  }

  getEndpoint(environment) {
    const spec = this.load();
    return spec.endpoints[environment] || spec.endpoints.production;
  }

  getDataModel(modelName) {
    const spec = this.load();
    return spec.dataModels[modelName] || null;
  }

  getErrorCode(code) {
    const spec = this.load();
    return spec.errorCodes[code] || null;
  }

  getAuthConfig() {
    const spec = this.load();
    return spec.authentication;
  }

  getAuthorizationConfig() {
    const spec = this.load();
    return spec.authorization;
  }

  getEnvironmentVariables() {
    const spec = this.load();
    return spec.environmentVariables;
  }

  getHealthCheckConfig() {
    const spec = this.load();
    return spec.healthCheck;
  }

  getFrontendConfig() {
    const spec = this.load();
    return spec.frontendConfig;
  }

  validateRequest(apiName, requestData) {
    const apiConfig = this.getApiConfig(apiName);
    if (!apiConfig) {
      return { valid: false, errors: [`API "${apiName}" not found in spec`] };
    }

    const errors = [];
    const bodySchema = apiConfig.request?.body || {};

    for (const [field, schema] of Object.entries(bodySchema)) {
      if (schema.required && !requestData[field]) {
        errors.push(`Missing required field: ${field}`);
      }

      if (requestData[field] !== undefined && schema.type) {
        const actualType = typeof requestData[field];
        if (schema.type === 'number' && actualType !== 'number') {
          errors.push(`Field "${field}" should be number, got ${actualType}`);
        } else if (schema.type === 'string' && actualType !== 'string') {
          errors.push(`Field "${field}" should be string, got ${actualType}`);
        } else if (schema.type === 'boolean' && actualType !== 'boolean') {
          errors.push(`Field "${field}" should be boolean, got ${actualType}`);
        } else if (schema.type === 'object' && actualType !== 'object') {
          errors.push(`Field "${field}" should be object, got ${actualType}`);
        }
      }

      if (schema.enum && !schema.enum.includes(requestData[field])) {
        errors.push(`Field "${field}" must be one of: ${schema.enum.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  generateResponse(apiName, data, isError = false) {
    const spec = this.load();
    const responseFormat = spec.responseFormat;

    if (isError) {
      const errorCode = typeof data === 'number' ? data : -1;
      const errorInfo = this.getErrorCode(errorCode) || { code: errorCode, message: 'Unknown error' };
      return {
        code: errorInfo.code,
        message: errorInfo.message,
        data: null
      };
    }

    return {
      code: 0,
      message: 'success',
      data
    };
  }

  generateFrontendConfig() {
    const spec = this.load();
    const endpoints = spec.endpoints;
    const apis = spec.apis;

    const config = {
      baseUrl: endpoints.production?.baseUrl || '',
      apiPaths: {},
      storageKeys: spec.frontendConfig?.storageKeys || {}
    };

    for (const [apiName, apiConfig] of Object.entries(apis)) {
      const module = this.getApiModule(apiName);
      if (!config.apiPaths[module]) {
        config.apiPaths[module] = {};
      }
      config.apiPaths[module][apiName.replace(`${module}_`, '')] = apiConfig.path;
    }

    return config;
  }

  getApiModule(apiName) {
    if (apiName.startsWith('login') || apiName.startsWith('auth')) return 'auth';
    if (apiName.startsWith('report')) return 'report';
    if (apiName.startsWith('project')) return 'project';
    if (apiName.startsWith('review')) return 'review';
    if (apiName.startsWith('admin')) return 'admin';
    if (apiName.startsWith('health')) return 'health';
    return 'common';
  }

  exportToJson() {
    const spec = this.load();
    return JSON.stringify(spec, null, 2);
  }
}

function createParser(specPath) {
  const defaultPath = path.join(__dirname, '..', 'docs', 'BACKEND_SPEC.md');
  return new BackendSpecParser(specPath || defaultPath);
}

module.exports = {
  BackendSpecParser,
  createParser
};
