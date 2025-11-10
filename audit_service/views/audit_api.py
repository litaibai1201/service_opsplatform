# -*- coding: utf-8 -*-
"""
@文件: audit_api.py
@說明: 審計API (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g, jsonify, send_file
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from common.common_method import fail_response_result, response_result
from controllers.audit_controller import AuditController
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.audit_serialize import (
    AuditLogQuerySchema, AuditLogSearchSchema, AuditStatisticsQuerySchema,
    SecurityEventQuerySchema, SecurityEventInvestigateSchema, SecurityEventResolveSchema, SecurityEventAssignSchema,
    ComplianceReportQuerySchema, ComplianceReportGenerateSchema,
    AuditConfigQuerySchema, AuditConfigUpdateSchema, RetentionPolicyUpdateSchema,
    AuditExportSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("audit_api", __name__)


class BaseAuditView(MethodView):
    """审计API基类 - 统一控制器管理和错误处理"""
    
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
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 审计日志接口 ====================

@blp.route("/audit/logs")
class AuditLogsApi(BaseAuditView):
    """审计日志API"""

    @jwt_required()
    @blp.arguments(AuditLogQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取审计日志"""
        try:
            result, flag = self.ac.get_audit_logs(
                filters=query_params,
                page=query_params.get('page', 1),
                per_page=query_params.get('per_page', 20)
            )
            return self._build_response(result, flag, "獲取審計日誌成功")
        except Exception as e:
            logger.error(f"獲取審計日誌異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/logs/search")
class AuditLogsSearchApi(BaseAuditView):
    """审计日志搜索API"""

    @jwt_required()
    @blp.arguments(AuditLogSearchSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """搜索审计日志"""
        try:
            result, flag = self.ac.search_audit_logs(
                query=query_params['query'],
                filters=query_params.get('filters'),
                page=query_params.get('page', 1),
                per_page=query_params.get('per_page', 20)
            )
            return self._build_response(result, flag, "搜索審計日誌成功")
        except Exception as e:
            logger.error(f"搜索審計日誌異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/logs/export")
class AuditLogsExportApi(BaseAuditView):
    """审计日志导出API"""

    @jwt_required()
    @blp.arguments(AuditExportSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """导出审计日志"""
        try:
            current_user_id = get_jwt_identity()
            payload['created_by'] = current_user_id
            
            result, flag = self.ac.export_audit_logs(payload)
            return self._build_response(result, flag, "創建導出任務成功")
        except Exception as e:
            logger.error(f"導出審計日誌異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/logs/statistics")
class AuditLogsStatisticsApi(BaseAuditView):
    """审计日志统计API"""

    @jwt_required()
    @blp.arguments(AuditStatisticsQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取审计统计"""
        try:
            result, flag = self.ac.get_audit_statistics(query_params)
            return self._build_response(result, flag, "獲取審計統計成功")
        except Exception as e:
            logger.error(f"獲取審計統計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 安全事件接口 ====================

@blp.route("/audit/security-events")
class SecurityEventsApi(BaseAuditView):
    """安全事件API"""

    @jwt_required()
    @blp.arguments(SecurityEventQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取安全事件"""
        try:
            result, flag = self.ac.get_security_events(
                filters=query_params,
                page=query_params.get('page', 1),
                per_page=query_params.get('per_page', 20)
            )
            return self._build_response(result, flag, "獲取安全事件成功")
        except Exception as e:
            logger.error(f"獲取安全事件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/security-events/<event_id>/investigate")
class SecurityEventInvestigateApi(BaseAuditView):
    """安全事件调查API"""

    @jwt_required()
    @blp.arguments(SecurityEventInvestigateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload, event_id):
        """开始调查安全事件"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role not in ['admin', 'security_admin']:
                return fail_response_result(msg="權限不足，僅安全管理員可操作")
            
            result, flag = self.ac.investigate_security_event(event_id, payload['assigned_to'])
            return self._build_response(result, flag, "開始調查安全事件成功")
        except Exception as e:
            logger.error(f"開始調查安全事件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/security-events/<event_id>/resolve")
class SecurityEventResolveApi(BaseAuditView):
    """安全事件解决API"""

    @jwt_required()
    @blp.arguments(SecurityEventResolveSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload, event_id):
        """解决安全事件"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role not in ['admin', 'security_admin']:
                return fail_response_result(msg="權限不足，僅安全管理員可操作")
            
            result, flag = self.ac.resolve_security_event(event_id, payload['resolution_notes'])
            return self._build_response(result, flag, "解決安全事件成功")
        except Exception as e:
            logger.error(f"解決安全事件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/security-events/<event_id>/assign")
class SecurityEventAssignApi(BaseAuditView):
    """安全事件分配API"""

    @jwt_required()
    @blp.arguments(SecurityEventAssignSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, event_id):
        """分配安全事件"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role not in ['admin', 'security_admin']:
                return fail_response_result(msg="權限不足，僅安全管理員可操作")
            
            result, flag = self.ac.assign_security_event(event_id, payload['assigned_to'])
            return self._build_response(result, flag, "分配安全事件成功")
        except Exception as e:
            logger.error(f"分配安全事件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 合规报告接口 ====================

@blp.route("/audit/compliance-reports")
class ComplianceReportsApi(BaseAuditView):
    """合规报告API"""

    @jwt_required()
    @blp.arguments(ComplianceReportQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取合规报告列表"""
        try:
            result, flag = self.ac.get_compliance_reports(
                filters=query_params,
                page=query_params.get('page', 1),
                per_page=query_params.get('per_page', 20)
            )
            return self._build_response(result, flag, "獲取合規報告成功")
        except Exception as e:
            logger.error(f"獲取合規報告異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/compliance-reports/generate")
class ComplianceReportGenerateApi(BaseAuditView):
    """合规报告生成API"""

    @jwt_required()
    @blp.arguments(ComplianceReportGenerateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """生成合规报告"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role not in ['admin', 'compliance_admin']:
                return fail_response_result(msg="權限不足，僅合規管理員可操作")
            
            current_user_id = get_jwt_identity()
            payload['generated_by'] = current_user_id
            
            result, flag = self.ac.generate_compliance_report(payload)
            return self._build_response(result, flag, "生成合規報告成功")
        except Exception as e:
            logger.error(f"生成合規報告異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/compliance-reports/<report_id>")
class ComplianceReportDetailApi(BaseAuditView):
    """合规报告详情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, report_id):
        """获取合规报告详情/下载报告"""
        try:
            result, flag = self.ac.get_compliance_report(report_id)
            if flag and result.get('file_path'):
                # 如果有文件路径，返回下载文件
                return send_file(result['file_path'], as_attachment=True)
            else:
                return self._build_response(result, flag, "獲取合規報告詳情成功")
        except Exception as e:
            logger.error(f"獲取合規報告詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, report_id):
        """删除合规报告"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role not in ['admin', 'compliance_admin']:
                return fail_response_result(msg="權限不足，僅合規管理員可操作")
            
            result, flag = self.ac.delete_compliance_report(report_id)
            return self._build_response(result, flag, "刪除合規報告成功")
        except Exception as e:
            logger.error(f"刪除合規報告異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 审计配置接口 ====================

@blp.route("/audit/config")
class AuditConfigApi(BaseAuditView):
    """审计配置API"""

    @jwt_required()
    @blp.arguments(AuditConfigQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取审计配置"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            service_name = query_params.get('service_name')
            result, flag = self.ac.get_audit_config(service_name)
            return self._build_response(result, flag, "獲取審計配置成功")
        except Exception as e:
            logger.error(f"獲取審計配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/config/<config_id>")
class AuditConfigDetailApi(BaseAuditView):
    """审计配置详情API"""

    @jwt_required()
    @blp.arguments(AuditConfigUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, config_id):
        """更新审计配置"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.ac.update_audit_config(config_id, payload)
            return self._build_response(result, flag, "更新審計配置成功")
        except Exception as e:
            logger.error(f"更新審計配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 数据保留策略接口 ====================

@blp.route("/audit/retention-policies")
class RetentionPoliciesApi(BaseAuditView):
    """数据保留策略API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取数据保留策略"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.ac.get_retention_policies()
            return self._build_response(result, flag, "獲取數據保留策略成功")
        except Exception as e:
            logger.error(f"獲取數據保留策略異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/audit/retention-policies/<policy_id>")
class RetentionPolicyDetailApi(BaseAuditView):
    """数据保留策略详情API"""

    @jwt_required()
    @blp.arguments(RetentionPolicyUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, policy_id):
        """更新数据保留策略"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.ac.update_retention_policies(policy_id, payload)
            return self._build_response(result, flag, "更新數據保留策略成功")
        except Exception as e:
            logger.error(f"更新數據保留策略異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 健康检查接口 ====================

@blp.route("/health")
class AuditHealthApi(MethodView):
    """审计服务健康检查API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """健康检查"""
        health_data = {
            'status': 'healthy',
            'service': 'audit-service',
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
        
        # 检查核心服务状态
        try:
            audit_controller = AuditController()
            # 简单测试审计配置获取
            config_result, config_flag = audit_controller.get_audit_config()
            if config_flag:
                health_data['audit_service'] = 'operational'
            else:
                health_data['audit_service'] = 'degraded'
                issues.append('审计服务: 核心功能异常')
                
        except Exception as service_error:
            logger.error(f"服务状态检查失敗: {str(service_error)}")
            health_data['audit_service'] = 'error'
            issues.append(f'审计服务: {str(service_error)}')
        
        # 判断整体健康状态
        if issues:
            health_data['status'] = 'unhealthy'
            health_data['issues'] = issues
            return fail_response_result(content=health_data, msg="服務異常")
        else:
            return response_result(content=health_data, msg="服務正常")


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
    if request.endpoint and not request.endpoint.endswith('health'):
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