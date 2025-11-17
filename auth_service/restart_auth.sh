#!/bin/bash
# Auth Service 重启脚本

echo "🔍 检查并停止现有 Auth Service 进程..."

# 查找占用 25698 端口的进程
PIDS=$(lsof -ti :25698)

if [ ! -z "$PIDS" ]; then
    echo "📌 找到进程: $PIDS"
    echo "🛑 停止进程..."
    kill -9 $PIDS
    sleep 2
    echo "✅ 进程已停止"
else
    echo "ℹ️  没有找到运行中的 Auth Service 进程"
fi

# 检查端口是否释放
if lsof -i :25698 | grep LISTEN > /dev/null 2>&1; then
    echo "❌ 端口 25698 仍被占用，请手动检查"
    exit 1
else
    echo "✅ 端口 25698 已释放"
fi

echo ""
echo "🚀 启动 Auth Service..."
echo "===================================="

# 启动 Auth Service
cd "$(dirname "$0")"
python app.py
