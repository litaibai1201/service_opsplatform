#!/bin/bash
# API Gateway 重启脚本

echo "🔍 检查并停止现有 Gateway 进程..."

# 查找占用 8080 端口的进程
PIDS=$(lsof -ti :8080)

if [ ! -z "$PIDS" ]; then
    echo "📌 找到进程: $PIDS"
    echo "🛑 停止进程..."
    kill -9 $PIDS
    sleep 2
    echo "✅ 进程已停止"
else
    echo "ℹ️  没有找到运行中的 Gateway 进程"
fi

# 检查端口是否释放
if lsof -i :8080 | grep LISTEN > /dev/null 2>&1; then
    echo "❌ 端口 8080 仍被占用，请手动检查"
    exit 1
else
    echo "✅ 端口 8080 已释放"
fi

echo ""
echo "🚀 启动 API Gateway..."
echo "===================================="

# 启动 Gateway
cd "$(dirname "$0")"
python app.py
