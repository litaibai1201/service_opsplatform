# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 版本控制服務數據庫模型 (Version Control Service)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
import hashlib
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, Text, Index, ForeignKey
from sqlalchemy.dialects.mysql import ENUM
from sqlalchemy.orm import relationship
from dbs.mysql_db import db, Base


class VersionBranch(Base):
    """版本分支表"""
    __tablename__ = 'version_branches'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), nullable=False, index=True)
    document_type = Column(String(50), nullable=False)
    branch_name = Column(String(255), nullable=False)
    parent_branch_id = Column(String(36), ForeignKey('version_branches.id'), nullable=True)
    head_commit_id = Column(String(36), nullable=True)
    is_protected = Column(Boolean, default=False)
    protection_rules = Column(JSON)
    created_by = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    parent_branch = relationship("VersionBranch", remote_side=[id])
    commits = relationship("VersionCommit", back_populates="branch", cascade="all, delete-orphan")
    source_merge_requests = relationship("MergeRequest", foreign_keys="[MergeRequest.source_branch_id]")
    target_merge_requests = relationship("MergeRequest", foreign_keys="[MergeRequest.target_branch_id]")
    
    __table_args__ = (
        Index('idx_document_branch', 'document_id', 'document_type', 'branch_name', unique=True),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'document_type': self.document_type,
            'branch_name': self.branch_name,
            'parent_branch_id': self.parent_branch_id,
            'head_commit_id': self.head_commit_id,
            'is_protected': self.is_protected,
            'protection_rules': self.protection_rules,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class VersionCommit(Base):
    """版本提交表"""
    __tablename__ = 'version_commits'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    branch_id = Column(String(36), ForeignKey('version_branches.id'), nullable=False, index=True)
    commit_hash = Column(String(64), unique=True, nullable=False, index=True)
    parent_commit_id = Column(String(36), ForeignKey('version_commits.id'), nullable=True)
    author_id = Column(String(36), nullable=False, index=True)
    commit_message = Column(Text, nullable=False)
    document_snapshot = Column(JSON, nullable=False)
    changes_summary = Column(JSON)
    is_merge_commit = Column(Boolean, default=False)
    merge_from_branch = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    branch = relationship("VersionBranch", back_populates="commits")
    parent_commit = relationship("VersionCommit", remote_side=[id])
    tags = relationship("VersionTag", back_populates="commit")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.commit_hash:
            self.commit_hash = self.generate_commit_hash()
    
    def generate_commit_hash(self):
        """生成提交哈希"""
        content = f"{self.branch_id}{self.author_id}{self.commit_message}{datetime.utcnow().timestamp()}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def to_dict(self):
        return {
            'id': self.id,
            'branch_id': self.branch_id,
            'commit_hash': self.commit_hash,
            'parent_commit_id': self.parent_commit_id,
            'author_id': self.author_id,
            'commit_message': self.commit_message,
            'document_snapshot': self.document_snapshot,
            'changes_summary': self.changes_summary,
            'is_merge_commit': self.is_merge_commit,
            'merge_from_branch': self.merge_from_branch,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class MergeRequest(Base):
    """合并请求表"""
    __tablename__ = 'merge_requests'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_branch_id = Column(String(36), ForeignKey('version_branches.id'), nullable=False)
    target_branch_id = Column(String(36), ForeignKey('version_branches.id'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(ENUM('open', 'merged', 'closed', 'draft'), nullable=False, default='open', index=True)
    conflicts = Column(JSON)
    review_required = Column(Boolean, default=True)
    created_by = Column(String(36), nullable=False, index=True)
    assignee_id = Column(String(36), nullable=True, index=True)
    reviewers = Column(JSON)  # 审查者列表
    approvals = Column(JSON)  # 批准记录
    merged_by = Column(String(36), nullable=True)
    merge_commit_id = Column(String(36), ForeignKey('version_commits.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    merged_at = Column(DateTime, nullable=True)
    
    # 关系
    source_branch = relationship("VersionBranch", foreign_keys=[source_branch_id])
    target_branch = relationship("VersionBranch", foreign_keys=[target_branch_id])
    merge_commit = relationship("VersionCommit")
    reviews = relationship("CodeReview", back_populates="merge_request", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'source_branch_id': self.source_branch_id,
            'target_branch_id': self.target_branch_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'conflicts': self.conflicts,
            'review_required': self.review_required,
            'created_by': self.created_by,
            'assignee_id': self.assignee_id,
            'reviewers': self.reviewers,
            'approvals': self.approvals,
            'merged_by': self.merged_by,
            'merge_commit_id': self.merge_commit_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'merged_at': self.merged_at.isoformat() if self.merged_at else None
        }
    
    @property
    def is_approved(self):
        """检查是否已通过审查"""
        if not self.review_required:
            return True
        
        if not self.reviewers:
            return False
        
        approvals = self.approvals or {}
        required_reviewers = set(self.reviewers)
        approved_reviewers = set(approvals.keys())
        
        return required_reviewers.issubset(approved_reviewers)
    
    @property
    def can_be_merged(self):
        """检查是否可以合并"""
        return (
            self.status == 'open' and
            self.is_approved and
            not self.conflicts
        )


class VersionTag(Base):
    """版本标签表"""
    __tablename__ = 'version_tags'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), nullable=False, index=True)
    document_type = Column(String(50), nullable=False)
    tag_name = Column(String(255), nullable=False)
    commit_id = Column(String(36), ForeignKey('version_commits.id'), nullable=False)
    tag_type = Column(ENUM('release', 'milestone', 'hotfix'), default='milestone', index=True)
    description = Column(Text)
    created_by = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    commit = relationship("VersionCommit", back_populates="tags")
    
    __table_args__ = (
        Index('idx_document_tag', 'document_id', 'document_type', 'tag_name', unique=True),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'document_type': self.document_type,
            'tag_name': self.tag_name,
            'commit_id': self.commit_id,
            'tag_type': self.tag_type,
            'description': self.description,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CodeReview(Base):
    """代码审查表"""
    __tablename__ = 'code_reviews'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merge_request_id = Column(String(36), ForeignKey('merge_requests.id', ondelete='CASCADE'), nullable=False)
    reviewer_id = Column(String(36), nullable=False, index=True)
    status = Column(ENUM('pending', 'approved', 'rejected', 'needs_changes'), 
                   default='pending', nullable=False, index=True)
    comments = Column(Text)
    reviewed_at = Column(DateTime, nullable=True)
    
    # 关系
    merge_request = relationship("MergeRequest", back_populates="reviews")
    
    __table_args__ = (
        Index('idx_mr_reviewer', 'merge_request_id', 'reviewer_id', unique=True),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'merge_request_id': self.merge_request_id,
            'reviewer_id': self.reviewer_id,
            'status': self.status,
            'comments': self.comments,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None
        }
    
    def approve(self, comments=""):
        """批准审查"""
        self.status = 'approved'
        self.comments = comments
        self.reviewed_at = datetime.utcnow()
    
    def reject(self, comments=""):
        """拒绝审查"""
        self.status = 'rejected'
        self.comments = comments
        self.reviewed_at = datetime.utcnow()
    
    def request_changes(self, comments=""):
        """要求修改"""
        self.status = 'needs_changes'
        self.comments = comments
        self.reviewed_at = datetime.utcnow()