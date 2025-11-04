# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 協作服務數據庫模型 (Collaboration Service)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, Text, Index, BIGINT
from sqlalchemy.dialects.mysql import ENUM, TIMESTAMP
from dbs.mysql_db import db, Base


class CollaborationSession(Base):
    """協作會話表"""
    __tablename__ = 'collaboration_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), nullable=False, index=True)
    document_type = Column(ENUM('diagram', 'api_spec', 'db_design', 'flow', 'mind_map'), nullable=False)
    user_id = Column(String(36), nullable=False, index=True)
    session_token = Column(String(255), nullable=False, index=True)
    cursor_position = Column(JSON)
    selection_range = Column(JSON)
    user_color = Column(String(7))
    permissions = Column(JSON)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index('idx_document_session', 'document_id', 'document_type'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'document_type': self.document_type,
            'user_id': self.user_id,
            'session_token': self.session_token,
            'cursor_position': self.cursor_position,
            'selection_range': self.selection_range,
            'user_color': self.user_color,
            'permissions': self.permissions,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None
        }


class OperationLog(Base):
    """操作日志表"""
    __tablename__ = 'operation_logs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), nullable=False, index=True)
    document_type = Column(String(50), nullable=False)
    user_id = Column(String(36), nullable=False, index=True)
    operation_type = Column(String(50), nullable=False)
    operation_data = Column(JSON, nullable=False)
    timestamp = Column(TIMESTAMP(3), default=datetime.utcnow, index=True)
    sequence_number = Column(BIGINT, autoincrement=True)
    applied = Column(Boolean, default=True)
    conflicts_with = Column(JSON)
    conflict_resolution = Column(JSON)
    
    __table_args__ = (
        Index('idx_document_operation', 'document_id', 'document_type'),
        Index('idx_sequence_timestamp', 'sequence_number', 'timestamp'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'document_type': self.document_type,
            'user_id': self.user_id,
            'operation_type': self.operation_type,
            'operation_data': self.operation_data,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'sequence_number': self.sequence_number,
            'applied': self.applied,
            'conflicts_with': self.conflicts_with,
            'conflict_resolution': self.conflict_resolution
        }


class DocumentLock(Base):
    """文档锁定表"""
    __tablename__ = 'document_locks'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), nullable=False)
    document_type = Column(String(50), nullable=False)
    locked_by = Column(String(36), nullable=False)
    lock_type = Column(ENUM('read', 'write', 'exclusive'), nullable=False)
    locked_elements = Column(JSON)
    locked_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_document_lock', 'document_id', 'document_type'),
        Index('idx_user_lock', 'document_id', 'document_type', 'locked_by', unique=True),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'document_type': self.document_type,
            'locked_by': self.locked_by,
            'lock_type': self.lock_type,
            'locked_elements': self.locked_elements,
            'locked_at': self.locked_at.isoformat() if self.locked_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
    
    @property
    def is_expired(self):
        """检查锁是否已过期"""
        return datetime.utcnow() > self.expires_at
    
    def extend_lock(self, minutes=30):
        """延长锁定时间"""
        self.expires_at = datetime.utcnow() + timedelta(minutes=minutes)


class CollaborationStatistics(Base):
    """协作统计表"""
    __tablename__ = 'collaboration_statistics'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), nullable=False)
    document_type = Column(String(50), nullable=False)
    date = Column(DateTime, nullable=False)
    active_users = Column(Integer, default=0)
    total_operations = Column(Integer, default=0)
    conflicts_resolved = Column(Integer, default=0)
    avg_session_duration = Column(Integer, default=0)
    
    __table_args__ = (
        Index('idx_document_stats', 'document_id', 'document_type', 'date', unique=True),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'document_type': self.document_type,
            'date': self.date.isoformat() if self.date else None,
            'active_users': self.active_users,
            'total_operations': self.total_operations,
            'conflicts_resolved': self.conflicts_resolved,
            'avg_session_duration': self.avg_session_duration
        }