#!/bin/bash
# API Gateway 诊断脚本

echo "======================================"
echo "🔍 API Gateway 系统诊断"
echo "======================================"
echo ""

# 1. 检查 Gateway 状态
echo "1️⃣  检查 API Gateway (端口 8080)..."
if lsof -i :8080 | grep LISTEN > /dev/null 2>&1; then
    PID=$(lsof -ti :8080 | head -1)
    echo "   ✅ API Gateway 正在运行 (PID: $PID)"
else
    echo "   ❌ API Gateway 未运行"
fi
echo ""

# 2. 检查 Auth Service 状态
echo "2️⃣  检查 Auth Service (端口 25698)..."
if lsof -i :25698 | grep LISTEN > /dev/null 2>&1; then
    PID=$(lsof -ti :25698 | head -1)
    echo "   ✅ Auth Service 正在运行 (PID: $PID)"

    # 测试健康检查
    if curl -s http://localhost:25698/health > /dev/null 2>&1; then
        echo "   ✅ Auth Service 健康检查通过"
    else
        echo "   ⚠️  Auth Service 健康检查失败"
    fi
else
    echo "   ❌ Auth Service 未运行"
fi
echo ""

# 3. 测试 Gateway 健康检查
echo "3️⃣  测试 Gateway 健康检查..."
GATEWAY_HEALTH=$(curl -s http://localhost:8080/health 2>&1)
if [ $? -eq 0 ]; then
    echo "   ✅ Gateway 健康检查通过"
    echo "   响应: $GATEWAY_HEALTH"
else
    echo "   ❌ Gateway 健康检查失败"
fi
echo ""

# 4. 检查路由配置
echo "4️⃣  检查路由配置数据库..."
cd "$(dirname "$0")"
ROUTE_COUNT=$(python -c "
import sys
sys.path.insert(0, '.')
try:
    from app import create_app, app as flask_app
    from dbs.mysql_db import db
    from dbs.mysql_db.model_tables import ApiRouteModel, ServiceInstanceModel

    app = create_app(flask_app)
    with app.app_context():
        route_count = db.session.query(ApiRouteModel).filter_by(status=1).count()
        service_count = db.session.query(ServiceInstanceModel).filter_by(status=1).count()
        print(f'{route_count},{service_count}')
except Exception as e:
    print('0,0')
" 2>/dev/null)

if [ ! -z "$ROUTE_COUNT" ]; then
    ROUTES=$(echo $ROUTE_COUNT | cut -d',' -f1)
    SERVICES=$(echo $ROUTE_COUNT | cut -d',' -f2)

    if [ "$ROUTES" -gt "0" ]; then
        echo "   ✅ 已配置 $ROUTES 条路由"
    else
        echo "   ❌ 未配置路由 (需要运行 init_gateway_routes.py)"
    fi

    if [ "$SERVICES" -gt "0" ]; then
        echo "   ✅ 已注册 $SERVICES 个服务实例"
    else
        echo "   ❌ 未注册服务实例 (需要运行 init_gateway_routes.py)"
    fi
else
    echo "   ⚠️  无法检查数据库配置"
fi
echo ""

# 5. 测试登录接口
echo "5️⃣  测试登录接口..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123"}' 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "F10001"; then
    echo "   ❌ 登录接口测试失败 - 请求转发失败"
    echo "   可能原因: Auth Service 未运行或未注册"
elif echo "$LOGIN_RESPONSE" | grep -q "code"; then
    echo "   ✅ 登录接口响应正常"
    echo "   响应: ${LOGIN_RESPONSE:0:100}..."
else
    echo "   ⚠️  无法访问登录接口"
fi
echo ""

# 6. 总结和建议
echo "======================================"
echo "📋 诊断总结"
echo "======================================"

GATEWAY_OK=$(lsof -i :8080 | grep LISTEN > /dev/null 2>&1 && echo "yes" || echo "no")
AUTH_OK=$(lsof -i :25698 | grep LISTEN > /dev/null 2>&1 && echo "yes" || echo "no")

if [ "$GATEWAY_OK" = "no" ]; then
    echo "❌ 请启动 API Gateway:"
    echo "   cd api_gateway_service && ./restart_gateway.sh"
    echo ""
fi

if [ "$AUTH_OK" = "no" ]; then
    echo "❌ 请启动 Auth Service:"
    echo "   cd auth_service && ./restart_auth.sh"
    echo ""
fi

if [ "$ROUTES" = "0" ] || [ "$SERVICES" = "0" ]; then
    echo "❌ 请初始化路由配置:"
    echo "   cd api_gateway_service && python init_gateway_routes.py"
    echo ""
fi

if [ "$GATEWAY_OK" = "yes" ] && [ "$AUTH_OK" = "yes" ] && [ "$ROUTES" != "0" ]; then
    echo "✅ 系统状态良好，可以进行登录测试"
fi

echo "======================================"
