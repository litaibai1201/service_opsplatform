# -*- coding: utf-8 -*-
"""
@文件: audit_serialize.py
@說明: 審計服務序列化類
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import datetime


class AuditLogQuerySchema(Schema):
    """审计日志查询参数"""
    user_id = fields.Str(allow_none=True, metadata={"description": "用戶ID"})
    action = fields.Str(allow_none=True, metadata={"description": "操作動作"})
    resource_type = fields.Str(allow_none=True, metadata={"description": "資源類型"})
    resource_id = fields.Str(allow_none=True, metadata={"description": "資源ID"})
    result = fields.Str(allow_none=True, validate=validate.OneOf(['success', 'failure', 'error']), metadata={"description": "操作結果"})
    risk_level = fields.Str(allow_none=True, validate=validate.OneOf(['low', 'medium', 'high', 'critical']), metadata={"description": "風險等級"})
    ip_address = fields.Str(allow_none=True, metadata={"description": "IP地址"})
    start_time = fields.Str(allow_none=True, metadata={"description": "開始時間 (YYYY-MM-DD)"})
    end_time = fields.Str(allow_none=True, metadata={"description": "結束時間 (YYYY-MM-DD)"})
    page = fields.Int(missing=1, validate=validate.Range(min=1), metadata={"description": "頁碼"})
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100), metadata={"description": "每頁數量"})
    order_by = fields.Str(missing="timestamp", validate=validate.OneOf(['timestamp', 'action', 'result', 'risk_level']), metadata={"description": "排序字段"})
    order_dir = fields.Str(missing="desc", validate=validate.OneOf(['asc', 'desc']), metadata={"description": "排序方向"})


class AuditLogCreateSchema(Schema):
    """创建审计日志"""
    user_id = fields.Str(allow_none=True, metadata={"description": "用戶ID"})
    session_id = fields.Str(allow_none=True, metadata={"description": "會話ID"})
    action = fields.Str(required=True, validate=validate.Length(min=1, max=100), metadata={"description": "操作動作"})
    resource_type = fields.Str(required=True, validate=validate.Length(min=1, max=50), metadata={"description": "資源類型"})
    resource_id = fields.Str(required=True, validate=validate.Length(min=1, max=36), metadata={"description": "資源ID"})
    old_values = fields.Dict(allow_none=True, metadata={"description": "舊值"})
    new_values = fields.Dict(allow_none=True, metadata={"description": "新值"})
    ip_address = fields.Str(allow_none=True, validate=validate.Length(max=45), metadata={"description": "IP地址"})
    user_agent = fields.Str(allow_none=True, metadata={"description": "用戶代理"})
    request_id = fields.Str(allow_none=True, validate=validate.Length(max=36), metadata={"description": "請求ID"})
    result = fields.Str(required=True, validate=validate.OneOf(['success', 'failure', 'error']), metadata={"description": "操作結果"})
    error_message = fields.Str(allow_none=True, metadata={"description": "錯誤信息"})
    execution_time_ms = fields.Int(allow_none=True, validate=validate.Range(min=0), metadata={"description": "執行時間(毫秒)"})
    risk_level = fields.Str(missing='low', validate=validate.OneOf(['low', 'medium', 'high', 'critical']), metadata={"description": "風險等級"})
    tags = fields.Dict(allow_none=True, metadata={"description": "標籤"})


class AuditLogSearchSchema(Schema):
    """搜索审计日志"""
    query = fields.Str(required=True, validate=validate.Length(min=1), metadata={"description": "搜索關鍵詞"})
    filters = fields.Nested(AuditLogQuerySchema, allow_none=True, metadata={"description": "過濾條件"})
    page = fields.Int(missing=1, validate=validate.Range(min=1), metadata={"description": "頁碼"})
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100), metadata={"description": "每頁數量"})


class SecurityEventQuerySchema(Schema):
    """安全事件查询参数"""
    event_type = fields.Str(allow_none=True, metadata={"description": "事件類型"})
    severity = fields.Str(allow_none=True, validate=validate.OneOf(['low', 'medium', 'high', 'critical']), metadata={"description": "嚴重程度"})
    event_status = fields.Str(allow_none=True, validate=validate.OneOf(['open', 'investigating', 'resolved', 'false_positive']), metadata={"description": "事件狀態"})
    assigned_to = fields.Str(allow_none=True, metadata={"description": "分配給"})
    user_id = fields.Str(allow_none=True, metadata={"description": "用戶ID"})
    start_time = fields.Str(allow_none=True, metadata={"description": "開始時間 (YYYY-MM-DD)"})
    end_time = fields.Str(allow_none=True, metadata={"description": "結束時間 (YYYY-MM-DD)"})
    page = fields.Int(missing=1, validate=validate.Range(min=1), metadata={"description": "頁碼"})
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100), metadata={"description": "每頁數量"})


class SecurityEventCreateSchema(Schema):
    """创建安全事件"""
    event_type = fields.Str(required=True, validate=validate.Length(min=1, max=100), metadata={"description": "事件類型"})
    severity = fields.Str(required=True, validate=validate.OneOf(['low', 'medium', 'high', 'critical']), metadata={"description": "嚴重程度"})
    user_id = fields.Str(allow_none=True, metadata={"description": "用戶ID"})
    ip_address = fields.Str(allow_none=True, validate=validate.Length(max=45), metadata={"description": "IP地址"})
    details = fields.Dict(required=True, metadata={"description": "事件詳情"})
    status = fields.Str(missing='open', validate=validate.OneOf(['open', 'investigating', 'resolved', 'false_positive']), metadata={"description": "事件狀態"})
    assigned_to = fields.Str(allow_none=True, metadata={"description": "分配給"})


class SecurityEventInvestigateSchema(Schema):
    """开始调查安全事件"""
    assigned_to = fields.Str(required=True, validate=validate.Length(min=1), metadata={"description": "分配給"})


class SecurityEventResolveSchema(Schema):
    """解决安全事件"""
    resolution_notes = fields.Str(required=True, validate=validate.Length(min=1), metadata={"description": "解決備註"})


class SecurityEventAssignSchema(Schema):
    """分配安全事件"""
    assigned_to = fields.Str(required=True, validate=validate.Length(min=1), metadata={"description": "分配給"})


class ComplianceReportQuerySchema(Schema):
    """合规报告查询参数"""
    report_type = fields.Str(allow_none=True, metadata={"description": "報告類型"})
    report_status = fields.Str(allow_none=True, validate=validate.OneOf(['generating', 'completed', 'failed']), metadata={"description": "報告狀態"})
    generated_by = fields.Str(allow_none=True, metadata={"description": "生成者"})
    page = fields.Int(missing=1, validate=validate.Range(min=1), metadata={"description": "頁碼"})
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100), metadata={"description": "每頁數量"})


class ComplianceReportGenerateSchema(Schema):
    """生成合规报告"""
    report_type = fields.Str(required=True, validate=validate.Length(min=1, max=100), metadata={"description": "報告類型"})
    report_name = fields.Str(required=True, validate=validate.Length(min=1, max=255), metadata={"description": "報告名稱"})
    period_start = fields.Str(required=True, metadata={"description": "期間開始 (YYYY-MM-DD)"})
    period_end = fields.Str(required=True, metadata={"description": "期間結束 (YYYY-MM-DD)"})
    generated_by = fields.Str(required=True, validate=validate.Length(min=1), metadata={"description": "生成者"})
    
    @validates_schema
    def validate_date_range(self, data, **kwargs):
        """验证日期范围"""
        try:
            start_date = datetime.strptime(data['period_start'], '%Y-%m-%d')
            end_date = datetime.strptime(data['period_end'], '%Y-%m-%d')
            if start_date > end_date:
                raise ValidationError("開始日期不能大於結束日期")
        except ValueError:
            raise ValidationError("日期格式錯誤，請使用 YYYY-MM-DD 格式")


class AuditConfigQuerySchema(Schema):
    """审计配置查询参数"""
    service_name = fields.Str(allow_none=True, metadata={"description": "服務名稱"})


class AuditConfigUpdateSchema(Schema):
    """更新审计配置"""
    is_enabled = fields.Bool(allow_none=True, metadata={"description": "是否啟用"})
    log_level = fields.Str(allow_none=True, validate=validate.OneOf(['basic', 'detailed', 'full']), metadata={"description": "日誌級別"})
    include_request_data = fields.Bool(allow_none=True, metadata={"description": "包含請求數據"})
    include_response_data = fields.Bool(allow_none=True, metadata={"description": "包含響應數據"})
    retention_days = fields.Int(allow_none=True, validate=validate.Range(min=1, max=3650), metadata={"description": "保留天數"})


class RetentionPolicyUpdateSchema(Schema):
    """更新数据保留策略"""
    retention_days = fields.Int(allow_none=True, validate=validate.Range(min=1, max=3650), metadata={"description": "保留天數"})
    archive_after_days = fields.Int(allow_none=True, validate=validate.Range(min=1, max=3650), metadata={"description": "歸檔天數"})
    auto_delete = fields.Bool(allow_none=True, metadata={"description": "自動刪除"})
    policy_description = fields.Str(allow_none=True, metadata={"description": "策略描述"})
    is_active = fields.Bool(allow_none=True, metadata={"description": "是否啟用"})


class AuditExportSchema(Schema):
    """导出审计日志"""
    task_name = fields.Str(allow_none=True, validate=validate.Length(max=255), metadata={"description": "任務名稱"})
    export_type = fields.Str(missing='csv', validate=validate.OneOf(['csv', 'excel', 'json', 'pdf']), metadata={"description": "導出類型"})
    filters = fields.Nested(AuditLogQuerySchema, allow_none=True, metadata={"description": "過濾條件"})
    export_fields = fields.List(fields.Str(), allow_none=True, metadata={"description": "導出字段"})
    created_by = fields.Str(required=True, validate=validate.Length(min=1), metadata={"description": "創建者"})


class AuditStatisticsQuerySchema(Schema):
    """审计统计查询参数"""
    start_time = fields.Str(allow_none=True, metadata={"description": "開始時間 (YYYY-MM-DD)"})
    end_time = fields.Str(allow_none=True, metadata={"description": "結束時間 (YYYY-MM-DD)"})
    resource_type = fields.Str(allow_none=True, metadata={"description": "資源類型"})
    action = fields.Str(allow_none=True, metadata={"description": "操作動作"})


# ==================== 響應 Schema ====================

class AuditLogResponseSchema(Schema):
    """审计日志响应"""
    id = fields.Str(metadata={"description": "審計日誌ID"})
    user_id = fields.Str(allow_none=True, metadata={"description": "用戶ID"})
    session_id = fields.Str(allow_none=True, metadata={"description": "會話ID"})
    action = fields.Str(metadata={"description": "操作動作"})
    resource_type = fields.Str(metadata={"description": "資源類型"})
    resource_id = fields.Str(metadata={"description": "資源ID"})
    old_values = fields.Dict(allow_none=True, metadata={"description": "舊值"})
    new_values = fields.Dict(allow_none=True, metadata={"description": "新值"})
    ip_address = fields.Str(allow_none=True, metadata={"description": "IP地址"})
    user_agent = fields.Str(allow_none=True, metadata={"description": "用戶代理"})
    request_id = fields.Str(allow_none=True, metadata={"description": "請求ID"})
    result = fields.Str(metadata={"description": "操作結果"})
    error_message = fields.Str(allow_none=True, metadata={"description": "錯誤信息"})
    execution_time_ms = fields.Int(allow_none=True, metadata={"description": "執行時間(毫秒)"})
    risk_level = fields.Str(metadata={"description": "風險等級"})
    tags = fields.Dict(allow_none=True, metadata={"description": "標籤"})
    timestamp = fields.Str(metadata={"description": "時間戳"})


class SecurityEventResponseSchema(Schema):
    """安全事件响应"""
    id = fields.Str(metadata={"description": "安全事件ID"})
    event_type = fields.Str(metadata={"description": "事件類型"})
    severity = fields.Str(metadata={"description": "嚴重程度"})
    user_id = fields.Str(allow_none=True, metadata={"description": "用戶ID"})
    ip_address = fields.Str(allow_none=True, metadata={"description": "IP地址"})
    details = fields.Dict(metadata={"description": "事件詳情"})
    status = fields.Str(metadata={"description": "事件狀態"})
    assigned_to = fields.Str(allow_none=True, metadata={"description": "分配給"})
    resolution_notes = fields.Str(allow_none=True, metadata={"description": "解決備註"})
    resolved_at = fields.Str(allow_none=True, metadata={"description": "解決時間"})
    created_at = fields.Str(metadata={"description": "創建時間"})
    updated_at = fields.Str(allow_none=True, metadata={"description": "更新時間"})


class ComplianceReportResponseSchema(Schema):
    """合规报告响应"""
    id = fields.Str(metadata={"description": "合規報告ID"})
    report_type = fields.Str(metadata={"description": "報告類型"})
    report_name = fields.Str(metadata={"description": "報告名稱"})
    period_start = fields.Str(metadata={"description": "期間開始"})
    period_end = fields.Str(metadata={"description": "期間結束"})
    status = fields.Str(metadata={"description": "報告狀態"})
    file_path = fields.Str(allow_none=True, metadata={"description": "文件路徑"})
    generated_by = fields.Str(metadata={"description": "生成者"})
    generated_at = fields.Str(metadata={"description": "生成時間"})


class AuditConfigResponseSchema(Schema):
    """审计配置响应"""
    id = fields.Str(metadata={"description": "配置ID"})
    service_name = fields.Str(metadata={"description": "服務名稱"})
    action_type = fields.Str(metadata={"description": "操作類型"})
    is_enabled = fields.Bool(metadata={"description": "是否啟用"})
    log_level = fields.Str(metadata={"description": "日誌級別"})
    include_request_data = fields.Bool(metadata={"description": "包含請求數據"})
    include_response_data = fields.Bool(metadata={"description": "包含響應數據"})
    retention_days = fields.Int(metadata={"description": "保留天數"})
    created_at = fields.Str(metadata={"description": "創建時間"})


class RetentionPolicyResponseSchema(Schema):
    """数据保留策略响应"""
    id = fields.Str(metadata={"description": "策略ID"})
    resource_type = fields.Str(metadata={"description": "資源類型"})
    retention_days = fields.Int(metadata={"description": "保留天數"})
    archive_after_days = fields.Int(allow_none=True, metadata={"description": "歸檔天數"})
    auto_delete = fields.Bool(metadata={"description": "自動刪除"})
    policy_description = fields.Str(allow_none=True, metadata={"description": "策略描述"})
    is_active = fields.Bool(metadata={"description": "是否啟用"})
    created_by = fields.Str(metadata={"description": "創建者"})
    created_at = fields.Str(metadata={"description": "創建時間"})


class AuditStatisticsResponseSchema(Schema):
    """审计统计响应"""
    summary = fields.Dict(metadata={"description": "統計摘要"})
    generated_at = fields.Str(metadata={"description": "生成時間"})


class ExportTaskResponseSchema(Schema):
    """导出任务响应"""
    task_id = fields.Str(metadata={"description": "任務ID"})
    task_name = fields.Str(metadata={"description": "任務名稱"})
    status = fields.Str(metadata={"description": "任務狀態"})
    created_at = fields.Str(metadata={"description": "創建時間"})