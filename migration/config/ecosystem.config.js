module.exports = {
  apps: [
    {
      name: 'daily-report-api',
      script: './src/app.js',
      cwd: '/var/www/daily-report/server',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      error_file: '/var/log/daily-report/error.log',
      out_file: '/var/log/daily-report/out.log',
      log_file: '/var/log/daily-report/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
