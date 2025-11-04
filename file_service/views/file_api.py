# -*- coding: utf-8 -*-
"""
@文件: file_api.py
@說明: 文件服務API
@時間: 2025-01-09
@作者: LiDong
"""

import os
from flask import request, g, jsonify, send_file, make_response
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.exceptions import RequestEntityTooLarge

from common.common_method import fail_response_result, response_result
from controllers.file_controller import FileController, init_file_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.file_serialize import (
    FileUploadResponseSchema, FileInfoResponseSchema, FileListResponseSchema,
    FileUpdateSchema, FileCopySchema, FileMoveSchema, FileSearchSchema,
    FolderCreateSchema, FolderUpdateSchema, FolderResponseSchema,
    ShareCreateSchema, ShareUpdateSchema, ShareResponseSchema,
    VersionResponseSchema, ConversionCreateSchema, ConversionResponseSchema,
    ChunkUploadStartSchema, ChunkUploadCompleteSchema, UploadProgressResponseSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("file_api", __name__)


class BaseFileView(MethodView):
    """文件API基类 - 统一控制器管理和错误处理"""
    
    def __init__(self):
        super().__init__()
        # 使用单例模式的控制器，避免重复初始化
        if not hasattr(g, 'file_controller'):
            g.file_controller = FileController()
        self.fc = g.file_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"文件API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)
    
    def _get_current_user(self):
        """获取当前用户ID"""
        try:
            return get_jwt_identity()
        except:
            return None


# ==================== 文件上传接口 ====================

@blp.route("/files/upload")
class FileUploadApi(BaseFileView):
    """文件上传API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """单文件上传"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            if 'file' not in request.files:
                return fail_response_result(msg="沒有上傳文件")
            
            file_obj = request.files['file']
            if file_obj.filename == '':
                return fail_response_result(msg="文件名不能為空")
            
            upload_data = {
                'file': file_obj,
                'project_id': request.form.get('project_id'),
                'folder_id': request.form.get('folder_id'),
                'user_id': user_id
            }
            
            result, flag = self.fc.upload_file(upload_data)
            return self._build_response(result, flag, "文件上傳成功")
            
        except RequestEntityTooLarge:
            return fail_response_result(msg="文件大小超出限制")
        except Exception as e:
            logger.error(f"文件上傳異常: {str(e)}")
            return fail_response_result(msg="文件上傳失敗")


@blp.route("/files/upload/multiple")
class FileMultipleUploadApi(BaseFileView):
    """批量文件上传API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """批量文件上传"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            if 'files' not in request.files:
                return fail_response_result(msg="沒有上傳文件")
            
            files = request.files.getlist('files')
            if not files:
                return fail_response_result(msg="文件列表為空")
            
            upload_data = {
                'files': files,
                'project_id': request.form.get('project_id'),
                'folder_id': request.form.get('folder_id'),
                'user_id': user_id
            }
            
            result, flag = self.fc.upload_multiple_files(upload_data)
            return self._build_response(result, flag, "批量文件上傳完成")
            
        except RequestEntityTooLarge:
            return fail_response_result(msg="文件大小超出限制")
        except Exception as e:
            logger.error(f"批量文件上傳異常: {str(e)}")
            return fail_response_result(msg="批量文件上傳失敗")


@blp.route("/files/upload/chunk")
class FileChunkUploadApi(BaseFileView):
    """分块上传API"""

    @jwt_required()
    @blp.arguments(ChunkUploadStartSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """开始分块上传"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            payload['user_id'] = user_id
            result, flag = self.fc.start_chunk_upload(payload)
            return self._build_response(result, flag, "分塊上傳會話創建成功")
            
        except Exception as e:
            logger.error(f"開始分塊上傳異常: {str(e)}")
            return fail_response_result(msg="開始分塊上傳失敗")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self):
        """上传文件分块"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            upload_id = request.form.get('upload_id')
            chunk_number = request.form.get('chunk_number')
            
            if not upload_id or not chunk_number:
                return fail_response_result(msg="缺少必要參數")
            
            if 'chunk' not in request.files:
                return fail_response_result(msg="沒有分塊數據")
            
            chunk_data = request.files['chunk']
            
            upload_data = {
                'upload_id': upload_id,
                'chunk_number': int(chunk_number),
                'chunk_data': chunk_data,
                'user_id': user_id
            }
            
            result, flag = self.fc.upload_chunk(upload_data)
            return self._build_response(result, flag, "分塊上傳成功")
            
        except Exception as e:
            logger.error(f"分塊上傳異常: {str(e)}")
            return fail_response_result(msg="分塊上傳失敗")


@blp.route("/files/upload/complete")
class FileChunkCompleteApi(BaseFileView):
    """完成分块上传API"""

    @jwt_required()
    @blp.arguments(ChunkUploadCompleteSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """完成分块上传"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            result, flag = self.fc.complete_chunk_upload(payload)
            return self._build_response(result, flag, "分塊上傳完成")
            
        except Exception as e:
            logger.error(f"完成分塊上傳異常: {str(e)}")
            return fail_response_result(msg="完成分塊上傳失敗")


# ==================== 文件管理接口 ====================

@blp.route("/files/<file_id>")
class FileDetailApi(BaseFileView):
    """文件详情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, file_id):
        """获取文件信息"""
        try:
            user_id = self._get_current_user()
            result, flag = self.fc.get_file_info(file_id, user_id)
            return self._build_response(result, flag, "獲取文件信息成功")
            
        except Exception as e:
            logger.error(f"獲取文件信息異常: {str(e)}")
            return fail_response_result(msg="獲取文件信息失敗")

    @jwt_required()
    @blp.arguments(FileUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, file_id):
        """更新文件信息"""
        try:
            result, flag = self.fc.update_file_info(file_id, payload)
            return self._build_response(result, flag, "更新文件信息成功")
            
        except Exception as e:
            logger.error(f"更新文件信息異常: {str(e)}")
            return fail_response_result(msg="更新文件信息失敗")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, file_id):
        """删除文件"""
        try:
            user_id = self._get_current_user()
            result, flag = self.fc.delete_file(file_id, user_id)
            return self._build_response(result, flag, "刪除文件成功")
            
        except Exception as e:
            logger.error(f"刪除文件異常: {str(e)}")
            return fail_response_result(msg="刪除文件失敗")


@blp.route("/files/<file_id>/copy")
class FileCopyApi(BaseFileView):
    """文件复制API"""

    @jwt_required()
    @blp.arguments(FileCopySchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, file_id):
        """复制文件"""
        try:
            user_id = self._get_current_user()
            payload['user_id'] = user_id
            result, flag = self.fc.copy_file(file_id, payload)
            return self._build_response(result, flag, "複製文件成功")
            
        except Exception as e:
            logger.error(f"複製文件異常: {str(e)}")
            return fail_response_result(msg="複製文件失敗")


@blp.route("/files/<file_id>/move")
class FileMoveApi(BaseFileView):
    """文件移动API"""

    @jwt_required()
    @blp.arguments(FileMoveSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, file_id):
        """移动文件"""
        try:
            result, flag = self.fc.move_file(file_id, payload)
            return self._build_response(result, flag, "移動文件成功")
            
        except Exception as e:
            logger.error(f"移動文件異常: {str(e)}")
            return fail_response_result(msg="移動文件失敗")


# ==================== 文件访问接口 ====================

@blp.route("/files/<file_id>/download")
class FileDownloadApi(BaseFileView):
    """文件下载API"""

    @jwt_required()
    def get(self, file_id):
        """下载文件"""
        try:
            user_id = self._get_current_user()
            result, flag = self.fc.download_file(file_id, user_id)
            
            if not flag:
                return fail_response_result(msg=str(result))
            
            file_path = result['file_path']
            filename = result['filename']
            mime_type = result['mime_type']
            
            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype=mime_type
            )
            
        except Exception as e:
            logger.error(f"下載文件異常: {str(e)}")
            return fail_response_result(msg="下載文件失敗")


@blp.route("/files/<file_id>/preview")
class FilePreviewApi(BaseFileView):
    """文件预览API"""

    @jwt_required()
    def get(self, file_id):
        """预览文件"""
        try:
            user_id = self._get_current_user()
            result, flag = self.fc.get_file_preview(file_id, user_id)
            
            if not flag:
                return fail_response_result(msg=str(result))
            
            if not result.get('has_preview'):
                return fail_response_result(msg="該文件不支持預覽")
            
            preview_path = result['preview_path']
            mime_type = result['mime_type']
            
            return send_file(preview_path, mimetype=mime_type)
            
        except Exception as e:
            logger.error(f"預覽文件異常: {str(e)}")
            return fail_response_result(msg="預覽文件失敗")


@blp.route("/files/<file_id>/thumbnail")
class FileThumbnailApi(BaseFileView):
    """文件缩略图API"""

    def get(self, file_id):
        """获取缩略图"""
        try:
            result, flag = self.fc.get_file_thumbnail(file_id)
            
            if not flag:
                return fail_response_result(msg=str(result))
            
            thumbnail_path = result['thumbnail_path']
            mime_type = result['mime_type']
            
            return send_file(thumbnail_path, mimetype=mime_type)
            
        except Exception as e:
            logger.error(f"獲取縮略圖異常: {str(e)}")
            return fail_response_result(msg="獲取縮略圖失敗")


@blp.route("/files/<file_id>/stream")
class FileStreamApi(BaseFileView):
    """文件流式访问API"""

    @jwt_required()
    def get(self, file_id):
        """流式访问文件"""
        try:
            user_id = self._get_current_user()
            range_header = request.headers.get('Range')
            
            result, flag = self.fc.stream_file(file_id, range_header, user_id)
            
            if not flag:
                return fail_response_result(msg=str(result))
            
            file_path = result['file_path']
            start = result['start']
            end = result['end']
            content_length = result['content_length']
            file_size = result['file_size']
            mime_type = result['mime_type']
            
            def generate():
                with open(file_path, 'rb') as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining:
                        chunk_size = min(8192, remaining)
                        data = f.read(chunk_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            response = make_response(generate())
            response.headers.update({
                'Content-Type': mime_type,
                'Content-Length': str(content_length),
                'Accept-Ranges': 'bytes',
                'Content-Range': f'bytes {start}-{end}/{file_size}'
            })
            
            if range_header:
                response.status_code = 206  # Partial Content
            else:
                response.status_code = 200
            
            return response
            
        except Exception as e:
            logger.error(f"流式訪問文件異常: {str(e)}")
            return fail_response_result(msg="流式訪問文件失敗")


# ==================== 文件版本接口 ====================

@blp.route("/files/<file_id>/versions")
class FileVersionsApi(BaseFileView):
    """文件版本API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, file_id):
        """获取版本列表"""
        try:
            result, flag = self.fc.get_file_versions(file_id)
            return self._build_response(result, flag, "獲取版本列表成功")
            
        except Exception as e:
            logger.error(f"獲取版本列表異常: {str(e)}")
            return fail_response_result(msg="獲取版本列表失敗")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, file_id):
        """上传新版本"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            if 'file' not in request.files:
                return fail_response_result(msg="沒有上傳文件")
            
            file_obj = request.files['file']
            if file_obj.filename == '':
                return fail_response_result(msg="文件名不能為空")
            
            version_data = {
                'file': file_obj,
                'change_description': request.form.get('change_description'),
                'user_id': user_id
            }
            
            result, flag = self.fc.upload_file_version(file_id, version_data)
            return self._build_response(result, flag, "上傳新版本成功")
            
        except Exception as e:
            logger.error(f"上傳新版本異常: {str(e)}")
            return fail_response_result(msg="上傳新版本失敗")


@blp.route("/files/<file_id>/versions/<int:version>")
class FileVersionDetailApi(BaseFileView):
    """文件版本详情API"""

    @jwt_required()
    def get(self, file_id, version):
        """下载指定版本"""
        try:
            user_id = self._get_current_user()
            result, flag = self.fc.download_file_version(file_id, version, user_id)
            
            if not flag:
                return fail_response_result(msg=str(result))
            
            file_path = result['file_path']
            filename = result['filename']
            mime_type = result['mime_type']
            
            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype=mime_type
            )
            
        except Exception as e:
            logger.error(f"下載版本異常: {str(e)}")
            return fail_response_result(msg="下載版本失敗")


@blp.route("/files/<file_id>/restore/<int:version>")
class FileRestoreApi(BaseFileView):
    """文件恢复API"""

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def post(self, file_id, version):
        """恢复到指定版本"""
        try:
            user_id = self._get_current_user()
            result, flag = self.fc.restore_file_version(file_id, version, user_id)
            return self._build_response(result, flag, "恢復文件版本成功")
            
        except Exception as e:
            logger.error(f"恢復文件版本異常: {str(e)}")
            return fail_response_result(msg="恢復文件版本失敗")


# ==================== 文件分享接口 ====================

@blp.route("/files/<file_id>/share")
class FileShareApi(BaseFileView):
    """文件分享API"""

    @jwt_required()
    @blp.arguments(ShareCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, file_id):
        """创建分享链接"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            payload['user_id'] = user_id
            result, flag = self.fc.create_file_share(file_id, payload)
            return self._build_response(result, flag, "創建分享鏈接成功")
            
        except Exception as e:
            logger.error(f"創建分享鏈接異常: {str(e)}")
            return fail_response_result(msg="創建分享鏈接失敗")


@blp.route("/files/shared/<share_token>")
class SharedFileAccessApi(BaseFileView):
    """共享文件访问API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, share_token):
        """访问分享文件"""
        try:
            password = request.args.get('password')
            result, flag = self.fc.get_file_share(share_token, password)
            return self._build_response(result, flag, "訪問分享文件成功")
            
        except Exception as e:
            logger.error(f"訪問分享文件異常: {str(e)}")
            return fail_response_result(msg="訪問分享文件失敗")
    
    def post(self, share_token):
        """下载分享文件"""
        try:
            password = request.form.get('password')
            result, flag = self.fc.download_shared_file(share_token, password)
            
            if not flag:
                return fail_response_result(msg=str(result))
            
            file_path = result['file_path']
            filename = result['filename']
            mime_type = result['mime_type']
            
            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype=mime_type
            )
            
        except Exception as e:
            logger.error(f"下載分享文件異常: {str(e)}")
            return fail_response_result(msg="下載分享文件失敗")


@blp.route("/shares/<share_id>")
class ShareDetailApi(BaseFileView):
    """分享详情API"""

    @jwt_required()
    @blp.arguments(ShareUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, share_id):
        """更新分享设置"""
        try:
            result, flag = self.fc.update_file_share(share_id, payload)
            return self._build_response(result, flag, "更新分享設置成功")
            
        except Exception as e:
            logger.error(f"更新分享設置異常: {str(e)}")
            return fail_response_result(msg="更新分享設置失敗")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, share_id):
        """删除分享"""
        try:
            result, flag = self.fc.delete_file_share(share_id)
            return self._build_response(result, flag, "刪除分享成功")
            
        except Exception as e:
            logger.error(f"刪除分享異常: {str(e)}")
            return fail_response_result(msg="刪除分享失敗")


# ==================== 文件夹管理接口 ====================

@blp.route("/folders")
class FolderManagementApi(BaseFileView):
    """文件夹管理API"""

    @jwt_required()
    @blp.arguments(FolderCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """创建文件夹"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            payload['user_id'] = user_id
            result, flag = self.fc.create_folder(payload)
            return self._build_response(result, flag, "創建文件夾成功")
            
        except Exception as e:
            logger.error(f"創建文件夾異常: {str(e)}")
            return fail_response_result(msg="創建文件夾失敗")


@blp.route("/folders/<folder_id>")
class FolderDetailApi(BaseFileView):
    """文件夹详情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, folder_id):
        """获取文件夹内容"""
        try:
            page = request.args.get('page', 1, type=int)
            size = request.args.get('size', 20, type=int)
            
            result, flag = self.fc.get_folder_contents(folder_id, page, size)
            return self._build_response(result, flag, "獲取文件夾內容成功")
            
        except Exception as e:
            logger.error(f"獲取文件夾內容異常: {str(e)}")
            return fail_response_result(msg="獲取文件夾內容失敗")

    @jwt_required()
    @blp.arguments(FolderUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, folder_id):
        """更新文件夹"""
        try:
            result, flag = self.fc.update_folder(folder_id, payload)
            return self._build_response(result, flag, "更新文件夾成功")
            
        except Exception as e:
            logger.error(f"更新文件夾異常: {str(e)}")
            return fail_response_result(msg="更新文件夾失敗")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, folder_id):
        """删除文件夹"""
        try:
            user_id = self._get_current_user()
            result, flag = self.fc.delete_folder(folder_id, user_id)
            return self._build_response(result, flag, "刪除文件夾成功")
            
        except Exception as e:
            logger.error(f"刪除文件夾異常: {str(e)}")
            return fail_response_result(msg="刪除文件夾失敗")


# ==================== 项目文件接口 ====================

@blp.route("/projects/<project_id>/files")
class ProjectFilesApi(BaseFileView):
    """项目文件API"""

    @jwt_required()
    @blp.arguments(FileSearchSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, project_id):
        """获取项目文件列表"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            result, flag = self.fc.get_project_files(project_id, query_params, user_id)
            return self._build_response(result, flag, "獲取項目文件列表成功")
            
        except Exception as e:
            logger.error(f"獲取項目文件列表異常: {str(e)}")
            return fail_response_result(msg="獲取項目文件列表失敗")


@blp.route("/projects/<project_id>/storage-usage")
class ProjectStorageUsageApi(BaseFileView):
    """项目存储使用情况API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取存储使用情况"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            result, flag = self.fc.get_project_storage_usage(project_id, user_id)
            return self._build_response(result, flag, "獲取存儲使用情況成功")
            
        except Exception as e:
            logger.error(f"獲取存儲使用情況異常: {str(e)}")
            return fail_response_result(msg="獲取存儲使用情況失敗")


# ==================== 文件转换接口 ====================

@blp.route("/files/<file_id>/convert")
class FileConversionApi(BaseFileView):
    """文件转换API"""

    @jwt_required()
    @blp.arguments(ConversionCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, file_id):
        """文件格式转换"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            payload['user_id'] = user_id
            result, flag = self.fc.create_file_conversion(file_id, payload)
            return self._build_response(result, flag, "文件轉換任務創建成功")
            
        except Exception as e:
            logger.error(f"文件格式轉換異常: {str(e)}")
            return fail_response_result(msg="文件格式轉換失敗")


@blp.route("/files/<file_id>/convert-status")
class FileConversionStatusApi(BaseFileView):
    """文件转换状态API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, file_id):
        """获取转换状态"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            result, flag = self.fc.get_conversion_status(file_id, user_id)
            return self._build_response(result, flag, "獲取轉換狀態成功")
            
        except Exception as e:
            logger.error(f"獲取轉換狀態異常: {str(e)}")
            return fail_response_result(msg="獲取轉換狀態失敗")


@blp.route("/files/<file_id>/convert-result")
class FileConversionResultApi(BaseFileView):
    """文件转换结果API"""

    @jwt_required()
    def get(self, file_id):
        """获取转换结果"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用戶未登錄")
            
            result, flag = self.fc.get_conversion_result(file_id, user_id)
            
            if not flag:
                return fail_response_result(msg=str(result))
            
            # 如果是下载转换结果文件
            if 'file_path' in result:
                file_path = result['file_path']
                filename = result['filename']
                mime_type = result['mime_type']
                
                return send_file(
                    file_path,
                    as_attachment=True,
                    download_name=filename,
                    mimetype=mime_type
                )
            
            return self._build_response(result, flag, "獲取轉換結果成功")
            
        except Exception as e:
            logger.error(f"獲取轉換結果異常: {str(e)}")
            return fail_response_result(msg="獲取轉換結果失敗")


# ==================== 健康检查接口 ====================

@blp.route("/health")
class FileServiceHealthApi(MethodView):
    """文件服务健康检查API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """健康检查"""
        health_data = {
            'status': 'healthy',
            'service': 'file-service',
            'timestamp': CommonTools.get_now(),
            'version': '1.0.0'
        }
        
        issues = []
        
        # 检查数据库连接
        try:
            from dbs.mysql_db import db
            from sqlalchemy import text
            result = db.session.execute(text('SELECT 1'))
            result.fetchone()
            health_data['database'] = 'connected'
        except Exception as db_error:
            logger.error(f"数据库连接检查失敗: {str(db_error)}")
            health_data['database'] = f'error: {str(db_error)}'
            issues.append(f'数据库: {str(db_error)}')
        
        # 检查存储目录
        try:
            from configs.constant import Config
            upload_folder = getattr(Config, 'FILE_UPLOAD_FOLDER', './uploads')
            if os.path.exists(upload_folder) and os.access(upload_folder, os.W_OK):
                health_data['storage'] = 'accessible'
            else:
                health_data['storage'] = 'not_accessible'
                issues.append('存储目录不可访问')
        except Exception as storage_error:
            logger.error(f"存储检查失敗: {str(storage_error)}")
            health_data['storage'] = f'error: {str(storage_error)}'
            issues.append(f'存储: {str(storage_error)}')
        
        # 判断整体健康状态
        if issues:
            health_data['status'] = 'unhealthy'
            health_data['issues'] = issues
            return fail_response_result(content=health_data, msg="服務異常")
        else:
            return response_result(content=health_data, msg="服務正常")


# 错误处理器
@blp.errorhandler(401)
def handle_unauthorized(error):
    """处理401未授权错误"""
    return fail_response_result(msg="未授權訪問，請先登錄")


@blp.errorhandler(403)
def handle_forbidden(error):
    """处理403禁止访问错误"""
    return fail_response_result(msg="禁止訪問，權限不足")


@blp.errorhandler(413)
def handle_request_entity_too_large(error):
    """处理413文件过大错误"""
    return fail_response_result(msg="文件大小超出限制")


@blp.errorhandler(422)
def handle_validation_error(error):
    """处理422验证错误"""
    return fail_response_result(msg="請求參數驗證失敗")


@blp.errorhandler(500)
def handle_internal_error(error):
    """处理500内部错误"""
    logger.error(f"內部服務器錯誤: {str(error)}")
    return fail_response_result(msg="內部服務器錯誤")


# 请求前处理
@blp.before_request
def before_request():
    """请求前处理"""
    # 记录API访问日志（排除健康检查）
    if request.endpoint and not request.endpoint.endswith('health'):
        logger.info(f"文件API訪問: {request.method} {request.path} - IP: {request.remote_addr}")


# 响应后处理
@blp.after_request
def after_request(response):
    """响应后处理"""
    # 添加安全头
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # 添加CORS头
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    
    return response