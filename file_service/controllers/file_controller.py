# -*- coding: utf-8 -*-
"""
@文件: file_controller.py
@說明: 文件控制器
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
import os
import hashlib
import mimetypes
import traceback
import shutil
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, Optional, List
from flask import request, g, current_app
from werkzeug.utils import secure_filename

from common.common_tools import CommonTools
from dbs.mysql_db import DBFunction
from dbs.mysql_db.model_tables import (
    FileModel, FileFolderModel, FileShareModel, FileVersionModel,
    FileAccessLogModel, FileConversionModel, ChunkUploadModel, UploadSessionModel
)
from models.file_model import (
    OperFileModel, OperFileFolderModel, OperFileShareModel, OperFileVersionModel,
    OperFileAccessLogModel, OperFileConversionModel, OperUploadSessionModel
)
from configs.constant import Config
from loggers import logger
from cache import redis_client


class FileController:
    """文件控制器"""
    
    # 类级别的单例缓存
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FileController, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 避免重复初始化
        if FileController._initialized:
            return
            
        self.oper_file = OperFileModel()
        self.oper_folder = OperFileFolderModel()
        self.oper_share = OperFileShareModel()
        self.oper_version = OperFileVersionModel()
        self.oper_access_log = OperFileAccessLogModel()
        self.oper_conversion = OperFileConversionModel()
        self.oper_upload = OperUploadSessionModel()
        
        # 配置项
        self.upload_folder = Config.FILE_UPLOAD_FOLDER
        self.temp_folder = Config.FILE_TEMP_FOLDER
        self.max_file_size = Config.FILE_MAX_SIZE
        self.allowed_extensions = Config.FILE_ALLOWED_EXTENSIONS
        self.chunk_size = Config.FILE_CHUNK_SIZE
        
        FileController._initialized = True

    # ==================== 公共验证和工具方法 ====================
    
    def _get_client_info(self):
        """获取客户端信息"""
        return {
            'ip_address': request.remote_addr or '未知',
            'user_agent': request.headers.get('User-Agent', '未知')
        }
    
    def _generate_file_path(self, filename, project_id=None, folder_id=None):
        """生成文件路径"""
        # 按日期分文件夹存储
        date_folder = datetime.now().strftime('%Y/%m/%d')
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(filename)[1]
        
        relative_path = f"{date_folder}/{file_id}{file_ext}"
        full_path = os.path.join(self.upload_folder, relative_path)
        
        # 确保目录存在
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        return relative_path, full_path
    
    def _calculate_file_hash(self, file_path):
        """计算文件哈希值"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def _is_allowed_file(self, filename):
        """检查文件类型是否允许"""
        if not filename:
            return False
        ext = os.path.splitext(filename)[1].lower()
        return ext in self.allowed_extensions
    
    def _generate_thumbnail(self, file_path, mime_type):
        """生成缩略图"""
        # 这里应实现缩略图生成逻辑
        # 根据文件类型生成相应的缩略图
        return None
    
    def _generate_preview(self, file_path, mime_type):
        """生成预览文件"""
        # 这里应实现预览文件生成逻辑
        # 根据文件类型生成相应的预览文件
        return None
    
    def _log_file_access(self, file_id, access_type, user_id=None):
        """记录文件访问日志"""
        try:
            client_info = self._get_client_info()
            log_data = {
                'file_id': file_id,
                'user_id': user_id,
                'access_type': access_type,
                'ip_address': client_info['ip_address'],
                'user_agent': client_info['user_agent'],
                'accessed_at': CommonTools.get_now()
            }
            
            log_obj = FileAccessLogModel(**log_data)
            self.oper_access_log.create_access_log(log_obj)
            DBFunction.do_commit("記錄文件訪問日誌", True)
        except Exception as e:
            logger.warning(f"記錄文件訪問失敗: {str(e)}")

    # ==================== 事务处理装饰器 ====================
    
    def _execute_with_transaction(self, operation_func, operation_name: str, *args, **kwargs):
        """事务执行装饰器"""
        try:
            result = operation_func(*args, **kwargs)
            commit_result, commit_flag = DBFunction.do_commit(f"{operation_name}成功", True)
            if commit_flag:
                return result, True
            else:
                raise Exception(f"提交事務失敗: {commit_result}")
        except Exception as e:
            DBFunction.db_rollback()
            logger.error(f"{operation_name}失敗: {str(e)}")
            traceback.print_exc()
            return f"{operation_name}失敗: {str(e)}", False

    # ==================== 文件上传 ====================
    
    def upload_file(self, data: Dict) -> Tuple[Any, bool]:
        """单文件上传"""
        def _upload_file_operation():
            # 验证必填字段
            if 'file' not in data:
                raise ValueError("沒有上傳文件")
            
            file_obj = data['file']
            if file_obj.filename == '':
                raise ValueError("文件名不能為空")
            
            if not self._is_allowed_file(file_obj.filename):
                raise ValueError("不支持的文件類型")
            
            # 生成文件路径
            project_id = data.get('project_id')
            folder_id = data.get('folder_id')
            relative_path, full_path = self._generate_file_path(
                file_obj.filename, project_id, folder_id
            )
            
            # 保存文件
            file_obj.save(full_path)
            
            # 获取文件信息
            file_size = os.path.getsize(full_path)
            mime_type = mimetypes.guess_type(file_obj.filename)[0]
            file_hash = self._calculate_file_hash(full_path)
            
            # 检查是否已存在相同文件
            existing_file = self.oper_file.get_by_hash(file_hash)
            if existing_file:
                # 删除新上传的文件，返回已存在的文件信息
                os.remove(full_path)
                return {
                    'file_id': existing_file.id,
                    'name': existing_file.name,
                    'size': existing_file.size,
                    'duplicate': True,
                    'message': '文件已存在'
                }
            
            # 创建文件记录
            file_data = {
                'id': str(uuid.uuid4()),
                'name': secure_filename(file_obj.filename),
                'original_name': file_obj.filename,
                'path': relative_path,
                'size': file_size,
                'mime_type': mime_type,
                'file_hash': file_hash,
                'project_id': project_id,
                'folder_id': folder_id,
                'uploaded_by': data.get('user_id'),
                'uploaded_at': CommonTools.get_now()
            }
            
            # 生成缩略图和预览
            if mime_type and mime_type.startswith('image/'):
                thumbnail_path = self._generate_thumbnail(full_path, mime_type)
                if thumbnail_path:
                    file_data['thumbnail_path'] = thumbnail_path
            
            preview_path = self._generate_preview(full_path, mime_type)
            if preview_path:
                file_data['preview_path'] = preview_path
            
            file_model = FileModel(**file_data)
            result, flag = self.oper_file.create_file(file_model)
            if not flag:
                # 创建失败，删除文件
                os.remove(full_path)
                raise Exception(f"創建文件記錄失敗: {result}")
            
            return {
                'file_id': file_data['id'],
                'name': file_data['name'],
                'original_name': file_data['original_name'],
                'size': file_data['size'],
                'mime_type': file_data['mime_type'],
                'uploaded_at': file_data['uploaded_at'],
                'duplicate': False
            }
        
        return self._execute_with_transaction(_upload_file_operation, "上傳文件")
    
    def upload_multiple_files(self, data: Dict) -> Tuple[Any, bool]:
        """批量文件上传"""
        def _upload_multiple_files_operation():
            if 'files' not in data or not data['files']:
                raise ValueError("沒有上傳文件")
            
            results = []
            errors = []
            
            for file_obj in data['files']:
                try:
                    single_data = {
                        'file': file_obj,
                        'project_id': data.get('project_id'),
                        'folder_id': data.get('folder_id'),
                        'user_id': data.get('user_id')
                    }
                    result, success = self.upload_file(single_data)
                    if success:
                        results.append(result)
                    else:
                        errors.append({
                            'filename': file_obj.filename,
                            'error': result
                        })
                except Exception as e:
                    errors.append({
                        'filename': file_obj.filename,
                        'error': str(e)
                    })
            
            return {
                'uploaded_count': len(results),
                'error_count': len(errors),
                'files': results,
                'errors': errors
            }
        
        return self._execute_with_transaction(_upload_multiple_files_operation, "批量上傳文件")
    
    def start_chunk_upload(self, data: Dict) -> Tuple[Any, bool]:
        """开始分块上传"""
        def _start_chunk_upload_operation():
            required_fields = ['filename', 'file_size', 'chunk_size']
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"{field}不能為空")
            
            filename = data['filename']
            file_size = int(data['file_size'])
            chunk_size = int(data['chunk_size'])
            
            if not self._is_allowed_file(filename):
                raise ValueError("不支持的文件類型")
            
            if file_size > self.max_file_size:
                raise ValueError("文件大小超出限制")
            
            # 计算总分块数
            total_chunks = (file_size + chunk_size - 1) // chunk_size
            
            # 创建上传会话
            upload_id = str(uuid.uuid4())
            session_data = {
                'upload_id': upload_id,
                'filename': filename,
                'file_size': file_size,
                'chunk_size': chunk_size,
                'total_chunks': total_chunks,
                'project_id': data.get('project_id'),
                'folder_id': data.get('folder_id'),
                'uploaded_by': data.get('user_id'),
                'expires_at': CommonTools.get_now(
                    datetime.now() + timedelta(hours=24)
                )
            }
            
            session_model = UploadSessionModel(**session_data)
            result, flag = self.oper_upload.create_upload_session(session_model)
            if not flag:
                raise Exception(f"創建上傳會話失敗: {result}")
            
            return {
                'upload_id': upload_id,
                'chunk_size': chunk_size,
                'total_chunks': total_chunks,
                'expires_at': session_data['expires_at']
            }
        
        return self._execute_with_transaction(_start_chunk_upload_operation, "開始分塊上傳")
    
    def upload_chunk(self, data: Dict) -> Tuple[Any, bool]:
        """上传文件分块"""
        def _upload_chunk_operation():
            required_fields = ['upload_id', 'chunk_number', 'chunk_data']
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"{field}不能為空")
            
            upload_id = data['upload_id']
            chunk_number = int(data['chunk_number'])
            chunk_data = data['chunk_data']
            
            # 获取上传会话
            session = self.oper_upload.get_by_upload_id(upload_id)
            if not session:
                raise ValueError("上傳會話不存在或已過期")
            
            if session.upload_status in ['completed', 'failed', 'cancelled']:
                raise ValueError(f"上傳會話狀態無效: {session.upload_status}")
            
            # 保存分块文件
            chunk_filename = f"{upload_id}_{chunk_number}"
            chunk_path = os.path.join(self.temp_folder, chunk_filename)
            
            os.makedirs(self.temp_folder, exist_ok=True)
            
            with open(chunk_path, 'wb') as f:
                f.write(chunk_data.read())
            
            chunk_size = os.path.getsize(chunk_path)
            chunk_hash = self._calculate_file_hash(chunk_path)
            
            # 创建分块记录
            chunk_record_data = {
                'upload_id': upload_id,
                'chunk_number': chunk_number,
                'chunk_size': chunk_size,
                'chunk_hash': chunk_hash,
                'chunk_path': chunk_path,
                'is_completed': True,
                'uploaded_by': session.uploaded_by
            }
            
            chunk_model = ChunkUploadModel(**chunk_record_data)
            result, flag = self.oper_upload.create_chunk_upload(chunk_model)
            if not flag:
                os.remove(chunk_path)
                raise Exception(f"創建分塊記錄失敗: {result}")
            
            # 更新上传进度
            self.oper_upload.update_upload_progress(upload_id)
            
            return {
                'upload_id': upload_id,
                'chunk_number': chunk_number,
                'chunk_size': chunk_size,
                'completed': True
            }
        
        return self._execute_with_transaction(_upload_chunk_operation, "上傳文件分塊")
    
    def complete_chunk_upload(self, data: Dict) -> Tuple[Any, bool]:
        """完成分块上传"""
        def _complete_chunk_upload_operation():
            upload_id = data.get('upload_id')
            if not upload_id:
                raise ValueError("upload_id不能為空")
            
            # 获取上传会话
            session = self.oper_upload.get_by_upload_id(upload_id)
            if not session:
                raise ValueError("上傳會話不存在")
            
            if session.upload_status != 'completed':
                raise ValueError("分塊上傳尚未完成")
            
            # 获取所有分块
            chunks = self.oper_upload.get_upload_chunks(upload_id)
            if len(chunks) != session.total_chunks:
                raise ValueError("分塊數量不匹配")
            
            # 合并文件
            relative_path, full_path = self._generate_file_path(
                session.filename, session.project_id, session.folder_id
            )
            
            with open(full_path, 'wb') as output_file:
                for chunk in sorted(chunks, key=lambda x: x.chunk_number):
                    with open(chunk.chunk_path, 'rb') as chunk_file:
                        shutil.copyfileobj(chunk_file, output_file)
            
            # 验证文件大小
            final_size = os.path.getsize(full_path)
            if final_size != session.file_size:
                os.remove(full_path)
                raise ValueError("合併後文件大小不匹配")
            
            # 计算文件哈希
            file_hash = self._calculate_file_hash(full_path)
            
            # 检查重复文件
            existing_file = self.oper_file.get_by_hash(file_hash)
            if existing_file:
                os.remove(full_path)
                # 清理分块文件
                for chunk in chunks:
                    if os.path.exists(chunk.chunk_path):
                        os.remove(chunk.chunk_path)
                
                return {
                    'file_id': existing_file.id,
                    'name': existing_file.name,
                    'size': existing_file.size,
                    'duplicate': True,
                    'message': '文件已存在'
                }
            
            # 创建文件记录
            mime_type = mimetypes.guess_type(session.filename)[0]
            file_data = {
                'id': str(uuid.uuid4()),
                'name': secure_filename(session.filename),
                'original_name': session.filename,
                'path': relative_path,
                'size': final_size,
                'mime_type': mime_type,
                'file_hash': file_hash,
                'project_id': session.project_id,
                'folder_id': session.folder_id,
                'uploaded_by': session.uploaded_by,
                'uploaded_at': CommonTools.get_now()
            }
            
            file_model = FileModel(**file_data)
            result, flag = self.oper_file.create_file(file_model)
            if not flag:
                os.remove(full_path)
                raise Exception(f"創建文件記錄失敗: {result}")
            
            # 清理分块文件
            for chunk in chunks:
                if os.path.exists(chunk.chunk_path):
                    os.remove(chunk.chunk_path)
            
            return {
                'file_id': file_data['id'],
                'name': file_data['name'],
                'original_name': file_data['original_name'],
                'size': file_data['size'],
                'mime_type': file_data['mime_type'],
                'uploaded_at': file_data['uploaded_at'],
                'duplicate': False
            }
        
        return self._execute_with_transaction(_complete_chunk_upload_operation, "完成分塊上傳")

    # ==================== 文件管理 ====================
    
    def get_file_info(self, file_id: str, user_id: str = None) -> Tuple[Any, bool]:
        """获取文件信息"""
        try:
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                return "文件不存在", False
            
            # 记录访问日志
            if user_id:
                self._log_file_access(file_id, 'view', user_id)
            
            file_info = {
                'id': file_obj.id,
                'name': file_obj.name,
                'original_name': file_obj.original_name,
                'size': file_obj.size,
                'mime_type': file_obj.mime_type,
                'file_hash': file_obj.file_hash,
                'project_id': file_obj.project_id,
                'folder_id': file_obj.folder_id,
                'is_public': file_obj.is_public,
                'download_count': file_obj.download_count,
                'virus_scan_status': file_obj.virus_scan_status,
                'uploaded_by': file_obj.uploaded_by,
                'uploaded_at': file_obj.uploaded_at,
                'updated_at': file_obj.updated_at,
                'has_thumbnail': bool(file_obj.thumbnail_path),
                'has_preview': bool(file_obj.preview_path)
            }
            
            return file_info, True
            
        except Exception as e:
            logger.error(f"獲取文件信息異常: {str(e)}")
            return "獲取文件信息失敗", False
    
    def update_file_info(self, file_id: str, data: Dict) -> Tuple[Any, bool]:
        """更新文件信息"""
        def _update_file_operation():
            result, flag = self.oper_file.update_file(file_id, data)
            if not flag:
                raise Exception(f"更新文件失敗: {result}")
            
            return {
                'file_id': file_id,
                'updated_fields': list(data.keys()),
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_update_file_operation, "更新文件信息")
    
    def delete_file(self, file_id: str, user_id: str = None) -> Tuple[Any, bool]:
        """删除文件"""
        def _delete_file_operation():
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                raise ValueError("文件不存在")
            
            # 检查权限（这里应该添加具体的权限检查逻辑）
            if user_id and file_obj.uploaded_by != user_id:
                # 这里应该检查用户是否有删除权限
                pass
            
            # 软删除文件记录
            result, flag = self.oper_file.delete_file(file_id)
            if not flag:
                raise Exception(f"刪除文件失敗: {result}")
            
            # 物理删除文件（可选，也可以保留一段时间）
            file_path = os.path.join(self.upload_folder, file_obj.path)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"刪除物理文件失敗: {str(e)}")
            
            return {
                'file_id': file_id,
                'deleted_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_delete_file_operation, "刪除文件")
    
    def copy_file(self, file_id: str, data: Dict) -> Tuple[Any, bool]:
        """复制文件"""
        def _copy_file_operation():
            original_file = self.oper_file.get_by_id(file_id)
            if not original_file:
                raise ValueError("源文件不存在")
            
            # 生成新的文件路径
            relative_path, full_path = self._generate_file_path(
                original_file.name, 
                data.get('project_id', original_file.project_id),
                data.get('folder_id', original_file.folder_id)
            )
            
            # 复制物理文件
            original_path = os.path.join(self.upload_folder, original_file.path)
            shutil.copy2(original_path, full_path)
            
            # 创建新文件记录
            new_file_data = {
                'id': str(uuid.uuid4()),
                'name': data.get('name', original_file.name),
                'original_name': original_file.original_name,
                'path': relative_path,
                'size': original_file.size,
                'mime_type': original_file.mime_type,
                'file_hash': original_file.file_hash,
                'project_id': data.get('project_id', original_file.project_id),
                'folder_id': data.get('folder_id', original_file.folder_id),
                'uploaded_by': data.get('user_id'),
                'uploaded_at': CommonTools.get_now()
            }
            
            file_model = FileModel(**new_file_data)
            result, flag = self.oper_file.create_file(file_model)
            if not flag:
                os.remove(full_path)
                raise Exception(f"創建文件副本失敗: {result}")
            
            return {
                'file_id': new_file_data['id'],
                'name': new_file_data['name'],
                'size': new_file_data['size'],
                'copied_from': file_id,
                'created_at': new_file_data['uploaded_at']
            }
        
        return self._execute_with_transaction(_copy_file_operation, "複製文件")
    
    def move_file(self, file_id: str, data: Dict) -> Tuple[Any, bool]:
        """移动文件"""
        def _move_file_operation():
            update_data = {}
            if 'folder_id' in data:
                update_data['folder_id'] = data['folder_id']
            if 'project_id' in data:
                update_data['project_id'] = data['project_id']
            
            if not update_data:
                raise ValueError("沒有指定移動目標")
            
            result, flag = self.oper_file.update_file(file_id, update_data)
            if not flag:
                raise Exception(f"移動文件失敗: {result}")
            
            return {
                'file_id': file_id,
                'moved_to': update_data,
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_move_file_operation, "移動文件")

    # ==================== 文件访问 ====================
    
    def download_file(self, file_id: str, user_id: str = None) -> Tuple[Any, bool]:
        """下载文件"""
        try:
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                return "文件不存在", False
            
            file_path = os.path.join(self.upload_folder, file_obj.path)
            if not os.path.exists(file_path):
                return "文件不存在于存储中", False
            
            # 记录下载日志和增加下载次数
            if user_id:
                self._log_file_access(file_id, 'download', user_id)
            
            def _increment_download_operation():
                return self.oper_file.increment_download_count(file_id)
            
            self._execute_with_transaction(_increment_download_operation, "增加下載次數")
            
            return {
                'file_path': file_path,
                'filename': file_obj.original_name,
                'mime_type': file_obj.mime_type,
                'size': file_obj.size
            }, True
            
        except Exception as e:
            logger.error(f"下載文件異常: {str(e)}")
            return "下載文件失敗", False
    
    def get_file_preview(self, file_id: str, user_id: str = None) -> Tuple[Any, bool]:
        """获取文件预览"""
        try:
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                return "文件不存在", False
            
            # 记录预览日志
            if user_id:
                self._log_file_access(file_id, 'preview', user_id)
            
            preview_info = {
                'file_id': file_id,
                'name': file_obj.name,
                'mime_type': file_obj.mime_type,
                'size': file_obj.size
            }
            
            # 如果有预览文件，返回预览路径
            if file_obj.preview_path:
                preview_path = os.path.join(self.upload_folder, file_obj.preview_path)
                if os.path.exists(preview_path):
                    preview_info['preview_path'] = preview_path
                    preview_info['has_preview'] = True
                else:
                    preview_info['has_preview'] = False
            else:
                # 对于某些文件类型，可以直接预览原文件
                if file_obj.mime_type and (
                    file_obj.mime_type.startswith('image/') or
                    file_obj.mime_type.startswith('text/') or
                    file_obj.mime_type == 'application/pdf'
                ):
                    file_path = os.path.join(self.upload_folder, file_obj.path)
                    if os.path.exists(file_path):
                        preview_info['preview_path'] = file_path
                        preview_info['has_preview'] = True
                    else:
                        preview_info['has_preview'] = False
                else:
                    preview_info['has_preview'] = False
            
            return preview_info, True
            
        except Exception as e:
            logger.error(f"獲取文件預覽異常: {str(e)}")
            return "獲取文件預覽失敗", False
    
    def get_file_thumbnail(self, file_id: str) -> Tuple[Any, bool]:
        """获取文件缩略图"""
        try:
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                return "文件不存在", False
            
            if not file_obj.thumbnail_path:
                return "文件沒有縮略圖", False
            
            thumbnail_path = os.path.join(self.upload_folder, file_obj.thumbnail_path)
            if not os.path.exists(thumbnail_path):
                return "縮略圖文件不存在", False
            
            return {
                'thumbnail_path': thumbnail_path,
                'mime_type': 'image/jpeg'  # 缩略图通常是JPEG格式
            }, True
            
        except Exception as e:
            logger.error(f"獲取縮略圖異常: {str(e)}")
            return "獲取縮略圖失敗", False
    
    def stream_file(self, file_id: str, range_header: str = None, user_id: str = None) -> Tuple[Any, bool]:
        """流式访问文件"""
        try:
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                return "文件不存在", False
            
            file_path = os.path.join(self.upload_folder, file_obj.path)
            if not os.path.exists(file_path):
                return "文件不存在于存储中", False
            
            # 记录访问日志
            if user_id:
                self._log_file_access(file_id, 'view', user_id)
            
            file_size = file_obj.size
            start = 0
            end = file_size - 1
            
            # 解析Range头
            if range_header:
                try:
                    range_match = range_header.replace('bytes=', '').split('-')
                    start = int(range_match[0]) if range_match[0] else 0
                    end = int(range_match[1]) if range_match[1] else file_size - 1
                except:
                    pass  # 使用默认值
            
            return {
                'file_path': file_path,
                'filename': file_obj.original_name,
                'mime_type': file_obj.mime_type,
                'file_size': file_size,
                'start': start,
                'end': end,
                'content_length': end - start + 1
            }, True
            
        except Exception as e:
            logger.error(f"流式訪問文件異常: {str(e)}")
            return "流式訪問文件失敗", False

    # ==================== 文件分享接口 ====================
    
    def create_file_share(self, file_id: str, data: Dict) -> Tuple[Any, bool]:
        """创建文件分享"""
        def _create_share_operation():
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                raise ValueError("文件不存在")
            
            import secrets
            share_token = secrets.token_urlsafe(32)
            
            # 创建分享记录
            share_data = {
                'id': str(uuid.uuid4()),
                'file_id': file_id,
                'share_token': share_token,
                'password': data.get('password'),
                'expires_at': data.get('expires_at'),
                'max_downloads': data.get('max_downloads'),
                'allow_preview': data.get('allow_preview', True),
                'allow_download': data.get('allow_download', True),
                'created_by': data.get('user_id'),
                'created_at': CommonTools.get_now()
            }
            
            share_model = FileShareModel(**share_data)
            result, flag = self.oper_share.create_share(share_model)
            if not flag:
                raise Exception(f"創建分享失敗: {result}")
            
            return {
                'share_id': share_data['id'],
                'share_token': share_token,
                'share_url': f"/files/shared/{share_token}",
                'expires_at': share_data['expires_at'],
                'max_downloads': share_data['max_downloads'],
                'created_at': share_data['created_at']
            }
        
        return self._execute_with_transaction(_create_share_operation, "創建文件分享")
    
    def get_file_share(self, share_token: str, password: str = None) -> Tuple[Any, bool]:
        """获取分享文件信息"""
        try:
            share = self.oper_share.get_by_token(share_token)
            if not share:
                return "分享鏈接不存在", False
            
            # 检查分享有效性
            if not self.oper_share.is_share_valid(share):
                return "分享鏈接已過期或無效", False
            
            # 检查密码
            if share.password and password != share.password:
                return "分享密碼錯誤", False
            
            # 获取文件信息
            file_obj = self.oper_file.get_by_id(share.file_id)
            if not file_obj:
                return "關聯文件不存在", False
            
            share_info = {
                'share_id': share.id,
                'file_info': {
                    'id': file_obj.id,
                    'name': file_obj.name,
                    'original_name': file_obj.original_name,
                    'size': file_obj.size,
                    'mime_type': file_obj.mime_type,
                    'has_thumbnail': bool(file_obj.thumbnail_path),
                    'has_preview': bool(file_obj.preview_path)
                },
                'share_settings': {
                    'allow_preview': share.allow_preview,
                    'allow_download': share.allow_download,
                    'max_downloads': share.max_downloads,
                    'download_count': share.download_count,
                    'expires_at': share.expires_at
                },
                'share_token': share_token
            }
            
            return share_info, True
            
        except Exception as e:
            logger.error(f"獲取分享文件信息異常: {str(e)}")
            return "獲取分享文件信息失敗", False
    
    def update_file_share(self, share_id: str, data: Dict) -> Tuple[Any, bool]:
        """更新文件分享设置"""
        def _update_share_operation():
            result, flag = self.oper_share.update_share(share_id, data)
            if not flag:
                raise Exception(f"更新分享設置失敗: {result}")
            
            return {
                'share_id': share_id,
                'updated_fields': list(data.keys()),
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_update_share_operation, "更新文件分享設置")
    
    def delete_file_share(self, share_id: str) -> Tuple[Any, bool]:
        """删除文件分享"""
        def _delete_share_operation():
            result, flag = self.oper_share.delete_share(share_id)
            if not flag:
                raise Exception(f"刪除分享失敗: {result}")
            
            return {
                'share_id': share_id,
                'deleted_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_delete_share_operation, "刪除文件分享")
    
    def download_shared_file(self, share_token: str, password: str = None) -> Tuple[Any, bool]:
        """下载分享文件"""
        try:
            # 获取分享信息
            share_info, flag = self.get_file_share(share_token, password)
            if not flag:
                return share_info, False
            
            share = self.oper_share.get_by_token(share_token)
            if not share.allow_download:
                return "該分享不允許下載", False
            
            file_id = share_info['file_info']['id']
            
            # 增加下载次数
            def _increment_share_download():
                return self.oper_share.increment_download_count(share.id)
            
            self._execute_with_transaction(_increment_share_download, "增加分享下載次數")
            
            # 获取文件路径
            result, flag = self.download_file(file_id)
            return result, flag
            
        except Exception as e:
            logger.error(f"下載分享文件異常: {str(e)}")
            return "下載分享文件失敗", False

    # ==================== 文件版本接口 ====================
    
    def get_file_versions(self, file_id: str) -> Tuple[Any, bool]:
        """获取文件版本列表"""
        try:
            versions = self.oper_version.get_file_versions(file_id)
            
            version_list = []
            for version in versions:
                version_info = {
                    'id': version.id,
                    'version_number': version.version_number,
                    'size': version.size,
                    'file_hash': version.file_hash,
                    'change_description': version.change_description,
                    'uploaded_by': version.uploaded_by,
                    'uploaded_at': version.uploaded_at
                }
                version_list.append(version_info)
            
            latest_version = self.oper_version.get_latest_version_number(file_id)
            
            return {
                'total': len(version_list),
                'current_version': latest_version,
                'versions': version_list
            }, True
            
        except Exception as e:
            logger.error(f"獲取文件版本列表異常: {str(e)}")
            return "獲取文件版本列表失敗", False
    
    def upload_file_version(self, file_id: str, data: Dict) -> Tuple[Any, bool]:
        """上传新文件版本"""
        def _upload_version_operation():
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                raise ValueError("文件不存在")
            
            if 'file' not in data:
                raise ValueError("沒有上傳文件")
            
            file_upload = data['file']
            if file_upload.filename == '':
                raise ValueError("文件名不能為空")
            
            # 生成版本文件路径
            version_number = self.oper_version.get_latest_version_number(file_id) + 1
            relative_path, full_path = self._generate_file_path(
                f"v{version_number}_{file_upload.filename}"
            )
            
            # 保存版本文件
            file_upload.save(full_path)
            
            # 获取文件信息
            file_size = os.path.getsize(full_path)
            file_hash = self._calculate_file_hash(full_path)
            
            # 创建版本记录
            version_data = {
                'id': str(uuid.uuid4()),
                'file_id': file_id,
                'version_number': version_number,
                'path': relative_path,
                'size': file_size,
                'file_hash': file_hash,
                'change_description': data.get('change_description'),
                'uploaded_by': data.get('user_id'),
                'uploaded_at': CommonTools.get_now()
            }
            
            version_model = FileVersionModel(**version_data)
            result, flag = self.oper_version.create_version(version_model)
            if not flag:
                os.remove(full_path)
                raise Exception(f"創建版本記錄失敗: {result}")
            
            return {
                'version_id': version_data['id'],
                'version_number': version_number,
                'file_id': file_id,
                'size': file_size,
                'uploaded_at': version_data['uploaded_at']
            }
        
        return self._execute_with_transaction(_upload_version_operation, "上傳文件版本")
    
    def download_file_version(self, file_id: str, version_number: int, user_id: str = None) -> Tuple[Any, bool]:
        """下载指定版本文件"""
        try:
            version = self.oper_version.get_version_by_number(file_id, version_number)
            if not version:
                return "文件版本不存在", False
            
            version_path = os.path.join(self.upload_folder, version.path)
            if not os.path.exists(version_path):
                return "版本文件不存在于存储中", False
            
            # 记录访问日志
            if user_id:
                self._log_file_access(file_id, 'download', user_id)
            
            # 获取原文件信息用于文件名
            file_obj = self.oper_file.get_by_id(file_id)
            filename = f"v{version_number}_{file_obj.original_name}" if file_obj else f"version_{version_number}"
            
            return {
                'file_path': version_path,
                'filename': filename,
                'mime_type': file_obj.mime_type if file_obj else 'application/octet-stream',
                'size': version.size
            }, True
            
        except Exception as e:
            logger.error(f"下載版本文件異常: {str(e)}")
            return "下載版本文件失敗", False
    
    def restore_file_version(self, file_id: str, version_number: int, user_id: str = None) -> Tuple[Any, bool]:
        """恢复文件到指定版本"""
        def _restore_version_operation():
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                raise ValueError("文件不存在")
            
            version = self.oper_version.get_version_by_number(file_id, version_number)
            if not version:
                raise ValueError("指定版本不存在")
            
            version_path = os.path.join(self.upload_folder, version.path)
            if not os.path.exists(version_path):
                raise ValueError("版本文件不存在于存储中")
            
            # 生成新的主文件路径
            relative_path, full_path = self._generate_file_path(
                file_obj.original_name, file_obj.project_id, file_obj.folder_id
            )
            
            # 复制版本文件到新位置
            shutil.copy2(version_path, full_path)
            
            # 更新主文件记录
            update_data = {
                'path': relative_path,
                'size': version.size,
                'file_hash': version.file_hash,
                'updated_at': CommonTools.get_now()
            }
            
            result, flag = self.oper_file.update_file(file_id, update_data)
            if not flag:
                os.remove(full_path)
                raise Exception(f"更新文件記錄失敗: {result}")
            
            # 删除旧文件
            old_path = os.path.join(self.upload_folder, file_obj.path)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    logger.warning(f"刪除舊文件失敗: {str(e)}")
            
            return {
                'file_id': file_id,
                'restored_version': version_number,
                'restored_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_restore_version_operation, "恢復文件版本")

    # ==================== 文件转换接口 ====================
    
    def create_file_conversion(self, file_id: str, data: Dict) -> Tuple[Any, bool]:
        """创建文件转换任务"""
        def _create_conversion_operation():
            file_obj = self.oper_file.get_by_id(file_id)
            if not file_obj:
                raise ValueError("文件不存在")
            
            target_format = data.get('target_format')
            if not target_format:
                raise ValueError("目標格式不能為空")
            
            # 检查是否已有相同格式的转换任务
            existing_conversions = self.oper_conversion.get_file_conversions(file_id)
            for conversion in existing_conversions:
                if (conversion.target_format == target_format and 
                    conversion.conversion_status in ['pending', 'processing']):
                    return {
                        'conversion_id': conversion.id,
                        'status': 'already_exists',
                        'message': '相同格式的轉換任務已存在'
                    }
            
            # 创建转换任务
            conversion_data = {
                'id': str(uuid.uuid4()),
                'file_id': file_id,
                'target_format': target_format,
                'conversion_status': 'pending',
                'conversion_params': data.get('conversion_params', {}),
                'requested_by': data.get('user_id'),
                'created_at': CommonTools.get_now()
            }
            
            conversion_model = FileConversionModel(**conversion_data)
            result, flag = self.oper_conversion.create_conversion(conversion_model)
            if not flag:
                raise Exception(f"創建轉換任務失敗: {result}")
            
            # 这里应该启动实际的转换处理（可以使用队列系统）
            # 暂时直接返回任务创建成功
            
            return {
                'conversion_id': conversion_data['id'],
                'file_id': file_id,
                'target_format': target_format,
                'status': 'pending',
                'created_at': conversion_data['created_at']
            }
        
        return self._execute_with_transaction(_create_conversion_operation, "創建文件轉換任務")
    
    def get_conversion_status(self, file_id: str, conversion_id: str = None) -> Tuple[Any, bool]:
        """获取文件转换状态"""
        try:
            if conversion_id:
                conversion = self.oper_conversion.get_by_id(conversion_id)
                if not conversion:
                    return "轉換任務不存在", False
                
                conversions = [conversion]
            else:
                conversions = self.oper_conversion.get_file_conversions(file_id)
            
            conversion_list = []
            for conversion in conversions:
                conversion_info = {
                    'id': conversion.id,
                    'file_id': conversion.file_id,
                    'target_format': conversion.target_format,
                    'status': conversion.conversion_status,
                    'converted_file_path': conversion.converted_file_path,
                    'converted_file_size': conversion.converted_file_size,
                    'error_message': conversion.error_message,
                    'started_at': conversion.started_at,
                    'completed_at': conversion.completed_at,
                    'requested_by': conversion.requested_by,
                    'created_at': conversion.created_at
                }
                conversion_list.append(conversion_info)
            
            return {
                'conversions': conversion_list,
                'total': len(conversion_list)
            }, True
            
        except Exception as e:
            logger.error(f"獲取轉換狀態異常: {str(e)}")
            return "獲取轉換狀態失敗", False
    
    def download_conversion_result(self, conversion_id: str, user_id: str = None) -> Tuple[Any, bool]:
        """下载转换结果文件"""
        try:
            conversion = self.oper_conversion.get_by_id(conversion_id)
            if not conversion:
                return "轉換任務不存在", False
            
            if conversion.conversion_status != 'completed':
                return "轉換尚未完成", False
            
            if not conversion.converted_file_path:
                return "轉換結果文件不存在", False
            
            converted_path = os.path.join(self.upload_folder, conversion.converted_file_path)
            if not os.path.exists(converted_path):
                return "轉換結果文件不存在于存储中", False
            
            # 记录访问日志
            if user_id:
                self._log_file_access(conversion.file_id, 'download', user_id)
            
            # 获取原文件信息
            file_obj = self.oper_file.get_by_id(conversion.file_id)
            base_name = os.path.splitext(file_obj.original_name)[0] if file_obj else 'converted_file'
            filename = f"{base_name}.{conversion.target_format}"
            
            return {
                'file_path': converted_path,
                'filename': filename,
                'mime_type': mimetypes.guess_type(filename)[0] or 'application/octet-stream',
                'size': conversion.converted_file_size
            }, True
            
        except Exception as e:
            logger.error(f"下載轉換結果異常: {str(e)}")
            return "下載轉換結果失敗", False

    # ==================== 文件夹管理接口 ====================
    
    def create_folder(self, data: Dict) -> Tuple[Any, bool]:
        """创建文件夹"""
        def _create_folder_operation():
            required_fields = ['name', 'project_id']
            for field in required_fields:
                if not data.get(field):
                    raise ValueError(f"{field}不能為空")
            
            # 构建文件夹路径
            folder_path = data['name']
            if data.get('parent_id'):
                parent_folder = self.oper_folder.get_by_id(data['parent_id'])
                if not parent_folder:
                    raise ValueError("父文件夾不存在")
                folder_path = f"{parent_folder.path}/{data['name']}"
            
            # 创建文件夹记录
            folder_data = {
                'id': str(uuid.uuid4()),
                'name': data['name'].strip(),
                'parent_id': data.get('parent_id'),
                'project_id': data['project_id'],
                'path': folder_path,
                'description': data.get('description'),
                'created_by': data.get('user_id'),
                'created_at': CommonTools.get_now()
            }
            
            folder_model = FileFolderModel(**folder_data)
            result, flag = self.oper_folder.create_folder(folder_model)
            if not flag:
                raise Exception(f"創建文件夾失敗: {result}")
            
            return {
                'folder_id': folder_data['id'],
                'name': folder_data['name'],
                'path': folder_data['path'],
                'parent_id': folder_data['parent_id'],
                'project_id': folder_data['project_id'],
                'created_at': folder_data['created_at']
            }
        
        return self._execute_with_transaction(_create_folder_operation, "創建文件夾")
    
    def get_folder_contents(self, folder_id: str, page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取文件夹内容"""
        try:
            folder = self.oper_folder.get_by_id(folder_id)
            if not folder:
                return "文件夾不存在", False
            
            # 获取子文件夹
            subfolders = self.oper_folder.get_children_folders(folder_id)
            subfolder_list = []
            for subfolder in subfolders:
                subfolder_info = {
                    'id': subfolder.id,
                    'name': subfolder.name,
                    'type': 'folder',
                    'path': subfolder.path,
                    'description': subfolder.description,
                    'created_by': subfolder.created_by,
                    'created_at': subfolder.created_at
                }
                subfolder_list.append(subfolder_info)
            
            # 获取文件
            files_result = self.oper_file.get_files_by_folder(folder_id, page, size)
            file_list = []
            for file_obj in files_result.items:
                file_info = {
                    'id': file_obj.id,
                    'name': file_obj.name,
                    'type': 'file',
                    'original_name': file_obj.original_name,
                    'size': file_obj.size,
                    'mime_type': file_obj.mime_type,
                    'uploaded_by': file_obj.uploaded_by,
                    'uploaded_at': file_obj.uploaded_at,
                    'download_count': file_obj.download_count
                }
                file_list.append(file_info)
            
            return {
                'folder': {
                    'id': folder.id,
                    'name': folder.name,
                    'path': folder.path,
                    'parent_id': folder.parent_id,
                    'project_id': folder.project_id,
                    'description': folder.description,
                    'created_by': folder.created_by,
                    'created_at': folder.created_at
                },
                'contents': {
                    'subfolders': subfolder_list,
                    'files': file_list,
                    'total_subfolders': len(subfolder_list),
                    'total_files': files_result.total,
                    'page': page,
                    'size': size,
                    'total_pages': files_result.pages
                }
            }, True
            
        except Exception as e:
            logger.error(f"獲取文件夾內容異常: {str(e)}")
            return "獲取文件夾內容失敗", False
    
    def update_folder(self, folder_id: str, data: Dict) -> Tuple[Any, bool]:
        """更新文件夹"""
        def _update_folder_operation():
            result, flag = self.oper_folder.update_folder(folder_id, data)
            if not flag:
                raise Exception(f"更新文件夾失敗: {result}")
            
            return {
                'folder_id': folder_id,
                'updated_fields': list(data.keys()),
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_update_folder_operation, "更新文件夾")
    
    def delete_folder(self, folder_id: str, user_id: str = None) -> Tuple[Any, bool]:
        """删除文件夹"""
        def _delete_folder_operation():
            folder = self.oper_folder.get_by_id(folder_id)
            if not folder:
                raise ValueError("文件夾不存在")
            
            # 检查是否有子文件夹或文件
            subfolders = self.oper_folder.get_children_folders(folder_id)
            if subfolders:
                raise ValueError("文件夾不為空，請先刪除子文件夾")
            
            files_result = self.oper_file.get_files_by_folder(folder_id, 1, 1)
            if files_result.total > 0:
                raise ValueError("文件夾不為空，請先刪除文件")
            
            result, flag = self.oper_folder.delete_folder(folder_id)
            if not flag:
                raise Exception(f"刪除文件夾失敗: {result}")
            
            return {
                'folder_id': folder_id,
                'deleted_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_delete_folder_operation, "刪除文件夾")


def init_file_controller():
    """初始化文件控制器"""
    global file_controller
    file_controller = FileController()
    return file_controller


# 全局文件控制器实例
file_controller = None