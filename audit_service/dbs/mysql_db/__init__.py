# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: MySQL数据库模块初始化 (Audit Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class DBFunction:
    """数据库操作功能类"""
    
    @staticmethod
    def do_commit(commit_info: str, commit_flag: bool):
        """提交数据库事务"""
        try:
            if commit_flag:
                db.session.commit()
                return commit_info, True
            else:
                return commit_info, False
        except Exception as e:
            db.session.rollback()
            return f"数据库提交失败: {str(e)}", False
    
    @staticmethod
    def db_rollback():
        """回滚数据库事务"""
        try:
            db.session.rollback()
        except Exception:
            pass