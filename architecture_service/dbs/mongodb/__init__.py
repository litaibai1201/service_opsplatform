# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: MongoDB 數據庫包初始化
@時間: 2025-01-09
@作者: LiDong
"""

from flask_pymongo import PyMongo
from configs.app_config import MONGODB_URI

mongo = PyMongo()

def init_mongodb(app):
    """初始化MongoDB連接"""
    app.config["MONGO_URI"] = MONGODB_URI
    mongo.init_app(app)
    return mongo.db