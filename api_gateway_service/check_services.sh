#!/bin/bash
# -*- coding: utf-8 -*-
# 服务健康检查脚本

echo "🔍 检查微服务健康状态..."
echo "================================"

# 定义服务列表
declare -A services=(
    ["API Gateway"]="8080"
    ["Auth Service"]="25698"
    ["Team Service"]="25708"
    ["Project Service"]="25707"
    ["Permission Service"]="25706"
    ["Architecture Service"]="25701"
    ["Flow Diagram Service"]="25705"
    ["API Design Service"]="25703"
    ["DB Design Service"]="25700"
    ["Feature Map Service"]="25702"
    ["Collaboration Service"]="25699"
    ["Version Control Service"]="25709"
    ["File Service"]="25704"
    ["Notification Service"]="8094"
    ["Search Service"]="8095"
    ["Audit Service"]="8091"
    ["Integration Service"]="8093"
)

# 统计
total=0
running=0
stopped=0

# 检查每个服务
for service in "${!services[@]}"; do
    port=${services[$service]}
    total=$((total + 1))

    # 检查端口是否监听
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ $service (端口 $port) - 运行中"
        running=$((running + 1))
    else
        echo "❌ $service (端口 $port) - 未运行"
        stopped=$((stopped + 1))
    fi
done

echo "================================"
echo "📊 统计结果:"
echo "   总服务数: $total"
echo "   运行中: $running"
echo "   未运行: $stopped"

# 检查 Gateway 是否可访问
echo ""
echo "🌐 测试 API Gateway..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ API Gateway 可访问: http://localhost:8080"
else
    echo "❌ API Gateway 不可访问"
    echo "💡 提示: 请先启动 API Gateway"
fi

echo ""
echo "💡 提示:"
echo "   - 运行 'python init_gateway_routes.py' 初始化网关路由"
echo "   - 访问 http://localhost:8080/swagger-ui 查看 API 文档"
echo "   - 访问 http://localhost:8080/admin/routes 查看路由配置"
