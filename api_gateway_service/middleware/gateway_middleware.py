# -*- coding: utf-8 -*-
"""
@文件: gateway_middleware.py
@說明: 網關中間件 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

import time
import uuid
from functools import wraps
from typing import Dict, Any, Optional
from flask import request, g, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt

from common.common_method import fail_response_result
from models.gateway_model import OperApiRouteModel, OperRateLimitRecordModel
from loggers import logger
from cache import redis_client


class GatewayMiddleware:
    """网关中间件类"""
    
    def __init__(self, app=None):
        self.app = app
        self.oper_route = OperApiRouteModel()
        self.oper_rate_limit = OperRateLimitRecordModel()
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """初始化应用"""
        self.app = app
        
        # 注册请求前处理
        app.before_request(self.before_request)
        
        # 注册请求后处理
        app.after_request(self.after_request)
    
    def before_request(self):
        """请求前处理"""
        # 生成请求ID
        g.request_id = str(uuid.uuid4())
        g.start_time = time.time()
        
        # 记录请求开始
        logger.info(f"請求開始 [{g.request_id}]: {request.method} {request.path}")
        
        # 跳过特殊路径
        if self._should_skip_middleware():
            return None
        
        # CORS 预检请求处理
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'ok'})
            response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,PATCH,OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Request-ID,x-request-id'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Max-Age'] = '3600'
            return response
        
        return None
    
    def after_request(self, response):
        """请求后处理"""
        # 计算请求时间
        if hasattr(g, 'start_time'):
            request_time = int((time.time() - g.start_time) * 1000)
            response.headers['X-Response-Time'] = f"{request_time}ms"
        
        # 添加请求ID到响应头
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
            logger.info(f"請求完成 [{g.request_id}]: {response.status_code} ({request_time if 'request_time' in locals() else '?'}ms)")
        
        # 添加安全头
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # 添加CORS头
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,PATCH,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Request-ID,x-request-id'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Expose-Headers'] = 'X-Request-ID,X-Response-Time'
        
        return response
    
    def _should_skip_middleware(self):
        """检查是否跳过中间件处理"""
        skip_paths = [
            '/health', '/metrics', '/swagger-ui', '/openapi.json',
            '/admin', '/static'
        ]
        
        for path in skip_paths:
            if request.path.startswith(path):
                return True
        
        return False


def require_auth(optional=False):
    """认证装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                g.current_user_id = get_jwt_identity()
                g.current_user_claims = get_jwt()
                return f(*args, **kwargs)
            except Exception as e:
                if not optional:
                    logger.warning(f"認證失敗: {str(e)}")
                    return fail_response_result(msg="未授權訪問，請先登錄"), 401
                else:
                    # 可选认证，即使失败也继续处理
                    g.current_user_id = None
                    g.current_user_claims = {}
                    return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_permission(permission_codes, strategy='any'):
    """权限验证装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 先进行认证
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                user_claims = get_jwt()
            except Exception as e:
                logger.warning(f"認證失敗: {str(e)}")
                return fail_response_result(msg="未授權訪問，請先登錄"), 401
            
            # 检查权限
            try:
                from models.gateway_model import OperPermissionModel
                oper_permission = OperPermissionModel()
                
                if isinstance(permission_codes, str):
                    permission_codes_list = [permission_codes]
                else:
                    permission_codes_list = permission_codes
                
                has_permission = oper_permission.check_user_permission(
                    user_id, permission_codes_list, strategy
                )
                
                if not has_permission:
                    return fail_response_result(msg="權限不足"), 403
                
                g.current_user_id = user_id
                g.current_user_claims = user_claims
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"權限檢查異常: {str(e)}")
                return fail_response_result(msg="權限檢查失敗"), 500
        
        return decorated_function
    return decorator


def require_admin():
    """管理员权限装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_claims = get_jwt()
                user_role = user_claims.get('role', 'user')
                
                if user_role != 'admin':
                    return fail_response_result(msg="權限不足，僅管理員可操作"), 403
                
                g.current_user_id = get_jwt_identity()
                g.current_user_claims = user_claims
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.warning(f"管理員認證失敗: {str(e)}")
                return fail_response_result(msg="未授權訪問，請先登錄"), 401
        
        return decorated_function
    return decorator


class RateLimitMiddleware:
    """限流中间件"""
    
    def __init__(self, app=None):
        self.app = app
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """初始化应用"""
        self.app = app
    
    def check_rate_limit(self, identifier, endpoint, limit=100, window=60):
        """检查限流
        
        Args:
            identifier: 标识符（用户ID、IP等）
            endpoint: 端点
            limit: 限制次数
            window: 时间窗口（秒）
        """
        try:
            # 使用Redis滑动窗口算法
            current_time = int(time.time())
            window_start = current_time - window
            
            # Redis键
            key = f"rate_limit:{identifier}:{endpoint}"
            
            # 使用Redis管道提高性能
            pipe = redis_client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)  # 删除过期记录
            pipe.zcard(key)  # 获取当前计数
            pipe.zadd(key, {str(uuid.uuid4()): current_time})  # 添加当前请求
            pipe.expire(key, window)  # 设置键过期时间
            
            results = pipe.execute()
            current_count = results[1]
            
            if current_count >= limit:
                return {
                    'allowed': False,
                    'current_count': current_count,
                    'limit': limit,
                    'window': window,
                    'retry_after': window
                }
            
            return {
                'allowed': True,
                'current_count': current_count + 1,
                'limit': limit,
                'window': window
            }
            
        except Exception as e:
            logger.error(f"限流檢查異常: {str(e)}")
            # 异常时允许通过，避免影响正常服务
            return {'allowed': True, 'error': str(e)}


def rate_limit(limit=100, window=60, per='ip', key_func=None):
    """限流装饰器
    
    Args:
        limit: 限制次数
        window: 时间窗口（秒）
        per: 限流类型 ('ip', 'user', 'custom')
        key_func: 自定义键函数
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 确定限流标识符
            if key_func:
                identifier = key_func()
            elif per == 'user':
                try:
                    identifier = get_jwt_identity()
                    if not identifier:
                        identifier = request.remote_addr
                except:
                    identifier = request.remote_addr
            elif per == 'ip':
                identifier = request.remote_addr
            else:
                identifier = f"{per}:default"
            
            # 检查限流
            rate_limiter = RateLimitMiddleware()
            result = rate_limiter.check_rate_limit(
                identifier, request.endpoint or request.path, limit, window
            )
            
            if not result.get('allowed', True):
                response = fail_response_result(
                    msg=f"請求過於頻繁，請{result.get('retry_after', window)}秒後重試"
                )
                
                # 添加限流相关头部
                headers = {
                    'X-RateLimit-Limit': str(limit),
                    'X-RateLimit-Remaining': str(max(0, limit - result.get('current_count', 0))),
                    'X-RateLimit-Reset': str(int(time.time()) + result.get('retry_after', window)),
                    'Retry-After': str(result.get('retry_after', window))
                }
                
                return response, 429, headers
            
            # 添加限流信息到响应头
            response = f(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(limit)
                response.headers['X-RateLimit-Remaining'] = str(max(0, limit - result.get('current_count', 0)))
                response.headers['X-RateLimit-Reset'] = str(int(time.time()) + window)
            
            return response
        
        return decorated_function
    return decorator


class CircuitBreakerMiddleware:
    """熔断器中间件"""
    
    def __init__(self, app=None):
        self.app = app
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """初始化应用"""
        self.app = app
    
    def check_circuit_breaker(self, service_name):
        """检查熔断器状态"""
        try:
            from models.gateway_model import OperCircuitBreakerModel
            oper_circuit_breaker = OperCircuitBreakerModel()
            
            circuit = oper_circuit_breaker.get_by_service(service_name)
            
            if not circuit:
                return {'open': False, 'reason': '熔斷器未初始化'}
            
            if circuit.state == 'closed':
                return {'open': False, 'reason': '熔斷器關閉'}
            elif circuit.state == 'open':
                # 检查是否可以尝试半开
                from common.common_tools import CommonTools
                if circuit.next_attempt_time and circuit.next_attempt_time <= CommonTools.get_now():
                    # 转为半开状态
                    circuit.state = 'half_open'
                    circuit.updated_at = CommonTools.get_now()
                    return {'open': False, 'reason': '熔斷器轉為半開狀態'}
                else:
                    return {'open': True, 'reason': '熔斷器開啟中'}
            elif circuit.state == 'half_open':
                return {'open': False, 'reason': '熔斷器半開狀態，允許嘗試'}
            
        except Exception as e:
            logger.error(f"熔斷器檢查異常: {str(e)}")
            return {'open': False, 'reason': f'熔斷器檢查異常，允許通過: {str(e)}'}


def circuit_breaker(service_name, failure_threshold=5, timeout=60):
    """熔断器装饰器
    
    Args:
        service_name: 服务名称
        failure_threshold: 失败阈值
        timeout: 熔断超时时间（秒）
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 检查熔断器状态
            cb_middleware = CircuitBreakerMiddleware()
            circuit_state = cb_middleware.check_circuit_breaker(service_name)
            
            if circuit_state.get('open', False):
                return fail_response_result(
                    msg=f"服務 {service_name} 暫時不可用: {circuit_state.get('reason')}"
                ), 503
            
            try:
                # 执行函数
                result = f(*args, **kwargs)
                
                # 记录成功
                from models.gateway_model import OperCircuitBreakerModel
                oper_circuit_breaker = OperCircuitBreakerModel()
                oper_circuit_breaker.record_success(service_name)
                
                return result
                
            except Exception as e:
                # 记录失败
                try:
                    from models.gateway_model import OperCircuitBreakerModel
                    oper_circuit_breaker = OperCircuitBreakerModel()
                    oper_circuit_breaker.record_failure(service_name)
                except Exception as record_error:
                    logger.error(f"記錄熔斷器失敗異常: {str(record_error)}")
                
                raise e
        
        return decorated_function
    return decorator


# 全局中间件实例
gateway_middleware = GatewayMiddleware()
rate_limit_middleware = RateLimitMiddleware()
circuit_breaker_middleware = CircuitBreakerMiddleware()