# -*- coding: utf-8 -*-
"""
@文件: gateway_api.py
@說明: 網關API (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from common.common_method import fail_response_result, response_result
from controllers.gateway_controller import GatewayController
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.gateway_serialize import (
    RouteCreateSchema, RouteUpdateSchema, RouteQuerySchema, RouteResponseSchema,
    ServiceInstanceRegisterSchema, ServiceInstanceUpdateSchema, ServiceQuerySchema,
    ServiceInstanceResponseSchema, PermissionCreateSchema, UserPermissionGrantSchema,
    PermissionResponseSchema, LogQuerySchema, ApiLogResponseSchema,
    MetricsQuerySchema, MetricsResponseSchema, HealthCheckResponseSchema,
    BatchRouteCreateSchema, BatchServiceRegisterSchema, BatchPermissionGrantSchema,
    ProxyRequestSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("gateway_api", __name__)


class BaseGatewayView(MethodView):
    """网关API基类 - 统一控制器管理和错误处理"""
    
    def __init__(self):
        super().__init__()
        # 使用单例模式的控制器，避免重复初始化
        if not hasattr(g, 'gateway_controller'):
            g.gateway_controller = GatewayController()
        self.gc = g.gateway_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 管理接口 ====================

@blp.route("/admin/routes")
class RouteManagementApi(BaseGatewayView):
    """路由管理API"""

    @jwt_required()
    @blp.arguments(RouteQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取路由配置列表"""
        try:
            service_name = query_params.get('service_name')
            result, flag = self.gc.get_routes(service_name)
            return self._build_response(result, flag, "獲取路由配置成功")
        except Exception as e:
            logger.error(f"獲取路由配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(RouteCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """创建路由配置"""
        try:
            # 检查管理员权限
            current_user_id = get_jwt_identity()
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.gc.create_route(payload)
            return self._build_response(result, flag, "創建路由配置成功")
        except Exception as e:
            logger.error(f"創建路由配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/admin/routes/<route_id>")
class RouteDetailApi(BaseGatewayView):
    """路由详情API"""

    @jwt_required()
    @blp.arguments(RouteUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, route_id):
        """更新路由配置"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.gc.update_route(route_id, payload)
            return self._build_response(result, flag, "更新路由配置成功")
        except Exception as e:
            logger.error(f"更新路由配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, route_id):
        """删除路由配置"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.gc.delete_route(route_id)
            return self._build_response(result, flag, "刪除路由配置成功")
        except Exception as e:
            logger.error(f"刪除路由配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/admin/services")
class ServiceManagementApi(BaseGatewayView):
    """服务管理API"""

    @jwt_required()
    @blp.arguments(ServiceQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取服务实例列表"""
        try:
            service_name = query_params.get('service_name')
            if not service_name:
                return fail_response_result(msg="服務名稱為必填參數")
            
            result, flag = self.gc.get_service_instances(service_name)
            return self._build_response(result, flag, "獲取服務實例成功")
        except Exception as e:
            logger.error(f"獲取服務實例異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(ServiceInstanceRegisterSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """注册服务实例"""
        try:
            result, flag = self.gc.register_service(payload)
            return self._build_response(result, flag, "註冊服務實例成功")
        except Exception as e:
            logger.error(f"註冊服務實例異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/admin/services/<instance_id>")
class ServiceInstanceDetailApi(BaseGatewayView):
    """服务实例详情API"""

    @jwt_required()
    @blp.arguments(ServiceInstanceUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, instance_id):
        """更新服务实例"""
        try:
            result, flag = self.gc.update_service_instance(instance_id, payload)
            return self._build_response(result, flag, "更新服務實例成功")
        except Exception as e:
            logger.error(f"更新服務實例異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, instance_id):
        """注销服务实例"""
        try:
            result, flag = self.gc.deregister_service(instance_id)
            return self._build_response(result, flag, "註銷服務實例成功")
        except Exception as e:
            logger.error(f"註銷服務實例異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/admin/permissions")
class PermissionManagementApi(BaseGatewayView):
    """权限管理API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取权限配置"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.gc.get_permissions()
            return self._build_response(result, flag, "獲取權限配置成功")
        except Exception as e:
            logger.error(f"獲取權限配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(PermissionCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """创建权限"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.gc.create_permission(payload)
            return self._build_response(result, flag, "創建權限成功")
        except Exception as e:
            logger.error(f"創建權限異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 监控指标接口 ====================

@blp.route("/metrics")
class MetricsApi(BaseGatewayView):
    """监控指标API"""

    @blp.arguments(MetricsQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取监控指标（Prometheus格式）"""
        try:
            result, flag = self.gc.get_gateway_metrics()
            if flag:
                # 转换为Prometheus格式
                metrics_text = self._convert_to_prometheus_format(result)
                return response_result(content={'metrics': metrics_text}, msg="獲取監控指標成功")
            else:
                return self._build_response(result, flag, "獲取監控指標失敗")
        except Exception as e:
            logger.error(f"獲取監控指標異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")
    
    def _convert_to_prometheus_format(self, data):
        """转换为Prometheus格式"""
        metrics = []
        metrics.append(f"# HELP gateway_requests_total Total number of requests")
        metrics.append(f"# TYPE gateway_requests_total counter")
        metrics.append(f"gateway_requests_total {data.get('total_requests', 0)}")
        
        metrics.append(f"# HELP gateway_errors_total Total number of error requests")
        metrics.append(f"# TYPE gateway_errors_total counter")
        metrics.append(f"gateway_errors_total {data.get('error_requests', 0)}")
        
        metrics.append(f"# HELP gateway_response_time_ms Average response time in milliseconds")
        metrics.append(f"# TYPE gateway_response_time_ms gauge")
        metrics.append(f"gateway_response_time_ms {data.get('avg_response_time_ms', 0)}")
        
        metrics.append(f"# HELP gateway_active_routes Number of active routes")
        metrics.append(f"# TYPE gateway_active_routes gauge")
        metrics.append(f"gateway_active_routes {data.get('active_routes', 0)}")
        
        metrics.append(f"# HELP gateway_healthy_instances Number of healthy service instances")
        metrics.append(f"# TYPE gateway_healthy_instances gauge")
        metrics.append(f"gateway_healthy_instances {data.get('healthy_instances', 0)}")
        
        return '\n'.join(metrics)


# ==================== 健康检查接口 ====================

@blp.route("/health")
class GatewayHealthApi(MethodView):
    """网关健康检查API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """健康检查"""
        health_data = {
            'status': 'healthy',
            'service': 'api-gateway',
            'timestamp': CommonTools.get_now(),
            'version': '1.0.0'
        }
        
        issues = []
        
        # 检查数据库连接
        try:
            from dbs.mysql_db import db
            from sqlalchemy import text
            result = db.session.execute(text('SELECT 1'))
            result.fetchone()
            health_data['database'] = 'connected'
        except Exception as db_error:
            logger.error(f"数据库连接检查失敗: {str(db_error)}")
            health_data['database'] = f'error: {str(db_error)}'
            issues.append(f'数据库: {str(db_error)}')
        
        # 检查缓存连接
        try:
            from cache import redis_client
            if redis_client.redis_client is None:
                health_data['cache'] = 'not_initialized'
                issues.append('缓存: Redis客户端未初始化')
            else:
                redis_client.ping()
                health_data['cache'] = 'connected'
        except Exception as cache_error:
            logger.error(f"缓存连接检查失敗: {str(cache_error)}")
            health_data['cache'] = f'error: {str(cache_error)}'
            issues.append(f'缓存: {str(cache_error)}')
        
        # 检查关键服务状态
        try:
            from controllers.gateway_controller import GatewayController
            gc = GatewayController()
            
            # 获取活跃路由数
            routes_result, routes_flag = gc.get_routes()
            if routes_flag:
                health_data['active_routes'] = routes_result.get('total', 0)
            else:
                health_data['active_routes'] = 'error'
                issues.append('路由配置检查失败')
                
        except Exception as service_error:
            logger.error(f"服务状态检查失敗: {str(service_error)}")
            issues.append(f'服务状态: {str(service_error)}')
        
        # 判断整体健康状态
        if issues:
            health_data['status'] = 'unhealthy'
            health_data['issues'] = issues
            return fail_response_result(content=health_data, msg="服務異常")
        else:
            return response_result(content=health_data, msg="服務正常")


# ==================== 动态路由转发接口 ====================

@blp.route("/<path:path>", methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
class DynamicRouteApi(BaseGatewayView):
    """动态路由转发API - 处理所有业务请求"""

    def _handle_request(self, path):
        """处理所有类型的HTTP请求"""
        try:
            # 跳过特殊路径
            if self._should_skip_path(path):
                return fail_response_result(msg="路徑不支持"), 404
            
            # 获取用户身份信息
            user_id = None
            try:
                if request.headers.get('Authorization'):
                    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
                    verify_jwt_in_request()
                    user_id = get_jwt_identity()
            except Exception:
                # 如果JWT验证失败，继续处理（可能是不需要认证的接口）
                pass
            
            # 准备转发参数
            forward_params = {
                'user_id': user_id,
                'headers': dict(request.headers),
                'params': dict(request.args),
                'json': request.get_json(silent=True),
                'data': request.get_data() if request.content_type != 'application/json' else None
            }
            
            # 调用控制器进行请求转发
            result, flag = self.gc.forward_request(f"/{path}", request.method, **forward_params)
            
            if flag:
                # 成功转发，返回目标服务的响应
                response_data = result
                status_code = response_data.get('status', 200)
                headers = response_data.get('headers', {})
                data = response_data.get('data')
                
                # 构建响应
                if isinstance(data, dict):
                    response = jsonify(data)
                else:
                    response = jsonify({'data': data})
                
                response.status_code = status_code
                
                # 添加响应头（过滤掉一些不需要的头）
                skip_headers = {'content-length', 'content-encoding', 'transfer-encoding', 'connection'}
                for key, value in headers.items():
                    if key.lower() not in skip_headers:
                        response.headers[key] = value
                
                return response
            else:
                # 转发失败，返回错误信息
                return fail_response_result(msg=str(result))
                
        except Exception as e:
            logger.error(f"動態路由轉發異常: {str(e)}")
            return fail_response_result(msg="網關內部錯誤")
    
    def _should_skip_path(self, path):
        """检查是否应该跳过的路径"""
        skip_patterns = [
            'admin/', 'health', 'metrics', 'swagger-ui', 'openapi.json'
        ]
        
        for pattern in skip_patterns:
            if path.startswith(pattern):
                return True
        
        return False

    def get(self, path):
        """处理GET请求"""
        return self._handle_request(path)
    
    def post(self, path):
        """处理POST请求"""
        return self._handle_request(path)
    
    def put(self, path):
        """处理PUT请求"""
        return self._handle_request(path)
    
    def delete(self, path):
        """处理DELETE请求"""
        return self._handle_request(path)
    
    def patch(self, path):
        """处理PATCH请求"""
        return self._handle_request(path)
    
    def options(self, path):
        """处理OPTIONS请求"""
        return self._handle_request(path)


# ==================== 批量操作接口 ====================

@blp.route("/admin/batch/routes")
class BatchRouteApi(BaseGatewayView):
    """批量路由操作API"""

    @jwt_required()
    @blp.arguments(BatchRouteCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """批量创建路由配置"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            routes = payload.get('routes', [])
            results = []
            errors = []
            
            for i, route_data in enumerate(routes):
                try:
                    result, flag = self.gc.create_route(route_data)
                    if flag:
                        results.append({
                            'index': i,
                            'status': 'success',
                            'data': result
                        })
                    else:
                        errors.append({
                            'index': i,
                            'status': 'error',
                            'message': str(result)
                        })
                except Exception as e:
                    errors.append({
                        'index': i,
                        'status': 'error',
                        'message': str(e)
                    })
            
            response_data = {
                'total': len(routes),
                'successful': len(results),
                'failed': len(errors),
                'results': results,
                'errors': errors
            }
            
            return response_result(content=response_data, msg="批量創建路由完成")
            
        except Exception as e:
            logger.error(f"批量創建路由異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# 错误处理器
@blp.errorhandler(401)
def handle_unauthorized(error):
    """处理401未授权错误"""
    return fail_response_result(msg="未授權訪問，請先登錄")


@blp.errorhandler(403)
def handle_forbidden(error):
    """处理403禁止访问错误"""
    return fail_response_result(msg="禁止訪問，權限不足")


@blp.errorhandler(422)
def handle_validation_error(error):
    """处理422验证错误"""
    return fail_response_result(msg="請求參數驗證失敗")


@blp.errorhandler(500)
def handle_internal_error(error):
    """处理500内部错误"""
    logger.error(f"內部服務器錯誤: {str(error)}")
    return fail_response_result(msg="內部服務器錯誤")


# 请求前处理
@blp.before_request
def before_request():
    """请求前处理"""
    # 记录API访问日志（排除健康检查）
    if request.endpoint and not request.endpoint.endswith('health') and not request.path.startswith('/metrics'):
        logger.info(f"API訪問: {request.method} {request.path} - IP: {request.remote_addr}")


# 响应后处理
@blp.after_request
def after_request(response):
    """响应后处理"""
    # 添加安全头
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # 添加CORS头
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    
    return response