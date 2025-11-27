@echo off
chcp 65001 >nul
echo ===================================
echo   邀请数据统计系统 - 启动脚本
echo ===================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo Node.js 版本:
node -v
echo.

REM 检查是否需要安装依赖
if not exist "backend\node_modules" (
    echo 正在安装后端依赖...
    cd backend
    call npm install
    cd ..
    echo 后端依赖安装完成
    echo.
)

if not exist "frontend\node_modules" (
    echo 正在安装前端依赖...
    cd frontend
    call npm install
    cd ..
    echo 前端依赖安装完成
    echo.
)

REM 检查环境配置文件
if not exist "backend\.env" (
    echo 警告: 未找到 backend\.env 文件
    echo 请复制 backend\.env.example 并修改配置
    echo.
    set /p create_env="是否现在创建 .env 文件? (y/n) "
    if /i "%create_env%"=="y" (
        copy backend\.env.example backend\.env
        echo 已创建 backend\.env 文件，请编辑配置后重新运行此脚本
        pause
        exit /b 0
    ) else (
        exit /b 1
    )
)

REM 询问是否需要初始化数据库
set /p init_db="是否需要初始化数据库? (首次运行选择 y) (y/n) "
if /i "%init_db%"=="y" (
    echo 正在初始化数据库...
    cd backend
    call npm run init-db
    cd ..
    echo.
)

REM 启动服务
echo 正在启动后端服务...
start "后端服务" cmd /k "cd backend && npm start"

echo 等待后端服务启动...
timeout /t 3 /nobreak >nul

echo 正在启动前端服务...
start "前端服务" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================
echo   服务启动成功！
echo ===================================
echo 后端服务: http://localhost:3000
echo 前端应用: http://localhost:5173
echo.
echo 请不要关闭弹出的命令行窗口
echo.
pause
