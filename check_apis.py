#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API 配置检查脚本
对比前端期望的接口和 Gateway 已配置的路由
"""

import sys
import re
from collections import defaultdict

sys.path.insert(0, '/Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service')

from app import create_app, app as flask_app
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import ApiRouteModel

# 前端期望的接口列表（从 apiConfig.ts 提取）
FRONTEND_ENDPOINTS = {
    "认证相关 (AUTH)": [
        "/auth/login",
        "/auth/register",
        "/auth/logout",
        "/auth/refresh",
        "/auth/profile",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/verify-email",
        "/auth/resend-verification",
        "/auth/change-password",
        "/auth/check-username/:username",
        "/auth/check-email/:email",
    ],

    "用户相关 (USERS)": [
        "/users",
        "/users/:id",
        "/users/:id/avatar",
    ],

    "团队相关 (TEAMS)": [
        "/teams",
        "/teams/:id",
        "/teams/:id/members",
        "/teams/:id/invitations",
        "/teams/:id/invite",
        "/teams/:id/join",
        "/teams/:id/leave",
        "/teams/:id/stats",
    ],

    "项目相关 (PROJECTS)": [
        "/projects",
        "/projects/:id",
        "/projects/:id/maintainers",
        "/project-templates",
        "/project-tags",
    ],

    "设计工具 - 架构 (ARCHITECTURE)": [
        "/projects/:projectId/architecture",
        "/projects/:projectId/architecture/:id",
    ],

    "设计工具 - 流程图 (FLOW_DIAGRAM)": [
        "/projects/:projectId/flow-diagrams",
        "/projects/:projectId/flow-diagrams/:id",
    ],

    "设计工具 - API (API_DESIGN)": [
        "/projects/:projectId/api-designs",
        "/projects/:projectId/api-designs/:id",
        "/projects/:projectId/api-designs/:id/mock",
    ],

    "设计工具 - 数据库 (DATABASE)": [
        "/projects/:projectId/database-designs",
        "/projects/:projectId/database-designs/:id",
        "/projects/:projectId/database-designs/:id/sql",
    ],

    "设计工具 - 功能导图 (FEATURE_MAP)": [
        "/projects/:projectId/feature-maps",
        "/projects/:projectId/feature-maps/:id",
    ],

    "协作相关 (COLLABORATION)": [
        "/collaboration/rooms",
        "/collaboration/rooms/:id/join",
        "/collaboration/rooms/:id/leave",
        "/collaboration/comments",
        "/collaboration/presence",
    ],

    "文件相关 (FILES)": [
        "/files/upload",
        "/files/:id/download",
        "/files/:id",
    ],

    "通知相关 (NOTIFICATIONS)": [
        "/notifications",
        "/notifications/:id/read",
        "/notifications/read-all",
        "/notifications/settings",
    ],

    "仪表板 (DASHBOARD)": [
        "/dashboard/stats",
        "/dashboard/activities",
        "/dashboard/recent-projects",
        "/dashboard/charts",
    ],

    "管理员 (ADMIN)": [
        "/admin/users",
        "/admin/teams",
        "/admin/projects",
        "/admin/system",
        "/admin/audit-logs",
        "/admin/settings",
    ],
}


def normalize_path(path):
    """标准化路径，替换参数为通配符"""
    # /users/:id -> /users/*
    # /teams/:id/members -> /teams/*/members
    normalized = re.sub(r':[^/]+', '*', path)
    return normalized


def check_route_match(frontend_path, gateway_routes):
    """检查前端路径是否在 Gateway 中有匹配的路由"""
    # 精确匹配
    for route in gateway_routes:
        if route['path'] == frontend_path:
            return 'exact', route

    # 通配符匹配
    normalized = normalize_path(frontend_path)
    for route in gateway_routes:
        if route['path'] == normalized:
            return 'wildcard', route

    # 更宽泛的通配符匹配
    for route in gateway_routes:
        if route['path'].endswith('/*'):
            prefix = route['path'][:-2]  # 移除 /*
            if frontend_path.startswith(prefix):
                return 'prefix', route

    return None, None


def main():
    print("=" * 80)
    print("🔍 API 配置检查报告")
    print("=" * 80)
    print()

    # 从数据库获取已配置的路由
    app = create_app(flask_app)
    with app.app_context():
        routes = db.session.query(ApiRouteModel).filter_by(status=1).all()

        gateway_routes = []
        for route in routes:
            gateway_routes.append({
                'path': route.path_pattern,
                'method': route.method,
                'service': route.service_name,
                'auth': route.requires_auth,
            })

    print(f"📊 Gateway 已配置路由: {len(gateway_routes)} 条")
    print()

    # 统计
    stats = {
        'total': 0,
        'matched': 0,
        'missing': 0,
        'by_category': defaultdict(lambda: {'total': 0, 'matched': 0, 'missing': 0})
    }

    missing_routes = []

    # 检查每个类别
    for category, endpoints in FRONTEND_ENDPOINTS.items():
        print(f"{'=' * 80}")
        print(f"📋 {category}")
        print(f"{'=' * 80}")

        for endpoint in endpoints:
            stats['total'] += 1
            stats['by_category'][category]['total'] += 1

            match_type, matched_route = check_route_match(endpoint, gateway_routes)

            if match_type:
                stats['matched'] += 1
                stats['by_category'][category]['matched'] += 1

                if match_type == 'exact':
                    print(f"  ✅ {endpoint:50s} → {matched_route['service']}")
                elif match_type == 'wildcard':
                    print(f"  ✅ {endpoint:50s} → {matched_route['path']} ({matched_route['service']})")
                else:  # prefix
                    print(f"  ⚠️  {endpoint:50s} → {matched_route['path']} ({matched_route['service']})")
            else:
                stats['missing'] += 1
                stats['by_category'][category]['missing'] += 1
                print(f"  ❌ {endpoint:50s} → 未配置")
                missing_routes.append({
                    'category': category,
                    'path': endpoint
                })

        print()

    # 总结
    print("=" * 80)
    print("📊 统计汇总")
    print("=" * 80)
    print(f"总接口数: {stats['total']}")
    print(f"已配置: {stats['matched']} ({stats['matched']/stats['total']*100:.1f}%)")
    print(f"未配置: {stats['missing']} ({stats['missing']/stats['total']*100:.1f}%)")
    print()

    # 分类统计
    print("📋 分类统计:")
    for category, cat_stats in stats['by_category'].items():
        percentage = cat_stats['matched'] / cat_stats['total'] * 100 if cat_stats['total'] > 0 else 0
        status = "✅" if percentage == 100 else "⚠️" if percentage >= 50 else "❌"
        print(f"  {status} {category:40s} {cat_stats['matched']}/{cat_stats['total']} ({percentage:.0f}%)")
    print()

    # 缺失路由
    if missing_routes:
        print("=" * 80)
        print("❌ 缺失的路由")
        print("=" * 80)

        by_category = defaultdict(list)
        for route in missing_routes:
            by_category[route['category']].append(route['path'])

        for category, paths in by_category.items():
            print(f"\n{category}:")
            for path in paths:
                print(f"  - {path}")

    print()
    print("=" * 80)

    # 建议
    print()
    print("💡 建议:")
    print()

    if stats['missing'] == 0:
        print("  ✅ 所有前端接口都已配置！")
    else:
        print(f"  ⚠️  有 {stats['missing']} 个接口未配置")
        print()
        print("  优先级建议:")
        print("  1. 高优先级: 认证、用户、团队、项目相关接口")
        print("  2. 中优先级: 设计工具、协作、文件、通知接口")
        print("  3. 低优先级: Dashboard、管理员接口")
        print()
        print(f"  详细信息请查看: api_route_gaps.md")


if __name__ == "__main__":
    main()
