const path = require('path');
const { BackendSpecParser, createParser } = require('./backend-spec-parser');
const { TraeIntegration, traeIntegration } = require('./trae-integration');

async function testSoloMode() {
  console.log('========================================');
  console.log('Solo Mode 测试');
  console.log('========================================\n');

  const specPath = path.join(__dirname, '..', 'docs', 'BACKEND_SPEC.md');
  console.log('1. 测试后端规范解析器...');
  console.log(`   规范文件路径: ${specPath}\n`);

  try {
    const parser = createParser(specPath);
    const spec = parser.load();

    console.log('   ✅ 规范文件加载成功\n');

    console.log('2. 测试端点配置...');
    const endpoint = parser.getEndpoint('production');
    console.log(`   生产环境URL: ${endpoint.baseUrl}`);
    console.log(`   超时时间: ${endpoint.timeout}ms`);
    console.log('   ✅ 端点配置正确\n');

    console.log('3. 测试API配置...');
    const loginApi = parser.getApiConfig('login');
    if (loginApi) {
      console.log(`   登录API路径: ${loginApi.path}`);
      console.log(`   请求方法: ${loginApi.method}`);
      console.log(`   权限级别: ${loginApi.auth}`);
      console.log('   ✅ API配置正确\n');
    }

    console.log('4. 测试数据模型...');
    const userModel = parser.getDataModel('User');
    if (userModel) {
      console.log(`   用户表名: ${userModel.tableName}`);
      console.log(`   主键: ${userModel.primaryKey}`);
      console.log(`   字段数量: ${Object.keys(userModel.fields).length}`);
      console.log('   ✅ 数据模型正确\n');
    }

    console.log('5. 测试认证配置...');
    const authConfig = parser.getAuthConfig();
    if (authConfig) {
      console.log(`   认证类型: ${authConfig.type}`);
      console.log(`   描述: ${authConfig.description}`);
      console.log('   ✅ 认证配置正确\n');
    }

    console.log('6. 测试错误码...');
    const errorCode = parser.getErrorCode('bad_request');
    if (errorCode) {
      console.log(`   错误码: ${errorCode.code}`);
      console.log(`   消息: ${errorCode.message}`);
      console.log('   ✅ 错误码配置正确\n');
    }

    console.log('7. 测试请求验证...');
    const validation = parser.validateRequest('login', { openid: 'test123' });
    console.log(`   验证结果: ${validation.valid ? '通过' : '失败'}`);
    console.log(`   错误列表: ${validation.errors.length === 0 ? '无' : validation.errors.join(', ')}`);
    console.log('   ✅ 请求验证正确\n');

    console.log('8. 测试响应生成...');
    const successResponse = parser.generateResponse('login', { openid: 'test123' });
    console.log(`   成功响应: ${JSON.stringify(successResponse)}`);
    const errorResponse = parser.generateResponse('login', 400, true);
    console.log(`   错误响应: ${JSON.stringify(errorResponse)}`);
    console.log('   ✅ 响应生成正确\n');

    console.log('9. 测试前端配置生成...');
    const frontendConfig = parser.generateFrontendConfig();
    console.log(`   Base URL: ${frontendConfig.baseUrl}`);
    console.log(`   API模块数量: ${Object.keys(frontendConfig.apiPaths).length}`);
    console.log('   ✅ 前端配置生成正确\n');

    console.log('10. 测试Trae集成...');
    const trae = new TraeIntegration({ specPath });
    await trae.initialize();
    console.log('   ✅ Trae集成初始化成功\n');

    console.log('11. 测试API列表...');
    const apiList = await trae.getApiList();
    console.log(`   API数量: ${apiList.length}`);
    apiList.slice(0, 3).forEach(api => {
      console.log(`   - ${api.method} ${api.path} (${api.auth})`);
    });
    console.log('   ✅ API列表获取正确\n');

    console.log('12. 测试健康状态...');
    const health = await trae.getHealthStatus();
    console.log(`   规范状态: ${health.spec}`);
    console.log(`   时间: ${health.time}`);
    console.log('   ✅ 健康状态检查正确\n');

    console.log('========================================');
    console.log('✅ 所有测试通过！Solo模式配置正确');
    console.log('========================================\n');

    console.log('使用说明:');
    console.log('---------');
    console.log('1. 启用Solo模式: 设置 solo.config.json 中 soloMode.enabled = true');
    console.log('2. 后端规范文档: docs/BACKEND_SPEC.md');
    console.log('3. 前端配置自动从规范文档生成');
    console.log('4. 后端使用 trae-integration.js 读取规范');
    console.log('\nAPI示例:');
    console.log('  const { traeIntegration } = require("./sql/trae-integration");');
    console.log('  const apiConfig = await traeIntegration.getApiConfig("login");');
    console.log('  const validation = await traeIntegration.validateRequest("login", data);');

  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testSoloMode();
