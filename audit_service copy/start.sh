#!/bin/bash

# Auth Service 启动脚本

echo "=== Auth Service Starting ==="

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 not found"
    exit 1
fi

# 检查依赖文件
if [ ! -f "requirements.txt" ]; then
    echo "Error: requirements.txt not found"
    exit 1
fi

# 安装依赖（可选）
echo "Installing dependencies..."
pip3 install -r requirements.txt

# 设置环境变量（如果.env文件存在）
if [ -f ".env" ]; then
    echo "Loading environment variables from .env"
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# 创建必要的目录
mkdir -p logs/{info,error,warn,critical}

echo "Starting Auth Service on port 8000..."
echo "Access Swagger UI at: http://localhost:8000/swagger-ui"
echo "Health check at: http://localhost:8000/auth/health"
echo "=== Press Ctrl+C to stop ==="

# 启动服务
python3 app.py