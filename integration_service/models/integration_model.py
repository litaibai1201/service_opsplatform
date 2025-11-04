# -*- coding: utf-8 -*-
"""
@文件: integration_model.py
@說明: 集成服务模型操作类
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy import and_, or_, desc, asc
from sqlalchemy.exc import IntegrityError

from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    WebhookModel, WebhookLogModel, PluginModel, PluginConfigurationModel,
    ExternalIntegrationModel, IntegrationSyncLogModel
)
from common.common_method import TryExcept
from loggers import logger


class OperWebhookModel:
    """Webhook模型操作类"""
    
    @TryExcept("创建Webhook失败")
    def create_webhook(self, webhook_data: WebhookModel) -> Tuple[Any, bool]:
        """创建Webhook"""
        def _create_webhook_operation():
            if not webhook_data.id:
                webhook_data.id = str(uuid.uuid4())
            
            db.session.add(webhook_data)
            db.session.commit()
            logger.info(f"创建Webhook成功: {webhook_data.id}")
            return webhook_data.to_dict(), True
            
        return db.session.execute(_create_webhook_operation)
    
    @TryExcept("获取Webhook列表失败")
    def get_webhooks(self, project_id: str = None, is_active: bool = None, 
                    page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取Webhook列表"""
        def _get_webhooks_operation():
            query = WebhookModel.query
            
            if project_id:
                query = query.filter(WebhookModel.project_id == project_id)
            if is_active is not None:
                query = query.filter(WebhookModel.is_active == is_active)
                
            total = query.count()
            webhooks = query.offset((page - 1) * size).limit(size).all()
            
            result = {
                'webhooks': [webhook.to_dict() for webhook in webhooks],
                'total': total,
                'page': page,
                'size': size
            }
            
            return result, True
            
        return db.session.execute(_get_webhooks_operation)
    
    @TryExcept("获取Webhook详情失败")
    def get_webhook_by_id(self, webhook_id: str) -> Tuple[Any, bool]:
        """根据ID获取Webhook"""
        def _get_webhook_operation():
            webhook = WebhookModel.query.filter_by(id=webhook_id).first()
            if not webhook:
                return "Webhook不存在", False
            return webhook.to_dict(), True
            
        return db.session.execute(_get_webhook_operation)
    
    @TryExcept("更新Webhook失败")
    def update_webhook(self, webhook_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新Webhook"""
        def _update_webhook_operation():
            webhook = WebhookModel.query.filter_by(id=webhook_id).first()
            if not webhook:
                return "Webhook不存在", False
                
            for key, value in update_data.items():
                if hasattr(webhook, key):
                    setattr(webhook, key, value)
                    
            db.session.commit()
            logger.info(f"更新Webhook成功: {webhook_id}")
            return webhook.to_dict(), True
            
        return db.session.execute(_update_webhook_operation)
    
    @TryExcept("删除Webhook失败")
    def delete_webhook(self, webhook_id: str) -> Tuple[Any, bool]:
        """删除Webhook"""
        def _delete_webhook_operation():
            webhook = WebhookModel.query.filter_by(id=webhook_id).first()
            if not webhook:
                return "Webhook不存在", False
                
            db.session.delete(webhook)
            db.session.commit()
            logger.info(f"删除Webhook成功: {webhook_id}")
            return "删除成功", True
            
        return db.session.execute(_delete_webhook_operation)
    
    @TryExcept("记录Webhook执行日志失败")
    def log_webhook_execution(self, log_data: WebhookLogModel) -> Tuple[Any, bool]:
        """记录Webhook执行日志"""
        def _log_execution_operation():
            if not log_data.id:
                log_data.id = str(uuid.uuid4())
                
            db.session.add(log_data)
            
            # 更新Webhook统计
            webhook = WebhookModel.query.filter_by(id=log_data.webhook_id).first()
            if webhook:
                webhook.last_triggered_at = datetime.now()
                if log_data.response_status and 200 <= log_data.response_status < 300:
                    webhook.success_count += 1
                else:
                    webhook.failure_count += 1
                    
            db.session.commit()
            return log_data.to_dict(), True
            
        return db.session.execute(_log_execution_operation)
    
    @TryExcept("获取Webhook执行日志失败")
    def get_webhook_logs(self, webhook_id: str, page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取Webhook执行日志"""
        def _get_logs_operation():
            query = WebhookLogModel.query.filter(WebhookLogModel.webhook_id == webhook_id)
            query = query.order_by(desc(WebhookLogModel.created_at))
            
            total = query.count()
            logs = query.offset((page - 1) * size).limit(size).all()
            
            result = {
                'logs': [log.to_dict() for log in logs],
                'total': total,
                'page': page,
                'size': size
            }
            
            return result, True
            
        return db.session.execute(_get_logs_operation)


class OperPluginModel:
    """插件模型操作类"""
    
    @TryExcept("安装插件失败")
    def install_plugin(self, plugin_data: PluginModel) -> Tuple[Any, bool]:
        """安装插件"""
        def _install_plugin_operation():
            if not plugin_data.id:
                plugin_data.id = str(uuid.uuid4())
                
            # 检查插件是否已存在
            existing = PluginModel.query.filter_by(name=plugin_data.name).first()
            if existing:
                return "插件已存在", False
                
            db.session.add(plugin_data)
            db.session.commit()
            logger.info(f"安装插件成功: {plugin_data.name}")
            return plugin_data.to_dict(), True
            
        return db.session.execute(_install_plugin_operation)
    
    @TryExcept("获取插件列表失败")
    def get_plugins(self, is_enabled: bool = None, is_verified: bool = None,
                   page: int = 1, size: int = 20, sort_by: str = 'rating') -> Tuple[Any, bool]:
        """获取插件列表"""
        def _get_plugins_operation():
            query = PluginModel.query
            
            if is_enabled is not None:
                query = query.filter(PluginModel.is_enabled == is_enabled)
            if is_verified is not None:
                query = query.filter(PluginModel.is_verified == is_verified)
                
            # 排序
            if sort_by == 'rating':
                query = query.order_by(desc(PluginModel.rating))
            elif sort_by == 'downloads':
                query = query.order_by(desc(PluginModel.download_count))
            elif sort_by == 'installed_at':
                query = query.order_by(desc(PluginModel.installed_at))
                
            total = query.count()
            plugins = query.offset((page - 1) * size).limit(size).all()
            
            result = {
                'plugins': [plugin.to_dict() for plugin in plugins],
                'total': total,
                'page': page,
                'size': size
            }
            
            return result, True
            
        return db.session.execute(_get_plugins_operation)
    
    @TryExcept("获取插件详情失败")
    def get_plugin_by_id(self, plugin_id: str) -> Tuple[Any, bool]:
        """根据ID获取插件"""
        def _get_plugin_operation():
            plugin = PluginModel.query.filter_by(id=plugin_id).first()
            if not plugin:
                return "插件不存在", False
            return plugin.to_dict(), True
            
        return db.session.execute(_get_plugin_operation)
    
    @TryExcept("卸载插件失败")
    def uninstall_plugin(self, plugin_id: str) -> Tuple[Any, bool]:
        """卸载插件"""
        def _uninstall_plugin_operation():
            plugin = PluginModel.query.filter_by(id=plugin_id).first()
            if not plugin:
                return "插件不存在", False
                
            db.session.delete(plugin)
            db.session.commit()
            logger.info(f"卸载插件成功: {plugin.name}")
            return "卸载成功", True
            
        return db.session.execute(_uninstall_plugin_operation)
    
    @TryExcept("创建插件配置失败")
    def create_plugin_configuration(self, config_data: PluginConfigurationModel) -> Tuple[Any, bool]:
        """创建插件配置"""
        def _create_config_operation():
            if not config_data.id:
                config_data.id = str(uuid.uuid4())
                
            db.session.add(config_data)
            db.session.commit()
            return config_data.to_dict(), True
            
        return db.session.execute(_create_config_operation)
    
    @TryExcept("更新插件配置失败")
    def update_plugin_configuration(self, config_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新插件配置"""
        def _update_config_operation():
            config = PluginConfigurationModel.query.filter_by(id=config_id).first()
            if not config:
                return "配置不存在", False
                
            for key, value in update_data.items():
                if hasattr(config, key):
                    setattr(config, key, value)
                    
            config.updated_at = datetime.now()
            db.session.commit()
            return config.to_dict(), True
            
        return db.session.execute(_update_config_operation)


class OperExternalIntegrationModel:
    """外部集成模型操作类"""
    
    @TryExcept("创建外部集成失败")
    def create_integration(self, integration_data: ExternalIntegrationModel) -> Tuple[Any, bool]:
        """创建外部集成"""
        def _create_integration_operation():
            if not integration_data.id:
                integration_data.id = str(uuid.uuid4())
                
            db.session.add(integration_data)
            db.session.commit()
            logger.info(f"创建外部集成成功: {integration_data.id}")
            return integration_data.to_dict(), True
            
        return db.session.execute(_create_integration_operation)
    
    @TryExcept("获取外部集成列表失败")
    def get_integrations(self, project_id: str = None, integration_type: str = None,
                        status: str = None, page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取外部集成列表"""
        def _get_integrations_operation():
            query = ExternalIntegrationModel.query
            
            if project_id:
                query = query.filter(ExternalIntegrationModel.project_id == project_id)
            if integration_type:
                query = query.filter(ExternalIntegrationModel.integration_type == integration_type)
            if status:
                query = query.filter(ExternalIntegrationModel.status == status)
                
            query = query.order_by(desc(ExternalIntegrationModel.created_at))
            
            total = query.count()
            integrations = query.offset((page - 1) * size).limit(size).all()
            
            result = {
                'integrations': [integration.to_dict() for integration in integrations],
                'total': total,
                'page': page,
                'size': size
            }
            
            return result, True
            
        return db.session.execute(_get_integrations_operation)
    
    @TryExcept("获取外部集成详情失败")
    def get_integration_by_id(self, integration_id: str) -> Tuple[Any, bool]:
        """根据ID获取外部集成"""
        def _get_integration_operation():
            integration = ExternalIntegrationModel.query.filter_by(id=integration_id).first()
            if not integration:
                return "集成不存在", False
            return integration.to_dict(), True
            
        return db.session.execute(_get_integration_operation)
    
    @TryExcept("更新外部集成失败")
    def update_integration(self, integration_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新外部集成"""
        def _update_integration_operation():
            integration = ExternalIntegrationModel.query.filter_by(id=integration_id).first()
            if not integration:
                return "集成不存在", False
                
            for key, value in update_data.items():
                if hasattr(integration, key):
                    setattr(integration, key, value)
                    
            integration.updated_at = datetime.now()
            db.session.commit()
            logger.info(f"更新外部集成成功: {integration_id}")
            return integration.to_dict(), True
            
        return db.session.execute(_update_integration_operation)
    
    @TryExcept("删除外部集成失败")
    def delete_integration(self, integration_id: str) -> Tuple[Any, bool]:
        """删除外部集成"""
        def _delete_integration_operation():
            integration = ExternalIntegrationModel.query.filter_by(id=integration_id).first()
            if not integration:
                return "集成不存在", False
                
            db.session.delete(integration)
            db.session.commit()
            logger.info(f"删除外部集成成功: {integration_id}")
            return "删除成功", True
            
        return db.session.execute(_delete_integration_operation)
    
    @TryExcept("记录同步日志失败")
    def log_sync_execution(self, log_data: IntegrationSyncLogModel) -> Tuple[Any, bool]:
        """记录同步执行日志"""
        def _log_sync_operation():
            if not log_data.id:
                log_data.id = str(uuid.uuid4())
                
            db.session.add(log_data)
            
            # 更新集成的最后同步时间
            integration = ExternalIntegrationModel.query.filter_by(id=log_data.integration_id).first()
            if integration:
                integration.last_sync_at = datetime.now()
                if log_data.status == 'failure' and log_data.error_details:
                    integration.sync_error_message = str(log_data.error_details)
                    integration.status = 'error'
                elif log_data.status == 'success':
                    integration.sync_error_message = None
                    integration.status = 'active'
                    
            db.session.commit()
            return log_data.to_dict(), True
            
        return db.session.execute(_log_sync_operation)
    
    @TryExcept("获取同步日志失败")
    def get_sync_logs(self, integration_id: str, page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取同步日志"""
        def _get_sync_logs_operation():
            query = IntegrationSyncLogModel.query.filter(
                IntegrationSyncLogModel.integration_id == integration_id
            )
            query = query.order_by(desc(IntegrationSyncLogModel.started_at))
            
            total = query.count()
            logs = query.offset((page - 1) * size).limit(size).all()
            
            result = {
                'logs': [log.to_dict() for log in logs],
                'total': total,
                'page': page,
                'size': size
            }
            
            return result, True
            
        return db.session.execute(_get_sync_logs_operation)


# 全局模型实例
webhook_model = OperWebhookModel()
plugin_model = OperPluginModel()
integration_model = OperExternalIntegrationModel()