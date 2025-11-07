# -*- coding: utf-8 -*-
"""
@文件: gateway_controller.py
@說明: 網關控制器 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
import time
import requests
import traceback
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, Optional, List
from flask import request, g

from common.common_tools import CommonTools
from dbs.mysql_db import DBFunction
from dbs.mysql_db.model_tables import (
    ApiRouteModel, ServiceInstanceModel, RateLimitRecordModel,
    ApiCallLogModel, CircuitBreakerModel, PermissionModel
)
from models.gateway_model import (
    OperApiRouteModel, OperServiceInstanceModel, OperRateLimitRecordModel,
    OperApiCallLogModel, OperCircuitBreakerModel, OperPermissionModel
)
from configs.constant import Config
from loggers import logger
from cache import redis_client


class GatewayController:
    """網關控制器 (优化版本)"""
    
    # 类级别的单例缓存
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GatewayController, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 避免重复初始化
        if GatewayController._initialized:
            return
            
        self.oper_route = OperApiRouteModel()
        self.oper_service = OperServiceInstanceModel()
        self.oper_rate_limit = OperRateLimitRecordModel()
        self.oper_log = OperApiCallLogModel()
        self.oper_circuit_breaker = OperCircuitBreakerModel()
        self.oper_permission = OperPermissionModel()
        
        # 配置项
        self.default_timeout = Config.GATEWAY_DEFAULT_TIMEOUT
        self.max_retry_count = Config.GATEWAY_MAX_RETRY_COUNT
        self.circuit_breaker_threshold = Config.CIRCUIT_BREAKER_THRESHOLD
        
        GatewayController._initialized = True

    # ==================== 公共验证和工具方法 ====================
    
    def _get_client_info(self):
        """获取客户端信息"""
        return {
            'ip_address': request.remote_addr or '未知',
            'user_agent': request.headers.get('User-Agent', '未知'),
            'request_id': str(uuid.uuid4())
        }
    
    def _build_target_url(self, instance, route, path):
        """构建目标URL"""
        base_url = f"{instance.protocol}://{instance.host}:{instance.port}"
        # 简化的路径替换，实际应用中可能需要更复杂的路径映射
        target_path = path.replace(route.path_pattern, route.target_url, 1)
        return f"{base_url}{target_path}"
    
    def _select_instance(self, instances, strategy='round_robin'):
        """选择服务实例（负载均衡）"""
        if not instances:
            return None
        
        if strategy == 'round_robin':
            # 简化的轮询实现
            cache_key = f"lb_counter:{instances[0].service_name}"
            counter = redis_client.get(cache_key) or 0
            counter = int(counter)
            selected = instances[counter % len(instances)]
            redis_client.setex(cache_key, 3600, counter + 1)
            return selected
        elif strategy == 'weighted':
            # 权重选择
            total_weight = sum(inst.weight for inst in instances)
            import random
            rand_val = random.randint(1, total_weight)
            current_weight = 0
            for instance in instances:
                current_weight += instance.weight
                if rand_val <= current_weight:
                    return instance
        
        # 默认返回第一个实例
        return instances[0]

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

    # ==================== 路由管理 ====================
    
    def create_route(self, data: Dict) -> Tuple[Any, bool]:
        """创建路由配置"""
        def _create_route_operation():
            # 验证必填字段
            required_fields = ['service_name', 'path_pattern', 'target_url', 'method']
            for field in required_fields:
                if not data.get(field):
                    raise ValueError(f"{field}不能為空")
            
            # 创建路由对象
            route_data = {
                'id': str(uuid.uuid4()),
                'service_name': data['service_name'].strip(),
                'path_pattern': data['path_pattern'].strip(),
                'target_url': data['target_url'].strip(),
                'method': data['method'].upper(),
                'version': data.get('version', 'v1'),
                'is_active': data.get('is_active', True),
                'requires_auth': data.get('requires_auth', True),
                'required_permissions': data.get('required_permissions'),
                'permission_check_strategy': data.get('permission_check_strategy', 'any'),
                'rate_limit_rpm': data.get('rate_limit_rpm', 1000),
                'timeout_seconds': data.get('timeout_seconds', 30),
                'retry_count': data.get('retry_count', 3),
                'circuit_breaker_enabled': data.get('circuit_breaker_enabled', True),
                'cache_enabled': data.get('cache_enabled', False),
                'cache_ttl_seconds': data.get('cache_ttl_seconds', 300),
                'load_balance_strategy': data.get('load_balance_strategy', 'round_robin'),
                'priority': data.get('priority', 0)
            }
            
            route_obj = ApiRouteModel(**route_data)
            result, flag = self.oper_route.create_route(route_obj)
            if not flag:
                raise Exception(f"創建路由失敗: {result}")
            
            return {
                'route_id': route_data['id'],
                'service_name': route_data['service_name'],
                'path_pattern': route_data['path_pattern'],
                'created_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_create_route_operation, "創建路由")
    
    def get_routes(self, service_name: str = None) -> Tuple[Any, bool]:
        """获取路由配置"""
        try:
            if service_name:
                routes = self.oper_route.get_routes_by_service(service_name)
            else:
                routes = self.oper_route.get_active_routes()
            
            routes_data = []
            for route in routes:
                route_info = {
                    'id': route.id,
                    'service_name': route.service_name,
                    'path_pattern': route.path_pattern,
                    'target_url': route.target_url,
                    'method': route.method,
                    'version': route.version,
                    'is_active': route.is_active,
                    'requires_auth': route.requires_auth,
                    'required_permissions': route.required_permissions,
                    'rate_limit_rpm': route.rate_limit_rpm,
                    'timeout_seconds': route.timeout_seconds,
                    'created_at': route.created_at
                }
                routes_data.append(route_info)
            
            return {
                'total': len(routes_data),
                'routes': routes_data
            }, True
            
        except Exception as e:
            logger.error(f"獲取路由配置異常: {str(e)}")
            return "獲取路由配置失敗", False

    # ==================== 服务发现与注册 ====================
    
    def register_service(self, data: Dict) -> Tuple[Any, bool]:
        """注册服务实例"""
        def _register_service_operation():
            required_fields = ['service_name', 'instance_id', 'host', 'port']
            for field in required_fields:
                if not data.get(field):
                    raise ValueError(f"{field}不能為空")
            
            service_data = {
                'id': str(uuid.uuid4()),
                'service_name': data['service_name'].strip(),
                'instance_id': data['instance_id'].strip(),
                'host': data['host'].strip(),
                'port': int(data['port']),
                'protocol': data.get('protocol', 'http'),
                'weight': int(data.get('weight', 100)),
                'instance_status': 'healthy',
                'health_check_url': data.get('health_check_url'),
                'health_check_interval_seconds': int(data.get('health_check_interval_seconds', 30)),
                '_metadata': data.get('_metadata')
            }
            
            instance_obj = ServiceInstanceModel(**service_data)
            result, flag = self.oper_service.register_instance(instance_obj)
            if not flag:
                raise Exception(f"註冊服務失敗: {result}")
            
            return {
                'instance_id': service_data['id'],
                'service_name': service_data['service_name'],
                'endpoint': f"{service_data['protocol']}://{service_data['host']}:{service_data['port']}",
                'registered_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_register_service_operation, "註冊服務")
    
    def get_service_instances(self, service_name: str) -> Tuple[Any, bool]:
        """获取服务实例列表"""
        try:
            instances = self.oper_service.get_all_instances_by_service(service_name)
            
            instances_data = []
            for instance in instances:
                instance_info = {
                    'id': instance.id,
                    'instance_id': instance.instance_id,
                    'endpoint': f"{instance.protocol}://{instance.host}:{instance.port}",
                    'weight': instance.weight,
                    'status': instance.instance_status,
                    'last_health_check': instance.last_health_check,
                    'registered_at': instance.registered_at
                }
                instances_data.append(instance_info)
            
            return {
                'service_name': service_name,
                'total_instances': len(instances_data),
                'healthy_instances': len([i for i in instances_data if i['status'] == 'healthy']),
                'instances': instances_data
            }, True
            
        except Exception as e:
            logger.error(f"獲取服務實例異常: {str(e)}")
            return "獲取服務實例失敗", False

    # ==================== 请求转发核心逻辑 ====================
    
    def forward_request(self, path: str, method: str, **kwargs) -> Tuple[Any, bool]:
        """请求转发核心逻辑"""
        client_info = self._get_client_info()
        request_id = client_info['request_id']
        start_time = time.time()
        
        try:
            # 1. 路由匹配
            route = self.oper_route.match_route(path, method)
            if not route:
                return self._handle_route_not_found(request_id, path, method, client_info)
            
            # 2. 权限验证
            user_id = kwargs.get('user_id')
            if route.requires_auth and user_id:
                permission_check = self._check_permissions(user_id, route)
                if not permission_check['allowed']:
                    return self._handle_permission_denied(request_id, route, permission_check, client_info)
            
            # 3. 限流检查
            rate_limit_check = self._check_rate_limit(user_id or client_info['ip_address'], route, 'user' if user_id else 'ip')
            if rate_limit_check['blocked']:
                return self._handle_rate_limited(request_id, route, rate_limit_check, client_info)
            
            # 4. 熔断检查
            if route.circuit_breaker_enabled:
                circuit_state = self._check_circuit_breaker(route.service_name)
                if circuit_state['open']:
                    return self._handle_circuit_breaker_open(request_id, route, circuit_state, client_info)
            
            # 5. 服务实例选择
            instances = self.oper_service.get_healthy_instances(route.service_name)
            if not instances:
                return self._handle_no_healthy_instances(request_id, route, client_info)
            
            selected_instance = self._select_instance(instances, route.load_balance_strategy)
            target_url = self._build_target_url(selected_instance, route, path)
            
            # 6. 记录请求开始
            self._log_request_start(request_id, route, target_url, client_info, user_id)
            
            # 7. 发起HTTP请求
            response_data = self._make_http_request(target_url, method, route, **kwargs)
            
            # 8. 记录成功
            if route.circuit_breaker_enabled:
                self.oper_circuit_breaker.record_success(route.service_name)
            
            # 9. 记录请求完成
            response_time = int((time.time() - start_time) * 1000)
            self._log_request_completion(request_id, response_data, response_time)
            
            return response_data, True
            
        except Exception as e:
            # 记录失败
            if 'route' in locals() and route and route.circuit_breaker_enabled:
                self.oper_circuit_breaker.record_failure(route.service_name)
            
            response_time = int((time.time() - start_time) * 1000)
            error_response = {
                'status': 500,
                'data': {'error': '網關內部錯誤', 'message': str(e)},
                'size': 0
            }
            
            if 'request_id' in locals():
                self._log_request_completion(request_id, error_response, response_time, str(e))
            
            logger.error(f"請求轉發異常: {str(e)}")
            traceback.print_exc()
            return "請求轉發失敗", False

    # ==================== 辅助方法 ====================
    
    def _check_permissions(self, user_id: str, route: ApiRouteModel) -> Dict[str, Any]:
        """检查权限"""
        try:
            if not route.required_permissions:
                return {'allowed': True, 'reason': '無權限要求'}
            
            has_permission = self.oper_permission.check_user_permission(
                user_id, 
                route.required_permissions,
                route.permission_check_strategy
            )
            
            return {
                'allowed': has_permission,
                'reason': '權限檢查通過' if has_permission else '權限不足',
                'required': route.required_permissions,
                'strategy': route.permission_check_strategy
            }
            
        except Exception as e:
            logger.error(f"權限檢查異常: {str(e)}")
            return {'allowed': False, 'reason': f'權限檢查異常: {str(e)}'}
    
    def _check_rate_limit(self, identifier: str, route: ApiRouteModel, identifier_type: str) -> Dict[str, Any]:
        """检查限流"""
        try:
            # 使用分钟级别的滑动窗口
            now = datetime.now()
            window_start = now.replace(second=0, microsecond=0)
            window_end = window_start + timedelta(minutes=1)
            
            window_start_str = window_start.strftime('%Y-%m-%d %H:%M:%S')
            window_end_str = window_end.strftime('%Y-%m-%d %H:%M:%S')
            
            # 获取或创建限流记录
            record = self.oper_rate_limit.get_current_window_record(
                identifier, identifier_type, route.path_pattern, window_start_str, window_end_str
            )
            
            if record:
                if record.request_count >= route.rate_limit_rpm:
                    return {
                        'blocked': True,
                        'reason': '超出限流限制',
                        'current_count': record.request_count,
                        'limit': route.rate_limit_rpm
                    }
                else:
                    # 更新计数
                    self.oper_rate_limit.update_request_count(record, 1)
            else:
                # 创建新记录
                record_data = {
                    'identifier': identifier,
                    'identifier_type': identifier_type,
                    'endpoint': route.path_pattern,
                    'request_count': 1,
                    'window_start': window_start_str,
                    'window_end': window_end_str
                }
                record_obj = RateLimitRecordModel(**record_data)
                self.oper_rate_limit.create_record(record_obj)
            
            return {'blocked': False, 'reason': '限流檢查通過'}
            
        except Exception as e:
            logger.error(f"限流檢查異常: {str(e)}")
            return {'blocked': False, 'reason': f'限流檢查異常，允許通過: {str(e)}'}
    
    def _check_circuit_breaker(self, service_name: str) -> Dict[str, Any]:
        """检查熔断器状态"""
        try:
            circuit = self.oper_circuit_breaker.get_by_service(service_name)
            
            if not circuit:
                return {'open': False, 'reason': '熔斷器未初始化'}
            
            if circuit.state == 'closed':
                return {'open': False, 'reason': '熔斷器關閉'}
            elif circuit.state == 'open':
                # 检查是否可以尝试半开
                if circuit.next_attempt_time and circuit.next_attempt_time <= CommonTools.get_now():
                    circuit.state = 'half_open'
                    circuit.updated_at = CommonTools.get_now()
                    DBFunction.do_commit("更新熔斷器狀態為半開", True)
                    return {'open': False, 'reason': '熔斷器轉為半開狀態'}
                else:
                    return {'open': True, 'reason': '熔斷器開啟中'}
            elif circuit.state == 'half_open':
                return {'open': False, 'reason': '熔斷器半開狀態，允許嘗試'}
            
        except Exception as e:
            logger.error(f"熔斷器檢查異常: {str(e)}")
            return {'open': False, 'reason': f'熔斷器檢查異常，允許通過: {str(e)}'}
    
    def _make_http_request(self, target_url: str, method: str, route: ApiRouteModel, **kwargs) -> Dict[str, Any]:
        """发起HTTP请求 (带重试功能)"""
        import time
        import random
        
        # 准备请求参数
        request_kwargs = {
            'timeout': route.timeout_seconds,
            'headers': kwargs.get('headers', {}),
            'params': kwargs.get('params'),
            'json': kwargs.get('json'),
            'data': kwargs.get('data')
        }
        
        # 移除None值
        request_kwargs = {k: v for k, v in request_kwargs.items() if v is not None}
        
        max_retries = route.retry_count or 3
        last_exception = None
        
        for attempt in range(max_retries + 1):  # +1 因为包含初始尝试
            try:
                # 发起请求
                response = requests.request(method, target_url, **request_kwargs)
                
                # 检查响应状态码，5xx错误需要重试
                if response.status_code >= 500 and attempt < max_retries:
                    logger.warning(f"收到5xx響應 {response.status_code}，嘗試重試 ({attempt + 1}/{max_retries})")
                    last_exception = Exception(f"服務器錯誤: {response.status_code}")
                    # 计算退避时间并继续重试
                    if attempt < max_retries:
                        delay = self._calculate_backoff_delay(attempt)
                        time.sleep(delay)
                        continue
                
                # 成功响应或客户端错误(4xx)，直接返回
                return {
                    'status': response.status_code,
                    'headers': dict(response.headers),
                    'data': response.json() if 'application/json' in response.headers.get('content-type', '') else response.text,
                    'size': len(response.content)
                }
                
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, requests.exceptions.RequestException) as e:
                last_exception = e
                logger.warning(f"請求失敗 ({attempt + 1}/{max_retries + 1}): {str(e)}")
                
                # 如果还有重试机会，等待后重试
                if attempt < max_retries:
                    delay = self._calculate_backoff_delay(attempt)
                    logger.info(f"等待 {delay:.2f} 秒後重試...")
                    time.sleep(delay)
                else:
                    # 最后一次尝试失败，抛出异常
                    break
            except Exception as e:
                # 其他异常（如解析错误等）不重试
                last_exception = e
                break
        
        # 所有重试都失败，抛出最后的异常
        if isinstance(last_exception, requests.exceptions.Timeout):
            raise Exception(f"請求超時: {route.timeout_seconds}秒 (重試{max_retries}次後失敗)")
        elif isinstance(last_exception, requests.exceptions.ConnectionError):
            raise Exception(f"目標服務連接失敗 (重試{max_retries}次後失敗)")
        else:
            raise Exception(f"HTTP請求失敗: {str(last_exception)} (重試{max_retries}次後失敗)")
    
    def _calculate_backoff_delay(self, attempt: int) -> float:
        """计算指数退避延迟时间"""
        # 指数退避算法: base_delay * (2 ^ attempt) + jitter
        base_delay = 0.1  # 基础延迟100ms
        max_delay = 5.0   # 最大延迟5秒
        
        # 计算指数退避时间
        delay = base_delay * (2 ** attempt)
        
        # 添加随机抖动(±20%)避免雪崩效应
        jitter = delay * 0.2 * random.uniform(-1, 1)
        delay += jitter
        
        # 限制最大延迟时间
        return min(delay, max_delay)
    
    def _log_request_start(self, request_id: str, route: ApiRouteModel, target_url: str, client_info: Dict, user_id: str = None):
        """记录请求开始"""
        try:
            log_data = {
                'request_id': request_id,
                'user_id': user_id,
                'method': request.method,
                'path': request.path,
                'query_params': dict(request.args),
                'headers': dict(request.headers),
                'ip_address': client_info['ip_address'],
                'user_agent': client_info['user_agent'],
                'target_service': route.service_name,
                'started_at': CommonTools.get_now_ms()
            }
            
            log_obj = ApiCallLogModel(**log_data)
            self.oper_log.create_log(log_obj)
            DBFunction.do_commit("記錄請求開始", True)
            
        except Exception as e:
            logger.warning(f"記錄請求開始失敗: {str(e)}")
    
    def _log_request_completion(self, request_id: str, response_data: Dict, response_time_ms: int, error: str = None):
        """记录请求完成"""
        try:
            completion_data = {
                'status': response_data.get('status'),
                'size': response_data.get('size', 0),
                'time_ms': response_time_ms,
                'error': error
            }
            
            self.oper_log.update_log_completion(request_id, completion_data)
            DBFunction.do_commit("記錄請求完成", True)
            
        except Exception as e:
            logger.warning(f"記錄請求完成失敗: {str(e)}")
    
    # 错误处理方法
    def _handle_route_not_found(self, request_id: str, path: str, method: str, client_info: Dict):
        """处理路由未找到"""
        error_response = {
            'error': '路由未找到',
            'path': path,
            'method': method,
            'message': '請檢查請求路徑和方法是否正確'
        }
        return error_response, False
    
    def _handle_permission_denied(self, request_id: str, route: ApiRouteModel, permission_check: Dict, client_info: Dict):
        """处理权限拒绝"""
        error_response = {
            'error': '權限不足',
            'reason': permission_check['reason'],
            'required_permissions': permission_check.get('required', []),
            'message': '請聯繫管理員獲取相應權限'
        }
        return error_response, False
    
    def _handle_rate_limited(self, request_id: str, route: ApiRouteModel, rate_check: Dict, client_info: Dict):
        """处理限流"""
        error_response = {
            'error': '請求過於頻繁',
            'reason': rate_check['reason'],
            'limit': rate_check.get('limit'),
            'current_count': rate_check.get('current_count'),
            'message': '請稍後再試'
        }
        return error_response, False
    
    def _handle_circuit_breaker_open(self, request_id: str, route: ApiRouteModel, circuit_state: Dict, client_info: Dict):
        """处理熔断器开启"""
        error_response = {
            'error': '服務暫時不可用',
            'reason': circuit_state['reason'],
            'service': route.service_name,
            'message': '目標服務異常，已啟動熔斷保護'
        }
        return error_response, False
    
    def _handle_no_healthy_instances(self, request_id: str, route: ApiRouteModel, client_info: Dict):
        """处理无健康实例"""
        error_response = {
            'error': '服務不可用',
            'service': route.service_name,
            'message': '沒有可用的服務實例'
        }
        return error_response, False

    # ==================== 管理接口 ====================
    
    def get_gateway_metrics(self) -> Tuple[Any, bool]:
        """获取网关监控指标"""
        try:
            # 获取最近24小时的统计数据
            hours = 24
            since_time = CommonTools.get_now(
                datetime.now() - timedelta(hours=hours)
            )
            
            # 总请求数
            from sqlalchemy import func
            total_requests = db.session.query(func.count(ApiCallLogModel.id)).filter(
                ApiCallLogModel.started_at >= since_time
            ).scalar() or 0
            
            # 错误请求数
            error_requests = db.session.query(func.count(ApiCallLogModel.id)).filter(
                and_(
                    ApiCallLogModel.started_at >= since_time,
                    ApiCallLogModel.response_status >= 400
                )
            ).scalar() or 0
            
            # 平均响应时间
            avg_response_time = db.session.query(func.avg(ApiCallLogModel.response_time_ms)).filter(
                ApiCallLogModel.started_at >= since_time
            ).scalar() or 0
            
            # 活跃路由数
            active_routes = db.session.query(func.count(ApiRouteModel.id)).filter(
                and_(
                    ApiRouteModel.is_active == True,
                    ApiRouteModel.status == 1
                )
            ).scalar() or 0
            
            # 健康服务实例数
            healthy_instances = db.session.query(func.count(ServiceInstanceModel.id)).filter(
                and_(
                    ServiceInstanceModel.instance_status == 'healthy',
                    ServiceInstanceModel.status == 1
                )
            ).scalar() or 0
            
            return {
                'timeframe': f'{hours}小時',
                'total_requests': total_requests,
                'error_requests': error_requests,
                'error_rate': round((error_requests / total_requests * 100) if total_requests > 0 else 0, 2),
                'avg_response_time_ms': round(float(avg_response_time), 2),
                'active_routes': active_routes,
                'healthy_instances': healthy_instances,
                'timestamp': CommonTools.get_now()
            }, True
            
        except Exception as e:
            logger.error(f"獲取網關監控指標異常: {str(e)}")
            return "獲取監控指標失敗", False

    def update_route(self, route_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新路由配置"""
        def _update_route_operation():
            result, flag = self.oper_route.update_route(route_id, update_data)
            if not flag:
                raise Exception(f"更新路由失敗: {result}")
            
            return {
                'route_id': route_id,
                'updated_fields': list(update_data.keys()),
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_update_route_operation, "更新路由")

    def delete_route(self, route_id: str) -> Tuple[Any, bool]:
        """删除路由配置"""
        def _delete_route_operation():
            result, flag = self.oper_route.delete_route(route_id)
            if not flag:
                raise Exception(f"刪除路由失敗: {result}")
            
            return {
                'route_id': route_id,
                'deleted_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_delete_route_operation, "刪除路由")

    def update_service_instance(self, instance_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新服务实例"""
        try:
            instance = self.oper_service.get_by_id(instance_id)
            if not instance:
                return "服務實例不存在", False
            
            # 更新允许的字段
            allowed_fields = ['weight', 'health_check_url', 'health_check_interval_seconds', 'metadata']
            for field, value in update_data.items():
                if field in allowed_fields and hasattr(instance, field):
                    setattr(instance, field, value)
                elif field == 'status' and value in ['healthy', 'unhealthy', 'draining']:
                    setattr(instance, 'instance_status', value)
            
            instance.updated_at = CommonTools.get_now()
            
            def _update_instance_operation():
                return {
                    'instance_id': instance_id,
                    'updated_fields': list(update_data.keys()),
                    'updated_at': instance.updated_at
                }
            
            return self._execute_with_transaction(_update_instance_operation, "更新服務實例")
            
        except Exception as e:
            logger.error(f"更新服務實例異常: {str(e)}")
            return "更新服務實例失敗", False

    def deregister_service(self, instance_id: str) -> Tuple[Any, bool]:
        """注销服务实例"""
        def _deregister_service_operation():
            result, flag = self.oper_service.deregister_instance(instance_id)
            if not flag:
                raise Exception(f"註銷服務實例失敗: {result}")
            
            return {
                'instance_id': instance_id,
                'deregistered_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_deregister_service_operation, "註銷服務實例")

    def get_permissions(self) -> Tuple[Any, bool]:
        """获取权限列表"""
        try:
            # 这里可以实现权限列表的获取逻辑
            # 暂时返回示例数据
            permissions = [
                {
                    'id': '1',
                    'permission_code': 'gateway.admin',
                    'permission_name': '網關管理員',
                    'description': '網關系統管理員權限',
                    'resource_type': 'system',
                    'actions': ['read', 'write', 'delete'],
                    'is_system': True,
                    'created_at': CommonTools.get_now()
                },
                {
                    'id': '2', 
                    'permission_code': 'service.read',
                    'permission_name': '服務查看',
                    'description': '查看服務信息權限',
                    'resource_type': 'service',
                    'actions': ['read'],
                    'is_system': False,
                    'created_at': CommonTools.get_now()
                }
            ]
            
            return {
                'total': len(permissions),
                'permissions': permissions
            }, True
            
        except Exception as e:
            logger.error(f"獲取權限列表異常: {str(e)}")
            return "獲取權限列表失敗", False

    def create_permission(self, data: Dict) -> Tuple[Any, bool]:
        """创建权限"""
        def _create_permission_operation():
            # 创建权限对象
            permission_data = {
                'permission_code': data['permission_code'].strip(),
                'permission_name': data['permission_name'].strip(),
                'description': data.get('description', '').strip(),
                'resource_type': data.get('resource_type', '').strip(),
                'actions': data.get('actions', []),
                'is_system': data.get('is_system', False)
            }
            
            permission_obj = PermissionModel(**permission_data)
            result, flag = self.oper_permission.create_permission(permission_obj)
            if not flag:
                raise Exception(f"創建權限失敗: {result}")
            
            return {
                'permission_code': permission_data['permission_code'],
                'permission_name': permission_data['permission_name'],
                'created_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_create_permission_operation, "創建權限")