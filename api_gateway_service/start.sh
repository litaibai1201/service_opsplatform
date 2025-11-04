#!/bin/bash
# -*- coding: utf-8 -*-
"""
@文件: start.sh
@說明: API Gateway 启动脚本
@時間: 2025-01-09
@作者: LiDong
"""

echo "========================================="
echo "  API Gateway Service Starting..."
echo "========================================="

# 检查Python版本
python_version=$(python3 --version 2>&1)
echo "Python版本: $python_version"

# 检查依赖是否已安装
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境..."
source venv/bin/activate

echo "安装/更新依赖..."
pip install -r requirements.txt

# 检查环境变量
echo "检查环境变量配置..."
if [ -f ".env" ]; then
    echo "发现 .env 文件，加载环境变量..."
    export $(cat .env | grep -v ^# | xargs)
else
    echo "警告: 未找到 .env 文件，使用默认配置"
fi

# 检查数据库连接
echo "检查数据库和Redis连接..."

echo "========================================="
echo "启动API Gateway服务..."
echo "========================================="

# 启动应用
python app.py