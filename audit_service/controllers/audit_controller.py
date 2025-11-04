# -*- coding: utf-8 -*-
"""
@文件: audit_controller.py
@說明: 審計控制器 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
import json
import csv
import os
import traceback
from datetime import datetime, timedelta, date
from typing import Tuple, Dict, Any, Optional, List
from flask import request, g

from common.common_tools import CommonTools
from dbs.mysql_db import DBFunction
from dbs.mysql_db.model_tables import (
    AuditLogModel, SecurityEventModel, ComplianceReportModel,
    DataRetentionPolicyModel, AuditConfigurationModel, AuditExportTaskModel
)
from models.audit_model import (
    OperAuditLogModel, OperSecurityEventModel, OperComplianceReportModel,
    OperDataRetentionPolicyModel, OperAuditConfigurationModel, OperAuditExportTaskModel
)
from configs.constant import Config
from loggers import logger


class AuditController:
    """審計控制器 (优化版本)"""
    
    # 类级别的单例缓存
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AuditController, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 避免重复初始化
        if AuditController._initialized:
            return
            
        self.oper_audit_log = OperAuditLogModel()
        self.oper_security_event = OperSecurityEventModel()
        self.oper_compliance_report = OperComplianceReportModel()
        self.oper_retention_policy = OperDataRetentionPolicyModel()
        self.oper_audit_config = OperAuditConfigurationModel()
        self.oper_export_task = OperAuditExportTaskModel()
        
        # 配置项
        self.default_page_size = Config.DEFAULT_PAGE_SIZE if hasattr(Config, 'DEFAULT_PAGE_SIZE') else 20
        self.max_export_records = Config.MAX_EXPORT_RECORDS if hasattr(Config, 'MAX_EXPORT_RECORDS') else 100000
        
        AuditController._initialized = True

    # ==================== 公共验证和工具方法 ====================
    
    def _get_client_info(self):
        """获取客户端信息"""
        return {
            'ip_address': request.remote_addr or '未知',
            'user_agent': request.headers.get('User-Agent', '未知'),
            'request_id': str(uuid.uuid4())
        }
    
    def _validate_date_range(self, start_date: str, end_date: str) -> Tuple[bool, str]:
        """验证日期范围"""
        try:
            if start_date:
                datetime.strptime(start_date, '%Y-%m-%d')
            if end_date:
                datetime.strptime(end_date, '%Y-%m-%d')
            
            if start_date and end_date and start_date > end_date:
                return False, "開始日期不能大於結束日期"
            
            return True, ""
        except ValueError:
            return False, "日期格式錯誤，請使用 YYYY-MM-DD 格式"

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

    # ==================== 审计日志管理 ====================
    
    def record_audit_log(self, data: Dict) -> Tuple[Any, bool]:
        """记录审计日志"""
        def _record_audit_log_operation():
            # 验证必填字段
            required_fields = ['action', 'resource_type', 'resource_id', 'result']
            for field in required_fields:
                if not data.get(field):
                    raise ValueError(f"{field}不能為空")
            
            # 创建审计日志对象
            log_data = {
                'user_id': data.get('user_id'),
                'session_id': data.get('session_id'),
                'action': data['action'],
                'resource_type': data['resource_type'],
                'resource_id': data['resource_id'],
                'old_values': data.get('old_values'),
                'new_values': data.get('new_values'),
                'ip_address': data.get('ip_address'),
                'user_agent': data.get('user_agent'),
                'request_id': data.get('request_id'),
                'result': data['result'],
                'error_message': data.get('error_message'),
                'execution_time_ms': data.get('execution_time_ms'),
                'risk_level': data.get('risk_level', 'low'),
                'tags': data.get('tags')
            }
            
            audit_log = AuditLogModel(**log_data)
            result, flag = self.oper_audit_log.create_audit_log(audit_log)
            if not flag:
                raise Exception(f"記錄審計日誌失敗: {result}")
            
            return {
                'log_id': audit_log.id,
                'action': audit_log.action,
                'resource_type': audit_log.resource_type,
                'timestamp': audit_log.timestamp
            }
        
        return self._execute_with_transaction(_record_audit_log_operation, "記錄審計日誌")
    
    def get_audit_logs(self, filters: Dict = None, page: int = 1, per_page: int = None) -> Tuple[Any, bool]:
        """获取审计日志列表"""
        try:
            if per_page is None:
                per_page = self.default_page_size
            
            # 验证日期范围
            if filters and filters.get('start_time') and filters.get('end_time'):
                valid, msg = self._validate_date_range(filters['start_time'], filters['end_time'])
                if not valid:
                    return msg, False
            
            # 获取审计日志
            logs = self.oper_audit_log.get_audit_logs(filters, page, per_page)
            total_count = self.oper_audit_log.get_audit_log_count(filters)
            
            logs_data = []
            for log in logs:
                log_info = {
                    'id': log.id,
                    'user_id': log.user_id,
                    'session_id': log.session_id,
                    'action': log.action,
                    'resource_type': log.resource_type,
                    'resource_id': log.resource_id,
                    'old_values': log.old_values,
                    'new_values': log.new_values,
                    'ip_address': log.ip_address,
                    'user_agent': log.user_agent,
                    'request_id': log.request_id,
                    'result': log.result,
                    'error_message': log.error_message,
                    'execution_time_ms': log.execution_time_ms,
                    'risk_level': log.risk_level,
                    'tags': log.tags,
                    'timestamp': log.timestamp
                }
                logs_data.append(log_info)
            
            return {
                'total': total_count,
                'page': page,
                'per_page': per_page,
                'pages': (total_count + per_page - 1) // per_page,
                'logs': logs_data
            }, True
            
        except Exception as e:
            logger.error(f"獲取審計日誌異常: {str(e)}")
            return "獲取審計日誌失敗", False
    
    def search_audit_logs(self, query: str, filters: Dict = None, page: int = 1, per_page: int = None) -> Tuple[Any, bool]:
        """搜索审计日志"""
        try:
            if per_page is None:
                per_page = self.default_page_size
            
            # 扩展搜索过滤条件
            search_filters = filters or {}
            if query:
                # 这里可以集成Elasticsearch进行全文搜索
                # 暂时使用SQL LIKE搜索
                search_filters['action'] = query
            
            return self.get_audit_logs(search_filters, page, per_page)
            
        except Exception as e:
            logger.error(f"搜索審計日誌異常: {str(e)}")
            return "搜索審計日誌失敗", False
    
    def get_audit_statistics(self, filters: Dict = None) -> Tuple[Any, bool]:
        """获取审计统计"""
        try:
            stats = self.oper_audit_log.get_audit_statistics(filters)
            
            return {
                'summary': stats,
                'generated_at': CommonTools.get_now()
            }, True
            
        except Exception as e:
            logger.error(f"獲取審計統計異常: {str(e)}")
            return "獲取審計統計失敗", False

    # ==================== 安全事件管理 ====================
    
    def record_security_event(self, data: Dict) -> Tuple[Any, bool]:
        """记录安全事件"""
        def _record_security_event_operation():
            # 验证必填字段
            required_fields = ['event_type', 'severity', 'details']
            for field in required_fields:
                if not data.get(field):
                    raise ValueError(f"{field}不能為空")
            
            # 创建安全事件对象
            event_data = {
                'event_type': data['event_type'],
                'severity': data['severity'],
                'user_id': data.get('user_id'),
                'ip_address': data.get('ip_address'),
                'details': data['details'],
                'status': data.get('status', 'open'),
                'assigned_to': data.get('assigned_to')
            }
            
            security_event = SecurityEventModel(**event_data)
            result, flag = self.oper_security_event.create_security_event(security_event)
            if not flag:
                raise Exception(f"記錄安全事件失敗: {result}")
            
            return {
                'event_id': security_event.id,
                'event_type': security_event.event_type,
                'severity': security_event.severity,
                'status': security_event.status,
                'created_at': security_event.created_at
            }
        
        return self._execute_with_transaction(_record_security_event_operation, "記錄安全事件")
    
    def get_security_events(self, filters: Dict = None, page: int = 1, per_page: int = None) -> Tuple[Any, bool]:
        """获取安全事件列表"""
        try:
            if per_page is None:
                per_page = self.default_page_size
            
            events = self.oper_security_event.get_security_events(filters, page, per_page)
            
            events_data = []
            for event in events:
                event_info = {
                    'id': event.id,
                    'event_type': event.event_type,
                    'severity': event.severity,
                    'user_id': event.user_id,
                    'ip_address': event.ip_address,
                    'details': event.details,
                    'status': event.status,
                    'assigned_to': event.assigned_to,
                    'resolution_notes': event.resolution_notes,
                    'resolved_at': event.resolved_at,
                    'created_at': event.created_at,
                    'updated_at': event.updated_at
                }
                events_data.append(event_info)
            
            return {
                'total': len(events_data),
                'page': page,
                'per_page': per_page,
                'events': events_data
            }, True
            
        except Exception as e:
            logger.error(f"獲取安全事件異常: {str(e)}")
            return "獲取安全事件失敗", False
    
    def investigate_security_event(self, event_id: str, assigned_to: str) -> Tuple[Any, bool]:
        """开始调查安全事件"""
        def _investigate_operation():
            result, flag = self.oper_security_event.update_event_status(event_id, 'investigating', assigned_to)
            if not flag:
                raise Exception(result)
            
            return {
                'event_id': event_id,
                'status': 'investigating',
                'assigned_to': assigned_to,
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_investigate_operation, "開始調查安全事件")
    
    def resolve_security_event(self, event_id: str, resolution_notes: str) -> Tuple[Any, bool]:
        """解决安全事件"""
        def _resolve_operation():
            result, flag = self.oper_security_event.update_event_status(
                event_id, 'resolved', resolution_notes=resolution_notes
            )
            if not flag:
                raise Exception(result)
            
            return {
                'event_id': event_id,
                'status': 'resolved',
                'resolution_notes': resolution_notes,
                'resolved_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_resolve_operation, "解決安全事件")
    
    def assign_security_event(self, event_id: str, assigned_to: str) -> Tuple[Any, bool]:
        """分配安全事件"""
        def _assign_operation():
            result, flag = self.oper_security_event.update_event_status(event_id, None, assigned_to)
            if not flag:
                raise Exception(result)
            
            return {
                'event_id': event_id,
                'assigned_to': assigned_to,
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_assign_operation, "分配安全事件")

    # ==================== 合规报告管理 ====================
    
    def generate_compliance_report(self, data: Dict) -> Tuple[Any, bool]:
        """生成合规报告"""
        def _generate_report_operation():
            # 验证必填字段
            required_fields = ['report_type', 'report_name', 'period_start', 'period_end', 'generated_by']
            for field in required_fields:
                if not data.get(field):
                    raise ValueError(f"{field}不能為空")
            
            # 验证日期格式
            try:
                period_start = datetime.strptime(data['period_start'], '%Y-%m-%d').date()
                period_end = datetime.strptime(data['period_end'], '%Y-%m-%d').date()
            except ValueError:
                raise ValueError("日期格式錯誤，請使用 YYYY-MM-DD 格式")
            
            if period_start > period_end:
                raise ValueError("開始日期不能大於結束日期")
            
            # 生成报告数据
            report_data = self._generate_report_data(data['report_type'], period_start, period_end)
            
            # 创建合规报告对象
            report = ComplianceReportModel(
                report_type=data['report_type'],
                report_name=data['report_name'],
                period_start=period_start,
                period_end=period_end,
                report_data=report_data,
                generated_by=data['generated_by']
            )
            
            result, flag = self.oper_compliance_report.create_report(report)
            if not flag:
                raise Exception(f"生成合規報告失敗: {result}")
            
            return {
                'report_id': report.id,
                'report_name': report.report_name,
                'report_type': report.report_type,
                'status': report.report_status,
                'generated_at': report.generated_at
            }
        
        return self._execute_with_transaction(_generate_report_operation, "生成合規報告")
    
    def get_compliance_reports(self, filters: Dict = None, page: int = 1, per_page: int = None) -> Tuple[Any, bool]:
        """获取合规报告列表"""
        try:
            if per_page is None:
                per_page = self.default_page_size
            
            reports = self.oper_compliance_report.get_reports(filters, page, per_page)
            
            reports_data = []
            for report in reports:
                report_info = {
                    'id': report.id,
                    'report_type': report.report_type,
                    'report_name': report.report_name,
                    'period_start': report.period_start.strftime('%Y-%m-%d'),
                    'period_end': report.period_end.strftime('%Y-%m-%d'),
                    'status': report.report_status,
                    'file_path': report.file_path,
                    'generated_by': report.generated_by,
                    'generated_at': report.generated_at
                }
                reports_data.append(report_info)
            
            return {
                'total': len(reports_data),
                'page': page,
                'per_page': per_page,
                'reports': reports_data
            }, True
            
        except Exception as e:
            logger.error(f"獲取合規報告異常: {str(e)}")
            return "獲取合規報告失敗", False
    
    def get_compliance_report(self, report_id: str) -> Tuple[Any, bool]:
        """获取合规报告详情"""
        try:
            report = self.oper_compliance_report.get_report_by_id(report_id)
            if not report:
                return "合規報告不存在", False
            
            report_info = {
                'id': report.id,
                'report_type': report.report_type,
                'report_name': report.report_name,
                'period_start': report.period_start.strftime('%Y-%m-%d'),
                'period_end': report.period_end.strftime('%Y-%m-%d'),
                'report_data': report.report_data,
                'status': report.report_status,
                'file_path': report.file_path,
                'generated_by': report.generated_by,
                'generated_at': report.generated_at
            }
            
            return report_info, True
            
        except Exception as e:
            logger.error(f"獲取合規報告詳情異常: {str(e)}")
            return "獲取合規報告詳情失敗", False
    
    def delete_compliance_report(self, report_id: str) -> Tuple[Any, bool]:
        """删除合规报告"""
        def _delete_report_operation():
            result, flag = self.oper_compliance_report.delete_report(report_id)
            if not flag:
                raise Exception(result)
            
            return {
                'report_id': report_id,
                'deleted_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_delete_report_operation, "刪除合規報告")

    # ==================== 审计配置管理 ====================
    
    def get_audit_config(self, service_name: str = None) -> Tuple[Any, bool]:
        """获取审计配置"""
        try:
            configs = self.oper_audit_config.get_configurations(service_name)
            
            configs_data = []
            for config in configs:
                config_info = {
                    'id': config.id,
                    'service_name': config.service_name,
                    'action_type': config.action_type,
                    'is_enabled': config.is_enabled,
                    'log_level': config.log_level,
                    'include_request_data': config.include_request_data,
                    'include_response_data': config.include_response_data,
                    'retention_days': config.retention_days,
                    'created_at': config.created_at
                }
                configs_data.append(config_info)
            
            return {
                'total': len(configs_data),
                'configurations': configs_data
            }, True
            
        except Exception as e:
            logger.error(f"獲取審計配置異常: {str(e)}")
            return "獲取審計配置失敗", False
    
    def update_audit_config(self, config_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新审计配置"""
        def _update_config_operation():
            result, flag = self.oper_audit_config.update_configuration(config_id, update_data)
            if not flag:
                raise Exception(result)
            
            return {
                'config_id': config_id,
                'updated_fields': list(update_data.keys()),
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_update_config_operation, "更新審計配置")

    # ==================== 数据保留策略管理 ====================
    
    def get_retention_policies(self) -> Tuple[Any, bool]:
        """获取数据保留策略"""
        try:
            policies = self.oper_retention_policy.get_policies()
            
            policies_data = []
            for policy in policies:
                policy_info = {
                    'id': policy.id,
                    'resource_type': policy.resource_type,
                    'retention_days': policy.retention_days,
                    'archive_after_days': policy.archive_after_days,
                    'auto_delete': policy.auto_delete,
                    'policy_description': policy.policy_description,
                    'is_active': policy.is_active,
                    'created_by': policy.created_by,
                    'created_at': policy.created_at
                }
                policies_data.append(policy_info)
            
            return {
                'total': len(policies_data),
                'policies': policies_data
            }, True
            
        except Exception as e:
            logger.error(f"獲取數據保留策略異常: {str(e)}")
            return "獲取數據保留策略失敗", False
    
    def update_retention_policies(self, policy_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新数据保留策略"""
        def _update_policy_operation():
            result, flag = self.oper_retention_policy.update_policy(policy_id, update_data)
            if not flag:
                raise Exception(result)
            
            return {
                'policy_id': policy_id,
                'updated_fields': list(update_data.keys()),
                'updated_at': CommonTools.get_now()
            }
        
        return self._execute_with_transaction(_update_policy_operation, "更新數據保留策略")

    # ==================== 导出功能 ====================
    
    def export_audit_logs(self, export_data: Dict) -> Tuple[Any, bool]:
        """导出审计日志"""
        def _export_operation():
            # 创建导出任务
            task_data = {
                'task_name': export_data.get('task_name', f"審計日誌導出_{CommonTools.get_now()}"),
                'export_type': export_data.get('export_type', 'csv'),
                'filter_conditions': export_data.get('filters'),
                'export_fields': export_data.get('fields'),
                'created_by': export_data['created_by']
            }
            
            export_task = AuditExportTaskModel(**task_data)
            result, flag = self.oper_export_task.create_export_task(export_task)
            if not flag:
                raise Exception(f"創建導出任務失敗: {result}")
            
            return {
                'task_id': export_task.id,
                'task_name': export_task.task_name,
                'status': export_task.task_status,
                'created_at': export_task.created_at
            }
        
        return self._execute_with_transaction(_export_operation, "創建審計日誌導出任務")

    # ==================== 私有辅助方法 ====================
    
    def _generate_report_data(self, report_type: str, period_start: date, period_end: date) -> Dict[str, Any]:
        """生成报告数据"""
        try:
            # 根据报告类型生成不同的数据
            filters = {
                'start_time': period_start.strftime('%Y-%m-%d'),
                'end_time': period_end.strftime('%Y-%m-%d')
            }
            
            stats = self.oper_audit_log.get_audit_statistics(filters)
            
            report_data = {
                'report_type': report_type,
                'period': {
                    'start': period_start.strftime('%Y-%m-%d'),
                    'end': period_end.strftime('%Y-%m-%d')
                },
                'statistics': stats,
                'generated_at': CommonTools.get_now()
            }
            
            return report_data
            
        except Exception as e:
            logger.error(f"生成報告數據失敗: {str(e)}")
            return {}