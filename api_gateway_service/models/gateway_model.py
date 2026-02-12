# -*- coding: utf-8 -*-
"""
@文件: gateway_model.py
@說明: 網關模型操作類 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import load_only
from typing import List, Dict, Any, Optional, Tuple

from common.common_tools import CommonTools, TryExcept
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    ApiRouteModel, ServiceInstanceModel, RateLimitRecordModel,
    ApiCallLogModel, CircuitBreakerModel, PermissionModel,
    UserRolePermissionModel
)


class OperApiRouteModel:
    """API路由模型操作类"""
    
    def __init__(self):
        self.model = ApiRouteModel
    
    @TryExcept("創建路由配置失敗")
    def create_route(self, route_data):
        """创建路由配置"""
        if not route_data.id:
            route_data.id = str(uuid.uuid4())
        db.session.add(route_data)
        return True
    
    def get_by_id(self, route_id):
        """根据ID获取路由配置"""
        return self.model.query.filter(
            and_(
                self.model.id == route_id,
                self.model.status == 1
            )
        ).first()
    
    def get_active_routes(self):
        """获取所有激活的路由配置"""
        return self.model.query.filter(
            and_(
                self.model.is_active == True,
                self.model.status == 1
            )
        ).order_by(self.model.priority.desc()).all()
    
    def get_routes_by_service(self, service_name):
        """根据服务名获取路由配置"""
        return self.model.query.filter(
            and_(
                self.model.service_name == service_name,
                self.model.status == 1
            )
        ).all()
    
    def _match_path_pattern(self, pattern, path):
        """检查路径是否匹配路由模式（支持通配符 *）

        例如:
          pattern="/auth/check-username/*", path="/auth/check-username/testuser" -> True
          pattern="/auth/login", path="/auth/login" -> True
          pattern="/teams/*/members", path="/teams/123/members" -> True
        """
        import fnmatch
        return fnmatch.fnmatch(path, pattern)

    def _match_route_from_db(self, path, method):
        """从数据库查询并匹配路由（支持通配符）"""
        # 1. 先尝试精确匹配（性能最优）
        route = self.model.query.filter(
            and_(
                self.model.path_pattern == path,
                self.model.method.in_([method, 'ANY']),
                self.model.is_active == True,
                self.model.status == 1
            )
        ).order_by(self.model.priority.desc()).first()

        if route:
            return route

        # 2. 精确匹配失败，获取所有包含通配符的活跃路由进行模式匹配
        wildcard_routes = self.model.query.filter(
            and_(
                self.model.path_pattern.like('%*%'),
                self.model.method.in_([method, 'ANY']),
                self.model.is_active == True,
                self.model.status == 1
            )
        ).order_by(self.model.priority.desc()).all()

        for route in wildcard_routes:
            if self._match_path_pattern(route.path_pattern, path):
                return route

        return None

    def match_route(self, path, method):
        """匹配路由规则（带缓存优化，支持通配符 *）"""
        # 尝试从缓存获取
        cache_key = f"route:{path}:{method}"

        try:
            from cache import redis_client
            import json

            # 1. 先从缓存查找
            cached_route = redis_client.get(cache_key)
            if cached_route:
                # 反序列化缓存数据
                route_data = json.loads(cached_route)
                # 从数据库重新获取对象（保持ORM关系）
                if route_data.get('id'):
                    route = self.model.query.get(route_data['id'])
                    if route and route.is_active and route.status == 1:
                        return route

            # 2. 缓存未命中，查询数据库（支持通配符匹配）
            route = self._match_route_from_db(path, method)

            # 3. 缓存结果（5分钟）
            if route:
                route_data = {
                    'id': route.id,
                    'service_name': route.service_name,
                    'path_pattern': route.path_pattern
                }
                redis_client.setex(cache_key, 300, json.dumps(route_data))

            return route

        except Exception as e:
            # 缓存失败不影响正常流程，直接查数据库
            from loggers import logger
            logger.warning(f"路由缓存失败，使用数据库查询: {str(e)}")
            return self._match_route_from_db(path, method)
    
    @TryExcept("更新路由配置失敗")
    def update_route(self, route_id, update_data):
        """更新路由配置"""
        route = self.get_by_id(route_id)
        if not route:
            raise ValueError("路由配置不存在")

        # 保存旧的路径和方法用于清除缓存
        old_path = route.path_pattern
        old_method = route.method

        allowed_fields = [
            'service_name', 'path_pattern', 'target_url', 'method', 'version',
            'is_active', 'requires_auth', 'required_permissions',
            'permission_check_strategy', 'rate_limit_rpm', 'timeout_seconds',
            'retry_count', 'circuit_breaker_enabled', 'cache_enabled',
            'cache_ttl_seconds', 'load_balance_strategy', 'priority'
        ]

        for field, value in update_data.items():
            if field in allowed_fields and hasattr(route, field):
                setattr(route, field, value)

        route.updated_at = CommonTools.get_now()

        # 清除缓存
        try:
            from cache import redis_client
            # 清除旧的缓存
            if old_method == 'ANY':
                for method in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                    redis_client.delete(f"route:{old_path}:{method}")
            else:
                redis_client.delete(f"route:{old_path}:{old_method}")

            # 如果路径或方法改变了，也清除新的缓存键
            if route.path_pattern != old_path or route.method != old_method:
                if route.method == 'ANY':
                    for method in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                        redis_client.delete(f"route:{route.path_pattern}:{method}")
                else:
                    redis_client.delete(f"route:{route.path_pattern}:{route.method}")
        except:
            pass  # 缓存清除失败不影响主流程

        return True
    
    @TryExcept("刪除路由配置失敗")
    def delete_route(self, route_id):
        """删除路由配置（软删除）"""
        route = self.get_by_id(route_id)
        if not route:
            raise ValueError("路由配置不存在")

        # 清除缓存
        try:
            from cache import redis_client
            if route.method == 'ANY':
                for method in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                    redis_client.delete(f"route:{route.path_pattern}:{method}")
            else:
                redis_client.delete(f"route:{route.path_pattern}:{route.method}")
        except:
            pass  # 缓存清除失败不影响主流程

        route.status = -1
        route.status_update_at = CommonTools.get_now()
        return True


class OperServiceInstanceModel:
    """服务实例模型操作类"""
    
    def __init__(self):
        self.model = ServiceInstanceModel
    
    @TryExcept("註冊服務實例失敗")
    def register_instance(self, instance_data):
        """注册服务实例"""
        if not instance_data.id:
            instance_data.id = str(uuid.uuid4())
        instance_data.registered_at = CommonTools.get_now()
        db.session.add(instance_data)
        return True
    
    def get_by_id(self, instance_id):
        """根据ID获取服务实例"""
        return self.model.query.filter(
            and_(
                self.model.id == instance_id,
                self.model.status == 1
            )
        ).first()
    
    def get_healthy_instances(self, service_name):
        """获取健康的服务实例"""
        return self.model.query.filter(
            and_(
                self.model.service_name == service_name,
                self.model.instance_status == 'healthy',
                self.model.status == 1
            )
        ).order_by(self.model.weight.desc()).all()
    
    def get_all_instances_by_service(self, service_name):
        """获取服务的所有实例"""
        return self.model.query.filter(
            and_(
                self.model.service_name == service_name,
                self.model.status == 1
            )
        ).all()
    
    @TryExcept("更新實例狀態失敗")
    def update_instance_health(self, instance_id, status, health_check_time=None):
        """更新实例健康状态"""
        instance = self.get_by_id(instance_id)
        if not instance:
            raise ValueError("服務實例不存在")
        
        instance.instance_status = status
        instance.last_health_check = health_check_time or CommonTools.get_now()
        instance.updated_at = CommonTools.get_now()
        return True
    
    @TryExcept("註銷服務實例失敗")
    def deregister_instance(self, instance_id):
        """注销服务实例"""
        instance = self.get_by_id(instance_id)
        if not instance:
            raise ValueError("服務實例不存在")
        
        instance.status = -1
        instance.status_update_at = CommonTools.get_now()
        return True


class OperRateLimitRecordModel:
    """限流记录模型操作类"""
    
    def __init__(self):
        self.model = RateLimitRecordModel
    
    @TryExcept("創建限流記錄失敗")
    def create_record(self, record_data):
        """创建限流记录"""
        if not record_data.id:
            record_data.id = str(uuid.uuid4())
        db.session.add(record_data)
        return True
    
    def get_current_window_record(self, identifier, identifier_type, endpoint, window_start, window_end):
        """获取当前窗口的限流记录"""
        return self.model.query.filter(
            and_(
                self.model.identifier == identifier,
                self.model.identifier_type == identifier_type,
                self.model.endpoint == endpoint,
                self.model.window_start == window_start,
                self.model.window_end == window_end,
                self.model.status == 1
            )
        ).first()
    
    @TryExcept("更新限流記錄失敗")
    def update_request_count(self, record, increment=1):
        """更新请求计数"""
        record.request_count += increment
        return True
    
    def cleanup_expired_records(self, hours=24):
        """清理过期的限流记录"""
        cutoff_time = CommonTools.get_now(
            datetime.now() - timedelta(hours=hours)
        )
        
        expired_records = self.model.query.filter(
            and_(
                self.model.window_end < cutoff_time,
                self.model.status == 1
            )
        ).all()
        
        for record in expired_records:
            record.status = 0
            record.status_update_at = CommonTools.get_now()
        
        return len(expired_records)


class OperApiCallLogModel:
    """API调用日志模型操作类"""
    
    def __init__(self):
        self.model = ApiCallLogModel
    
    @TryExcept("記錄API調用日誌失敗")
    def create_log(self, log_data):
        """创建API调用日志"""
        if not log_data.id:
            log_data.id = str(uuid.uuid4())
        if not log_data.request_id:
            log_data.request_id = str(uuid.uuid4())
        db.session.add(log_data)
        return True
    
    def get_by_request_id(self, request_id):
        """根据请求ID获取日志"""
        return self.model.query.filter(
            and_(
                self.model.request_id == request_id,
                self.model.status == 1
            )
        ).first()
    
    def get_logs_by_user(self, user_id, page=1, size=20):
        """获取用户的API调用日志"""
        return self.model.query.filter(
            and_(
                self.model.user_id == user_id,
                self.model.status == 1
            )
        ).order_by(self.model.started_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_logs_by_service(self, service_name, hours=24):
        """获取服务的调用日志"""
        since_time = CommonTools.get_now(
            datetime.now() - timedelta(hours=hours)
        )
        
        return self.model.query.filter(
            and_(
                self.model.target_service == service_name,
                self.model.started_at >= since_time,
                self.model.status == 1
            )
        ).order_by(self.model.started_at.desc()).all()
    
    def get_error_logs(self, hours=24):
        """获取错误日志"""
        since_time = CommonTools.get_now(
            datetime.now() - timedelta(hours=hours)
        )
        
        return self.model.query.filter(
            and_(
                or_(
                    self.model.response_status >= 400,
                    self.model.error_message.isnot(None)
                ),
                self.model.started_at >= since_time,
                self.model.status == 1
            )
        ).order_by(self.model.started_at.desc()).all()
    
    @TryExcept("更新API調用日誌失敗")
    def update_log_completion(self, request_id, response_data):
        """更新日志完成信息"""
        log = self.get_by_request_id(request_id)
        if not log:
            raise ValueError("API調用日誌不存在")
        
        log.response_status = response_data.get('status')
        log.response_size = response_data.get('size')
        log.response_time_ms = response_data.get('time_ms')
        log.error_message = response_data.get('error')
        log.completed_at = CommonTools.get_now_ms()
        return True


class OperCircuitBreakerModel:
    """熔断器模型操作类"""
    
    def __init__(self):
        self.model = CircuitBreakerModel
    
    @TryExcept("創建熔斷器狀態失敗")
    def create_or_update_state(self, service_name, state_data):
        """创建或更新熔断器状态"""
        existing = self.get_by_service(service_name)
        
        if existing:
            # 更新现有状态
            for field, value in state_data.items():
                if hasattr(existing, field):
                    setattr(existing, field, value)
            existing.updated_at = CommonTools.get_now()
        else:
            # 创建新状态
            state_data['id'] = str(uuid.uuid4())
            state_data['service_name'] = service_name
            new_state = self.model(**state_data)
            db.session.add(new_state)
        
        return True
    
    def get_by_service(self, service_name):
        """根据服务名获取熔断器状态"""
        return self.model.query.filter(
            and_(
                self.model.service_name == service_name,
                self.model.status == 1
            )
        ).first()
    
    def get_open_circuits(self):
        """获取所有处于开放状态的熔断器"""
        return self.model.query.filter(
            and_(
                self.model.state == 'open',
                self.model.status == 1
            )
        ).all()
    
    @TryExcept("記錄失敗次數失敗")
    def record_failure(self, service_name):
        """记录失败"""
        circuit = self.get_by_service(service_name)
        if not circuit:
            # 创建新的熔断器状态
            circuit_data = {
                'service_name': service_name,
                'failure_count': 1,
                'last_failure_time': CommonTools.get_now()
            }
            self.create_or_update_state(service_name, circuit_data)
        else:
            circuit.failure_count += 1
            circuit.last_failure_time = CommonTools.get_now()
            
            # 检查是否需要开启熔断器
            if circuit.failure_count >= circuit.failure_threshold:
                circuit.state = 'open'
                circuit.next_attempt_time = CommonTools.get_now(
                    datetime.now() + timedelta(seconds=circuit.timeout_seconds)
                )
            
            circuit.updated_at = CommonTools.get_now()
        
        return True
    
    @TryExcept("記錄成功次數失敗")
    def record_success(self, service_name):
        """记录成功"""
        circuit = self.get_by_service(service_name)
        if circuit:
            circuit.success_count += 1
            circuit.failure_count = 0  # 重置失败计数
            
            if circuit.state != 'closed':
                circuit.state = 'closed'
            
            circuit.updated_at = CommonTools.get_now()
        
        return True


class OperPermissionModel:
    """权限模型操作类"""
    
    def __init__(self):
        self.model = PermissionModel
        self.user_permission_model = UserRolePermissionModel
    
    @TryExcept("創建權限失敗")
    def create_permission(self, permission_data):
        """创建权限"""
        if not permission_data.id:
            permission_data.id = str(uuid.uuid4())
        db.session.add(permission_data)
        return True
    
    def get_by_code(self, permission_code):
        """根据权限代码获取权限"""
        return self.model.query.filter(
            and_(
                self.model.permission_code == permission_code,
                self.model.status == 1
            )
        ).first()
    
    def get_user_permissions(self, user_id):
        """获取用户权限"""
        return db.session.query(self.model).join(
            self.user_permission_model,
            self.model.id == self.user_permission_model.permission_id
        ).filter(
            and_(
                self.user_permission_model.user_id == user_id,
                self.user_permission_model.status == 1,
                self.model.status == 1,
                or_(
                    self.user_permission_model.expires_at.is_(None),
                    self.user_permission_model.expires_at > CommonTools.get_now()
                )
            )
        ).all()
    
    def check_user_permission(self, user_id, permission_codes, strategy='any'):
        """检查用户是否具有指定权限"""
        if not permission_codes:
            return True
        
        user_permissions = self.get_user_permissions(user_id)
        user_permission_codes = {p.permission_code for p in user_permissions}
        
        if strategy == 'all':
            return all(code in user_permission_codes for code in permission_codes)
        else:  # 'any'
            return any(code in user_permission_codes for code in permission_codes)
    
    @TryExcept("授予權限失敗")
    def grant_permission_to_user(self, user_id, permission_id, role, granted_by=None, expires_at=None):
        """授予用户权限"""
        permission_data = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'role': role,
            'permission_id': permission_id,
            'granted_by': granted_by,
            'granted_at': CommonTools.get_now(),
            'expires_at': expires_at
        }
        
        user_permission = self.user_permission_model(**permission_data)
        db.session.add(user_permission)
        return True