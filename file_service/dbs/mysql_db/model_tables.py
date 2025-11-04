# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 文件服務相關數據模型表
@時間: 2025-01-09
@作者: LiDong
"""

from common.common_tools import CommonTools
from dbs.mysql_db import db


class BaseModel(db.Model):
    """基础模型类"""
    __abstract__ = True

    status = db.Column(db.Integer, default=1, comment="状态(1:正常,0:禁用,-1:删除)")
    created_at = db.Column(
        db.String(19), default=CommonTools.get_now, nullable=False,
        comment="創建時間"
    )
    status_update_at = db.Column(db.String(19), comment="状态更新時間")


class BaseMixinModel(BaseModel):
    """基础混合模型类"""
    __abstract__ = True

    updated_at = db.Column(db.String(19), comment="更新時間")


class FileModel(BaseMixinModel):
    """文件表模型"""
    __tablename__ = "files"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="文件ID")
    name = db.Column(db.String(255), nullable=False, comment="文件名稱")
    original_name = db.Column(db.String(255), nullable=False, comment="原始文件名")
    path = db.Column(db.String(500), nullable=False, comment="文件路徑")
    size = db.Column(db.BigInteger, nullable=False, comment="文件大小(字節)")
    mime_type = db.Column(db.String(100), comment="MIME類型")
    file_hash = db.Column(db.String(64), comment="文件哈希值")
    thumbnail_path = db.Column(db.String(500), comment="縮略圖路徑")
    preview_path = db.Column(db.String(500), comment="預覽路徑")
    project_id = db.Column(db.String(36), nullable=True, comment="項目ID")
    folder_id = db.Column(db.String(36), nullable=True, comment="文件夾ID")
    is_public = db.Column(db.Boolean, default=False, comment="是否公開")
    download_count = db.Column(db.Integer, default=0, comment="下載次數")
    virus_scan_status = db.Column(
        db.Enum("pending", "clean", "infected", "error", name="virus_scan_status"),
        default="pending",
        comment="病毒掃描狀態"
    )
    virus_scan_date = db.Column(db.String(19), comment="病毒掃描日期")
    uploaded_by = db.Column(db.String(36), nullable=False, comment="上傳者ID")
    uploaded_at = db.Column(db.String(19), default=CommonTools.get_now, comment="上傳時間")

    # 索引
    __table_args__ = (
        db.Index('idx_project', 'project_id'),
        db.Index('idx_folder', 'folder_id'),
        db.Index('idx_hash', 'file_hash'),
        db.Index('idx_uploaded_by', 'uploaded_by'),
        db.Index('idx_mime_type', 'mime_type'),
        db.Index('idx_uploaded_at', 'uploaded_at'),
    )


class FileFolderModel(BaseModel):
    """文件夹表模型"""
    __tablename__ = "file_folders"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="文件夾ID")
    name = db.Column(db.String(255), nullable=False, comment="文件夾名稱")
    parent_id = db.Column(db.String(36), nullable=True, comment="父文件夾ID")
    project_id = db.Column(db.String(36), nullable=False, comment="項目ID")
    path = db.Column(db.String(1000), nullable=False, comment="完整路徑")
    description = db.Column(db.Text, comment="描述")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者ID")

    # 索引和外鍵約束
    __table_args__ = (
        db.ForeignKeyConstraint(['parent_id'], ['file_folders.id'], ondelete='CASCADE'),
        db.Index('idx_parent', 'parent_id'),
        db.Index('idx_project', 'project_id'),
        db.Index('idx_path', 'path', mysql_length=255),
        db.Index('idx_created_by', 'created_by'),
    )


class FileShareModel(BaseModel):
    """文件分享表模型"""
    __tablename__ = "file_shares"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="分享ID")
    file_id = db.Column(db.String(36), nullable=False, comment="文件ID")
    share_token = db.Column(db.String(255), unique=True, nullable=False, comment="分享令牌")
    password = db.Column(db.String(255), nullable=True, comment="密碼")
    expires_at = db.Column(db.String(19), nullable=True, comment="過期時間")
    max_downloads = db.Column(db.Integer, nullable=True, comment="最大下載次數")
    download_count = db.Column(db.Integer, default=0, comment="已下載次數")
    allow_preview = db.Column(db.Boolean, default=True, comment="允許預覽")
    allow_download = db.Column(db.Boolean, default=True, comment="允許下載")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者ID")

    # 外鍵關係
    file = db.relationship('FileModel', backref='shares', foreign_keys=[file_id], 
                          primaryjoin="FileShareModel.file_id == FileModel.id")

    # 索引和外鍵約束
    __table_args__ = (
        db.ForeignKeyConstraint(['file_id'], ['files.id'], ondelete='CASCADE'),
        db.Index('idx_token', 'share_token'),
        db.Index('idx_expires', 'expires_at'),
        db.Index('idx_file', 'file_id'),
        db.Index('idx_created_by', 'created_by'),
    )


class FileVersionModel(BaseModel):
    """文件版本表模型"""
    __tablename__ = "file_versions"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="版本ID")
    file_id = db.Column(db.String(36), nullable=False, comment="文件ID")
    version_number = db.Column(db.Integer, nullable=False, comment="版本號")
    path = db.Column(db.String(500), nullable=False, comment="版本文件路徑")
    size = db.Column(db.BigInteger, nullable=False, comment="版本文件大小")
    file_hash = db.Column(db.String(64), comment="版本文件哈希")
    change_description = db.Column(db.Text, comment="變更描述")
    uploaded_by = db.Column(db.String(36), nullable=False, comment="上傳者ID")
    uploaded_at = db.Column(db.String(19), default=CommonTools.get_now, comment="上傳時間")

    # 外鍵關係
    file = db.relationship('FileModel', backref='versions', foreign_keys=[file_id],
                          primaryjoin="FileVersionModel.file_id == FileModel.id")

    # 索引和外鍵約束
    __table_args__ = (
        db.ForeignKeyConstraint(['file_id'], ['files.id'], ondelete='CASCADE'),
        db.UniqueConstraint('file_id', 'version_number', name='uk_file_version'),
        db.Index('idx_file_version', 'file_id', 'version_number'),
        db.Index('idx_uploaded_by', 'uploaded_by'),
        db.Index('idx_uploaded_at', 'uploaded_at'),
    )


class FileAccessLogModel(BaseModel):
    """文件访问日志表模型"""
    __tablename__ = "file_access_logs"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="日誌ID")
    file_id = db.Column(db.String(36), nullable=False, comment="文件ID")
    user_id = db.Column(db.String(36), comment="用戶ID")
    access_type = db.Column(
        db.Enum("view", "download", "preview", name="access_type"),
        nullable=False,
        comment="訪問類型"
    )
    ip_address = db.Column(db.String(45), comment="IP地址")
    user_agent = db.Column(db.Text, comment="用戶代理")
    accessed_at = db.Column(db.String(19), default=CommonTools.get_now, comment="訪問時間")

    # 索引
    __table_args__ = (
        db.Index('idx_file', 'file_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_access_type', 'access_type'),
        db.Index('idx_accessed_at', 'accessed_at'),
        db.Index('idx_ip', 'ip_address'),
    )


class FileConversionModel(BaseMixinModel):
    """文件转换表模型"""
    __tablename__ = "file_conversions"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="轉換ID")
    file_id = db.Column(db.String(36), nullable=False, comment="源文件ID")
    target_format = db.Column(db.String(50), nullable=False, comment="目標格式")
    conversion_status = db.Column(
        db.Enum("pending", "processing", "completed", "failed", name="conversion_status"),
        default="pending",
        comment="轉換狀態"
    )
    converted_file_path = db.Column(db.String(500), comment="轉換後文件路徑")
    converted_file_size = db.Column(db.BigInteger, comment="轉換後文件大小")
    error_message = db.Column(db.Text, comment="錯誤信息")
    conversion_params = db.Column(db.JSON, comment="轉換參數")
    started_at = db.Column(db.String(19), comment="開始時間")
    completed_at = db.Column(db.String(19), comment="完成時間")
    requested_by = db.Column(db.String(36), nullable=False, comment="請求者ID")

    # 外鍵關係
    file = db.relationship('FileModel', backref='conversions', foreign_keys=[file_id],
                          primaryjoin="FileConversionModel.file_id == FileModel.id")

    # 索引
    __table_args__ = (
        db.Index('idx_file_conversion', 'file_id', 'target_format'),
        db.Index('idx_status', 'conversion_status'),
        db.Index('idx_requested_by', 'requested_by'),
        db.Index('idx_started_at', 'started_at'),
    )


class ChunkUploadModel(BaseModel):
    """分块上传表模型"""
    __tablename__ = "chunk_uploads"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="分塊ID")
    upload_id = db.Column(db.String(36), nullable=False, comment="上傳ID")
    chunk_number = db.Column(db.Integer, nullable=False, comment="分塊編號")
    chunk_size = db.Column(db.Integer, nullable=False, comment="分塊大小")
    chunk_hash = db.Column(db.String(64), comment="分塊哈希值")
    chunk_path = db.Column(db.String(500), nullable=False, comment="分塊文件路徑")
    is_completed = db.Column(db.Boolean, default=False, comment="是否完成")
    uploaded_by = db.Column(db.String(36), nullable=False, comment="上傳者ID")

    # 索引
    __table_args__ = (
        db.UniqueConstraint('upload_id', 'chunk_number', name='uk_upload_chunk'),
        db.Index('idx_upload_id', 'upload_id'),
        db.Index('idx_uploaded_by', 'uploaded_by'),
        db.Index('idx_completed', 'is_completed'),
    )


class UploadSessionModel(BaseMixinModel):
    """上传会话表模型"""
    __tablename__ = "upload_sessions"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="會話ID")
    upload_id = db.Column(db.String(36), unique=True, nullable=False, comment="上傳ID")
    filename = db.Column(db.String(255), nullable=False, comment="文件名")
    file_size = db.Column(db.BigInteger, nullable=False, comment="文件總大小")
    chunk_size = db.Column(db.Integer, nullable=False, comment="分塊大小")
    total_chunks = db.Column(db.Integer, nullable=False, comment="總分塊數")
    completed_chunks = db.Column(db.Integer, default=0, comment="已完成分塊數")
    upload_status = db.Column(
        db.Enum("pending", "uploading", "completed", "failed", "cancelled", name="upload_status"),
        default="pending",
        comment="上傳狀態"
    )
    project_id = db.Column(db.String(36), comment="項目ID")
    folder_id = db.Column(db.String(36), comment="文件夾ID")
    final_file_path = db.Column(db.String(500), comment="最終文件路徑")
    file_hash = db.Column(db.String(64), comment="文件哈希值")
    mime_type = db.Column(db.String(100), comment="MIME類型")
    uploaded_by = db.Column(db.String(36), nullable=False, comment="上傳者ID")
    expires_at = db.Column(db.String(19), comment="會話過期時間")

    # 索引
    __table_args__ = (
        db.Index('idx_upload_id', 'upload_id'),
        db.Index('idx_uploaded_by', 'uploaded_by'),
        db.Index('idx_status', 'upload_status'),
        db.Index('idx_expires_at', 'expires_at'),
        db.Index('idx_project_folder', 'project_id', 'folder_id'),
    )