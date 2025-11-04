# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: MongoDB 數據庫初始化 (Feature Map Service)
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
        
        # 測試連接（開發環境可跳過）
        try:
            mongo.cx.admin.command('ping')
            logger.info("MongoDB 連接成功")
            
            # 初始化索引
            init_indexes()
        except Exception as conn_e:
            logger.warning(f"MongoDB 連接測試失敗，繼續運行（開發模式）: {str(conn_e)}")
            # 開發環境下可以繼續運行
        
        return db_instance
    except Exception as e:
        logger.error(f"MongoDB 連接失敗: {str(e)}")
        raise


def init_indexes():
    """初始化集合索引"""
    try:
        if db_instance:
            # feature_maps 集合索引
            db_instance.feature_maps.create_index([("project_id", 1)])
            db_instance.feature_maps.create_index([("created_by", 1)])
            db_instance.feature_maps.create_index([("type", 1)])
            db_instance.feature_maps.create_index([("created_at", -1)])
            db_instance.feature_maps.create_index([("project_id", 1), ("name", 1)])
            
            # feature_dependencies 集合索引
            db_instance.feature_dependencies.create_index([("feature_map_id", 1)])
            db_instance.feature_dependencies.create_index([("source_feature_id", 1)])
            db_instance.feature_dependencies.create_index([("target_feature_id", 1)])
            db_instance.feature_dependencies.create_index([("dependency_type", 1)])
            db_instance.feature_dependencies.create_index([("created_at", -1)])
            
            # feature_history 集合索引
            db_instance.feature_history.create_index([("feature_map_id", 1)])
            db_instance.feature_history.create_index([("feature_id", 1)])
            db_instance.feature_history.create_index([("action", 1)])
            db_instance.feature_history.create_index([("user_id", 1)])
            db_instance.feature_history.create_index([("timestamp", -1)])
            
            logger.info("MongoDB 索引初始化完成")
    except Exception as e:
        logger.error(f"MongoDB 索引初始化失敗: {str(e)}")


def get_db():
    """獲取數據庫實例"""
    global db_instance
    if db_instance is None:
        raise RuntimeError("MongoDB 未初始化")
    return db_instance