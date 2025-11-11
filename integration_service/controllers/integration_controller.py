# -*- coding: utf-8 -*-
"""
@文件: integration_controller.py
@說明: 集成服务控制器
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
import json
import requests
import hashlib
import hmac
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from models.integration_model import webhook_model, plugin_model, integration_model
from dbs.mysql_db.model_tables import (
    WebhookModel, WebhookLogModel, PluginModel, PluginConfigurationModel,
    ExternalIntegrationModel, IntegrationSyncLogModel
)
from common.common_tools import TryExcept
from cache import redis_client
from loggers import logger


class WebhookController:
    """Webhook控制器"""
    
    def __init__(self):
        self.wm = webhook_model
        self.cache = redis_client
        self.executor = ThreadPoolExecutor(max_workers=10)
        
    # ==================== Webhook管理 ====================
    
    @TryExcept("创建Webhook失败")
    def create_webhook(self, data: Dict) -> Tuple[Any, bool]:
        """创建Webhook"""
        try:
            webhook = WebhookModel(
                id=str(uuid.uuid4()),
                project_id=data.get('project_id'),
                name=data.get('name'),
                url=data.get('url'),
                events=data.get('events', []),
                headers=data.get('headers', {}),
                secret=data.get('secret'),
                is_active=data.get('is_active', True),
                retry_config=data.get('retry_config', {
                    'max_retries': 3,
                    'retry_delay': 5,
                    'backoff_factor': 2
                }),
                timeout_seconds=data.get('timeout_seconds', 30),
                created_by=data.get('user_id')
            )
            
            return self.wm.create_webhook(webhook)
            
        except Exception as e:
            logger.error(f"创建Webhook控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取Webhook列表失败")
    def get_webhooks(self, data: Dict) -> Tuple[Any, bool]:
        """获取Webhook列表"""
        try:
            project_id = data.get('project_id')
            is_active = data.get('is_active')
            page = data.get('page', 1)
            size = data.get('size', 20)
            
            return self.wm.get_webhooks(project_id, is_active, page, size)
            
        except Exception as e:
            logger.error(f"获取Webhook列表控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取Webhook详情失败")
    def get_webhook_detail(self, data: Dict) -> Tuple[Any, bool]:
        """获取Webhook详情"""
        try:
            webhook_id = data.get('webhook_id')
            if not webhook_id:
                return "Webhook ID不能为空", False
                
            return self.wm.get_webhook_by_id(webhook_id)
            
        except Exception as e:
            logger.error(f"获取Webhook详情控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("更新Webhook失败")
    def update_webhook(self, data: Dict) -> Tuple[Any, bool]:
        """更新Webhook"""
        try:
            webhook_id = data.get('webhook_id')
            if not webhook_id:
                return "Webhook ID不能为空", False
                
            update_data = {k: v for k, v in data.items() 
                          if k not in ['webhook_id', 'user_id']}
            
            return self.wm.update_webhook(webhook_id, update_data)
            
        except Exception as e:
            logger.error(f"更新Webhook控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("删除Webhook失败")
    def delete_webhook(self, data: Dict) -> Tuple[Any, bool]:
        """删除Webhook"""
        try:
            webhook_id = data.get('webhook_id')
            if not webhook_id:
                return "Webhook ID不能为空", False
                
            return self.wm.delete_webhook(webhook_id)
            
        except Exception as e:
            logger.error(f"删除Webhook控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("测试Webhook失败")
    def test_webhook(self, data: Dict) -> Tuple[Any, bool]:
        """测试Webhook"""
        try:
            webhook_id = data.get('webhook_id')
            if not webhook_id:
                return "Webhook ID不能为空", False
                
            webhook_result, success = self.wm.get_webhook_by_id(webhook_id)
            if not success:
                return webhook_result, False
                
            # 构造测试载荷
            test_payload = {
                'event_type': 'test',
                'timestamp': datetime.now().isoformat(),
                'data': {
                    'message': 'This is a test webhook call',
                    'webhook_id': webhook_id
                }
            }
            
            # 执行Webhook调用
            result = self._execute_webhook(webhook_result, 'test', test_payload)
            
            return result, True
            
        except Exception as e:
            logger.error(f"测试Webhook控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取Webhook日志失败")
    def get_webhook_logs(self, data: Dict) -> Tuple[Any, bool]:
        """获取Webhook执行日志"""
        try:
            webhook_id = data.get('webhook_id')
            if not webhook_id:
                return "Webhook ID不能为空", False
                
            page = data.get('page', 1)
            size = data.get('size', 20)
            
            return self.wm.get_webhook_logs(webhook_id, page, size)
            
        except Exception as e:
            logger.error(f"获取Webhook日志控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("重试Webhook失败")
    def retry_webhook(self, data: Dict) -> Tuple[Any, bool]:
        """重试失败的Webhook调用"""
        try:
            webhook_id = data.get('webhook_id')
            log_id = data.get('log_id')
            
            if not webhook_id:
                return "Webhook ID不能为空", False
                
            # 获取Webhook配置
            webhook_result, success = self.wm.get_webhook_by_id(webhook_id)
            if not success:
                return webhook_result, False
                
            # 如果指定了log_id，获取原始载荷
            if log_id:
                # 这里需要实现获取特定日志的方法
                # 暂时使用测试载荷
                pass
                
            # 构造重试载荷
            retry_payload = {
                'event_type': 'retry',
                'timestamp': datetime.now().isoformat(),
                'original_log_id': log_id,
                'data': {
                    'message': 'This is a retry webhook call',
                    'webhook_id': webhook_id
                }
            }
            
            # 执行重试
            result = self._execute_webhook(webhook_result, 'retry', retry_payload)
            
            return result, True
            
        except Exception as e:
            logger.error(f"重试Webhook控制器异常: {str(e)}")
            return str(e), False
    
    # ==================== Webhook执行引擎 ====================
    
    def trigger_webhook(self, webhook_id: str, event_type: str, payload: Dict):
        """触发Webhook（异步）"""
        try:
            # 获取Webhook配置
            webhook_result, success = self.wm.get_webhook_by_id(webhook_id)
            if not success:
                logger.error(f"获取Webhook配置失败: {webhook_result}")
                return
                
            webhook_data = webhook_result
            
            # 检查是否激活和事件匹配
            if not webhook_data.get('is_active'):
                logger.warning(f"Webhook未激活: {webhook_id}")
                return
                
            if event_type not in webhook_data.get('events', []):
                logger.debug(f"事件类型不匹配: {event_type}")
                return
                
            # 异步执行
            self.executor.submit(self._execute_webhook, webhook_data, event_type, payload)
            
        except Exception as e:
            logger.error(f"触发Webhook异常: {str(e)}")
    
    def _execute_webhook(self, webhook_data: Dict, event_type: str, payload: Dict) -> Dict:
        """执行Webhook调用"""
        webhook_id = webhook_data['id']
        start_time = datetime.now()
        
        try:
            # 准备请求
            url = webhook_data['url']
            headers = webhook_data.get('headers', {})
            headers['Content-Type'] = 'application/json'
            
            # 添加签名
            if webhook_data.get('secret'):
                signature = self._generate_signature(payload, webhook_data['secret'])
                headers['X-Webhook-Signature'] = f"sha256={signature}"
                
            # 添加元数据
            headers['X-Webhook-Event'] = event_type
            headers['X-Webhook-ID'] = webhook_id
            headers['X-Webhook-Timestamp'] = start_time.isoformat()
            
            timeout = webhook_data.get('timeout_seconds', 30)
            
            # 执行请求
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=timeout
            )
            
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # 记录日志
            log_data = WebhookLogModel(
                webhook_id=webhook_id,
                event_type=event_type,
                payload=payload,
                response_status=response.status_code,
                response_body=response.text[:10000],  # 限制长度
                response_headers=dict(response.headers),
                execution_time_ms=execution_time,
                error_message=None if response.ok else f"HTTP {response.status_code}",
                retry_count=0
            )
            
            self.wm.log_webhook_execution(log_data)
            
            result = {
                'success': response.ok,
                'status_code': response.status_code,
                'execution_time_ms': execution_time,
                'response_body': response.text[:1000]  # 返回部分响应
            }
            
            # 如果失败且配置了重试，执行重试
            if not response.ok and webhook_data.get('retry_config', {}).get('max_retries', 0) > 0:
                self._schedule_retry(webhook_data, event_type, payload, log_data)
                
            return result
            
        except requests.RequestException as e:
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # 记录错误日志
            log_data = WebhookLogModel(
                webhook_id=webhook_id,
                event_type=event_type,
                payload=payload,
                response_status=None,
                response_body=None,
                response_headers=None,
                execution_time_ms=execution_time,
                error_message=str(e),
                retry_count=0
            )
            
            self.wm.log_webhook_execution(log_data)
            
            # 如果配置了重试，执行重试
            if webhook_data.get('retry_config', {}).get('max_retries', 0) > 0:
                self._schedule_retry(webhook_data, event_type, payload, log_data)
                
            return {
                'success': False,
                'error': str(e),
                'execution_time_ms': execution_time
            }
            
        except Exception as e:
            logger.error(f"执行Webhook异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_signature(self, payload: Dict, secret: str) -> str:
        """生成Webhook签名"""
        payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        signature = hmac.new(
            secret.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def _schedule_retry(self, webhook_data: Dict, event_type: str, payload: Dict, 
                       original_log: WebhookLogModel):
        """调度重试"""
        retry_config = webhook_data.get('retry_config', {})
        max_retries = retry_config.get('max_retries', 3)
        retry_delay = retry_config.get('retry_delay', 5)
        backoff_factor = retry_config.get('backoff_factor', 2)
        
        for retry_attempt in range(1, max_retries + 1):
            delay = retry_delay * (backoff_factor ** (retry_attempt - 1))
            
            # 使用定时器调度重试
            timer = threading.Timer(
                delay, 
                self._execute_retry,
                args=(webhook_data, event_type, payload, retry_attempt, original_log.id)
            )
            timer.start()
    
    def _execute_retry(self, webhook_data: Dict, event_type: str, payload: Dict, 
                      retry_attempt: int, original_log_id: str):
        """执行重试"""
        try:
            # 修改载荷标记为重试
            retry_payload = payload.copy()
            retry_payload['_retry_attempt'] = retry_attempt
            retry_payload['_original_log_id'] = original_log_id
            
            result = self._execute_webhook(webhook_data, event_type, retry_payload)
            
            # 如果重试成功，停止后续重试
            if result.get('success'):
                logger.info(f"Webhook重试成功: {webhook_data['id']}, 尝试次数: {retry_attempt}")
                
        except Exception as e:
            logger.error(f"执行Webhook重试异常: {str(e)}")


class PluginController:
    """插件控制器"""
    
    def __init__(self):
        self.pm = plugin_model
        self.cache = redis_client
        
    # ==================== 插件管理 ====================
    
    @TryExcept("安装插件失败")
    def install_plugin(self, data: Dict) -> Tuple[Any, bool]:
        """安装插件"""
        try:
            plugin = PluginModel(
                id=str(uuid.uuid4()),
                name=data.get('name'),
                version=data.get('version'),
                description=data.get('description'),
                author=data.get('author'),
                repository_url=data.get('repository_url'),
                documentation_url=data.get('documentation_url'),
                manifest=data.get('manifest'),
                permissions=data.get('permissions', []),
                configuration_schema=data.get('configuration_schema'),
                is_enabled=data.get('is_enabled', True),
                is_verified=data.get('is_verified', False),
                installed_by=data.get('user_id')
            )
            
            return self.pm.install_plugin(plugin)
            
        except Exception as e:
            logger.error(f"安装插件控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取插件列表失败")
    def get_plugins(self, data: Dict) -> Tuple[Any, bool]:
        """获取插件列表"""
        try:
            is_enabled = data.get('is_enabled')
            is_verified = data.get('is_verified')
            page = data.get('page', 1)
            size = data.get('size', 20)
            sort_by = data.get('sort_by', 'rating')
            
            return self.pm.get_plugins(is_enabled, is_verified, page, size, sort_by)
            
        except Exception as e:
            logger.error(f"获取插件列表控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取插件市场失败")
    def get_plugin_marketplace(self, data: Dict) -> Tuple[Any, bool]:
        """获取插件市场"""
        try:
            # 获取已验证的插件
            marketplace_data = {
                'is_verified': True,
                'page': data.get('page', 1),
                'size': data.get('size', 20),
                'sort_by': data.get('sort_by', 'rating')
            }
            
            result, success = self.pm.get_plugins(**marketplace_data)
            
            if success:
                # 添加市场特有信息
                for plugin in result['plugins']:
                    plugin['marketplace_featured'] = plugin.get('rating', 0) >= 4.0
                    plugin['trending'] = plugin.get('download_count', 0) > 100
                    
            return result, success
            
        except Exception as e:
            logger.error(f"获取插件市场控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取插件详情失败")
    def get_plugin_detail(self, data: Dict) -> Tuple[Any, bool]:
        """获取插件详情"""
        try:
            plugin_id = data.get('plugin_id')
            if not plugin_id:
                return "插件ID不能为空", False
                
            return self.pm.get_plugin_by_id(plugin_id)
            
        except Exception as e:
            logger.error(f"获取插件详情控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("卸载插件失败")
    def uninstall_plugin(self, data: Dict) -> Tuple[Any, bool]:
        """卸载插件"""
        try:
            plugin_id = data.get('plugin_id')
            if not plugin_id:
                return "插件ID不能为空", False
                
            return self.pm.uninstall_plugin(plugin_id)
            
        except Exception as e:
            logger.error(f"卸载插件控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("更新插件配置失败")
    def update_plugin_config(self, data: Dict) -> Tuple[Any, bool]:
        """更新插件配置"""
        try:
            plugin_id = data.get('plugin_id')
            project_id = data.get('project_id')
            configuration = data.get('configuration')
            user_id = data.get('user_id')
            
            if not plugin_id or not configuration:
                return "插件ID和配置不能为空", False
                
            # 查找现有配置
            # 这里需要实现查找现有配置的方法
            
            config = PluginConfigurationModel(
                plugin_id=plugin_id,
                project_id=project_id,
                configuration=configuration,
                is_active=data.get('is_active', True),
                created_by=user_id
            )
            
            return self.pm.create_plugin_configuration(config)
            
        except Exception as e:
            logger.error(f"更新插件配置控制器异常: {str(e)}")
            return str(e), False


class ExternalIntegrationController:
    """外部集成控制器"""
    
    def __init__(self):
        self.im = integration_model
        self.cache = redis_client
        self.sync_executor = ThreadPoolExecutor(max_workers=5)
        
    # ==================== 外部集成管理 ====================
    
    @TryExcept("创建外部集成失败")
    def create_integration(self, data: Dict) -> Tuple[Any, bool]:
        """创建外部集成"""
        try:
            integration = ExternalIntegrationModel(
                id=str(uuid.uuid4()),
                project_id=data.get('project_id'),
                integration_type=data.get('integration_type'),
                name=data.get('name'),
                configuration=data.get('configuration'),
                auth_config=data.get('auth_config'),
                sync_settings=data.get('sync_settings', {
                    'auto_sync': True,
                    'sync_interval': 3600,  # 1小时
                    'sync_direction': 'bidirectional'
                }),
                status='active',
                created_by=data.get('user_id')
            )
            
            result, success = self.im.create_integration(integration)
            
            # 如果创建成功且配置了自动同步，启动同步
            if success and integration.sync_settings.get('auto_sync'):
                self._schedule_sync(integration.id)
                
            return result, success
            
        except Exception as e:
            logger.error(f"创建外部集成控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取外部集成列表失败")
    def get_integrations(self, data: Dict) -> Tuple[Any, bool]:
        """获取外部集成列表"""
        try:
            project_id = data.get('project_id')
            integration_type = data.get('integration_type')
            status = data.get('status')
            page = data.get('page', 1)
            size = data.get('size', 20)
            
            return self.im.get_integrations(project_id, integration_type, status, page, size)
            
        except Exception as e:
            logger.error(f"获取外部集成列表控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取外部集成详情失败")
    def get_integration_detail(self, data: Dict) -> Tuple[Any, bool]:
        """获取外部集成详情"""
        try:
            integration_id = data.get('integration_id')
            if not integration_id:
                return "集成ID不能为空", False
                
            return self.im.get_integration_by_id(integration_id)
            
        except Exception as e:
            logger.error(f"获取外部集成详情控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("更新外部集成失败")
    def update_integration(self, data: Dict) -> Tuple[Any, bool]:
        """更新外部集成"""
        try:
            integration_id = data.get('integration_id')
            if not integration_id:
                return "集成ID不能为空", False
                
            update_data = {k: v for k, v in data.items() 
                          if k not in ['integration_id', 'user_id']}
            
            return self.im.update_integration(integration_id, update_data)
            
        except Exception as e:
            logger.error(f"更新外部集成控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("删除外部集成失败")
    def delete_integration(self, data: Dict) -> Tuple[Any, bool]:
        """删除外部集成"""
        try:
            integration_id = data.get('integration_id')
            if not integration_id:
                return "集成ID不能为空", False
                
            return self.im.delete_integration(integration_id)
            
        except Exception as e:
            logger.error(f"删除外部集成控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("手动同步失败")
    def manual_sync(self, data: Dict) -> Tuple[Any, bool]:
        """手动触发同步"""
        try:
            integration_id = data.get('integration_id')
            sync_type = data.get('sync_type', 'full')
            
            if not integration_id:
                return "集成ID不能为空", False
                
            # 获取集成配置
            integration_result, success = self.im.get_integration_by_id(integration_id)
            if not success:
                return integration_result, False
                
            # 异步执行同步
            future = self.sync_executor.submit(
                self._execute_sync, 
                integration_result, 
                sync_type, 
                manual=True
            )
            
            return {"message": "同步任务已启动", "integration_id": integration_id}, True
            
        except Exception as e:
            logger.error(f"手动同步控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取同步日志失败")
    def get_sync_logs(self, data: Dict) -> Tuple[Any, bool]:
        """获取同步日志"""
        try:
            integration_id = data.get('integration_id')
            if not integration_id:
                return "集成ID不能为空", False
                
            page = data.get('page', 1)
            size = data.get('size', 20)
            
            return self.im.get_sync_logs(integration_id, page, size)
            
        except Exception as e:
            logger.error(f"获取同步日志控制器异常: {str(e)}")
            return str(e), False
    
    # ==================== 集成类型管理 ====================
    
    @TryExcept("获取集成类型失败")
    def get_integration_types(self, data: Dict) -> Tuple[Any, bool]:
        """获取支持的集成类型"""
        try:
            integration_types = [
                {
                    'type': 'github',
                    'name': 'GitHub',
                    'description': '与GitHub代码仓库集成',
                    'category': 'code_repository',
                    'supported_features': ['webhook', 'sync', 'auth'],
                    'auth_types': ['oauth', 'token'],
                    'icon': 'github.png'
                },
                {
                    'type': 'gitlab',
                    'name': 'GitLab',
                    'description': '与GitLab代码仓库集成',
                    'category': 'code_repository',
                    'supported_features': ['webhook', 'sync', 'auth'],
                    'auth_types': ['oauth', 'token'],
                    'icon': 'gitlab.png'
                },
                {
                    'type': 'jira',
                    'name': 'Jira',
                    'description': '与Atlassian Jira项目管理工具集成',
                    'category': 'project_management',
                    'supported_features': ['webhook', 'sync', 'auth'],
                    'auth_types': ['basic', 'oauth', 'token'],
                    'icon': 'jira.png'
                },
                {
                    'type': 'slack',
                    'name': 'Slack',
                    'description': '与Slack团队协作工具集成',
                    'category': 'communication',
                    'supported_features': ['webhook', 'bot', 'auth'],
                    'auth_types': ['oauth'],
                    'icon': 'slack.png'
                },
                {
                    'type': 'jenkins',
                    'name': 'Jenkins',
                    'description': '与Jenkins CI/CD系统集成',
                    'category': 'ci_cd',
                    'supported_features': ['webhook', 'api', 'auth'],
                    'auth_types': ['basic', 'token'],
                    'icon': 'jenkins.png'
                },
                {
                    'type': 'docker',
                    'name': 'Docker Registry',
                    'description': '与Docker镜像仓库集成',
                    'category': 'container',
                    'supported_features': ['sync', 'auth'],
                    'auth_types': ['basic', 'token'],
                    'icon': 'docker.png'
                }
            ]
            
            return {"types": integration_types}, True
            
        except Exception as e:
            logger.error(f"获取集成类型控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取集成配置架构失败")
    def get_integration_schema(self, data: Dict) -> Tuple[Any, bool]:
        """获取集成配置架构"""
        try:
            integration_type = data.get('integration_type')
            if not integration_type:
                return "集成类型不能为空", False
                
            # 根据集成类型返回配置架构
            schemas = {
                'github': {
                    'properties': {
                        'repository': {'type': 'string', 'required': True},
                        'owner': {'type': 'string', 'required': True},
                        'branch': {'type': 'string', 'default': 'main'},
                        'webhook_events': {
                            'type': 'array',
                            'items': {'type': 'string'},
                            'enum': ['push', 'pull_request', 'issues', 'release']
                        }
                    }
                },
                'jira': {
                    'properties': {
                        'server_url': {'type': 'string', 'required': True},
                        'project_key': {'type': 'string', 'required': True},
                        'issue_types': {
                            'type': 'array',
                            'items': {'type': 'string'},
                            'default': ['Bug', 'Task', 'Story']
                        }
                    }
                },
                'slack': {
                    'properties': {
                        'workspace': {'type': 'string', 'required': True},
                        'channels': {
                            'type': 'array',
                            'items': {'type': 'string'},
                            'required': True
                        },
                        'notification_events': {
                            'type': 'array',
                            'items': {'type': 'string'},
                            'enum': ['deployment', 'error', 'success', 'warning']
                        }
                    }
                }
            }
            
            schema = schemas.get(integration_type)
            if not schema:
                return f"不支持的集成类型: {integration_type}", False
                
            return {"schema": schema}, True
            
        except Exception as e:
            logger.error(f"获取集成配置架构控制器异常: {str(e)}")
            return str(e), False
    
    # ==================== 数据同步引擎 ====================
    
    def _schedule_sync(self, integration_id: str):
        """调度自动同步"""
        try:
            # 获取集成配置
            integration_result, success = self.im.get_integration_by_id(integration_id)
            if not success:
                logger.error(f"获取集成配置失败: {integration_result}")
                return
                
            sync_settings = integration_result.get('sync_settings', {})
            if not sync_settings.get('auto_sync'):
                return
                
            sync_interval = sync_settings.get('sync_interval', 3600)
            
            # 使用定时器调度下次同步
            timer = threading.Timer(
                sync_interval,
                self._execute_sync,
                args=(integration_result, 'scheduled', False)
            )
            timer.start()
            
        except Exception as e:
            logger.error(f"调度同步异常: {str(e)}")
    
    def _execute_sync(self, integration_data: Dict, sync_type: str, manual: bool = False):
        """执行数据同步"""
        integration_id = integration_data['id']
        start_time = datetime.now()
        
        try:
            # 创建同步日志
            sync_log = IntegrationSyncLogModel(
                integration_id=integration_id,
                sync_type=sync_type,
                status='success',  # 先设为成功，后续根据实际情况更新
                started_at=start_time
            )
            
            # 根据集成类型执行不同的同步逻辑
            integration_type = integration_data['integration_type']
            sync_result = self._sync_by_type(integration_type, integration_data)
            
            # 更新同步日志
            sync_log.status = sync_result.get('status', 'success')
            sync_log.records_processed = sync_result.get('records_processed', 0)
            sync_log.errors_count = sync_result.get('errors_count', 0)
            sync_log.sync_details = sync_result.get('details')
            sync_log.error_details = sync_result.get('errors')
            sync_log.completed_at = datetime.now()
            
            # 记录日志
            self.im.log_sync_execution(sync_log)
            
            # 如果是自动同步且成功，调度下次同步
            if not manual and sync_result.get('status') == 'success':
                self._schedule_sync(integration_id)
                
            logger.info(f"同步完成: {integration_id}, 状态: {sync_log.status}")
            
        except Exception as e:
            # 记录错误日志
            sync_log = IntegrationSyncLogModel(
                integration_id=integration_id,
                sync_type=sync_type,
                status='failure',
                started_at=start_time,
                completed_at=datetime.now(),
                error_details={'error': str(e)}
            )
            
            self.im.log_sync_execution(sync_log)
            logger.error(f"同步异常: {integration_id}, 错误: {str(e)}")
    
    def _sync_by_type(self, integration_type: str, integration_data: Dict) -> Dict:
        """根据集成类型执行同步"""
        try:
            if integration_type == 'github':
                return self._sync_github(integration_data)
            elif integration_type == 'jira':
                return self._sync_jira(integration_data)
            elif integration_type == 'slack':
                return self._sync_slack(integration_data)
            else:
                return {
                    'status': 'failure',
                    'errors': [f'不支持的集成类型: {integration_type}']
                }
                
        except Exception as e:
            return {
                'status': 'failure',
                'errors': [str(e)]
            }
    
    def _sync_github(self, integration_data: Dict) -> Dict:
        """同步GitHub数据"""
        # 这里实现GitHub API集成逻辑
        # 示例实现
        try:
            config = integration_data['configuration']
            auth_config = integration_data.get('auth_config', {})
            
            # 模拟同步过程
            records_processed = 10
            errors_count = 0
            
            return {
                'status': 'success',
                'records_processed': records_processed,
                'errors_count': errors_count,
                'details': {
                    'repositories_synced': 1,
                    'commits_processed': records_processed,
                    'last_commit': 'abc123'
                }
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'errors': [str(e)]
            }
    
    def _sync_jira(self, integration_data: Dict) -> Dict:
        """同步Jira数据"""
        # 这里实现Jira API集成逻辑
        try:
            config = integration_data['configuration']
            auth_config = integration_data.get('auth_config', {})
            
            # 模拟同步过程
            records_processed = 5
            errors_count = 0
            
            return {
                'status': 'success',
                'records_processed': records_processed,
                'errors_count': errors_count,
                'details': {
                    'issues_synced': records_processed,
                    'project_key': config.get('project_key')
                }
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'errors': [str(e)]
            }
    
    def _sync_slack(self, integration_data: Dict) -> Dict:
        """同步Slack数据"""
        # 这里实现Slack API集成逻辑
        try:
            config = integration_data['configuration']
            auth_config = integration_data.get('auth_config', {})
            
            # 模拟同步过程
            records_processed = 3
            errors_count = 0
            
            return {
                'status': 'success',
                'records_processed': records_processed,
                'errors_count': errors_count,
                'details': {
                    'channels_synced': len(config.get('channels', [])),
                    'messages_processed': records_processed
                }
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'errors': [str(e)]
            }


def init_integration_controller():
    """初始化集成控制器"""
    global webhook_controller, plugin_controller, integration_controller
    webhook_controller = WebhookController()
    plugin_controller = PluginController()
    integration_controller = ExternalIntegrationController()
    logger.info("集成控制器初始化完成")


# 全局控制器实例
webhook_controller = None
plugin_controller = None
integration_controller = None