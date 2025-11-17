#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MySQL 连接测试脚本
"""

import sys
sys.path.insert(0, '.')

from configs.app_config import SQLALCHEMY_DATABASE_URI
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

print("=" * 60)
print("MySQL 连接测试")
print("=" * 60)
print()

# 解析连接字符串
print(f"📝 连接字符串: {SQLALCHEMY_DATABASE_URI[:50]}...")
print()

try:
    # 测试 1: 基础连接测试（不使用连接池）
    print("1️⃣  测试基础连接...")
    engine = create_engine(
        SQLALCHEMY_DATABASE_URI,
        poolclass=NullPool,
        echo=False
    )

    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("   ✅ 基础连接成功")

    engine.dispose()
    print()

    # 测试 2: 带连接池的连接测试
    print("2️⃣  测试连接池配置...")
    engine_with_pool = create_engine(
        SQLALCHEMY_DATABASE_URI,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        echo=False
    )

    with engine_with_pool.connect() as conn:
        result = conn.execute(text("SELECT VERSION()"))
        version = result.fetchone()[0]
        print(f"   ✅ MySQL 版本: {version}")

    print()

    # 测试 3: 查询数据库
    print("3️⃣  测试数据库查询...")
    with engine_with_pool.connect() as conn:
        # 查询路由表
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM api_routes
            WHERE status = 1
        """))
        route_count = result.fetchone()[0]
        print(f"   ✅ 活跃路由数: {route_count}")

        # 查询服务实例表
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM service_instances
            WHERE status = 1
        """))
        service_count = result.fetchone()[0]
        print(f"   ✅ 注册服务数: {service_count}")

    print()

    # 测试 4: 连接池状态
    print("4️⃣  连接池状态...")
    pool = engine_with_pool.pool
    print(f"   📊 连接池大小: {pool.size()}")
    print(f"   📊 当前连接数: {pool.checkedin()}")
    print(f"   📊 使用中连接: {pool.checkedout()}")
    print(f"   📊 溢出连接数: {pool.overflow()}")

    print()
    print("=" * 60)
    print("✅ 所有测试通过！MySQL 连接正常")
    print("=" * 60)

    engine_with_pool.dispose()
    sys.exit(0)

except Exception as e:
    print()
    print("=" * 60)
    print(f"❌ MySQL 连接测试失败")
    print("=" * 60)
    print()
    print(f"错误类型: {type(e).__name__}")
    print(f"错误信息: {str(e)}")
    print()
    print("🔧 可能的解决方案:")
    print("   1. 检查 MySQL 是否运行:")
    print("      ps aux | grep mysqld")
    print()
    print("   2. 检查数据库配置:")
    print("      configs/db_config.py")
    print()
    print("   3. 尝试手动连接:")
    print("      mysql -u <username> -p <database>")
    print()
    print("   4. 重启 MySQL:")
    print("      mysql.server restart")
    print()

    import traceback
    traceback.print_exc()
    sys.exit(1)
