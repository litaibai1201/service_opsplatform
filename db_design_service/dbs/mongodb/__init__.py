# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: MongoDB 數據庫初始化 (Database Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

import pymongo
from flask_pymongo import PyMongo
from loggers import logger

# 全局 MongoDB 實例
mongo = PyMongo()
db_instance = None


def init_mongodb(app):
    """初始化 MongoDB 連接"""
    global db_instance
    try:
        mongo.init_app(app)
        db_instance = mongo.db
        
        # 測試連接
        db_instance.admin.command('ping')
        logger.info("MongoDB 連接成功")
        
        # 初始化索引
        init_indexes()
        
        return db_instance
    except Exception as e:
        logger.error(f"MongoDB 連接失敗: {str(e)}")
        raise


def init_indexes():
    """初始化集合索引"""
    try:
        # database_designs 集合索引
        db_instance.database_designs.create_index([("project_id", 1)])
        db_instance.database_designs.create_index([("created_by", 1)])
        db_instance.database_designs.create_index([("db_type", 1)])
        db_instance.database_designs.create_index([("version", 1)])
        db_instance.database_designs.create_index([("created_at", -1)])
        db_instance.database_designs.create_index([("project_id", 1), ("name", 1)])
        
        # db_migrations 集合索引
        db_instance.db_migrations.create_index([("design_id", 1)])
        db_instance.db_migrations.create_index([("version_from", 1)])
        db_instance.db_migrations.create_index([("version_to", 1)])
        db_instance.db_migrations.create_index([("applied", 1)])
        db_instance.db_migrations.create_index([("created_by", 1)])
        db_instance.db_migrations.create_index([("created_at", -1)])
        
        logger.info("MongoDB 索引初始化完成")
    except Exception as e:
        logger.error(f"MongoDB 索引初始化失敗: {str(e)}")


def get_db():
    """獲取數據庫實例"""
    global db_instance
    if db_instance is None:
        raise RuntimeError("MongoDB 未初始化")
    return db_instance