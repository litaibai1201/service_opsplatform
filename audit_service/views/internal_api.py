# -*- coding: utf-8 -*-
"""
@文件: internal_api.py
@說明: 內部審計API (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint

from common.common_method import fail_response_result, response_result
from controllers.audit_controller import AuditController
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.audit_serialize import (
    AuditLogCreateSchema, SecurityEventCreateSchema
)
from common.common_tools import CommonTools
from loggers import logger


internal_blp = Blueprint("internal_audit_api", __name__, url_prefix="/internal")


class BaseInternalAuditView(MethodView):
    """内部审计API基类"""
    
    def __init__(self):
        super().__init__()
        # 使用单例模式的控制器，避免重复初始化
        if not hasattr(g, 'audit_controller'):
            g.audit_controller = AuditController()
        self.ac = g.audit_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"内部API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)
    
    def _validate_internal_request(self):
        """验证内部请求来源"""
        # 检查请求头中的内部服务标识
        service_key = request.headers.get('X-Internal-Service-Key')
        service_name = request.headers.get('X-Service-Name')
        
        # 这里可以实现更严格的内部服务验证逻辑
        # 例如检查预定义的服务密钥、IP白名单等
        expected_key = "internal_audit_key_2025"  # 应该从配置文件获取
        
        if not service_key or service_key != expected_key:
            return False, "內部服務認證失敗"
        
        if not service_name:
            return False, "缺少服務名稱標識"
        
        return True, service_name


# ==================== 内部审计日志接口 ====================

@internal_blp.route("/audit/log")
class InternalAuditLogApi(BaseInternalAuditView):
    """内部审计日志API"""

    @internal_blp.arguments(AuditLogCreateSchema)
    @internal_blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """记录审计日志"""
        try:
            # 验证内部请求
            valid, service_info = self._validate_internal_request()
            if not valid:
                return fail_response_result(msg=service_info)
            
            # 添加请求来源信息
            client_info = self._get_client_info()
            payload.update({
                'ip_address': payload.get('ip_address') or client_info['ip_address'],
                'user_agent': payload.get('user_agent') or client_info['user_agent'],
                'request_id': payload.get('request_id') or client_info['request_id']
            })
            
            # 记录审计日志
            result, flag = self.ac.record_audit_log(payload)
            return self._build_response(result, flag, "記錄審計日誌成功")
            
        except Exception as e:
            logger.error(f"記錄內部審計日誌異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤")
    
    def _get_client_info(self):
        """获取客户端信息"""
        return {
            'ip_address': request.remote_addr or request.headers.get('X-Forwarded-For', '未知'),
            'user_agent': request.headers.get('User-Agent', '未知'),
            'request_id': request.headers.get('X-Request-ID', CommonTools.get_uuid())
        }


@internal_blp.route("/audit/security-event")
class InternalSecurityEventApi(BaseInternalAuditView):
    """内部安全事件API"""

    @internal_blp.arguments(SecurityEventCreateSchema)
    @internal_blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """记录安全事件"""
        try:
            # 验证内部请求
            valid, service_info = self._validate_internal_request()
            if not valid:
                return fail_response_result(msg=service_info)
            
            # 添加请求来源信息
            client_info = self._get_client_info()
            payload.update({
                'ip_address': payload.get('ip_address') or client_info['ip_address']
            })
            
            # 添加服务来源信息到详情中
            if isinstance(payload.get('details'), dict):
                payload['details']['source_service'] = service_info
                payload['details']['reported_at'] = CommonTools.get_now()
            
            # 记录安全事件
            result, flag = self.ac.record_security_event(payload)
            return self._build_response(result, flag, "記錄安全事件成功")
            
        except Exception as e:
            logger.error(f"記錄內部安全事件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤")


# ==================== 批量操作接口 ====================

@internal_blp.route("/audit/logs/batch")
class InternalBatchAuditLogApi(BaseInternalAuditView):
    """内部批量审计日志API"""

    @internal_blp.arguments({"type": "array", "items": AuditLogCreateSchema})
    @internal_blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """批量记录审计日志"""
        try:
            # 验证内部请求
            valid, service_info = self._validate_internal_request()
            if not valid:
                return fail_response_result(msg=service_info)
            
            if not isinstance(payload, list) or len(payload) == 0:
                return fail_response_result(msg="批量數據不能為空")
            
            if len(payload) > 1000:  # 限制批量大小
                return fail_response_result(msg="批量數據超出限制，最多1000條")
            
            # 批量处理
            results = []
            errors = []
            client_info = self._get_client_info()
            
            for i, log_data in enumerate(payload):
                try:
                    # 添加请求来源信息
                    log_data.update({
                        'ip_address': log_data.get('ip_address') or client_info['ip_address'],
                        'user_agent': log_data.get('user_agent') or client_info['user_agent'],
                        'request_id': log_data.get('request_id') or f"{client_info['request_id']}-{i}"
                    })
                    
                    result, flag = self.ac.record_audit_log(log_data)
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
                'total': len(payload),
                'successful': len(results),
                'failed': len(errors),
                'results': results,
                'errors': errors
            }
            
            return response_result(content=response_data, msg="批量記錄審計日誌完成")
            
        except Exception as e:
            logger.error(f"批量記錄內部審計日誌異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤")


# ==================== 健康检查接口 ====================

@internal_blp.route("/health")
class InternalHealthApi(MethodView):
    """内部健康检查API"""

    @internal_blp.response(200, RspMsgDictSchema)
    def get(self):
        """内部健康检查"""
        health_data = {
            'status': 'healthy',
            'service': 'audit-service-internal',
            'timestamp': CommonTools.get_now(),
            'endpoints': [
                '/internal/audit/log',
                '/internal/audit/security-event',
                '/internal/audit/logs/batch'
            ]
        }
        
        # 简单的服务可用性检查
        try:
            audit_controller = AuditController()
            # 测试核心功能是否正常
            test_result = audit_controller._get_client_info() if hasattr(audit_controller, '_get_client_info') else True
            if test_result:
                health_data['audit_controller'] = 'operational'
            else:
                health_data['audit_controller'] = 'degraded'
                health_data['status'] = 'degraded'
        except Exception as e:
            logger.error(f"內部健康檢查異常: {str(e)}")
            health_data['audit_controller'] = 'error'
            health_data['status'] = 'unhealthy'
            health_data['error'] = str(e)
        
        if health_data['status'] == 'healthy':
            return response_result(content=health_data, msg="內部服務正常")
        else:
            return fail_response_result(content=health_data, msg="內部服務異常")


# ==================== 配置查询接口 ====================

@internal_blp.route("/audit/config/check")
class InternalAuditConfigCheckApi(BaseInternalAuditView):
    """内部审计配置检查API"""

    def get(self):
        """检查服务的审计配置"""
        try:
            # 验证内部请求
            valid, service_name = self._validate_internal_request()
            if not valid:
                return fail_response_result(msg=service_name)
            
            # 获取服务的审计配置
            result, flag = self.ac.get_audit_config(service_name)
            if flag and result.get('configurations'):
                # 返回该服务的配置信息
                service_configs = [
                    config for config in result['configurations'] 
                    if config['service_name'] == service_name
                ]
                
                config_map = {}
                for config in service_configs:
                    config_map[config['action_type']] = {
                        'is_enabled': config['is_enabled'],
                        'log_level': config['log_level'],
                        'include_request_data': config['include_request_data'],
                        'include_response_data': config['include_response_data'],
                        'retention_days': config['retention_days']
                    }
                
                return response_result(
                    content={
                        'service_name': service_name,
                        'configurations': config_map,
                        'total_configs': len(service_configs)
                    },
                    msg="獲取審計配置成功"
                )
            else:
                # 返回默认配置
                return response_result(
                    content={
                        'service_name': service_name,
                        'configurations': {},
                        'default_config': {
                            'is_enabled': True,
                            'log_level': 'basic',
                            'include_request_data': False,
                            'include_response_data': False,
                            'retention_days': 90
                        }
                    },
                    msg="使用默認審計配置"
                )
            
        except Exception as e:
            logger.error(f"檢查內部審計配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤")


# 错误处理器
@internal_blp.errorhandler(422)
def handle_validation_error(error):
    """处理422验证错误"""
    return fail_response_result(msg="內部API參數驗證失敗")


@internal_blp.errorhandler(500)
def handle_internal_error(error):
    """处理500内部错误"""
    logger.error(f"內部API服務器錯誤: {str(error)}")
    return fail_response_result(msg="內部API服務器錯誤")


# 请求前处理
@internal_blp.before_request
def before_request():
    """内部API请求前处理"""
    # 记录内部API访问日志
    service_name = request.headers.get('X-Service-Name', 'unknown')
    logger.info(f"內部API訪問: {request.method} {request.path} - 服務: {service_name} - IP: {request.remote_addr}")


# 响应后处理  
@internal_blp.after_request
def after_request(response):
    """内部API响应后处理"""
    # 添加内部API标识
    response.headers['X-Internal-API'] = 'audit-service'
    response.headers['X-API-Version'] = '1.0.0'
    
    return response