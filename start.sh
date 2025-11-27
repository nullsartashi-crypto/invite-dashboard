#!/bin/bash

echo "==================================="
echo "  邀请数据统计系统 - 启动脚本"
echo "==================================="
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "Node.js 版本: $(node -v)"
echo ""

# 检查是否需要安装依赖
if [ ! -d "backend/node_modules" ]; then
    echo "正在安装后端依赖..."
    cd backend && npm install
    cd ..
    echo "后端依赖安装完成"
    echo ""
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "正在安装前端依赖..."
    cd frontend && npm install
    cd ..
    echo "前端依赖安装完成"
    echo ""
fi

# 检查环境配置文件
if [ ! -f "backend/.env" ]; then
    echo "警告: 未找到 backend/.env 文件"
    echo "请复制 backend/.env.example 并修改配置"
    echo ""
    read -p "是否现在创建 .env 文件? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp backend/.env.example backend/.env
        echo "已创建 backend/.env 文件，请编辑配置后重新运行此脚本"
        exit 0
    else
        exit 1
    fi
fi

# 询问是否需要初始化数据库
read -p "是否需要初始化数据库? (首次运行选择 y) (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "正在初始化数据库..."
    cd backend && npm run init-db
    cd ..
    echo ""
fi

# 启动服务
echo "正在启动后端服务..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

echo "等待后端服务启动..."
sleep 3

echo "正在启动前端服务..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==================================="
echo "  服务启动成功！"
echo "==================================="
echo "后端服务: http://localhost:3000"
echo "前端应用: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 等待进程
wait $BACKEND_PID $FRONTEND_PID
