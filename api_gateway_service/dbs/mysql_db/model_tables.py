# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: API網關相關數據模型表
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


class ApiRouteModel(BaseMixinModel):
    """API路由配置模型"""
    __tablename__ = "api_routes"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="路由ID")
    service_name = db.Column(db.String(100), nullable=False, comment="服務名稱")
    path_pattern = db.Column(db.String(500), nullable=False, comment="路徑模式")
    target_url = db.Column(db.String(500), nullable=False, comment="目標URL")
    method = db.Column(db.String(10), nullable=False, comment="HTTP方法")
    version = db.Column(db.String(20), default="v1", comment="版本")
    is_active = db.Column(db.Boolean, default=True, comment="是否啟用")
    requires_auth = db.Column(db.Boolean, default=True, comment="是否需要認證")
    required_permissions = db.Column(db.JSON, comment="需要的權限列表")
    permission_check_strategy = db.Column(
        db.Enum("any", "all", name="permission_strategy"), 
        default="any", 
        comment="權限檢查策略"
    )
    rate_limit_rpm = db.Column(db.Integer, default=1000, comment="每分鐘請求限制")
    timeout_seconds = db.Column(db.Integer, default=30, comment="超時時間(秒)")
    retry_count = db.Column(db.Integer, default=3, comment="重試次數")
    circuit_breaker_enabled = db.Column(db.Boolean, default=True, comment="是否啟用熔斷器")
    cache_enabled = db.Column(db.Boolean, default=False, comment="是否啟用緩存")
    cache_ttl_seconds = db.Column(db.Integer, default=300, comment="緩存TTL(秒)")
    load_balance_strategy = db.Column(
        db.Enum("round_robin", "weighted", "least_connections", name="lb_strategy"),
        default="round_robin",
        comment="負載均衡策略"
    )
    priority = db.Column(db.Integer, default=0, comment="優先級")

    # 索引
    __table_args__ = (
        db.Index('idx_path_method', 'path_pattern', 'method'),
        db.Index('idx_service', 'service_name'),
        db.Index('idx_active', 'is_active'),
        db.Index('idx_priority', 'priority'),
    )


class ServiceInstanceModel(BaseMixinModel):
    """服务实例模型"""
    __tablename__ = "service_instances"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="實例ID")
    service_name = db.Column(db.String(100), nullable=False, comment="服務名稱")
    instance_id = db.Column(db.String(100), nullable=False, comment="實例標識")
    host = db.Column(db.String(255), nullable=False, comment="主機地址")
    port = db.Column(db.Integer, nullable=False, comment="端口")
    protocol = db.Column(
        db.Enum("http", "https", name="protocol_type"), 
        default="http", 
        comment="協議"
    )
    weight = db.Column(db.Integer, default=100, comment="權重")
    instance_status = db.Column(
        db.Enum("healthy", "unhealthy", "draining", name="instance_status"),
        default="healthy",
        comment="實例狀態"
    )
    last_health_check = db.Column(db.String(19), default=CommonTools.get_now, comment="最後健康檢查時間")
    health_check_url = db.Column(db.String(500), comment="健康檢查URL")
    health_check_interval_seconds = db.Column(db.Integer, default=30, comment="健康檢查間隔(秒)")
    metadata = db.Column(db.JSON, comment="元數據")
    registered_at = db.Column(db.String(19), default=CommonTools.get_now, comment="註冊時間")

    # 索引和唯一约束
    __table_args__ = (
        db.UniqueConstraint('service_name', 'instance_id', name='uk_service_instance'),
        db.Index('idx_service_status', 'service_name', 'instance_status'),
        db.Index('idx_health_check', 'last_health_check'),
    )


class RateLimitRecordModel(BaseModel):
    """API限流记录模型"""
    __tablename__ = "rate_limit_records"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="記錄ID")
    identifier = db.Column(db.String(255), nullable=False, comment="標識符")
    identifier_type = db.Column(
        db.Enum("user", "ip", "api_key", name="identifier_type"),
        nullable=False,
        comment="標識符類型"
    )
    endpoint = db.Column(db.String(500), nullable=False, comment="端點")
    request_count = db.Column(db.Integer, default=1, comment="請求次數")
    window_start = db.Column(db.String(19), nullable=False, comment="窗口開始時間")
    window_end = db.Column(db.String(19), nullable=False, comment="窗口結束時間")
    is_blocked = db.Column(db.Boolean, default=False, comment="是否被阻止")

    # 索引
    __table_args__ = (
        db.Index('idx_identifier_endpoint_window', 'identifier', 'endpoint', 'window_start'),
        db.Index('idx_window_end', 'window_end'),
    )


class ApiCallLogModel(BaseModel):
    """API调用日志模型"""
    __tablename__ = "api_call_logs"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="日誌ID")
    request_id = db.Column(db.String(36), unique=True, nullable=False, comment="請求ID")
    user_id = db.Column(db.String(36), comment="用戶ID")
    method = db.Column(db.String(10), nullable=False, comment="HTTP方法")
    path = db.Column(db.String(1000), nullable=False, comment="請求路徑")
    query_params = db.Column(db.JSON, comment="查詢參數")
    headers = db.Column(db.JSON, comment="請求頭")
    ip_address = db.Column(db.String(45), comment="IP地址")
    user_agent = db.Column(db.Text, comment="用戶代理")
    target_service = db.Column(db.String(100), comment="目標服務")
    response_status = db.Column(db.Integer, comment="響應狀態碼")
    response_size = db.Column(db.BigInteger, comment="響應大小(字節)")
    response_time_ms = db.Column(db.Integer, comment="響應時間(毫秒)")
    error_message = db.Column(db.Text, comment="錯誤信息")
    permission_check_result = db.Column(db.JSON, comment="權限檢查結果")
    started_at = db.Column(db.String(23), default=CommonTools.get_now_ms, comment="開始時間")
    completed_at = db.Column(db.String(23), comment="完成時間")

    # 索引
    __table_args__ = (
        db.Index('idx_path', 'path'),
        db.Index('idx_status', 'response_status'),
        db.Index('idx_service', 'target_service'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_started_at', 'started_at'),
        db.Index('idx_response_time', 'response_time_ms'),
    )


class CircuitBreakerModel(BaseMixinModel):
    """熔断器状态模型"""
    __tablename__ = "circuit_breaker_states"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="熔斷器ID")
    service_name = db.Column(db.String(100), nullable=False, unique=True, comment="服務名稱")
    state = db.Column(
        db.Enum("closed", "open", "half_open", name="circuit_state"),
        default="closed",
        comment="熔斷器狀態"
    )
    failure_count = db.Column(db.Integer, default=0, comment="失敗次數")
    success_count = db.Column(db.Integer, default=0, comment="成功次數")
    last_failure_time = db.Column(db.String(19), comment="最後失敗時間")
    next_attempt_time = db.Column(db.String(19), comment="下次嘗試時間")
    failure_threshold = db.Column(db.Integer, default=5, comment="失敗閾值")
    timeout_seconds = db.Column(db.Integer, default=60, comment="熔斷超時(秒)")

    # 索引
    __table_args__ = (
        db.Index('idx_service_state', 'service_name', 'state'),
    )


class PermissionModel(BaseMixinModel):
    """权限模型"""
    __tablename__ = "permissions"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="權限ID")
    permission_code = db.Column(db.String(100), nullable=False, unique=True, comment="權限代碼")
    permission_name = db.Column(db.String(100), nullable=False, comment="權限名稱")
    description = db.Column(db.String(500), comment="權限描述")
    resource_type = db.Column(db.String(50), comment="資源類型")
    actions = db.Column(db.JSON, comment="允許的操作")
    is_system = db.Column(db.Boolean, default=False, comment="是否系統權限")

    # 索引
    __table_args__ = (
        db.Index('idx_permission_code', 'permission_code'),
        db.Index('idx_resource_type', 'resource_type'),
    )


class UserRolePermissionModel(BaseModel):
    """用户角色权限关联模型"""
    __tablename__ = "user_role_permissions"

    id = db.Column(db.String(36), nullable=False, primary_key=True, comment="關聯ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    role = db.Column(db.String(50), nullable=False, comment="角色")
    permission_id = db.Column(db.String(36), db.ForeignKey('permissions.id'), nullable=False, comment="權限ID")
    granted_by = db.Column(db.String(36), comment="授權者ID")
    granted_at = db.Column(db.String(19), default=CommonTools.get_now, comment="授權時間")
    expires_at = db.Column(db.String(19), comment="過期時間")

    # 关系
    permission = db.relationship('PermissionModel', backref='user_permissions')

    # 索引和唯一约束
    __table_args__ = (
        db.UniqueConstraint('user_id', 'permission_id', name='uk_user_permission'),
        db.Index('idx_user_role', 'user_id', 'role'),
        db.Index('idx_expires_at', 'expires_at'),
    )