# -*- coding: utf-8 -*-
"""
@文件: collaboration_serialize.py
@說明: 協作服務序列化Schema (Collaboration Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from marshmallow.validate import OneOf, Length, Range


class CursorPositionSchema(Schema):
    """光標位置Schema"""
    x = fields.Float(required=True, description="X坐標")
    y = fields.Float(required=True, description="Y坐標")
    element_id = fields.String(description="元素ID", allow_none=True)
    line = fields.Integer(description="行號", allow_none=True)
    column = fields.Integer(description="列號", allow_none=True)


class SelectionRangeSchema(Schema):
    """選擇範圍Schema"""
    start_x = fields.Float(required=True, description="起始X坐標")
    start_y = fields.Float(required=True, description="起始Y坐標")
    end_x = fields.Float(required=True, description="結束X坐標")
    end_y = fields.Float(required=True, description="結束Y坐標")
    element_ids = fields.List(fields.String(), description="選中的元素ID列表")
    start_line = fields.Integer(description="起始行號", allow_none=True)
    start_column = fields.Integer(description="起始列號", allow_none=True)
    end_line = fields.Integer(description="結束行號", allow_none=True)
    end_column = fields.Integer(description="結束列號", allow_none=True)


class PermissionsSchema(Schema):
    """權限Schema"""
    can_edit = fields.Boolean(default=True, description="是否可編輯")
    can_comment = fields.Boolean(default=True, description="是否可評論")
    can_view_cursors = fields.Boolean(default=True, description="是否可查看其他用戶光標")
    can_lock_elements = fields.Boolean(default=False, description="是否可鎖定元素")
    role = fields.String(validate=OneOf(['owner', 'editor', 'viewer', 'commenter']), 
                        description="用戶角色")


# ==================== 協作會話管理 ====================

class JoinCollaborationSchema(Schema):
    """加入協作會話Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    document_type = fields.String(
        required=True,
        validate=OneOf(['diagram', 'api_spec', 'db_design', 'flow', 'mind_map']),
        description="文檔類型"
    )
    permissions = fields.Nested(PermissionsSchema, description="用戶權限")


class LeaveCollaborationSchema(Schema):
    """離開協作會話Schema"""
    session_token = fields.String(required=True, validate=Length(min=1), 
                                 description="會話令牌")


class HeartbeatSchema(Schema):
    """心跳Schema"""
    session_token = fields.String(required=True, validate=Length(min=1), 
                                 description="會話令牌")
    cursor_position = fields.Nested(CursorPositionSchema, description="當前光標位置")
    selection_range = fields.Nested(SelectionRangeSchema, description="當前選擇範圍")


# ==================== 實時操作 ====================

class OperationDataSchema(Schema):
    """操作數據Schema"""
    element_id = fields.String(description="操作的元素ID")
    operation_path = fields.String(description="操作路徑")
    old_value = fields.Raw(description="舊值")
    new_value = fields.Raw(description="新值")
    properties = fields.Dict(description="操作屬性")
    metadata = fields.Dict(description="元數據")


class SubmitOperationSchema(Schema):
    """提交操作Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    document_type = fields.String(required=True, validate=Length(min=1, max=50), 
                                description="文檔類型")
    operation_type = fields.String(
        required=True,
        validate=OneOf(['create', 'update', 'delete', 'move', 'resize', 'style', 'content']),
        description="操作類型"
    )
    operation_data = fields.Nested(OperationDataSchema, required=True, description="操作數據")
    client_timestamp = fields.DateTime(description="客戶端時間戳")


class CursorUpdateSchema(Schema):
    """更新光標位置Schema"""
    session_token = fields.String(required=True, validate=Length(min=1), 
                                 description="會話令牌")
    cursor_position = fields.Nested(CursorPositionSchema, required=True, 
                                  description="光標位置")


class SelectionUpdateSchema(Schema):
    """更新選擇範圍Schema"""
    session_token = fields.String(required=True, validate=Length(min=1), 
                                 description="會話令牌")
    selection_range = fields.Nested(SelectionRangeSchema, required=True, 
                                  description="選擇範圍")


# ==================== 衝突解決 ====================

class ConflictResolutionSchema(Schema):
    """衝突解決Schema"""
    resolution_strategy = fields.String(
        required=True,
        validate=OneOf(['accept_mine', 'accept_theirs', 'merge', 'reject']),
        description="解決策略"
    )
    merged_data = fields.Raw(description="合併後的數據")
    reason = fields.String(description="解決原因")


class ResolveConflictSchema(Schema):
    """解決衝突Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    operation_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="操作ID")
    resolution = fields.Nested(ConflictResolutionSchema, required=True, 
                             description="解決方案")


# ==================== 文檔鎖定 ====================

class LockDocumentSchema(Schema):
    """鎖定文檔Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    document_type = fields.String(required=True, validate=Length(min=1, max=50), 
                                description="文檔類型")
    lock_type = fields.String(
        required=True,
        validate=OneOf(['read', 'write', 'exclusive']),
        description="鎖定類型"
    )
    locked_elements = fields.List(fields.String(), description="鎖定的元素ID列表")
    duration_minutes = fields.Integer(
        default=30, 
        validate=Range(min=1, max=1440),
        description="鎖定持續時間(分鐘)"
    )


class UnlockDocumentSchema(Schema):
    """解鎖文檔Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    document_type = fields.String(required=True, validate=Length(min=1, max=50), 
                                description="文檔類型")


# ==================== 協作權限 ====================

class GrantPermissionSchema(Schema):
    """授予權限Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    user_id = fields.String(required=True, validate=Length(min=1, max=36), 
                           description="用戶ID")
    permissions = fields.Nested(PermissionsSchema, required=True, description="權限配置")


class RevokePermissionSchema(Schema):
    """撤銷權限Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    user_id = fields.String(required=True, validate=Length(min=1, max=36), 
                           description="用戶ID")


# ==================== 查詢參數 ====================

class DocumentQuerySchema(Schema):
    """文檔查詢參數Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    document_type = fields.String(validate=Length(min=1, max=50), 
                                description="文檔類型")


class OperationHistoryQuerySchema(Schema):
    """操作歷史查詢Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    document_type = fields.String(required=True, validate=Length(min=1, max=50), 
                                description="文檔類型")
    since_sequence = fields.Integer(description="起始序列號")
    limit = fields.Integer(default=100, validate=Range(min=1, max=1000), 
                         description="返回數量限制")


class StatisticsQuerySchema(Schema):
    """統計查詢Schema"""
    document_id = fields.String(required=True, validate=Length(min=1, max=36), 
                               description="文檔ID")
    document_type = fields.String(required=True, validate=Length(min=1, max=50), 
                                description="文檔類型")
    start_date = fields.Date(description="開始日期")
    end_date = fields.Date(description="結束日期")


# ==================== WebSocket消息Schema ====================

class WebSocketMessageSchema(Schema):
    """WebSocket消息Schema"""
    type = fields.String(
        required=True,
        validate=OneOf([
            'join', 'leave', 'operation', 'cursor', 'selection', 
            'lock', 'unlock', 'conflict', 'heartbeat'
        ]),
        description="消息類型"
    )
    data = fields.Raw(required=True, description="消息數據")
    timestamp = fields.DateTime(description="時間戳")
    user_id = fields.String(description="用戶ID")
    session_token = fields.String(description="會話令牌")


# ==================== 響應Schema ====================

class CollaborationSessionResponseSchema(Schema):
    """協作會話響應Schema"""
    id = fields.String(description="會話ID")
    document_id = fields.String(description="文檔ID")
    document_type = fields.String(description="文檔類型")
    user_id = fields.String(description="用戶ID")
    session_token = fields.String(description="會話令牌")
    cursor_position = fields.Nested(CursorPositionSchema, description="光標位置")
    selection_range = fields.Nested(SelectionRangeSchema, description="選擇範圍")
    user_color = fields.String(description="用戶顏色")
    permissions = fields.Nested(PermissionsSchema, description="用戶權限")
    joined_at = fields.DateTime(description="加入時間")
    last_activity = fields.DateTime(description="最後活動時間")


class OperationLogResponseSchema(Schema):
    """操作日志響應Schema"""
    id = fields.String(description="操作ID")
    document_id = fields.String(description="文檔ID")
    document_type = fields.String(description="文檔類型")
    user_id = fields.String(description="用戶ID")
    operation_type = fields.String(description="操作類型")
    operation_data = fields.Nested(OperationDataSchema, description="操作數據")
    timestamp = fields.DateTime(description="時間戳")
    sequence_number = fields.Integer(description="序列號")
    applied = fields.Boolean(description="是否已應用")
    conflicts_with = fields.List(fields.String(), description="衝突操作ID")
    conflict_resolution = fields.Nested(ConflictResolutionSchema, description="衝突解決")


class DocumentLockResponseSchema(Schema):
    """文檔鎖定響應Schema"""
    id = fields.String(description="鎖定ID")
    document_id = fields.String(description="文檔ID")
    document_type = fields.String(description="文檔類型")
    locked_by = fields.String(description="鎖定用戶")
    lock_type = fields.String(description="鎖定類型")
    locked_elements = fields.List(fields.String(), description="鎖定元素")
    locked_at = fields.DateTime(description="鎖定時間")
    expires_at = fields.DateTime(description="過期時間")


class CollaborationStatisticsResponseSchema(Schema):
    """協作統計響應Schema"""
    id = fields.String(description="統計ID")
    document_id = fields.String(description="文檔ID")
    document_type = fields.String(description="文檔類型")
    date = fields.Date(description="統計日期")
    active_users = fields.Integer(description="活躍用戶數")
    total_operations = fields.Integer(description="總操作數")
    conflicts_resolved = fields.Integer(description="解決的衝突數")
    avg_session_duration = fields.Integer(description="平均會話時長")


class ActiveUsersResponseSchema(Schema):
    """活躍用戶響應Schema"""
    sessions = fields.List(
        fields.Nested(CollaborationSessionResponseSchema),
        description="活躍會話列表"
    )
    total_count = fields.Integer(description="總用戶數")
    last_updated = fields.DateTime(description="最後更新時間")