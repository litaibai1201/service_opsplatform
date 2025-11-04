# -*- coding: utf-8 -*-
"""
@文件: file_serialize.py
@說明: 文件服務序列化器
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate


# ==================== 文件上传相关 ====================

class FileUploadResponseSchema(Schema):
    """文件上传响应Schema"""
    file_id = fields.Str(metadata={"description": "文件ID"})
    name = fields.Str(metadata={"description": "文件名稱"})
    original_name = fields.Str(metadata={"description": "原始文件名"})
    size = fields.Int(metadata={"description": "文件大小(字節)"})
    mime_type = fields.Str(metadata={"description": "MIME類型"})
    uploaded_at = fields.Str(metadata={"description": "上傳時間"})
    duplicate = fields.Bool(metadata={"description": "是否為重複文件"})


class ChunkUploadStartSchema(Schema):
    """分块上传开始Schema"""
    filename = fields.Str(required=True, metadata={"description": "文件名"})
    file_size = fields.Int(required=True, validate=validate.Range(min=1), metadata={"description": "文件總大小"})
    chunk_size = fields.Int(required=True, validate=validate.Range(min=1024, max=10*1024*1024), metadata={"description": "分塊大小"})
    project_id = fields.Str(missing=None, metadata={"description": "項目ID"})
    folder_id = fields.Str(missing=None, metadata={"description": "文件夾ID"})


class ChunkUploadCompleteSchema(Schema):
    """分块上传完成Schema"""
    upload_id = fields.Str(required=True, metadata={"description": "上傳ID"})


class UploadProgressResponseSchema(Schema):
    """上传进度响应Schema"""
    upload_id = fields.Str(metadata={"description": "上傳ID"})
    filename = fields.Str(metadata={"description": "文件名"})
    total_chunks = fields.Int(metadata={"description": "總分塊數"})
    completed_chunks = fields.Int(metadata={"description": "已完成分塊數"})
    progress = fields.Float(metadata={"description": "進度百分比"})
    status = fields.Str(metadata={"description": "上傳狀態"})


# ==================== 文件信息相关 ====================

class FileInfoResponseSchema(Schema):
    """文件信息响应Schema"""
    id = fields.Str(metadata={"description": "文件ID"})
    name = fields.Str(metadata={"description": "文件名稱"})
    original_name = fields.Str(metadata={"description": "原始文件名"})
    size = fields.Int(metadata={"description": "文件大小(字節)"})
    mime_type = fields.Str(metadata={"description": "MIME類型"})
    file_hash = fields.Str(metadata={"description": "文件哈希值"})
    project_id = fields.Str(metadata={"description": "項目ID"})
    folder_id = fields.Str(metadata={"description": "文件夾ID"})
    is_public = fields.Bool(metadata={"description": "是否公開"})
    download_count = fields.Int(metadata={"description": "下載次數"})
    virus_scan_status = fields.Str(metadata={"description": "病毒掃描狀態"})
    uploaded_by = fields.Str(metadata={"description": "上傳者ID"})
    uploaded_at = fields.Str(metadata={"description": "上傳時間"})
    updated_at = fields.Str(metadata={"description": "更新時間"})
    has_thumbnail = fields.Bool(metadata={"description": "是否有縮略圖"})
    has_preview = fields.Bool(metadata={"description": "是否可預覽"})


class FileListResponseSchema(Schema):
    """文件列表响应Schema"""
    files = fields.List(fields.Nested(FileInfoResponseSchema), metadata={"description": "文件列表"})
    total = fields.Int(metadata={"description": "總文件數"})
    page = fields.Int(metadata={"description": "當前頁碼"})
    size = fields.Int(metadata={"description": "每頁數量"})
    total_pages = fields.Int(metadata={"description": "總頁數"})


class FileUpdateSchema(Schema):
    """文件更新Schema"""
    name = fields.Str(missing=None, validate=validate.Length(min=1, max=255), metadata={"description": "文件名稱"})
    folder_id = fields.Str(missing=None, metadata={"description": "文件夾ID"})
    is_public = fields.Bool(missing=None, metadata={"description": "是否公開"})


class FileCopySchema(Schema):
    """文件复制Schema"""
    name = fields.Str(missing=None, validate=validate.Length(min=1, max=255), metadata={"description": "新文件名稱"})
    project_id = fields.Str(missing=None, metadata={"description": "目標項目ID"})
    folder_id = fields.Str(missing=None, metadata={"description": "目標文件夾ID"})


class FileMoveSchema(Schema):
    """文件移动Schema"""
    project_id = fields.Str(missing=None, metadata={"description": "目標項目ID"})
    folder_id = fields.Str(missing=None, metadata={"description": "目標文件夾ID"})


class FileSearchSchema(Schema):
    """文件搜索Schema"""
    keyword = fields.Str(missing=None, metadata={"description": "搜尋關鍵字"})
    mime_type = fields.Str(missing=None, metadata={"description": "MIME類型過濾"})
    page = fields.Int(missing=1, validate=validate.Range(min=1), metadata={"description": "頁碼"})
    size = fields.Int(missing=20, validate=validate.Range(min=1, max=100), metadata={"description": "每頁數量"})
    sort_by = fields.Str(missing='uploaded_at', validate=validate.OneOf(['name', 'size', 'uploaded_at']), metadata={"description": "排序字段"})
    sort_order = fields.Str(missing='desc', validate=validate.OneOf(['asc', 'desc']), metadata={"description": "排序方向"})


# ==================== 文件夹相关 ====================

class FolderCreateSchema(Schema):
    """文件夹创建Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255), metadata={"description": "文件夾名稱"})
    parent_id = fields.Str(missing=None, metadata={"description": "父文件夾ID"})
    project_id = fields.Str(required=True, metadata={"description": "項目ID"})
    description = fields.Str(missing=None, validate=validate.Length(max=500), metadata={"description": "描述"})


class FolderUpdateSchema(Schema):
    """文件夹更新Schema"""
    name = fields.Str(missing=None, validate=validate.Length(min=1, max=255), metadata={"description": "文件夾名稱"})
    parent_id = fields.Str(missing=None, metadata={"description": "父文件夾ID"})
    description = fields.Str(missing=None, validate=validate.Length(max=500), metadata={"description": "描述"})


class FolderResponseSchema(Schema):
    """文件夹响应Schema"""
    id = fields.Str(metadata={"description": "文件夾ID"})
    name = fields.Str(metadata={"description": "文件夾名稱"})
    parent_id = fields.Str(metadata={"description": "父文件夾ID"})
    project_id = fields.Str(metadata={"description": "項目ID"})
    path = fields.Str(metadata={"description": "完整路徑"})
    description = fields.Str(metadata={"description": "描述"})
    created_by = fields.Str(metadata={"description": "創建者ID"})
    created_at = fields.Str(metadata={"description": "創建時間"})
    children_count = fields.Int(metadata={"description": "子文件夾數量"})
    files_count = fields.Int(metadata={"description": "文件數量"})


# ==================== 文件分享相关 ====================

class ShareCreateSchema(Schema):
    """分享创建Schema"""
    password = fields.Str(missing=None, validate=validate.Length(min=4, max=50), metadata={"description": "密碼"})
    expires_at = fields.Str(missing=None, metadata={"description": "過期時間"})
    max_downloads = fields.Int(missing=None, validate=validate.Range(min=1), metadata={"description": "最大下載次數"})
    allow_preview = fields.Bool(missing=True, metadata={"description": "允許預覽"})
    allow_download = fields.Bool(missing=True, metadata={"description": "允許下載"})


class ShareUpdateSchema(Schema):
    """分享更新Schema"""
    password = fields.Str(missing=None, validate=validate.Length(min=4, max=50), metadata={"description": "密碼"})
    expires_at = fields.Str(missing=None, metadata={"description": "過期時間"})
    max_downloads = fields.Int(missing=None, validate=validate.Range(min=1), metadata={"description": "最大下載次數"})
    allow_preview = fields.Bool(missing=None, metadata={"description": "允許預覽"})
    allow_download = fields.Bool(missing=None, metadata={"description": "允許下載"})


class ShareResponseSchema(Schema):
    """分享响应Schema"""
    id = fields.Str(metadata={"description": "分享ID"})
    file_id = fields.Str(metadata={"description": "文件ID"})
    share_token = fields.Str(metadata={"description": "分享令牌"})
    share_url = fields.Str(metadata={"description": "分享鏈接"})
    has_password = fields.Bool(metadata={"description": "是否設置密碼"})
    expires_at = fields.Str(metadata={"description": "過期時間"})
    max_downloads = fields.Int(metadata={"description": "最大下載次數"})
    download_count = fields.Int(metadata={"description": "已下載次數"})
    allow_preview = fields.Bool(metadata={"description": "允許預覽"})
    allow_download = fields.Bool(metadata={"description": "允許下載"})
    created_by = fields.Str(metadata={"description": "創建者ID"})
    created_at = fields.Str(metadata={"description": "創建時間"})


# ==================== 文件版本相关 ====================

class VersionResponseSchema(Schema):
    """版本响应Schema"""
    id = fields.Str(metadata={"description": "版本ID"})
    file_id = fields.Str(metadata={"description": "文件ID"})
    version_number = fields.Int(metadata={"description": "版本號"})
    size = fields.Int(metadata={"description": "版本文件大小"})
    file_hash = fields.Str(metadata={"description": "版本文件哈希"})
    change_description = fields.Str(metadata={"description": "變更描述"})
    uploaded_by = fields.Str(metadata={"description": "上傳者ID"})
    uploaded_at = fields.Str(metadata={"description": "上傳時間"})


class VersionListResponseSchema(Schema):
    """版本列表响应Schema"""
    versions = fields.List(fields.Nested(VersionResponseSchema), metadata={"description": "版本列表"})
    total = fields.Int(metadata={"description": "總版本數"})
    current_version = fields.Int(metadata={"description": "當前版本號"})


# ==================== 文件转换相关 ====================

class ConversionCreateSchema(Schema):
    """转换创建Schema"""
    target_format = fields.Str(required=True, validate=validate.OneOf(['pdf', 'jpg', 'png', 'docx', 'xlsx']), metadata={"description": "目標格式"})
    conversion_params = fields.Dict(missing={}, metadata={"description": "轉換參數"})


class ConversionResponseSchema(Schema):
    """转换响应Schema"""
    id = fields.Str(metadata={"description": "轉換ID"})
    file_id = fields.Str(metadata={"description": "文件ID"})
    target_format = fields.Str(metadata={"description": "目標格式"})
    conversion_status = fields.Str(metadata={"description": "轉換狀態"})
    converted_file_path = fields.Str(metadata={"description": "轉換後文件路徑"})
    converted_file_size = fields.Int(metadata={"description": "轉換後文件大小"})
    error_message = fields.Str(metadata={"description": "錯誤信息"})
    started_at = fields.Str(metadata={"description": "開始時間"})
    completed_at = fields.Str(metadata={"description": "完成時間"})
    requested_by = fields.Str(metadata={"description": "請求者ID"})


# ==================== 存储统计相关 ====================

class StorageUsageResponseSchema(Schema):
    """存储使用情况响应Schema"""
    project_id = fields.Str(metadata={"description": "項目ID"})
    total_files = fields.Int(metadata={"description": "總文件數"})
    total_size = fields.Int(metadata={"description": "總大小(字節)"})
    total_size_formatted = fields.Str(metadata={"description": "格式化後的總大小"})
    file_types = fields.Dict(metadata={"description": "文件類型統計"})
    monthly_usage = fields.List(fields.Dict(), metadata={"description": "月度使用統計"})
    storage_quota = fields.Int(metadata={"description": "存儲配額"})
    usage_percentage = fields.Float(metadata={"description": "使用百分比"})


# ==================== 访问日志相关 ====================

class AccessLogResponseSchema(Schema):
    """访问日志响应Schema"""
    id = fields.Str(metadata={"description": "日誌ID"})
    file_id = fields.Str(metadata={"description": "文件ID"})
    user_id = fields.Str(metadata={"description": "用戶ID"})
    access_type = fields.Str(metadata={"description": "訪問類型"})
    ip_address = fields.Str(metadata={"description": "IP地址"})
    user_agent = fields.Str(metadata={"description": "用戶代理"})
    accessed_at = fields.Str(metadata={"description": "訪問時間"})


class AccessLogListResponseSchema(Schema):
    """访问日志列表响应Schema"""
    logs = fields.List(fields.Nested(AccessLogResponseSchema), metadata={"description": "日誌列表"})
    total = fields.Int(metadata={"description": "總日誌數"})
    page = fields.Int(metadata={"description": "當前頁碼"})
    size = fields.Int(metadata={"description": "每頁數量"})
    total_pages = fields.Int(metadata={"description": "總頁數"})


# ==================== 统计分析相关 ====================

class FileStatisticsResponseSchema(Schema):
    """文件统计响应Schema"""
    total_files = fields.Int(metadata={"description": "總文件數"})
    total_size = fields.Int(metadata={"description": "總大小(字節)"})
    total_downloads = fields.Int(metadata={"description": "總下載數"})
    unique_users = fields.Int(metadata={"description": "唯一用戶數"})
    popular_files = fields.List(fields.Dict(), metadata={"description": "熱門文件"})
    file_type_distribution = fields.Dict(metadata={"description": "文件類型分佈"})
    upload_trend = fields.List(fields.Dict(), metadata={"description": "上傳趨勢"})
    access_trend = fields.List(fields.Dict(), metadata={"description": "訪問趨勢"})


# ==================== 批量操作相关 ====================

class BatchOperationResponseSchema(Schema):
    """批量操作响应Schema"""
    total = fields.Int(metadata={"description": "總操作數"})
    successful = fields.Int(metadata={"description": "成功數"})
    failed = fields.Int(metadata={"description": "失敗數"})
    results = fields.List(fields.Dict(), metadata={"description": "操作結果"})
    errors = fields.List(fields.Dict(), metadata={"description": "錯誤列表"})


class BatchFileDeleteSchema(Schema):
    """批量文件删除Schema"""
    file_ids = fields.List(fields.Str(), required=True, validate=validate.Length(min=1), metadata={"description": "文件ID列表"})


class BatchFileMoveSchema(Schema):
    """批量文件移动Schema"""
    file_ids = fields.List(fields.Str(), required=True, validate=validate.Length(min=1), metadata={"description": "文件ID列表"})
    target_folder_id = fields.Str(missing=None, metadata={"description": "目標文件夾ID"})
    target_project_id = fields.Str(missing=None, metadata={"description": "目標項目ID"})


# ==================== 文件预览相关 ====================

class FilePreviewResponseSchema(Schema):
    """文件预览响应Schema"""
    file_id = fields.Str(metadata={"description": "文件ID"})
    preview_type = fields.Str(metadata={"description": "預覽類型"})
    preview_url = fields.Str(metadata={"description": "預覽URL"})
    preview_content = fields.Str(metadata={"description": "預覽內容"})
    has_preview = fields.Bool(metadata={"description": "是否可預覽"})
    preview_pages = fields.Int(metadata={"description": "預覽頁數"})


# ==================== 安全扫描相关 ====================

class VirusScanResponseSchema(Schema):
    """病毒扫描响应Schema"""
    file_id = fields.Str(metadata={"description": "文件ID"})
    scan_status = fields.Str(metadata={"description": "掃描狀態"})
    scan_result = fields.Str(metadata={"description": "掃描結果"})
    scan_date = fields.Str(metadata={"description": "掃描日期"})
    threat_name = fields.Str(metadata={"description": "威脅名稱"})
    scan_engine = fields.Str(metadata={"description": "掃描引擎"})


# ==================== 文件标签相关 ====================

class FileTagSchema(Schema):
    """文件标签Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=50), metadata={"description": "標籤名稱"})
    color = fields.Str(missing=None, metadata={"description": "標籤顏色"})


class FileTagResponseSchema(Schema):
    """文件标签响应Schema"""
    id = fields.Str(metadata={"description": "標籤ID"})
    name = fields.Str(metadata={"description": "標籤名稱"})
    color = fields.Str(metadata={"description": "標籤顏色"})
    usage_count = fields.Int(metadata={"description": "使用次數"})
    created_at = fields.Str(metadata={"description": "創建時間"})


# ==================== 文件评论相关 ====================

class FileCommentCreateSchema(Schema):
    """文件评论创建Schema"""
    content = fields.Str(required=True, validate=validate.Length(min=1, max=500), metadata={"description": "評論內容"})
    parent_id = fields.Str(missing=None, metadata={"description": "父評論ID"})


class FileCommentResponseSchema(Schema):
    """文件评论响应Schema"""
    id = fields.Str(metadata={"description": "評論ID"})
    file_id = fields.Str(metadata={"description": "文件ID"})
    content = fields.Str(metadata={"description": "評論內容"})
    parent_id = fields.Str(metadata={"description": "父評論ID"})
    author_id = fields.Str(metadata={"description": "作者ID"})
    author_name = fields.Str(metadata={"description": "作者姓名"})
    created_at = fields.Str(metadata={"description": "創建時間"})
    updated_at = fields.Str(metadata={"description": "更新時間"})
    replies = fields.List(fields.Nested('self'), metadata={"description": "回覆列表"})