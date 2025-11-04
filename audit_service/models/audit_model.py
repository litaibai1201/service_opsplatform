# -*- coding: utf-8 -*-
"""
@文件: audit_model.py
@說明: 審計服務數據模型操作類
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.orm import Query

from common.common_tools import CommonTools
from dbs.mysql_db import db, DBFunction
from dbs.mysql_db.model_tables import (
    AuditLogModel, SecurityEventModel, ComplianceReportModel,
    DataRetentionPolicyModel, AuditConfigurationModel, AuditStatisticsModel,
    AuditAlertRuleModel, AuditExportTaskModel
)
from loggers import logger


class OperAuditLogModel:
    """审计日志操作类"""
    
    def create_audit_log(self, audit_log: AuditLogModel) -> Tuple[str, bool]:
        """创建审计日志"""
        try:
            audit_log.id = str(uuid.uuid4())
            audit_log.timestamp = CommonTools.get_now()
            db.session.add(audit_log)
            return "創建審計日誌成功", True
        except Exception as e:
            logger.error(f"創建審計日誌失敗: {str(e)}")
            return f"創建審計日誌失敗: {str(e)}", False
    
    def get_audit_logs(self, filters: Dict = None, page: int = 1, per_page: int = 20, 
                      order_by: str = "timestamp", order_dir: str = "desc") -> List[AuditLogModel]:
        """获取审计日志列表"""
        try:
            query = db.session.query(AuditLogModel).filter(AuditLogModel.status == 1)
            
            # 应用过滤条件
            if filters:
                if filters.get('user_id'):
                    query = query.filter(AuditLogModel.user_id == filters['user_id'])
                if filters.get('action'):
                    query = query.filter(AuditLogModel.action.like(f"%{filters['action']}%"))
                if filters.get('resource_type'):
                    query = query.filter(AuditLogModel.resource_type == filters['resource_type'])
                if filters.get('result'):
                    query = query.filter(AuditLogModel.result == filters['result'])
                if filters.get('risk_level'):
                    query = query.filter(AuditLogModel.risk_level == filters['risk_level'])
                if filters.get('start_time'):
                    query = query.filter(AuditLogModel.timestamp >= filters['start_time'])
                if filters.get('end_time'):
                    query = query.filter(AuditLogModel.timestamp <= filters['end_time'])
                if filters.get('ip_address'):
                    query = query.filter(AuditLogModel.ip_address == filters['ip_address'])
            
            # 排序
            if order_dir.lower() == "desc":
                query = query.order_by(desc(getattr(AuditLogModel, order_by, AuditLogModel.timestamp)))
            else:
                query = query.order_by(asc(getattr(AuditLogModel, order_by, AuditLogModel.timestamp)))
            
            # 分页
            return query.offset((page - 1) * per_page).limit(per_page).all()
        except Exception as e:
            logger.error(f"獲取審計日誌失敗: {str(e)}")
            return []
    
    def get_audit_log_count(self, filters: Dict = None) -> int:
        """获取审计日志总数"""
        try:
            query = db.session.query(func.count(AuditLogModel.id)).filter(AuditLogModel.status == 1)
            
            if filters:
                if filters.get('user_id'):
                    query = query.filter(AuditLogModel.user_id == filters['user_id'])
                if filters.get('action'):
                    query = query.filter(AuditLogModel.action.like(f"%{filters['action']}%"))
                if filters.get('resource_type'):
                    query = query.filter(AuditLogModel.resource_type == filters['resource_type'])
                if filters.get('result'):
                    query = query.filter(AuditLogModel.result == filters['result'])
                if filters.get('risk_level'):
                    query = query.filter(AuditLogModel.risk_level == filters['risk_level'])
                if filters.get('start_time'):
                    query = query.filter(AuditLogModel.timestamp >= filters['start_time'])
                if filters.get('end_time'):
                    query = query.filter(AuditLogModel.timestamp <= filters['end_time'])
                if filters.get('ip_address'):
                    query = query.filter(AuditLogModel.ip_address == filters['ip_address'])
            
            return query.scalar() or 0
        except Exception as e:
            logger.error(f"獲取審計日誌總數失敗: {str(e)}")
            return 0
    
    def get_audit_statistics(self, filters: Dict = None) -> Dict[str, Any]:
        """获取审计统计数据"""
        try:
            query = db.session.query(AuditLogModel).filter(AuditLogModel.status == 1)
            
            # 应用时间过滤
            if filters and filters.get('start_time'):
                query = query.filter(AuditLogModel.timestamp >= filters['start_time'])
            if filters and filters.get('end_time'):
                query = query.filter(AuditLogModel.timestamp <= filters['end_time'])
            
            # 总数统计
            total_count = query.count()
            
            # 结果统计
            result_stats = db.session.query(
                AuditLogModel.result,
                func.count(AuditLogModel.id).label('count')
            ).filter(AuditLogModel.status == 1)
            
            if filters and filters.get('start_time'):
                result_stats = result_stats.filter(AuditLogModel.timestamp >= filters['start_time'])
            if filters and filters.get('end_time'):
                result_stats = result_stats.filter(AuditLogModel.timestamp <= filters['end_time'])
            
            result_stats = result_stats.group_by(AuditLogModel.result).all()
            
            # 风险等级统计
            risk_stats = db.session.query(
                AuditLogModel.risk_level,
                func.count(AuditLogModel.id).label('count')
            ).filter(AuditLogModel.status == 1)
            
            if filters and filters.get('start_time'):
                risk_stats = risk_stats.filter(AuditLogModel.timestamp >= filters['start_time'])
            if filters and filters.get('end_time'):
                risk_stats = risk_stats.filter(AuditLogModel.timestamp <= filters['end_time'])
            
            risk_stats = risk_stats.group_by(AuditLogModel.risk_level).all()
            
            # 操作类型统计
            action_stats = db.session.query(
                AuditLogModel.action,
                func.count(AuditLogModel.id).label('count')
            ).filter(AuditLogModel.status == 1)
            
            if filters and filters.get('start_time'):
                action_stats = action_stats.filter(AuditLogModel.timestamp >= filters['start_time'])
            if filters and filters.get('end_time'):
                action_stats = action_stats.filter(AuditLogModel.timestamp <= filters['end_time'])
            
            action_stats = action_stats.group_by(AuditLogModel.action).limit(10).all()
            
            return {
                'total_count': total_count,
                'result_stats': {item.result: item.count for item in result_stats},
                'risk_stats': {item.risk_level: item.count for item in risk_stats},
                'action_stats': {item.action: item.count for item in action_stats}
            }
        except Exception as e:
            logger.error(f"獲取審計統計失敗: {str(e)}")
            return {}


class OperSecurityEventModel:
    """安全事件操作类"""
    
    def create_security_event(self, event: SecurityEventModel) -> Tuple[str, bool]:
        """创建安全事件"""
        try:
            event.id = str(uuid.uuid4())
            event.created_at = CommonTools.get_now()
            db.session.add(event)
            return "創建安全事件成功", True
        except Exception as e:
            logger.error(f"創建安全事件失敗: {str(e)}")
            return f"創建安全事件失敗: {str(e)}", False
    
    def get_security_events(self, filters: Dict = None, page: int = 1, per_page: int = 20) -> List[SecurityEventModel]:
        """获取安全事件列表"""
        try:
            query = db.session.query(SecurityEventModel).filter(SecurityEventModel.status == 1)
            
            if filters:
                if filters.get('event_type'):
                    query = query.filter(SecurityEventModel.event_type == filters['event_type'])
                if filters.get('severity'):
                    query = query.filter(SecurityEventModel.severity == filters['severity'])
                if filters.get('event_status'):
                    query = query.filter(SecurityEventModel.status == filters['event_status'])
                if filters.get('assigned_to'):
                    query = query.filter(SecurityEventModel.assigned_to == filters['assigned_to'])
                if filters.get('start_time'):
                    query = query.filter(SecurityEventModel.created_at >= filters['start_time'])
                if filters.get('end_time'):
                    query = query.filter(SecurityEventModel.created_at <= filters['end_time'])
            
            return query.order_by(desc(SecurityEventModel.created_at)).offset((page - 1) * per_page).limit(per_page).all()
        except Exception as e:
            logger.error(f"獲取安全事件失敗: {str(e)}")
            return []
    
    def get_event_by_id(self, event_id: str) -> Optional[SecurityEventModel]:
        """根据ID获取安全事件"""
        try:
            return db.session.query(SecurityEventModel).filter(
                and_(SecurityEventModel.id == event_id, SecurityEventModel.status == 1)
            ).first()
        except Exception as e:
            logger.error(f"獲取安全事件失敗: {str(e)}")
            return None
    
    def update_event_status(self, event_id: str, new_status: str, assigned_to: str = None, 
                           resolution_notes: str = None) -> Tuple[str, bool]:
        """更新安全事件状态"""
        try:
            event = self.get_event_by_id(event_id)
            if not event:
                return "安全事件不存在", False
            
            event.status = new_status
            event.updated_at = CommonTools.get_now()
            
            if assigned_to:
                event.assigned_to = assigned_to
            
            if resolution_notes:
                event.resolution_notes = resolution_notes
            
            if new_status == 'resolved':
                event.resolved_at = CommonTools.get_now()
            
            return "更新安全事件狀態成功", True
        except Exception as e:
            logger.error(f"更新安全事件狀態失敗: {str(e)}")
            return f"更新安全事件狀態失敗: {str(e)}", False


class OperComplianceReportModel:
    """合规报告操作类"""
    
    def create_report(self, report: ComplianceReportModel) -> Tuple[str, bool]:
        """创建合规报告"""
        try:
            report.id = str(uuid.uuid4())
            report.generated_at = CommonTools.get_now()
            db.session.add(report)
            return "創建合規報告成功", True
        except Exception as e:
            logger.error(f"創建合規報告失敗: {str(e)}")
            return f"創建合規報告失敗: {str(e)}", False
    
    def get_reports(self, filters: Dict = None, page: int = 1, per_page: int = 20) -> List[ComplianceReportModel]:
        """获取合规报告列表"""
        try:
            query = db.session.query(ComplianceReportModel).filter(ComplianceReportModel.status == 1)
            
            if filters:
                if filters.get('report_type'):
                    query = query.filter(ComplianceReportModel.report_type == filters['report_type'])
                if filters.get('report_status'):
                    query = query.filter(ComplianceReportModel.report_status == filters['report_status'])
                if filters.get('generated_by'):
                    query = query.filter(ComplianceReportModel.generated_by == filters['generated_by'])
            
            return query.order_by(desc(ComplianceReportModel.generated_at)).offset((page - 1) * per_page).limit(per_page).all()
        except Exception as e:
            logger.error(f"獲取合規報告失敗: {str(e)}")
            return []
    
    def get_report_by_id(self, report_id: str) -> Optional[ComplianceReportModel]:
        """根据ID获取合规报告"""
        try:
            return db.session.query(ComplianceReportModel).filter(
                and_(ComplianceReportModel.id == report_id, ComplianceReportModel.status == 1)
            ).first()
        except Exception as e:
            logger.error(f"獲取合規報告失敗: {str(e)}")
            return None
    
    def update_report_status(self, report_id: str, new_status: str, file_path: str = None) -> Tuple[str, bool]:
        """更新合规报告状态"""
        try:
            report = self.get_report_by_id(report_id)
            if not report:
                return "合規報告不存在", False
            
            report.report_status = new_status
            if file_path:
                report.file_path = file_path
            
            return "更新合規報告狀態成功", True
        except Exception as e:
            logger.error(f"更新合規報告狀態失敗: {str(e)}")
            return f"更新合規報告狀態失敗: {str(e)}", False
    
    def delete_report(self, report_id: str) -> Tuple[str, bool]:
        """删除合规报告"""
        try:
            report = self.get_report_by_id(report_id)
            if not report:
                return "合規報告不存在", False
            
            report.status = -1
            report.status_update_at = CommonTools.get_now()
            return "刪除合規報告成功", True
        except Exception as e:
            logger.error(f"刪除合規報告失敗: {str(e)}")
            return f"刪除合規報告失敗: {str(e)}", False


class OperDataRetentionPolicyModel:
    """数据保留策略操作类"""
    
    def create_policy(self, policy: DataRetentionPolicyModel) -> Tuple[str, bool]:
        """创建数据保留策略"""
        try:
            policy.id = str(uuid.uuid4())
            policy.created_at = CommonTools.get_now()
            db.session.add(policy)
            return "創建數據保留策略成功", True
        except Exception as e:
            logger.error(f"創建數據保留策略失敗: {str(e)}")
            return f"創建數據保留策略失敗: {str(e)}", False
    
    def get_policies(self, active_only: bool = True) -> List[DataRetentionPolicyModel]:
        """获取数据保留策略列表"""
        try:
            query = db.session.query(DataRetentionPolicyModel).filter(DataRetentionPolicyModel.status == 1)
            if active_only:
                query = query.filter(DataRetentionPolicyModel.is_active == True)
            return query.order_by(DataRetentionPolicyModel.resource_type).all()
        except Exception as e:
            logger.error(f"獲取數據保留策略失敗: {str(e)}")
            return []
    
    def get_policy_by_resource_type(self, resource_type: str) -> Optional[DataRetentionPolicyModel]:
        """根据资源类型获取策略"""
        try:
            return db.session.query(DataRetentionPolicyModel).filter(
                and_(
                    DataRetentionPolicyModel.resource_type == resource_type,
                    DataRetentionPolicyModel.status == 1,
                    DataRetentionPolicyModel.is_active == True
                )
            ).first()
        except Exception as e:
            logger.error(f"獲取數據保留策略失敗: {str(e)}")
            return None
    
    def update_policy(self, policy_id: str, update_data: Dict) -> Tuple[str, bool]:
        """更新数据保留策略"""
        try:
            policy = db.session.query(DataRetentionPolicyModel).filter(
                and_(DataRetentionPolicyModel.id == policy_id, DataRetentionPolicyModel.status == 1)
            ).first()
            
            if not policy:
                return "數據保留策略不存在", False
            
            # 更新允许的字段
            allowed_fields = ['retention_days', 'archive_after_days', 'auto_delete', 'policy_description', 'is_active']
            for field, value in update_data.items():
                if field in allowed_fields and hasattr(policy, field):
                    setattr(policy, field, value)
            
            policy.status_update_at = CommonTools.get_now()
            return "更新數據保留策略成功", True
        except Exception as e:
            logger.error(f"更新數據保留策略失敗: {str(e)}")
            return f"更新數據保留策略失敗: {str(e)}", False


class OperAuditConfigurationModel:
    """审计配置操作类"""
    
    def create_configuration(self, config: AuditConfigurationModel) -> Tuple[str, bool]:
        """创建审计配置"""
        try:
            config.id = str(uuid.uuid4())
            config.created_at = CommonTools.get_now()
            db.session.add(config)
            return "創建審計配置成功", True
        except Exception as e:
            logger.error(f"創建審計配置失敗: {str(e)}")
            return f"創建審計配置失敗: {str(e)}", False
    
    def get_configurations(self, service_name: str = None) -> List[AuditConfigurationModel]:
        """获取审计配置列表"""
        try:
            query = db.session.query(AuditConfigurationModel).filter(AuditConfigurationModel.status == 1)
            if service_name:
                query = query.filter(AuditConfigurationModel.service_name == service_name)
            return query.order_by(AuditConfigurationModel.service_name, AuditConfigurationModel.action_type).all()
        except Exception as e:
            logger.error(f"獲取審計配置失敗: {str(e)}")
            return []
    
    def get_configuration(self, service_name: str, action_type: str) -> Optional[AuditConfigurationModel]:
        """获取特定服务的审计配置"""
        try:
            return db.session.query(AuditConfigurationModel).filter(
                and_(
                    AuditConfigurationModel.service_name == service_name,
                    AuditConfigurationModel.action_type == action_type,
                    AuditConfigurationModel.status == 1
                )
            ).first()
        except Exception as e:
            logger.error(f"獲取審計配置失敗: {str(e)}")
            return None
    
    def update_configuration(self, config_id: str, update_data: Dict) -> Tuple[str, bool]:
        """更新审计配置"""
        try:
            config = db.session.query(AuditConfigurationModel).filter(
                and_(AuditConfigurationModel.id == config_id, AuditConfigurationModel.status == 1)
            ).first()
            
            if not config:
                return "審計配置不存在", False
            
            # 更新允许的字段
            allowed_fields = ['is_enabled', 'log_level', 'include_request_data', 'include_response_data', 'retention_days']
            for field, value in update_data.items():
                if field in allowed_fields and hasattr(config, field):
                    setattr(config, field, value)
            
            config.status_update_at = CommonTools.get_now()
            return "更新審計配置成功", True
        except Exception as e:
            logger.error(f"更新審計配置失敗: {str(e)}")
            return f"更新審計配置失敗: {str(e)}", False


class OperAuditExportTaskModel:
    """审计导出任务操作类"""
    
    def create_export_task(self, task: AuditExportTaskModel) -> Tuple[str, bool]:
        """创建导出任务"""
        try:
            task.id = str(uuid.uuid4())
            task.created_at = CommonTools.get_now()
            db.session.add(task)
            return "創建導出任務成功", True
        except Exception as e:
            logger.error(f"創建導出任務失敗: {str(e)}")
            return f"創建導出任務失敗: {str(e)}", False
    
    def get_export_tasks(self, user_id: str = None, page: int = 1, per_page: int = 20) -> List[AuditExportTaskModel]:
        """获取导出任务列表"""
        try:
            query = db.session.query(AuditExportTaskModel).filter(AuditExportTaskModel.status == 1)
            if user_id:
                query = query.filter(AuditExportTaskModel.created_by == user_id)
            return query.order_by(desc(AuditExportTaskModel.created_at)).offset((page - 1) * per_page).limit(per_page).all()
        except Exception as e:
            logger.error(f"獲取導出任務失敗: {str(e)}")
            return []
    
    def get_task_by_id(self, task_id: str) -> Optional[AuditExportTaskModel]:
        """根据ID获取导出任务"""
        try:
            return db.session.query(AuditExportTaskModel).filter(
                and_(AuditExportTaskModel.id == task_id, AuditExportTaskModel.status == 1)
            ).first()
        except Exception as e:
            logger.error(f"獲取導出任務失敗: {str(e)}")
            return None
    
    def update_task_status(self, task_id: str, new_status: str, **kwargs) -> Tuple[str, bool]:
        """更新导出任务状态"""
        try:
            task = self.get_task_by_id(task_id)
            if not task:
                return "導出任務不存在", False
            
            task.task_status = new_status
            task.updated_at = CommonTools.get_now()
            
            # 更新其他字段
            for field, value in kwargs.items():
                if hasattr(task, field):
                    setattr(task, field, value)
            
            if new_status == 'processing':
                task.started_at = CommonTools.get_now()
            elif new_status in ['completed', 'failed']:
                task.completed_at = CommonTools.get_now()
            
            return "更新導出任務狀態成功", True
        except Exception as e:
            logger.error(f"更新導出任務狀態失敗: {str(e)}")
            return f"更新導出任務狀態失敗: {str(e)}", False