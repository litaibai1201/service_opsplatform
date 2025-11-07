# -*- coding: utf-8 -*-
"""
@文件: gateway_serialize.py
@說明: 網關序列化器 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, post_load


class RouteCreateSchema(Schema):
    """路由创建序列化器"""
    
    service_name = fields.Str(required=True, validate=validate.Length(min=1, max=100), 
                               error_messages={"required": "服務名稱為必填項"})
    path_pattern = fields.Str(required=True, validate=validate.Length(min=1, max=500),
                              error_messages={"required": "路徑模式為必填項"})
    target_url = fields.Str(required=True, validate=validate.Length(min=1, max=500),
                            error_messages={"required": "目標URL為必填項"})
    method = fields.Str(required=True, validate=validate.OneOf(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY']),
                        error_messages={"required": "HTTP方法為必填項"})
    version = fields.Str(missing='v1', validate=validate.Length(max=20))
    is_active = fields.Bool(missing=True)
    requires_auth = fields.Bool(missing=True)
    required_permissions = fields.List(fields.Str(), missing=None, allow_none=True)
    permission_check_strategy = fields.Str(missing='any', validate=validate.OneOf(['any', 'all']))
    rate_limit_rpm = fields.Int(missing=1000, validate=validate.Range(min=1, max=100000))
    timeout_seconds = fields.Int(missing=30, validate=validate.Range(min=1, max=300))
    retry_count = fields.Int(missing=3, validate=validate.Range(min=0, max=10))
    circuit_breaker_enabled = fields.Bool(missing=True)
    cache_enabled = fields.Bool(missing=False)
    cache_ttl_seconds = fields.Int(missing=300, validate=validate.Range(min=1, max=3600))
    load_balance_strategy = fields.Str(missing='round_robin', 
                                       validate=validate.OneOf(['round_robin', 'weighted', 'least_connections']))
    priority = fields.Int(missing=0, validate=validate.Range(min=0, max=100))


class RouteUpdateSchema(Schema):
    """路由更新序列化器"""
    
    service_name = fields.Str(validate=validate.Length(min=1, max=100))
    path_pattern = fields.Str(validate=validate.Length(min=1, max=500))
    target_url = fields.Str(validate=validate.Length(min=1, max=500))
    method = fields.Str(validate=validate.OneOf(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY']))
    version = fields.Str(validate=validate.Length(max=20))
    is_active = fields.Bool()
    requires_auth = fields.Bool()
    required_permissions = fields.List(fields.Str(), allow_none=True)
    permission_check_strategy = fields.Str(validate=validate.OneOf(['any', 'all']))
    rate_limit_rpm = fields.Int(validate=validate.Range(min=1, max=100000))
    timeout_seconds = fields.Int(validate=validate.Range(min=1, max=300))
    retry_count = fields.Int(validate=validate.Range(min=0, max=10))
    circuit_breaker_enabled = fields.Bool()
    cache_enabled = fields.Bool()
    cache_ttl_seconds = fields.Int(validate=validate.Range(min=1, max=3600))
    load_balance_strategy = fields.Str(validate=validate.OneOf(['round_robin', 'weighted', 'least_connections']))
    priority = fields.Int(validate=validate.Range(min=0, max=100))


class ServiceInstanceRegisterSchema(Schema):
    """服务实例注册序列化器"""
    
    service_name = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                              error_messages={"required": "服務名稱為必填項"})
    instance_id = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                             error_messages={"required": "實例ID為必填項"})
    host = fields.Str(required=True, validate=validate.Length(min=1, max=255),
                      error_messages={"required": "主機地址為必填項"})
    port = fields.Int(required=True, validate=validate.Range(min=1, max=65535),
                      error_messages={"required": "端口號為必填項"})
    protocol = fields.Str(missing='http', validate=validate.OneOf(['http', 'https']))
    weight = fields.Int(missing=100, validate=validate.Range(min=1, max=1000))
    health_check_url = fields.Str(validate=validate.Length(max=500), allow_none=True)
    health_check_interval_seconds = fields.Int(missing=30, validate=validate.Range(min=5, max=300))
    _metadata = fields.Dict(missing=None, allow_none=True)


class ServiceInstanceUpdateSchema(Schema):
    """服务实例更新序列化器"""
    
    weight = fields.Int(validate=validate.Range(min=1, max=1000))
    status = fields.Str(validate=validate.OneOf(['healthy', 'unhealthy', 'draining']))
    health_check_url = fields.Str(validate=validate.Length(max=500), allow_none=True)
    health_check_interval_seconds = fields.Int(validate=validate.Range(min=5, max=300))
    metadata = fields.Dict(allow_none=True)


class PermissionCreateSchema(Schema):
    """权限创建序列化器"""
    
    permission_code = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                                 error_messages={"required": "權限代碼為必填項"})
    permission_name = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                                 error_messages={"required": "權限名稱為必填項"})
    description = fields.Str(validate=validate.Length(max=500))
    resource_type = fields.Str(validate=validate.Length(max=50))
    actions = fields.List(fields.Str(), missing=None, allow_none=True)
    is_system = fields.Bool(missing=False)


class UserPermissionGrantSchema(Schema):
    """用户权限授予序列化器"""
    
    user_id = fields.Str(required=True, validate=validate.Length(min=1, max=36),
                         error_messages={"required": "用戶ID為必填項"})
    permission_codes = fields.List(fields.Str(), required=True, validate=validate.Length(min=1),
                                   error_messages={"required": "權限代碼列表為必填項"})
    role = fields.Str(required=True, validate=validate.Length(min=1, max=50),
                      error_messages={"required": "角色為必填項"})
    expires_at = fields.DateTime(format='%Y-%m-%d %H:%M:%S', allow_none=True)


class RouteQuerySchema(Schema):
    """路由查询序列化器"""
    
    service_name = fields.Str(validate=validate.Length(min=1, max=100))
    is_active = fields.Bool()
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    size = fields.Int(missing=20, validate=validate.Range(min=1, max=100))


class ServiceQuerySchema(Schema):
    """服务查询序列化器"""
    
    service_name = fields.Str(validate=validate.Length(min=1, max=100))
    status = fields.Str(validate=validate.OneOf(['healthy', 'unhealthy', 'draining']))
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    size = fields.Int(missing=20, validate=validate.Range(min=1, max=100))


class LogQuerySchema(Schema):
    """日志查询序列化器"""
    
    user_id = fields.Str(validate=validate.Length(min=1, max=36))
    service_name = fields.Str(validate=validate.Length(min=1, max=100))
    status_code = fields.Int(validate=validate.Range(min=100, max=599))
    start_time = fields.DateTime(format='%Y-%m-%d %H:%M:%S')
    end_time = fields.DateTime(format='%Y-%m-%d %H:%M:%S')
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    size = fields.Int(missing=20, validate=validate.Range(min=1, max=100))


class MetricsQuerySchema(Schema):
    """监控指标查询序列化器"""
    
    hours = fields.Int(missing=24, validate=validate.Range(min=1, max=168))  # 最多7天
    service_name = fields.Str(validate=validate.Length(min=1, max=100))
    group_by = fields.Str(validate=validate.OneOf(['hour', 'day']))


# 响应序列化器
class RouteResponseSchema(Schema):
    """路由响应序列化器"""
    
    id = fields.Str()
    service_name = fields.Str()
    path_pattern = fields.Str()
    target_url = fields.Str()
    method = fields.Str()
    version = fields.Str()
    is_active = fields.Bool()
    requires_auth = fields.Bool()
    required_permissions = fields.List(fields.Str(), allow_none=True)
    rate_limit_rpm = fields.Int()
    timeout_seconds = fields.Int()
    priority = fields.Int()
    created_at = fields.Str()


class ServiceInstanceResponseSchema(Schema):
    """服务实例响应序列化器"""
    
    id = fields.Str()
    instance_id = fields.Str()
    service_name = fields.Str()
    endpoint = fields.Str()
    weight = fields.Int()
    status = fields.Str()
    last_health_check = fields.Str()
    registered_at = fields.Str()


class PermissionResponseSchema(Schema):
    """权限响应序列化器"""
    
    id = fields.Str()
    permission_code = fields.Str()
    permission_name = fields.Str()
    description = fields.Str()
    resource_type = fields.Str()
    actions = fields.List(fields.Str(), allow_none=True)
    is_system = fields.Bool()
    created_at = fields.Str()


class ApiLogResponseSchema(Schema):
    """API日志响应序列化器"""
    
    id = fields.Str()
    request_id = fields.Str()
    user_id = fields.Str(allow_none=True)
    method = fields.Str()
    path = fields.Str()
    target_service = fields.Str(allow_none=True)
    response_status = fields.Int(allow_none=True)
    response_time_ms = fields.Int(allow_none=True)
    ip_address = fields.Str(allow_none=True)
    started_at = fields.Str()
    completed_at = fields.Str(allow_none=True)


class MetricsResponseSchema(Schema):
    """监控指标响应序列化器"""
    
    timeframe = fields.Str()
    total_requests = fields.Int()
    error_requests = fields.Int()
    error_rate = fields.Float()
    avg_response_time_ms = fields.Float()
    active_routes = fields.Int()
    healthy_instances = fields.Int()
    timestamp = fields.Str()


class CircuitBreakerResponseSchema(Schema):
    """熔断器状态响应序列化器"""
    
    service_name = fields.Str()
    state = fields.Str()
    failure_count = fields.Int()
    success_count = fields.Int()
    failure_threshold = fields.Int()
    last_failure_time = fields.Str(allow_none=True)
    updated_at = fields.Str()


# 特殊的动态路由转发请求序列化器
class ProxyRequestSchema(Schema):
    """代理请求序列化器"""
    
    # 由于转发请求的参数是动态的，这里主要做基本的验证
    headers = fields.Dict(missing=dict)
    params = fields.Dict(missing=dict)
    json_data = fields.Raw(missing=None, allow_none=True)
    form_data = fields.Raw(missing=None, allow_none=True)
    
    @post_load
    def process_data(self, data, **kwargs):
        """后处理数据"""
        # 清理空值
        return {k: v for k, v in data.items() if v is not None}


# 批量操作序列化器
class BatchRouteCreateSchema(Schema):
    """批量路由创建序列化器"""
    
    routes = fields.List(fields.Nested(RouteCreateSchema), required=True, validate=validate.Length(min=1, max=50),
                         error_messages={"required": "路由列表為必填項"})


class BatchServiceRegisterSchema(Schema):
    """批量服务注册序列化器"""
    
    instances = fields.List(fields.Nested(ServiceInstanceRegisterSchema), required=True, 
                            validate=validate.Length(min=1, max=20),
                            error_messages={"required": "服務實例列表為必填項"})


class BatchPermissionGrantSchema(Schema):
    """批量权限授予序列化器"""
    
    grants = fields.List(fields.Nested(UserPermissionGrantSchema), required=True, 
                         validate=validate.Length(min=1, max=100),
                         error_messages={"required": "權限授予列表為必填項"})


# 健康检查相关序列化器
class HealthCheckSchema(Schema):
    """健康检查序列化器"""
    
    service_name = fields.Str(validate=validate.Length(min=1, max=100))
    check_all = fields.Bool(missing=False)


class HealthCheckResponseSchema(Schema):
    """健康检查响应序列化器"""
    
    status = fields.Str()
    service = fields.Str()
    timestamp = fields.Str()
    version = fields.Str()
    database = fields.Str()
    cache = fields.Str()
    services = fields.Dict(missing=dict)
    issues = fields.List(fields.Str(), missing=list)