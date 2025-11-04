# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 審計服務相關數據模型表
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


class AuditLogModel(BaseModel):
    """审计日志模型"""
    __tablename__ = "audit_logs"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="審計日誌ID")
    user_id = db.Column(db.String(36), comment="用戶ID")
    session_id = db.Column(db.String(36), comment="會話ID")
    action = db.Column(db.String(100), nullable=False, comment="操作動作")
    resource_type = db.Column(db.String(50), nullable=False, comment="資源類型")
    resource_id = db.Column(db.String(36), nullable=False, comment="資源ID")
    old_values = db.Column(db.JSON, comment="舊值")
    new_values = db.Column(db.JSON, comment="新值")
    ip_address = db.Column(db.String(45), comment="IP地址")
    user_agent = db.Column(db.Text, comment="用戶代理")
    request_id = db.Column(db.String(36), comment="請求ID")
    result = db.Column(
        db.Enum("success", "failure", "error", name="audit_result"), 
        nullable=False, 
        comment="操作結果"
    )
    error_message = db.Column(db.Text, comment="錯誤信息")
    execution_time_ms = db.Column(db.Integer, comment="執行時間(毫秒)")
    risk_level = db.Column(
        db.Enum("low", "medium", "high", "critical", name="risk_level"),
        default="low",
        comment="風險等級"
    )
    tags = db.Column(db.JSON, comment="標籤")
    timestamp = db.Column(db.String(19), default=CommonTools.get_now, comment="時間戳")

    # 索引
    __table_args__ = (
        db.Index('idx_user', 'user_id'),
        db.Index('idx_resource', 'resource_type', 'resource_id'),
        db.Index('idx_action', 'action'),
        db.Index('idx_timestamp', 'timestamp'),
        db.Index('idx_result', 'result'),
        db.Index('idx_risk_level', 'risk_level'),
    )


class SecurityEventModel(BaseMixinModel):
    """安全事件模型"""
    __tablename__ = "security_events"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="安全事件ID")
    event_type = db.Column(db.String(100), nullable=False, comment="事件類型")
    severity = db.Column(
        db.Enum("low", "medium", "high", "critical", name="event_severity"),
        nullable=False,
        comment="嚴重程度"
    )
    user_id = db.Column(db.String(36), comment="用戶ID")
    ip_address = db.Column(db.String(45), comment="IP地址")
    details = db.Column(db.JSON, nullable=False, comment="事件詳情")
    status = db.Column(
        db.Enum("open", "investigating", "resolved", "false_positive", name="event_status"),
        default="open",
        comment="事件狀態"
    )
    assigned_to = db.Column(db.String(36), comment="分配給")
    resolution_notes = db.Column(db.Text, comment="解決備註")
    resolved_at = db.Column(db.String(19), comment="解決時間")

    # 索引
    __table_args__ = (
        db.Index('idx_type', 'event_type'),
        db.Index('idx_severity', 'severity'),
        db.Index('idx_status', 'status'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_assigned', 'assigned_to'),
    )


class ComplianceReportModel(BaseModel):
    """合规报告模型"""
    __tablename__ = "compliance_reports"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="合規報告ID")
    report_type = db.Column(db.String(100), nullable=False, comment="報告類型")
    report_name = db.Column(db.String(255), nullable=False, comment="報告名稱")
    period_start = db.Column(db.Date, nullable=False, comment="期間開始")
    period_end = db.Column(db.Date, nullable=False, comment="期間結束")
    report_data = db.Column(db.JSON, nullable=False, comment="報告數據")
    file_path = db.Column(db.String(500), comment="文件路徑")
    report_status = db.Column(
        db.Enum("generating", "completed", "failed", name="report_status"),
        default="generating",
        comment="報告狀態"
    )
    generated_by = db.Column(db.String(36), nullable=False, comment="生成者")
    generated_at = db.Column(db.String(19), default=CommonTools.get_now, comment="生成時間")

    # 索引
    __table_args__ = (
        db.Index('idx_type_period', 'report_type', 'period_start', 'period_end'),
        db.Index('idx_status', 'report_status'),
        db.Index('idx_generated_by', 'generated_by'),
    )


class DataRetentionPolicyModel(BaseModel):
    """数据保留策略模型"""
    __tablename__ = "data_retention_policies"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="策略ID")
    resource_type = db.Column(db.String(100), nullable=False, unique=True, comment="資源類型")
    retention_days = db.Column(db.Integer, nullable=False, comment="保留天數")
    archive_after_days = db.Column(db.Integer, comment="歸檔天數")
    auto_delete = db.Column(db.Boolean, default=False, comment="自動刪除")
    policy_description = db.Column(db.Text, comment="策略描述")
    is_active = db.Column(db.Boolean, default=True, comment="是否啟用")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者")

    # 索引
    __table_args__ = (
        db.Index('idx_active', 'is_active'),
    )


class AuditConfigurationModel(BaseModel):
    """审计配置模型"""
    __tablename__ = "audit_configurations"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="配置ID")
    service_name = db.Column(db.String(100), nullable=False, comment="服務名稱")
    action_type = db.Column(db.String(100), nullable=False, comment="操作類型")
    is_enabled = db.Column(db.Boolean, default=True, comment="是否啟用")
    log_level = db.Column(
        db.Enum("basic", "detailed", "full", name="log_level"),
        default="basic",
        comment="日誌級別"
    )
    include_request_data = db.Column(db.Boolean, default=False, comment="包含請求數據")
    include_response_data = db.Column(db.Boolean, default=False, comment="包含響應數據")
    retention_days = db.Column(db.Integer, default=90, comment="保留天數")

    # 索引和唯一约束
    __table_args__ = (
        db.UniqueConstraint('service_name', 'action_type', name='uk_service_action'),
        db.Index('idx_enabled', 'is_enabled'),
    )


class AuditStatisticsModel(BaseModel):
    """审计统计模型"""
    __tablename__ = "audit_statistics"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="統計ID")
    stat_type = db.Column(db.String(50), nullable=False, comment="統計類型")
    stat_date = db.Column(db.Date, nullable=False, comment="統計日期")
    stat_hour = db.Column(db.Integer, comment="統計小時")
    resource_type = db.Column(db.String(50), comment="資源類型")
    action = db.Column(db.String(100), comment="操作動作")
    user_id = db.Column(db.String(36), comment="用戶ID")
    total_count = db.Column(db.Integer, default=0, comment="總數量")
    success_count = db.Column(db.Integer, default=0, comment="成功數量")
    failure_count = db.Column(db.Integer, default=0, comment="失敗數量")
    error_count = db.Column(db.Integer, default=0, comment="錯誤數量")
    avg_execution_time = db.Column(db.Float, comment="平均執行時間")
    risk_counts = db.Column(db.JSON, comment="風險等級統計")

    # 索引和唯一约束
    __table_args__ = (
        db.UniqueConstraint('stat_type', 'stat_date', 'stat_hour', 'resource_type', 'action', 'user_id', name='uk_stat_unique'),
        db.Index('idx_stat_date', 'stat_date'),
        db.Index('idx_stat_type', 'stat_type'),
        db.Index('idx_resource_action', 'resource_type', 'action'),
    )


class AuditAlertRuleModel(BaseMixinModel):
    """审计告警规则模型"""
    __tablename__ = "audit_alert_rules"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="告警規則ID")
    rule_name = db.Column(db.String(255), nullable=False, comment="規則名稱")
    rule_description = db.Column(db.Text, comment="規則描述")
    rule_type = db.Column(
        db.Enum("threshold", "pattern", "anomaly", name="alert_rule_type"),
        nullable=False,
        comment="規則類型"
    )
    conditions = db.Column(db.JSON, nullable=False, comment="觸發條件")
    alert_level = db.Column(
        db.Enum("info", "warning", "error", "critical", name="alert_level"),
        default="warning",
        comment="告警級別"
    )
    notification_channels = db.Column(db.JSON, comment="通知渠道")
    is_enabled = db.Column(db.Boolean, default=True, comment="是否啟用")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者")
    last_triggered = db.Column(db.String(19), comment="最後觸發時間")
    trigger_count = db.Column(db.Integer, default=0, comment="觸發次數")

    # 索引
    __table_args__ = (
        db.Index('idx_enabled', 'is_enabled'),
        db.Index('idx_rule_type', 'rule_type'),
        db.Index('idx_alert_level', 'alert_level'),
    )


class AuditExportTaskModel(BaseMixinModel):
    """审计导出任务模型"""
    __tablename__ = "audit_export_tasks"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="導出任務ID")
    task_name = db.Column(db.String(255), nullable=False, comment="任務名稱")
    export_type = db.Column(
        db.Enum("csv", "excel", "json", "pdf", name="export_type"),
        nullable=False,
        comment="導出類型"
    )
    filter_conditions = db.Column(db.JSON, comment="過濾條件")
    export_fields = db.Column(db.JSON, comment="導出字段")
    task_status = db.Column(
        db.Enum("pending", "processing", "completed", "failed", name="task_status"),
        default="pending",
        comment="任務狀態"
    )
    file_path = db.Column(db.String(500), comment="文件路徑")
    file_size = db.Column(db.BigInteger, comment="文件大小")
    record_count = db.Column(db.Integer, comment="記錄數量")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者")
    started_at = db.Column(db.String(19), comment="開始時間")
    completed_at = db.Column(db.String(19), comment="完成時間")
    error_message = db.Column(db.Text, comment="錯誤信息")

    # 索引
    __table_args__ = (
        db.Index('idx_status', 'task_status'),
        db.Index('idx_created_by', 'created_by'),
        db.Index('idx_created_at', 'created_at'),
    )