# -*- coding: utf-8 -*-
"""
@文件: collaboration_model.py  
@說明: 協作服務數據模型 (Collaboration Service)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.exc import IntegrityError

from dbs.mysql_db import db, DBFunction
from dbs.mysql_db.model_tables import (
    CollaborationSession, 
    OperationLog, 
    DocumentLock, 
    CollaborationStatistics
)
from common.common_tools import CommonTools
from loggers import logger


class CollaborationModel:
    """協作服務數據模型"""
    
    @staticmethod
    def create_session(document_id: str, document_type: str, user_id: str, 
                      permissions: Dict = None) -> Tuple[Any, bool]:
        """創建協作會話"""
        try:
            session_token = str(uuid.uuid4())
            user_color = CommonTools.generate_user_color()
            
            # 檢查是否已存在活躍會話
            existing_session = CollaborationSession.query.filter_by(
                document_id=document_id,
                document_type=document_type,
                user_id=user_id
            ).filter(
                CollaborationSession.last_activity > datetime.utcnow() - timedelta(minutes=30)
            ).first()
            
            if existing_session:
                existing_session.last_activity = datetime.utcnow()
                existing_session.session_token = session_token
                db.session.commit()
                return existing_session.to_dict(), True
            
            session = CollaborationSession(
                document_id=document_id,
                document_type=document_type,
                user_id=user_id,
                session_token=session_token,
                user_color=user_color,
                permissions=permissions or {}
            )
            
            db.session.add(session)
            return DBFunction.do_commit("創建協作會話")
            
        except Exception as e:
            logger.error(f"創建協作會話失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def update_session_activity(session_token: str) -> Tuple[Any, bool]:
        """更新會話活動時間"""
        try:
            session = CollaborationSession.query.filter_by(
                session_token=session_token
            ).first()
            
            if not session:
                return "會話不存在", False
            
            session.last_activity = datetime.utcnow()
            return DBFunction.do_commit("更新會話活動")
            
        except Exception as e:
            logger.error(f"更新會話活動失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def leave_session(session_token: str) -> Tuple[Any, bool]:
        """離開協作會話"""
        try:
            session = CollaborationSession.query.filter_by(
                session_token=session_token
            ).first()
            
            if not session:
                return "會話不存在", False
            
            db.session.delete(session)
            return DBFunction.do_commit("離開協作會話")
            
        except Exception as e:
            logger.error(f"離開協作會話失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_active_sessions(document_id: str, document_type: str) -> Tuple[Any, bool]:
        """獲取文檔的活躍會話"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=5)
            sessions = CollaborationSession.query.filter(
                and_(
                    CollaborationSession.document_id == document_id,
                    CollaborationSession.document_type == document_type,
                    CollaborationSession.last_activity > cutoff_time
                )
            ).all()
            
            return [session.to_dict() for session in sessions], True
            
        except Exception as e:
            logger.error(f"獲取活躍會話失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def update_cursor_position(session_token: str, cursor_position: Dict) -> Tuple[Any, bool]:
        """更新光標位置"""
        try:
            session = CollaborationSession.query.filter_by(
                session_token=session_token
            ).first()
            
            if not session:
                return "會話不存在", False
            
            session.cursor_position = cursor_position
            session.last_activity = datetime.utcnow()
            return DBFunction.do_commit("更新光標位置")
            
        except Exception as e:
            logger.error(f"更新光標位置失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def update_selection_range(session_token: str, selection_range: Dict) -> Tuple[Any, bool]:
        """更新選擇範圍"""
        try:
            session = CollaborationSession.query.filter_by(
                session_token=session_token
            ).first()
            
            if not session:
                return "會話不存在", False
            
            session.selection_range = selection_range
            session.last_activity = datetime.utcnow()
            return DBFunction.do_commit("更新選擇範圍")
            
        except Exception as e:
            logger.error(f"更新選擇範圍失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def log_operation(document_id: str, document_type: str, user_id: str,
                     operation_type: str, operation_data: Dict) -> Tuple[Any, bool]:
        """記錄操作"""
        try:
            operation = OperationLog(
                document_id=document_id,
                document_type=document_type,
                user_id=user_id,
                operation_type=operation_type,
                operation_data=operation_data
            )
            
            db.session.add(operation)
            result, success = DBFunction.do_commit("記錄操作")
            
            if success:
                return operation.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"記錄操作失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_operation_history(document_id: str, document_type: str, 
                            since_sequence: int = None, limit: int = 100) -> Tuple[Any, bool]:
        """獲取操作歷史"""
        try:
            query = OperationLog.query.filter(
                and_(
                    OperationLog.document_id == document_id,
                    OperationLog.document_type == document_type,
                    OperationLog.applied == True
                )
            )
            
            if since_sequence:
                query = query.filter(OperationLog.sequence_number > since_sequence)
            
            operations = query.order_by(OperationLog.sequence_number).limit(limit).all()
            return [op.to_dict() for op in operations], True
            
        except Exception as e:
            logger.error(f"獲取操作歷史失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def create_document_lock(document_id: str, document_type: str, user_id: str,
                           lock_type: str, locked_elements: List = None,
                           duration_minutes: int = 30) -> Tuple[Any, bool]:
        """創建文檔鎖定"""
        try:
            # 檢查是否已存在衝突的鎖定
            existing_locks = DocumentLock.query.filter(
                and_(
                    DocumentLock.document_id == document_id,
                    DocumentLock.document_type == document_type,
                    DocumentLock.expires_at > datetime.utcnow()
                )
            ).all()
            
            # 檢查鎖定衝突
            for lock in existing_locks:
                if (lock_type == 'exclusive' or lock.lock_type == 'exclusive' or
                    (lock_type == 'write' and lock.lock_type == 'write')):
                    return "文檔已被鎖定", False
            
            expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
            
            try:
                document_lock = DocumentLock(
                    document_id=document_id,
                    document_type=document_type,
                    locked_by=user_id,
                    lock_type=lock_type,
                    locked_elements=locked_elements,
                    expires_at=expires_at
                )
                
                db.session.add(document_lock)
                result, success = DBFunction.do_commit("創建文檔鎖定")
                
                if success:
                    return document_lock.to_dict(), True
                return result, False
                
            except IntegrityError:
                DBFunction.db_rollback()
                return "用戶已對此文檔持有鎖定", False
            
        except Exception as e:
            logger.error(f"創建文檔鎖定失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def release_document_lock(document_id: str, document_type: str, user_id: str) -> Tuple[Any, bool]:
        """釋放文檔鎖定"""
        try:
            lock = DocumentLock.query.filter(
                and_(
                    DocumentLock.document_id == document_id,
                    DocumentLock.document_type == document_type,
                    DocumentLock.locked_by == user_id
                )
            ).first()
            
            if not lock:
                return "鎖定不存在", False
            
            db.session.delete(lock)
            return DBFunction.do_commit("釋放文檔鎖定")
            
        except Exception as e:
            logger.error(f"釋放文檔鎖定失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_document_locks(document_id: str, document_type: str) -> Tuple[Any, bool]:
        """獲取文檔鎖定狀態"""
        try:
            # 清理過期鎖定
            DocumentLock.query.filter(
                DocumentLock.expires_at <= datetime.utcnow()
            ).delete()
            db.session.commit()
            
            locks = DocumentLock.query.filter(
                and_(
                    DocumentLock.document_id == document_id,
                    DocumentLock.document_type == document_type,
                    DocumentLock.expires_at > datetime.utcnow()
                )
            ).all()
            
            return [lock.to_dict() for lock in locks], True
            
        except Exception as e:
            logger.error(f"獲取文檔鎖定失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def force_unlock_document(document_id: str, document_type: str) -> Tuple[Any, bool]:
        """強制解鎖文檔"""
        try:
            deleted_count = DocumentLock.query.filter(
                and_(
                    DocumentLock.document_id == document_id,
                    DocumentLock.document_type == document_type
                )
            ).delete()
            
            result, success = DBFunction.do_commit("強制解鎖文檔")
            if success:
                return f"已解鎖 {deleted_count} 個鎖定", True
            return result, False
            
        except Exception as e:
            logger.error(f"強制解鎖文檔失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_collaboration_statistics(document_id: str, document_type: str,
                                   start_date: datetime = None, 
                                   end_date: datetime = None) -> Tuple[Any, bool]:
        """獲取協作統計"""
        try:
            query = CollaborationStatistics.query.filter(
                and_(
                    CollaborationStatistics.document_id == document_id,
                    CollaborationStatistics.document_type == document_type
                )
            )
            
            if start_date:
                query = query.filter(CollaborationStatistics.date >= start_date)
            if end_date:
                query = query.filter(CollaborationStatistics.date <= end_date)
            
            stats = query.order_by(desc(CollaborationStatistics.date)).all()
            return [stat.to_dict() for stat in stats], True
            
        except Exception as e:
            logger.error(f"獲取協作統計失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def cleanup_expired_sessions():
        """清理過期會話"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            expired_count = CollaborationSession.query.filter(
                CollaborationSession.last_activity < cutoff_time
            ).delete()
            
            db.session.commit()
            logger.info(f"清理了 {expired_count} 個過期會話")
            return expired_count, True
            
        except Exception as e:
            logger.error(f"清理過期會話失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def cleanup_old_operations(days: int = 30):
        """清理舊操作記錄"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            deleted_count = OperationLog.query.filter(
                OperationLog.timestamp < cutoff_time
            ).delete()
            
            db.session.commit()
            logger.info(f"清理了 {deleted_count} 條舊操作記錄")
            return deleted_count, True
            
        except Exception as e:
            logger.error(f"清理舊操作記錄失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False