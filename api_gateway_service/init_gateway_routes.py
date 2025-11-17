#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@文件: init_gateway_routes.py
@说明: 批量初始化 API Gateway 的服务实例和路由配置
@时间: 2025-01-15
@作者: AI Assistant
@用法: python init_gateway_routes.py
"""

import uuid
import sys

# 添加当前目录到 Python 路径
sys.path.insert(0, '.')

from app import create_app, app as flask_app
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import ApiRouteModel, ServiceInstanceModel
from common.common_tools import CommonTools


# ==================== 服务实例配置 ====================
SERVICES = [
    {
        "service_name": "auth-service",
        "instance_id": "auth-service-001",
        "host": "localhost",
        "port": 25698,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "认证授权服务"
    },
    {
        "service_name": "team-service",
        "instance_id": "team-service-001",
        "host": "localhost",
        "port": 25708,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "团队管理服务"
    },
    {
        "service_name": "project-service",
        "instance_id": "project-service-001",
        "host": "localhost",
        "port": 25707,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "项目管理服务"
    },
    {
        "service_name": "permission-service",
        "instance_id": "permission-service-001",
        "host": "localhost",
        "port": 25706,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "权限管理服务"
    },
    {
        "service_name": "architecture-service",
        "instance_id": "architecture-service-001",
        "host": "localhost",
        "port": 25701,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "架构设计服务"
    },
    {
        "service_name": "flow-diagram-service",
        "instance_id": "flow-diagram-service-001",
        "host": "localhost",
        "port": 25705,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "流程图设计服务"
    },
    {
        "service_name": "api-design-service",
        "instance_id": "api-design-service-001",
        "host": "localhost",
        "port": 25703,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "API设计服务"
    },
    {
        "service_name": "db-design-service",
        "instance_id": "db-design-service-001",
        "host": "localhost",
        "port": 25700,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "数据库设计服务"
    },
    {
        "service_name": "feature-map-service",
        "instance_id": "feature-map-service-001",
        "host": "localhost",
        "port": 25702,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "功能导图服务"
    },
    {
        "service_name": "collaboration-service",
        "instance_id": "collaboration-service-001",
        "host": "localhost",
        "port": 25699,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "实时协作服务"
    },
    {
        "service_name": "version-control-service",
        "instance_id": "version-control-service-001",
        "host": "localhost",
        "port": 25709,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "版本控制服务"
    },
    {
        "service_name": "file-service",
        "instance_id": "file-service-001",
        "host": "localhost",
        "port": 25704,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "文件管理服务"
    },
    {
        "service_name": "notification-service",
        "instance_id": "notification-service-001",
        "host": "localhost",
        "port": 8094,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "通知服务"
    },
    {
        "service_name": "search-service",
        "instance_id": "search-service-001",
        "host": "localhost",
        "port": 8095,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "搜索服务"
    },
    {
        "service_name": "audit-service",
        "instance_id": "audit-service-001",
        "host": "localhost",
        "port": 8091,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "审计服务"
    },
    {
        "service_name": "integration-service",
        "instance_id": "integration-service-001",
        "host": "localhost",
        "port": 8093,
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "集成服务"
    },
]


# ==================== 路由配置 ====================
ROUTES = [
    # ========== 认证服务路由 ==========
    # 公开接口（不需要认证）
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/register",
        "target_url": "/auth/register",
        "method": "POST",
        "requires_auth": False,
        "rate_limit_rpm": 50,
        "priority": 10,
        "description": "用户注册"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/login",
        "target_url": "/auth/login",
        "method": "POST",
        "requires_auth": False,
        "rate_limit_rpm": 100,
        "priority": 10,
        "description": "用户登录"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/check-username/*",
        "target_url": "/auth/check-username/*",
        "method": "GET",
        "requires_auth": False,
        "rate_limit_rpm": 60,
        "priority": 9,
        "description": "检查用户名可用性"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/check-email/*",
        "target_url": "/auth/check-email/*",
        "method": "GET",
        "requires_auth": False,
        "rate_limit_rpm": 60,
        "priority": 9,
        "description": "检查邮箱可用性"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/forgot-password",
        "target_url": "/auth/forgot-password",
        "method": "POST",
        "requires_auth": False,
        "rate_limit_rpm": 20,
        "priority": 10,
        "description": "忘记密码"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/reset-password",
        "target_url": "/auth/reset-password",
        "method": "POST",
        "requires_auth": False,
        "rate_limit_rpm": 20,
        "priority": 10,
        "description": "重置密码"
    },
    # 需要认证的接口
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/profile",
        "target_url": "/auth/profile",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 8,
        "description": "获取用户信息"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/profile",
        "target_url": "/auth/profile",
        "method": "PUT",
        "requires_auth": True,
        "rate_limit_rpm": 100,
        "priority": 8,
        "description": "更新用户信息"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/logout",
        "target_url": "/auth/logout",
        "method": "POST",
        "requires_auth": True,
        "rate_limit_rpm": 100,
        "priority": 8,
        "description": "用户登出"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/refresh",
        "target_url": "/auth/refresh",
        "method": "POST",
        "requires_auth": True,
        "rate_limit_rpm": 200,
        "priority": 8,
        "description": "刷新令牌"
    },
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/change-password",
        "target_url": "/auth/change-password",
        "method": "PUT",
        "requires_auth": True,
        "rate_limit_rpm": 50,
        "priority": 8,
        "description": "修改密码"
    },
    # 通配符路由（优先级最低）
    {
        "service_name": "auth-service",
        "path_pattern": "/auth/*",
        "target_url": "/auth/*",
        "method": "ANY",
        "requires_auth": False,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "认证服务通配路由"
    },

    # ========== 团队服务路由 ==========
    {
        "service_name": "team-service",
        "path_pattern": "/teams",
        "target_url": "/teams",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 8,
        "description": "获取团队列表"
    },
    {
        "service_name": "team-service",
        "path_pattern": "/teams",
        "target_url": "/teams",
        "method": "POST",
        "requires_auth": True,
        "rate_limit_rpm": 100,
        "priority": 8,
        "description": "创建团队"
    },
    {
        "service_name": "team-service",
        "path_pattern": "/teams/*",
        "target_url": "/teams/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "团队服务通配路由"
    },

    # ========== 项目服务路由 ==========
    {
        "service_name": "project-service",
        "path_pattern": "/projects",
        "target_url": "/projects",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 8,
        "description": "获取项目列表"
    },
    {
        "service_name": "project-service",
        "path_pattern": "/projects/discover",
        "target_url": "/projects/discover",
        "method": "GET",
        "requires_auth": False,
        "rate_limit_rpm": 200,
        "priority": 9,
        "description": "发现公开项目"
    },
    {
        "service_name": "project-service",
        "path_pattern": "/projects/*",
        "target_url": "/projects/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "项目服务通配路由"
    },
    {
        "service_name": "project-service",
        "path_pattern": "/project-templates",
        "target_url": "/project-templates",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 200,
        "priority": 8,
        "description": "获取项目模板列表"
    },
    {
        "service_name": "project-service",
        "path_pattern": "/project-templates/*",
        "target_url": "/project-templates/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 1,
        "description": "项目模板通配路由"
    },
    {
        "service_name": "project-service",
        "path_pattern": "/tags",
        "target_url": "/tags",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 200,
        "priority": 8,
        "description": "获取标签列表"
    },
    {
        "service_name": "project-service",
        "path_pattern": "/tags/*",
        "target_url": "/tags/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 1,
        "description": "标签通配路由"
    },

    # ========== 架构设计服务路由 ==========
    {
        "service_name": "architecture-service",
        "path_pattern": "/diagrams/*",
        "target_url": "/diagrams/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "架构图通配路由"
    },

    # ========== 流程图设计服务路由 ==========
    {
        "service_name": "flow-diagram-service",
        "path_pattern": "/flow-diagrams/*",
        "target_url": "/flow-diagrams/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "流程图通配路由"
    },

    # ========== API设计服务路由 ==========
    {
        "service_name": "api-design-service",
        "path_pattern": "/api-specs/*",
        "target_url": "/api-specs/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "API设计通配路由"
    },

    # ========== 数据库设计服务路由 ==========
    {
        "service_name": "db-design-service",
        "path_pattern": "/db-designs/*",
        "target_url": "/db-designs/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "数据库设计通配路由"
    },

    # ========== 功能导图服务路由 ==========
    {
        "service_name": "feature-map-service",
        "path_pattern": "/feature-maps/*",
        "target_url": "/feature-maps/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "功能导图通配路由"
    },

    # ========== 协作服务路由 ==========
    {
        "service_name": "collaboration-service",
        "path_pattern": "/collaboration/*",
        "target_url": "/collaboration/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 2000,
        "priority": 1,
        "description": "协作服务通配路由"
    },

    # ========== 版本控制服务路由 ==========
    {
        "service_name": "version-control-service",
        "path_pattern": "/versions/*",
        "target_url": "/versions/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "版本控制通配路由"
    },

    # ========== 文件服务路由 ==========
    {
        "service_name": "file-service",
        "path_pattern": "/files/*",
        "target_url": "/files/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "文件服务通配路由"
    },

    # ========== 通知服务路由 ==========
    {
        "service_name": "notification-service",
        "path_pattern": "/notifications/*",
        "target_url": "/notifications/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "通知服务通配路由"
    },

    # ========== 搜索服务路由 ==========
    {
        "service_name": "search-service",
        "path_pattern": "/search/*",
        "target_url": "/search/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 1,
        "description": "搜索服务通配路由"
    },

    # ========== 审计服务路由 ==========
    {
        "service_name": "audit-service",
        "path_pattern": "/audit/*",
        "target_url": "/audit/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 1,
        "description": "审计服务通配路由"
    },

    # ========== 集成服务路由 ==========
    # Webhook管理
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/webhooks",
        "target_url": "/integrations/webhooks",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 8,
        "description": "获取Webhook列表"
    },
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/webhooks",
        "target_url": "/integrations/webhooks",
        "method": "POST",
        "requires_auth": True,
        "rate_limit_rpm": 100,
        "priority": 8,
        "description": "创建Webhook"
    },
    # 插件管理
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/plugins/marketplace",
        "target_url": "/integrations/plugins/marketplace",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 200,
        "priority": 9,
        "description": "获取插件市场"
    },
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/plugins/install",
        "target_url": "/integrations/plugins/install",
        "method": "POST",
        "requires_auth": True,
        "rate_limit_rpm": 50,
        "priority": 9,
        "description": "安装插件"
    },
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/plugins/uninstall",
        "target_url": "/integrations/plugins/uninstall",
        "method": "POST",
        "requires_auth": True,
        "rate_limit_rpm": 50,
        "priority": 9,
        "description": "卸载插件"
    },
    # 外部集成
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/external",
        "target_url": "/integrations/external",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 500,
        "priority": 8,
        "description": "获取外部集成列表"
    },
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/external",
        "target_url": "/integrations/external",
        "method": "POST",
        "requires_auth": True,
        "rate_limit_rpm": 100,
        "priority": 8,
        "description": "创建外部集成"
    },
    # 集成类型
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/types",
        "target_url": "/integrations/types",
        "method": "GET",
        "requires_auth": True,
        "rate_limit_rpm": 200,
        "priority": 8,
        "description": "获取支持的集成类型"
    },
    # 通配符路由（优先级最低）
    {
        "service_name": "integration-service",
        "path_pattern": "/integrations/*",
        "target_url": "/integrations/*",
        "method": "ANY",
        "requires_auth": True,
        "rate_limit_rpm": 1000,
        "priority": 1,
        "description": "集成服务通配路由"
    },
]


def clear_existing_data():
    """清空现有数据（可选）"""
    print("🗑️  清空现有数据...")
    try:
        # 清空路由表
        db.session.query(ApiRouteModel).delete()
        # 清空服务实例表
        db.session.query(ServiceInstanceModel).delete()
        db.session.commit()
        print("✅ 现有数据已清空")
    except Exception as e:
        db.session.rollback()
        print(f"❌ 清空数据失败: {str(e)}")
        raise


def insert_services():
    """插入服务实例"""
    print("\n📦 开始插入服务实例...")
    success_count = 0

    for service in SERVICES:
        try:
            # 检查是否已存在
            existing = db.session.query(ServiceInstanceModel).filter_by(
                service_name=service["service_name"],
                instance_id=service["instance_id"]
            ).first()

            if existing:
                print(f"⚠️  服务实例已存在: {service['service_name']} - {service['instance_id']}")
                continue

            # 创建新实例
            instance = ServiceInstanceModel(
                id=str(uuid.uuid4()),
                service_name=service["service_name"],
                instance_id=service["instance_id"],
                host=service["host"],
                port=service["port"],
                protocol=service.get("protocol", "http"),
                weight=service.get("weight", 100),
                instance_status="healthy",
                health_check_url=service.get("health_check_url"),
                health_check_interval_seconds=service.get("health_check_interval_seconds", 30),
                instance_metadata={"description": service.get("description", "")},
                registered_at=CommonTools.get_now(),
                created_at=CommonTools.get_now(),
                status=1
            )

            db.session.add(instance)
            db.session.commit()

            print(f"✅ 成功插入服务实例: {service['service_name']} ({service['host']}:{service['port']})")
            success_count += 1

        except Exception as e:
            db.session.rollback()
            print(f"❌ 插入服务实例失败 {service['service_name']}: {str(e)}")

    print(f"\n📊 服务实例插入完成: 成功 {success_count}/{len(SERVICES)}")
    return success_count


def insert_routes():
    """插入路由配置"""
    print("\n🛣️  开始插入路由配置...")
    success_count = 0

    for route in ROUTES:
        try:
            # 检查是否已存在
            existing = db.session.query(ApiRouteModel).filter_by(
                service_name=route["service_name"],
                path_pattern=route["path_pattern"],
                method=route["method"]
            ).first()

            if existing:
                print(f"⚠️  路由已存在: {route['method']} {route['path_pattern']}")
                continue

            # 创建新路由
            api_route = ApiRouteModel(
                id=str(uuid.uuid4()),
                service_name=route["service_name"],
                path_pattern=route["path_pattern"],
                target_url=route["target_url"],
                method=route["method"],
                version=route.get("version", "v1"),
                is_active=route.get("is_active", True),
                requires_auth=route.get("requires_auth", True),
                required_permissions=route.get("required_permissions"),
                permission_check_strategy=route.get("permission_check_strategy", "any"),
                rate_limit_rpm=route.get("rate_limit_rpm", 1000),
                timeout_seconds=route.get("timeout_seconds", 30),
                retry_count=route.get("retry_count", 3),
                circuit_breaker_enabled=route.get("circuit_breaker_enabled", True),
                cache_enabled=route.get("cache_enabled", False),
                cache_ttl_seconds=route.get("cache_ttl_seconds", 300),
                load_balance_strategy=route.get("load_balance_strategy", "round_robin"),
                priority=route.get("priority", 0),
                created_at=CommonTools.get_now(),
                status=1
            )

            db.session.add(api_route)
            db.session.commit()

            auth_status = "🔓 公开" if not route["requires_auth"] else "🔒 需认证"
            print(f"✅ {auth_status} [{route['priority']}] {route['method']:6s} {route['path_pattern']:40s} -> {route['service_name']}")
            success_count += 1

        except Exception as e:
            db.session.rollback()
            print(f"❌ 插入路由失败 {route['path_pattern']}: {str(e)}")

    print(f"\n📊 路由配置插入完成: 成功 {success_count}/{len(ROUTES)}")
    return success_count


def verify_data():
    """验证插入的数据"""
    print("\n🔍 验证插入的数据...")

    # 统计服务实例
    service_count = db.session.query(ServiceInstanceModel).filter_by(status=1).count()
    print(f"📦 服务实例总数: {service_count}")

    # 统计路由
    route_count = db.session.query(ApiRouteModel).filter_by(status=1).count()
    print(f"🛣️  路由配置总数: {route_count}")

    # 按服务名分组统计路由
    print("\n📊 各服务路由统计:")
    services = db.session.query(ApiRouteModel.service_name).distinct().all()
    for (service_name,) in services:
        count = db.session.query(ApiRouteModel).filter_by(
            service_name=service_name,
            status=1
        ).count()
        print(f"   - {service_name}: {count} 条路由")


def main():
    """主函数"""
    print("=" * 80)
    print("🚀 API Gateway 路由初始化脚本")
    print("=" * 80)

    # 初始化应用
    app = create_app(flask_app)

    with app.app_context():
        try:
            # 询问是否清空现有数据
            response = input("\n⚠️  是否清空现有数据？(y/N): ").strip().lower()
            if response == 'y':
                clear_existing_data()

            # 插入服务实例
            service_count = insert_services()

            # 插入路由配置
            route_count = insert_routes()

            # 验证数据
            verify_data()

            print("\n" + "=" * 80)
            print("✅ 初始化完成!")
            print(f"📦 服务实例: {service_count} 个")
            print(f"🛣️  路由配置: {route_count} 条")
            print("=" * 80)
            print("\n💡 提示:")
            print("   1. 请确保对应的微服务已经启动在配置的端口上")
            print("   2. 可以访问 http://localhost:8080/admin/routes 查看所有路由")
            print("   3. 可以访问 http://localhost:8080/admin/services 查看所有服务")
            print("   4. 现在前端可以通过 http://localhost:8080 访问所有微服务")

        except KeyboardInterrupt:
            print("\n\n❌ 用户中断操作")
            sys.exit(1)
        except Exception as e:
            print(f"\n\n❌ 发生错误: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()
