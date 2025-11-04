# -*- coding: utf-8 -*-
"""
@文件: feature_map_serialize.py
@說明: 功能導圖序列化 (Feature Map Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from typing import Dict, Any


# ==================== 基礎Schema ====================

class NodeSchema(Schema):
    """節點Schema"""
    id = fields.Str(metadata={"description": "節點ID"})
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200), metadata={"description": "節點標題"})
    description = fields.Str(allow_none=True, validate=validate.Length(max=1000), metadata={"description": "節點描述"})
    type = fields.Str(validate=validate.OneOf(["epic", "feature", "story", "task", "bug"]), metadata={"description": "節點類型"})
    status = fields.Str(validate=validate.OneOf(["planned", "in_progress", "completed", "blocked", "cancelled"]), 
                        load_default="planned", metadata={"description": "節點狀態"})
    priority = fields.Str(validate=validate.OneOf(["critical", "high", "medium", "low"]), 
                         load_default="medium", metadata={"description": "優先級"})
    complexity = fields.Int(validate=validate.Range(min=1, max=10), load_default=5, metadata={"description": "複雜度"})
    assignee = fields.Str(allow_none=True, metadata={"description": "負責人"})
    estimated_hours = fields.Float(validate=validate.Range(min=0), load_default=0, metadata={"description": "預估工時"})
    actual_hours = fields.Float(validate=validate.Range(min=0), load_default=0, metadata={"description": "實際工時"})
    tags = fields.List(fields.Str(), load_default=list, metadata={"description": "標籤列表"})
    acceptance_criteria = fields.List(fields.Str(), load_default=list, metadata={"description": "驗收標準"})
    dependencies = fields.List(fields.Str(), load_default=list, metadata={"description": "依賴項"})
    attachments = fields.List(fields.Str(), load_default=list, metadata={"description": "附件列表"})
    comments = fields.List(fields.Dict(), load_default=list, metadata={"description": "評論列表"})
    due_date = fields.DateTime(allow_none=True, metadata={"description": "截止日期"})
    start_date = fields.DateTime(allow_none=True, metadata={"description": "開始日期"})
    progress = fields.Float(validate=validate.Range(min=0, max=100), load_default=0, metadata={"description": "進度百分比"})
    children = fields.List(fields.Nested(lambda: NodeSchema()), load_default=list, metadata={"description": "子節點"})


class MindMapSchema(Schema):
    """思維導圖Schema"""
    root = fields.Nested(NodeSchema, required=True, metadata={"description": "根節點"})


class MetricsSchema(Schema):
    """統計數據Schema"""
    total_features = fields.Int(load_default=0, metadata={"description": "總功能數"})
    completed_features = fields.Int(load_default=0, metadata={"description": "已完成功能數"})
    total_estimated_hours = fields.Float(load_default=0, metadata={"description": "總預估工時"})
    total_actual_hours = fields.Float(load_default=0, metadata={"description": "總實際工時"})
    progress_percentage = fields.Float(load_default=0, metadata={"description": "完成百分比"})
    velocity = fields.Float(load_default=0, metadata={"description": "開發速度"})


class IntegrationSchema(Schema):
    """集成配置Schema"""
    jira_project_key = fields.Str(allow_none=True, metadata={"description": "Jira項目鍵"})
    github_repo = fields.Str(allow_none=True, metadata={"description": "GitHub倉庫"})
    sync_enabled = fields.Bool(load_default=False, metadata={"description": "是否啟用同步"})
    last_sync = fields.DateTime(allow_none=True, metadata={"description": "最後同步時間"})


# ==================== 請求Schema ====================

class FeatureMapCreateSchema(Schema):
    """創建功能導圖請求Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100), metadata={"description": "功能導圖名稱"})
    description = fields.Str(allow_none=True, validate=validate.Length(max=500), metadata={"description": "功能導圖描述"})
    type = fields.Str(required=True, validate=validate.OneOf(["feature_breakdown", "requirement_analysis", "task_planning", "roadmap"]),
                     metadata={"description": "功能導圖類型"})
    mind_map = fields.Nested(MindMapSchema, allow_none=True, metadata={"description": "思維導圖數據"})


class FeatureMapUpdateSchema(Schema):
    """更新功能導圖請求Schema"""
    name = fields.Str(validate=validate.Length(min=1, max=100), metadata={"description": "功能導圖名稱"})
    description = fields.Str(allow_none=True, validate=validate.Length(max=500), metadata={"description": "功能導圖描述"})
    type = fields.Str(validate=validate.OneOf(["feature_breakdown", "requirement_analysis", "task_planning", "roadmap"]),
                     metadata={"description": "功能導圖類型"})
    mind_map = fields.Nested(MindMapSchema, allow_none=True, metadata={"description": "思維導圖數據"})
    integration = fields.Nested(IntegrationSchema, allow_none=True, metadata={"description": "集成配置"})


class FeatureMapQuerySchema(Schema):
    """功能導圖查詢請求Schema"""
    page = fields.Int(load_default=1, validate=validate.Range(min=1), metadata={"description": "頁碼"})
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=100), metadata={"description": "每頁數量"})
    type = fields.Str(validate=validate.OneOf(["feature_breakdown", "requirement_analysis", "task_planning", "roadmap"]),
                     metadata={"description": "功能導圖類型過濾"})


class FeatureMapDuplicateSchema(Schema):
    """複製功能導圖請求Schema"""
    new_name = fields.Str(required=True, validate=validate.Length(min=1, max=100), metadata={"description": "新功能導圖名稱"})


class NodeCreateSchema(Schema):
    """創建節點請求Schema"""
    parent_node_id = fields.Str(required=True, metadata={"description": "父節點ID"})
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200), metadata={"description": "節點標題"})
    description = fields.Str(allow_none=True, validate=validate.Length(max=1000), metadata={"description": "節點描述"})
    type = fields.Str(validate=validate.OneOf(["epic", "feature", "story", "task", "bug"]), 
                     load_default="feature", metadata={"description": "節點類型"})
    status = fields.Str(validate=validate.OneOf(["planned", "in_progress", "completed", "blocked", "cancelled"]), 
                       load_default="planned", metadata={"description": "節點狀態"})
    priority = fields.Str(validate=validate.OneOf(["critical", "high", "medium", "low"]), 
                         load_default="medium", metadata={"description": "優先級"})
    complexity = fields.Int(validate=validate.Range(min=1, max=10), load_default=5, metadata={"description": "複雜度"})
    assignee = fields.Str(allow_none=True, metadata={"description": "負責人"})
    estimated_hours = fields.Float(validate=validate.Range(min=0), load_default=0, metadata={"description": "預估工時"})
    tags = fields.List(fields.Str(), load_default=list, metadata={"description": "標籤列表"})
    acceptance_criteria = fields.List(fields.Str(), load_default=list, metadata={"description": "驗收標準"})
    due_date = fields.DateTime(allow_none=True, metadata={"description": "截止日期"})
    start_date = fields.DateTime(allow_none=True, metadata={"description": "開始日期"})


class NodeUpdateSchema(Schema):
    """更新節點請求Schema"""
    title = fields.Str(validate=validate.Length(min=1, max=200), metadata={"description": "節點標題"})
    description = fields.Str(allow_none=True, validate=validate.Length(max=1000), metadata={"description": "節點描述"})
    type = fields.Str(validate=validate.OneOf(["epic", "feature", "story", "task", "bug"]), metadata={"description": "節點類型"})
    status = fields.Str(validate=validate.OneOf(["planned", "in_progress", "completed", "blocked", "cancelled"]), 
                       metadata={"description": "節點狀態"})
    priority = fields.Str(validate=validate.OneOf(["critical", "high", "medium", "low"]), metadata={"description": "優先級"})
    complexity = fields.Int(validate=validate.Range(min=1, max=10), metadata={"description": "複雜度"})
    assignee = fields.Str(allow_none=True, metadata={"description": "負責人"})
    estimated_hours = fields.Float(validate=validate.Range(min=0), metadata={"description": "預估工時"})
    actual_hours = fields.Float(validate=validate.Range(min=0), metadata={"description": "實際工時"})
    tags = fields.List(fields.Str(), metadata={"description": "標籤列表"})
    acceptance_criteria = fields.List(fields.Str(), metadata={"description": "驗收標準"})
    dependencies = fields.List(fields.Str(), metadata={"description": "依賴項"})
    attachments = fields.List(fields.Str(), metadata={"description": "附件列表"})
    due_date = fields.DateTime(allow_none=True, metadata={"description": "截止日期"})
    start_date = fields.DateTime(allow_none=True, metadata={"description": "開始日期"})
    progress = fields.Float(validate=validate.Range(min=0, max=100), metadata={"description": "進度百分比"})


class NodeMoveSchema(Schema):
    """移動節點請求Schema"""
    new_parent_id = fields.Str(required=True, metadata={"description": "新父節點ID"})
    position = fields.Int(load_default=-1, validate=validate.Range(min=-1), metadata={"description": "位置索引，-1表示末尾"})


class NodeAssignSchema(Schema):
    """分配節點請求Schema"""
    assignee = fields.Str(required=True, metadata={"description": "負責人ID"})


class DependencyCreateSchema(Schema):
    """創建依賴關係請求Schema"""
    source_feature_id = fields.Str(required=True, metadata={"description": "源功能ID"})
    target_feature_id = fields.Str(required=True, metadata={"description": "目標功能ID"})
    dependency_type = fields.Str(required=True, validate=validate.OneOf(["blocks", "requires", "related"]),
                                metadata={"description": "依賴類型"})
    description = fields.Str(allow_none=True, validate=validate.Length(max=500), metadata={"description": "依賴描述"})


class ExportSchema(Schema):
    """導出請求Schema"""
    format = fields.Str(required=True, validate=validate.OneOf(["json", "csv", "xlsx", "pdf"]),
                       metadata={"description": "導出格式"})
    include_completed = fields.Bool(load_default=True, metadata={"description": "是否包含已完成項"})
    include_cancelled = fields.Bool(load_default=False, metadata={"description": "是否包含已取消項"})


class GanttExportSchema(Schema):
    """甘特圖導出請求Schema"""
    format = fields.Str(load_default="png", validate=validate.OneOf(["png", "pdf", "svg"]),
                       metadata={"description": "導出格式"})
    start_date = fields.DateTime(allow_none=True, metadata={"description": "開始日期"})
    end_date = fields.DateTime(allow_none=True, metadata={"description": "結束日期"})
    show_dependencies = fields.Bool(load_default=True, metadata={"description": "是否顯示依賴關係"})


class RoadmapExportSchema(Schema):
    """路線圖導出請求Schema"""
    format = fields.Str(load_default="png", validate=validate.OneOf(["png", "pdf", "svg"]),
                       metadata={"description": "導出格式"})
    time_period = fields.Str(load_default="quarter", validate=validate.OneOf(["month", "quarter", "year"]),
                            metadata={"description": "時間週期"})
    show_milestones = fields.Bool(load_default=True, metadata={"description": "是否顯示里程碑"})


class SyncJiraSchema(Schema):
    """同步Jira請求Schema"""
    project_key = fields.Str(required=True, validate=validate.Length(min=1, max=20), metadata={"description": "Jira項目鍵"})
    sync_type = fields.Str(load_default="two_way", validate=validate.OneOf(["import", "export", "two_way"]),
                          metadata={"description": "同步類型"})
    issue_types = fields.List(fields.Str(), load_default=["Epic", "Story", "Task", "Bug"],
                             metadata={"description": "同步的問題類型"})


class SyncGithubSchema(Schema):
    """同步GitHub請求Schema"""
    repo = fields.Str(required=True, validate=validate.Length(min=1, max=100), metadata={"description": "GitHub倉庫"})
    sync_type = fields.Str(load_default="import", validate=validate.OneOf(["import", "export"]),
                          metadata={"description": "同步類型"})
    include_issues = fields.Bool(load_default=True, metadata={"description": "是否包含Issues"})
    include_milestones = fields.Bool(load_default=True, metadata={"description": "是否包含Milestones"})


# ==================== 響應Schema ====================

class FeatureMapResponseSchema(Schema):
    """功能導圖響應Schema"""
    _id = fields.Str(metadata={"description": "功能導圖ID"})
    project_id = fields.Str(metadata={"description": "項目ID"})
    name = fields.Str(metadata={"description": "功能導圖名稱"})
    description = fields.Str(metadata={"description": "功能導圖描述"})
    type = fields.Str(metadata={"description": "功能導圖類型"})
    mind_map = fields.Nested(MindMapSchema, metadata={"description": "思維導圖數據"})
    metrics = fields.Nested(MetricsSchema, metadata={"description": "統計數據"})
    integration = fields.Nested(IntegrationSchema, metadata={"description": "集成配置"})
    created_by = fields.Str(metadata={"description": "創建者"})
    created_at = fields.Str(metadata={"description": "創建時間"})
    updated_at = fields.Str(metadata={"description": "更新時間"})


class FeatureMapListResponseSchema(Schema):
    """功能導圖列表響應Schema"""
    feature_maps = fields.List(fields.Nested(FeatureMapResponseSchema), metadata={"description": "功能導圖列表"})
    total = fields.Int(metadata={"description": "總數"})
    page = fields.Int(metadata={"description": "當前頁"})
    limit = fields.Int(metadata={"description": "每頁數量"})
    total_pages = fields.Int(metadata={"description": "總頁數"})


class NodeResponseSchema(Schema):
    """節點響應Schema"""
    node_id = fields.Str(metadata={"description": "節點ID"})
    node_data = fields.Nested(NodeSchema, metadata={"description": "節點數據"})


class DependencyResponseSchema(Schema):
    """依賴關係響應Schema"""
    _id = fields.Str(metadata={"description": "依賴關係ID"})
    feature_map_id = fields.Str(metadata={"description": "功能導圖ID"})
    source_feature_id = fields.Str(metadata={"description": "源功能ID"})
    target_feature_id = fields.Str(metadata={"description": "目標功能ID"})
    dependency_type = fields.Str(metadata={"description": "依賴類型"})
    description = fields.Str(metadata={"description": "依賴描述"})
    created_at = fields.Str(metadata={"description": "創建時間"})


class DependencyGraphResponseSchema(Schema):
    """依賴圖響應Schema"""
    nodes = fields.List(fields.Dict(), metadata={"description": "節點列表"})
    edges = fields.List(fields.Dict(), metadata={"description": "邊列表"})


class ProgressReportResponseSchema(Schema):
    """進度報告響應Schema"""
    overall_progress = fields.Float(metadata={"description": "總體進度"})
    feature_breakdown = fields.Dict(metadata={"description": "功能分解"})
    milestone_progress = fields.List(fields.Dict(), metadata={"description": "里程碑進度"})
    velocity_trend = fields.List(fields.Dict(), metadata={"description": "速度趨勢"})
    risk_analysis = fields.Dict(metadata={"description": "風險分析"})


class VelocityResponseSchema(Schema):
    """開發速度響應Schema"""
    current_velocity = fields.Float(metadata={"description": "當前速度"})
    average_velocity = fields.Float(metadata={"description": "平均速度"})
    velocity_history = fields.List(fields.Dict(), metadata={"description": "速度歷史"})
    sprint_burndown = fields.List(fields.Dict(), metadata={"description": "Sprint燃盡"})


class BurndownResponseSchema(Schema):
    """燃盡圖響應Schema"""
    ideal_line = fields.List(fields.Dict(), metadata={"description": "理想線"})
    actual_line = fields.List(fields.Dict(), metadata={"description": "實際線"})
    remaining_work = fields.Float(metadata={"description": "剩餘工作量"})
    completion_forecast = fields.Str(metadata={"description": "預計完成時間"})


class ExportResponseSchema(Schema):
    """導出響應Schema"""
    download_url = fields.Str(metadata={"description": "下載鏈接"})
    file_name = fields.Str(metadata={"description": "文件名"})
    file_size = fields.Int(metadata={"description": "文件大小"})
    export_format = fields.Str(metadata={"description": "導出格式"})
    generated_at = fields.Str(metadata={"description": "生成時間"})


class SyncStatusResponseSchema(Schema):
    """同步狀態響應Schema"""
    sync_enabled = fields.Bool(metadata={"description": "是否啟用同步"})
    last_sync = fields.Str(metadata={"description": "最後同步時間"})
    sync_status = fields.Str(metadata={"description": "同步狀態"})
    jira_status = fields.Dict(metadata={"description": "Jira同步狀態"})
    github_status = fields.Dict(metadata={"description": "GitHub同步狀態"})
    errors = fields.List(fields.Str(), metadata={"description": "錯誤列表"})


class HistoryResponseSchema(Schema):
    """歷史記錄響應Schema"""
    history = fields.List(fields.Dict(), metadata={"description": "歷史記錄列表"})
    total = fields.Int(metadata={"description": "總數"})
    page = fields.Int(metadata={"description": "當前頁"})
    limit = fields.Int(metadata={"description": "每頁數量"})