# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: MySQL 數據庫模塊 (Version Control Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from common.common_tools import TryExcept
from loggers import logger


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)


class DBFunction:
    """数据库操作函数"""
    
    @staticmethod
    @TryExcept("數據庫事務提交失敗")
    def do_commit(msg="", flag=True):
        """提交事务"""
        if flag:
            try:
                db.session.commit()
                if msg:
                    logger.info(f"數據庫事務提交成功: {msg}")
                return msg, True
            except Exception as e:
                db.session.rollback()
                error_msg = f"數據庫事務提交失敗: {str(e)}"
                logger.error(error_msg)
                return error_msg, False
        return msg, flag
    
    @staticmethod
    def db_rollback():
        """回滚事务"""
        try:
            db.session.rollback()
            logger.info("數據庫事務回滾成功")
        except Exception as e:
            logger.error(f"數據庫事務回滾失敗: {str(e)}")