#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "start", "stop", "restart", "status", "logs", "test")]
    [string]$Action = "deploy"
)

$ErrorActionPreference = "Stop"

$HOST_IP = "111.229.107.123"
$HOST_USER = "ubuntu"
$SSH_KEY = "$env:USERPROFILE\.ssh\Wx_App_Rb.pem"
$REMOTE_DIR = "/var/www/daily-report"
$SERVER_DIR = "$REMOTE_DIR/server"
$USER_GROUP = "ubuntu:ubuntu"

function Invoke-RemoteCommand {
    param([string]$Command)
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no "$HOST_USER@$HOST_IP" $Command
}

function Deploy-Backend {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "开始部署后端服务..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "[1/6] 创建远程目录..." -ForegroundColor Yellow
    Invoke-RemoteCommand "sudo mkdir -p $SERVER_DIR && sudo chown -R ${USER_GROUP} $REMOTE_DIR"

    Write-Host "[2/6] 创建日志目录..." -ForegroundColor Yellow
    Invoke-RemoteCommand "sudo mkdir -p /var/log/daily-report && sudo chown -R ${USER_GROUP} /var/log/daily-report"

    Write-Host "[3/6] 上传后端代码..." -ForegroundColor Yellow
    $tempDir = "$env:TEMP\daily-report-server"
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    Copy-Item "D:\AI\WX_APP_RB\sql\server_new.js" "$tempDir\app.js"
    Copy-Item "D:\AI\WX_APP_RB\sql\db.js" "$tempDir\db.js"
    
    $packageJson = @{
        name = "daily-report-server"
        version = "1.0.0"
        description = "Daily Report API Server"
        main = "app.js"
        scripts = @{
            start = "node app.js"
            dev = "nodemon app.js"
        }
        dependencies = @{
            express = "^4.18.2"
            cors = "^2.8.5"
            mysql2 = "^3.6.0"
        }
        engines = @{
            node = ">=18.0.0"
        }
    }
    $packageJson | ConvertTo-Json -Depth 10 | Out-File "$tempDir\package.json" -Encoding utf8

    $envContent = @"
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=daily_report_user
MYSQL_PASSWORD=DailyReport@2024
MYSQL_DATABASE=daily_report
PORT=3000
NODE_ENV=production
"@
    $envContent | Out-File "$tempDir\.env" -Encoding utf8

    scp -i $SSH_KEY -o StrictHostKeyChecking=no -r "$tempDir\*" "$HOST_USER@$HOST_IP`:$SERVER_DIR/"
    Remove-Item -Recurse -Force $tempDir

    Write-Host "[4/6] 安装依赖..." -ForegroundColor Yellow
    Invoke-RemoteCommand "cd $SERVER_DIR && npm install --production"

    Write-Host "[5/6] 创建PM2配置..." -ForegroundColor Yellow
    $pm2Config = @"
module.exports = {
  apps: [{
    name: 'daily-report-api',
    script: 'app.js',
    cwd: '$SERVER_DIR',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/daily-report/error.log',
    out_file: '/var/log/daily-report/out.log',
    time: true
  }]
};
"@
    Invoke-RemoteCommand "echo '$pm2Config' > $SERVER_DIR/ecosystem.config.js"

    Write-Host "[6/6] 启动服务..." -ForegroundColor Yellow
    Invoke-RemoteCommand "cd $SERVER_DIR && pm2 start ecosystem.config.js && pm2 save"

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "部署完成!" -ForegroundColor Green
    Write-Host "API地址: http://$HOST_IP:3000" -ForegroundColor Green
    Write-Host "健康检查: http://$HOST_IP:3000/health" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

function Start-Backend {
    Write-Host "启动后端服务..." -ForegroundColor Yellow
    Invoke-RemoteCommand "cd $SERVER_DIR && pm2 start ecosystem.config.js"
    Invoke-RemoteCommand "pm2 save"
}

function Stop-Backend {
    Write-Host "停止后端服务..." -ForegroundColor Yellow
    Invoke-RemoteCommand "pm2 stop daily-report-api"
}

function Restart-Backend {
    Write-Host "重启后端服务..." -ForegroundColor Yellow
    Invoke-RemoteCommand "pm2 restart daily-report-api"
}

function Get-BackendStatus {
    Write-Host "后端服务状态:" -ForegroundColor Cyan
    Invoke-RemoteCommand "pm2 list && echo '' && curl -s http://localhost:3000/health 2>/dev/null || echo '服务未响应'"
}

function Get-BackendLogs {
    Write-Host "后端服务日志 (最近50行):" -ForegroundColor Cyan
    Invoke-RemoteCommand "tail -50 /var/log/daily-report/out.log 2>/dev/null || echo '暂无日志'"
}

function Test-Backend {
    Write-Host "测试后端API..." -ForegroundColor Cyan
    Invoke-RemoteCommand "curl -s http://localhost:3000/health && echo ''"
    Write-Host ""
    Write-Host "测试登录API..." -ForegroundColor Yellow
    Invoke-RemoteCommand "curl -s -X POST http://localhost:3000/api/login -H 'Content-Type: application/json' -d '{`"openid`":`"test_openid`"}' && echo ''"
}

switch ($Action) {
    "deploy" { Deploy-Backend }
    "start" { Start-Backend }
    "stop" { Stop-Backend }
    "restart" { Restart-Backend }
    "status" { Get-BackendStatus }
    "logs" { Get-BackendLogs }
    "test" { Test-Backend }
}
