/**
 * ESLint 配置文件
 * 基于 docs/coding.md 编码规范
 * 适用于微信小程序原生开发 + Node.js 云函数
 */
module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  globals: {
    // 微信小程序全局对象
    wx: 'readonly',
    App: 'readonly',
    Page: 'readonly',
    Component: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly',
    Behavior: 'readonly',
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    // 编码规范：禁用 var
    'no-var': 'error',
    'prefer-const': 'warn',

    // 编码规范：使用箭头函数
    'prefer-arrow-callback': 'warn',

    // 编码规范：使用模板字符串
    'prefer-template': 'warn',

    // 代码质量
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',

    // 最佳实践
    eqeqeq: ['error', 'always'],
    curly: ['error', 'multi-line'],
    'no-throw-literal': 'error',

    // 代码风格
    indent: ['error', 2, { SwitchCase: 1 }],
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],

    // JSDoc 注释规范
    'require-jsdoc': [
      'warn',
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: false,
          ClassDeclaration: false,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
      },
    ],
  },
  overrides: [
    // 云函数特殊配置
    {
      files: ['cloudfunctions/**/*.js'],
      env: {
        node: true,
      },
    },
    // 小程序页面/组件配置
    {
      files: ['pages/**/*.js', 'components/**/*.js', 'custom-tab-bar/**/*.js'],
      rules: {
        // 小程序 Page/Component 构造器不需要 JSDoc
        'require-jsdoc': 'off',
      },
    },
  ],
};
