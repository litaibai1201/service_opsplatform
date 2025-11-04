# -*- coding: utf-8 -*-
"""
@文件: file_model.py
@說明: 文件模型操作類
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
import os
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import load_only
from typing import List, Dict, Any, Optional, Tuple

from common.common_tools import CommonTools, TryExcept
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    FileModel, FileFolderModel, FileShareModel, FileVersionModel,
    FileAccessLogModel, FileConversionModel, ChunkUploadModel, UploadSessionModel
)


class OperFileModel:
    """文件模型操作类"""
    
    def __init__(self):
        self.model = FileModel
    
    @TryExcept("創建文件記錄失敗")
    def create_file(self, file_data):
        """创建文件记录"""
        if not file_data.id:
            file_data.id = str(uuid.uuid4())
        db.session.add(file_data)
        return True
    
    def get_by_id(self, file_id):
        """根据ID获取文件"""
        return self.model.query.filter(
            and_(
                self.model.id == file_id,
                self.model.status == 1
            )
        ).first()
    
    def get_by_hash(self, file_hash):
        """根据哈希值获取文件"""
        return self.model.query.filter(
            and_(
                self.model.file_hash == file_hash,
                self.model.status == 1
            )
        ).first()
    
    def get_files_by_project(self, project_id, page=1, size=20):
        """获取项目文件列表"""
        return self.model.query.filter(
            and_(
                self.model.project_id == project_id,
                self.model.status == 1
            )
        ).order_by(self.model.uploaded_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_files_by_folder(self, folder_id, page=1, size=20):
        """获取文件夹文件列表"""
        return self.model.query.filter(
            and_(
                self.model.folder_id == folder_id,
                self.model.status == 1
            )
        ).order_by(self.model.uploaded_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_files_by_user(self, user_id, page=1, size=20):
        """获取用户上传的文件"""
        return self.model.query.filter(
            and_(
                self.model.uploaded_by == user_id,
                self.model.status == 1
            )
        ).order_by(self.model.uploaded_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    @TryExcept("更新文件信息失敗")
    def update_file(self, file_id, update_data):
        """更新文件信息"""
        file_obj = self.get_by_id(file_id)
        if not file_obj:
            raise ValueError("文件不存在")
        
        allowed_fields = [
            'name', 'folder_id', 'is_public', 'virus_scan_status', 
            'virus_scan_date', 'thumbnail_path', 'preview_path'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and hasattr(file_obj, field):
                setattr(file_obj, field, value)
        
        file_obj.updated_at = CommonTools.get_now()
        return True
    
    @TryExcept("增加下載次數失敗")
    def increment_download_count(self, file_id):
        """增加下载次数"""
        file_obj = self.get_by_id(file_id)
        if not file_obj:
            raise ValueError("文件不存在")
        
        file_obj.download_count += 1
        file_obj.updated_at = CommonTools.get_now()
        return True
    
    @TryExcept("刪除文件失敗")
    def delete_file(self, file_id):
        """删除文件（软删除）"""
        file_obj = self.get_by_id(file_id)
        if not file_obj:
            raise ValueError("文件不存在")
        
        file_obj.status = -1
        file_obj.status_update_at = CommonTools.get_now()
        return True
    
    def search_files(self, keyword, project_id=None, mime_type=None, page=1, size=20):
        """搜索文件"""
        query = self.model.query.filter(self.model.status == 1)
        
        if keyword:
            query = query.filter(
                or_(
                    self.model.name.like(f'%{keyword}%'),
                    self.model.original_name.like(f'%{keyword}%')
                )
            )
        
        if project_id:
            query = query.filter(self.model.project_id == project_id)
        
        if mime_type:
            query = query.filter(self.model.mime_type.like(f'{mime_type}%'))
        
        return query.order_by(self.model.uploaded_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_storage_usage_by_project(self, project_id):
        """获取项目存储使用量"""
        result = db.session.query(
            func.count(self.model.id).label('file_count'),
            func.sum(self.model.size).label('total_size')
        ).filter(
            and_(
                self.model.project_id == project_id,
                self.model.status == 1
            )
        ).first()
        
        return {
            'file_count': result.file_count or 0,
            'total_size': result.total_size or 0
        }


class OperFileFolderModel:
    """文件夹模型操作类"""
    
    def __init__(self):
        self.model = FileFolderModel
    
    @TryExcept("創建文件夾失敗")
    def create_folder(self, folder_data):
        """创建文件夹"""
        if not folder_data.id:
            folder_data.id = str(uuid.uuid4())
        db.session.add(folder_data)
        return True
    
    def get_by_id(self, folder_id):
        """根据ID获取文件夹"""
        return self.model.query.filter(
            and_(
                self.model.id == folder_id,
                self.model.status == 1
            )
        ).first()
    
    def get_children_folders(self, parent_id):
        """获取子文件夹列表"""
        return self.model.query.filter(
            and_(
                self.model.parent_id == parent_id,
                self.model.status == 1
            )
        ).order_by(self.model.name).all()
    
    def get_project_root_folders(self, project_id):
        """获取项目根文件夹列表"""
        return self.model.query.filter(
            and_(
                self.model.project_id == project_id,
                self.model.parent_id.is_(None),
                self.model.status == 1
            )
        ).order_by(self.model.name).all()
    
    def get_folder_path(self, folder_id):
        """获取文件夹路径"""
        folders = []
        current_folder = self.get_by_id(folder_id)
        
        while current_folder:
            folders.append(current_folder)
            if current_folder.parent_id:
                current_folder = self.get_by_id(current_folder.parent_id)
            else:
                break
        
        folders.reverse()
        return folders
    
    @TryExcept("更新文件夾失敗")
    def update_folder(self, folder_id, update_data):
        """更新文件夹"""
        folder = self.get_by_id(folder_id)
        if not folder:
            raise ValueError("文件夾不存在")
        
        allowed_fields = ['name', 'description', 'parent_id']
        
        for field, value in update_data.items():
            if field in allowed_fields and hasattr(folder, field):
                setattr(folder, field, value)
        
        return True
    
    @TryExcept("刪除文件夾失敗")
    def delete_folder(self, folder_id):
        """删除文件夹（软删除）"""
        folder = self.get_by_id(folder_id)
        if not folder:
            raise ValueError("文件夾不存在")
        
        folder.status = -1
        folder.status_update_at = CommonTools.get_now()
        return True


class OperFileShareModel:
    """文件分享模型操作类"""
    
    def __init__(self):
        self.model = FileShareModel
    
    @TryExcept("創建文件分享失敗")
    def create_share(self, share_data):
        """创建文件分享"""
        if not share_data.id:
            share_data.id = str(uuid.uuid4())
        db.session.add(share_data)
        return True
    
    def get_by_id(self, share_id):
        """根据ID获取分享"""
        return self.model.query.filter(
            and_(
                self.model.id == share_id,
                self.model.status == 1
            )
        ).first()
    
    def get_by_token(self, share_token):
        """根据token获取分享"""
        return self.model.query.filter(
            and_(
                self.model.share_token == share_token,
                self.model.status == 1
            )
        ).first()
    
    def get_file_shares(self, file_id):
        """获取文件的分享列表"""
        return self.model.query.filter(
            and_(
                self.model.file_id == file_id,
                self.model.status == 1
            )
        ).order_by(self.model.created_at.desc()).all()
    
    def get_user_shares(self, user_id, page=1, size=20):
        """获取用户创建的分享"""
        return self.model.query.filter(
            and_(
                self.model.created_by == user_id,
                self.model.status == 1
            )
        ).order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def is_share_valid(self, share):
        """检查分享是否有效"""
        if not share or share.status != 1:
            return False
        
        # 检查过期时间
        if share.expires_at:
            expires_time = datetime.strptime(share.expires_at, '%Y-%m-%d %H:%M:%S')
            if expires_time <= datetime.now():
                return False
        
        # 检查下载次数限制
        if share.max_downloads and share.download_count >= share.max_downloads:
            return False
        
        return True
    
    @TryExcept("更新分享下載次數失敗")
    def increment_download_count(self, share_id):
        """增加分享下载次数"""
        share = self.get_by_id(share_id)
        if not share:
            raise ValueError("分享不存在")
        
        share.download_count += 1
        return True
    
    @TryExcept("更新分享設置失敗")
    def update_share(self, share_id, update_data):
        """更新分享设置"""
        share = self.get_by_id(share_id)
        if not share:
            raise ValueError("分享不存在")
        
        allowed_fields = [
            'password', 'expires_at', 'max_downloads', 
            'allow_preview', 'allow_download'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and hasattr(share, field):
                setattr(share, field, value)
        
        return True
    
    @TryExcept("刪除分享失敗")
    def delete_share(self, share_id):
        """删除分享"""
        share = self.get_by_id(share_id)
        if not share:
            raise ValueError("分享不存在")
        
        share.status = -1
        share.status_update_at = CommonTools.get_now()
        return True


class OperFileVersionModel:
    """文件版本模型操作类"""
    
    def __init__(self):
        self.model = FileVersionModel
    
    @TryExcept("創建文件版本失敗")
    def create_version(self, version_data):
        """创建文件版本"""
        if not version_data.id:
            version_data.id = str(uuid.uuid4())
        db.session.add(version_data)
        return True
    
    def get_by_id(self, version_id):
        """根据ID获取版本"""
        return self.model.query.filter(
            and_(
                self.model.id == version_id,
                self.model.status == 1
            )
        ).first()
    
    def get_file_versions(self, file_id):
        """获取文件版本列表"""
        return self.model.query.filter(
            and_(
                self.model.file_id == file_id,
                self.model.status == 1
            )
        ).order_by(self.model.version_number.desc()).all()
    
    def get_latest_version_number(self, file_id):
        """获取最新版本号"""
        result = db.session.query(func.max(self.model.version_number)).filter(
            and_(
                self.model.file_id == file_id,
                self.model.status == 1
            )
        ).scalar()
        
        return result or 0
    
    def get_version_by_number(self, file_id, version_number):
        """根据版本号获取版本"""
        return self.model.query.filter(
            and_(
                self.model.file_id == file_id,
                self.model.version_number == version_number,
                self.model.status == 1
            )
        ).first()
    
    @TryExcept("刪除文件版本失敗")
    def delete_version(self, version_id):
        """删除文件版本"""
        version = self.get_by_id(version_id)
        if not version:
            raise ValueError("文件版本不存在")
        
        version.status = -1
        version.status_update_at = CommonTools.get_now()
        return True


class OperFileAccessLogModel:
    """文件访问日志模型操作类"""
    
    def __init__(self):
        self.model = FileAccessLogModel
    
    @TryExcept("創建訪問日誌失敗")
    def create_access_log(self, log_data):
        """创建访问日志"""
        if not log_data.id:
            log_data.id = str(uuid.uuid4())
        db.session.add(log_data)
        return True
    
    def get_file_access_logs(self, file_id, page=1, size=20):
        """获取文件访问日志"""
        return self.model.query.filter(
            and_(
                self.model.file_id == file_id,
                self.model.status == 1
            )
        ).order_by(self.model.accessed_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_user_access_logs(self, user_id, page=1, size=20):
        """获取用户访问日志"""
        return self.model.query.filter(
            and_(
                self.model.user_id == user_id,
                self.model.status == 1
            )
        ).order_by(self.model.accessed_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_access_statistics(self, file_id, days=30):
        """获取访问统计"""
        since_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        stats = db.session.query(
            self.model.access_type,
            func.count(self.model.id).label('count')
        ).filter(
            and_(
                self.model.file_id == file_id,
                self.model.accessed_at >= since_date,
                self.model.status == 1
            )
        ).group_by(self.model.access_type).all()
        
        result = {'view': 0, 'download': 0, 'preview': 0}
        for stat in stats:
            result[stat.access_type] = stat.count
        
        return result


class OperFileConversionModel:
    """文件转换模型操作类"""
    
    def __init__(self):
        self.model = FileConversionModel
    
    @TryExcept("創建文件轉換任務失敗")
    def create_conversion(self, conversion_data):
        """创建文件转换任务"""
        if not conversion_data.id:
            conversion_data.id = str(uuid.uuid4())
        db.session.add(conversion_data)
        return True
    
    def get_by_id(self, conversion_id):
        """根据ID获取转换任务"""
        return self.model.query.filter(
            and_(
                self.model.id == conversion_id,
                self.model.status == 1
            )
        ).first()
    
    def get_file_conversions(self, file_id):
        """获取文件转换列表"""
        return self.model.query.filter(
            and_(
                self.model.file_id == file_id,
                self.model.status == 1
            )
        ).order_by(self.model.created_at.desc()).all()
    
    def get_pending_conversions(self, limit=10):
        """获取待处理的转换任务"""
        return self.model.query.filter(
            and_(
                self.model.conversion_status == 'pending',
                self.model.status == 1
            )
        ).order_by(self.model.created_at).limit(limit).all()
    
    @TryExcept("更新轉換狀態失敗")
    def update_conversion_status(self, conversion_id, status, **kwargs):
        """更新转换状态"""
        conversion = self.get_by_id(conversion_id)
        if not conversion:
            raise ValueError("轉換任務不存在")
        
        conversion.conversion_status = status
        conversion.updated_at = CommonTools.get_now()
        
        # 更新其他字段
        if status == 'processing':
            conversion.started_at = CommonTools.get_now()
        elif status in ['completed', 'failed']:
            conversion.completed_at = CommonTools.get_now()
        
        for field, value in kwargs.items():
            if hasattr(conversion, field):
                setattr(conversion, field, value)
        
        return True


class OperUploadSessionModel:
    """上传会话模型操作类"""
    
    def __init__(self):
        self.model = UploadSessionModel
        self.chunk_model = ChunkUploadModel
    
    @TryExcept("創建上傳會話失敗")
    def create_upload_session(self, session_data):
        """创建上传会话"""
        if not session_data.id:
            session_data.id = str(uuid.uuid4())
        db.session.add(session_data)
        return True
    
    def get_by_upload_id(self, upload_id):
        """根据上传ID获取会话"""
        return self.model.query.filter(
            and_(
                self.model.upload_id == upload_id,
                self.model.status == 1
            )
        ).first()
    
    @TryExcept("創建分塊上傳記錄失敗")
    def create_chunk_upload(self, chunk_data):
        """创建分块上传记录"""
        if not chunk_data.id:
            chunk_data.id = str(uuid.uuid4())
        db.session.add(chunk_data)
        return True
    
    def get_upload_chunks(self, upload_id):
        """获取上传分块列表"""
        return self.chunk_model.query.filter(
            and_(
                self.chunk_model.upload_id == upload_id,
                self.chunk_model.status == 1
            )
        ).order_by(self.chunk_model.chunk_number).all()
    
    def get_completed_chunks_count(self, upload_id):
        """获取已完成分块数量"""
        return self.chunk_model.query.filter(
            and_(
                self.chunk_model.upload_id == upload_id,
                self.chunk_model.is_completed == True,
                self.chunk_model.status == 1
            )
        ).count()
    
    @TryExcept("更新上傳進度失敗")
    def update_upload_progress(self, upload_id):
        """更新上传进度"""
        session = self.get_by_upload_id(upload_id)
        if not session:
            raise ValueError("上傳會話不存在")
        
        completed_count = self.get_completed_chunks_count(upload_id)
        session.completed_chunks = completed_count
        
        if completed_count == session.total_chunks:
            session.upload_status = 'completed'
        elif completed_count > 0:
            session.upload_status = 'uploading'
        
        session.updated_at = CommonTools.get_now()
        return True
    
    def cleanup_expired_sessions(self, hours=24):
        """清理过期的上传会话"""
        cutoff_time = CommonTools.get_now(
            datetime.now() - timedelta(hours=hours)
        )
        
        expired_sessions = self.model.query.filter(
            and_(
                or_(
                    self.model.expires_at < cutoff_time,
                    and_(
                        self.model.upload_status.in_(['pending', 'uploading']),
                        self.model.created_at < cutoff_time
                    )
                ),
                self.model.status == 1
            )
        ).all()
        
        for session in expired_sessions:
            session.status = -1
            session.status_update_at = CommonTools.get_now()
        
        return len(expired_sessions)