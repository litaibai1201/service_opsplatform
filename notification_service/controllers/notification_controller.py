# -*- coding: utf-8 -*-
"""
@文件: notification_controller.py
@說明: 通知服务控制器
@時間: 2025-01-09
@作者: LiDong
"""
import json
import smtplib
import threading
import time
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, List, Any, Optional, Tuple
from jinja2 import Template
import requests

from dbs.mysql_db.model_tables import (
    NotificationTemplateModel, UserNotificationPreferenceModel, NotificationModel,
    EmailQueueModel, PushNotificationModel, UserDeviceModel,
    NotificationPriorityEnum, EmailStatusEnum, EmailPriorityEnum,
    PushStatusEnum, DeviceTypeEnum
)
from models.notification_model import (
    template_model, preference_model, notification_model,
    email_queue_model, push_notification_model, user_device_model
)
from common.common_method import TryExcept
from loggers import logger


class NotificationTemplateController:
    """通知模板控制器"""
    
    @TryExcept("获取通知模板列表失败")
    def get_templates(self, event_type: str = None, template_type: str = None,
                     is_active: bool = None, locale: str = None,
                     page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取通知模板列表"""
        return template_model.get_templates(event_type, template_type, is_active, locale, page, size)
    
    @TryExcept("获取通知模板详情失败")
    def get_template_by_id(self, template_id: str) -> Tuple[Any, bool]:
        """获取通知模板详情"""
        return template_model.get_template_by_id(template_id)
    
    @TryExcept("创建通知模板失败")
    def create_template(self, template_data: Dict) -> Tuple[Any, bool]:
        """创建通知模板"""
        template = NotificationTemplateModel(
            name=template_data['name'],
            type=template_data['type'],
            event_type=template_data['event_type'],
            subject_template=template_data.get('subject_template'),
            content_template=template_data['content_template'],
            html_template=template_data.get('html_template'),
            variables=template_data.get('variables', {}),
            is_active=template_data.get('is_active', True),
            locale=template_data.get('locale', 'en'),
            created_by=template_data['created_by']
        )
        
        return template_model.create_template(template)
    
    @TryExcept("更新通知模板失败")
    def update_template(self, template_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新通知模板"""
        return template_model.update_template(template_id, update_data)
    
    @TryExcept("删除通知模板失败")
    def delete_template(self, template_id: str) -> Tuple[Any, bool]:
        """删除通知模板"""
        return template_model.delete_template(template_id)
    
    @TryExcept("渲染模板失败")
    def render_template(self, template_data: Dict, variables: Dict) -> Tuple[Any, bool]:
        """渲染模板内容"""
        try:
            result = {}
            
            # 渲染主题
            if template_data.get('subject_template'):
                subject_template = Template(template_data['subject_template'])
                result['subject'] = subject_template.render(**variables)
            
            # 渲染内容
            content_template = Template(template_data['content_template'])
            result['content'] = content_template.render(**variables)
            
            # 渲染HTML内容
            if template_data.get('html_template'):
                html_template = Template(template_data['html_template'])
                result['html_content'] = html_template.render(**variables)
            
            return result, True
            
        except Exception as e:
            logger.error(f"渲染模板失败: {str(e)}")
            return f"渲染模板失败: {str(e)}", False


class NotificationPreferenceController:
    """通知偏好控制器"""
    
    @TryExcept("获取用户通知偏好失败")
    def get_user_preferences(self, user_id: str) -> Tuple[Any, bool]:
        """获取用户通知偏好"""
        return preference_model.get_user_preferences(user_id)
    
    @TryExcept("更新用户通知偏好失败")
    def update_user_preferences(self, user_id: str, preferences_data: List[Dict]) -> Tuple[Any, bool]:
        """更新用户通知偏好"""
        return preference_model.update_user_preferences(user_id, preferences_data)
    
    @TryExcept("重置用户通知偏好失败")
    def reset_user_preferences(self, user_id: str) -> Tuple[Any, bool]:
        """重置用户通知偏好"""
        return preference_model.reset_user_preferences(user_id)
    
    @TryExcept("检查用户通知偏好失败")
    def check_user_notification_enabled(self, user_id: str, event_type: str, 
                                       notification_type: str) -> Tuple[Any, bool]:
        """检查用户是否启用了特定类型的通知"""
        preference_result, success = preference_model.get_user_event_preference(user_id, event_type)
        
        if not success:
            return False, True  # 默认不发送
            
        preference = preference_result
        
        # 检查对应的通知类型是否启用
        if notification_type == 'email':
            return preference.get('email_enabled', True), True
        elif notification_type == 'in_app':
            return preference.get('in_app_enabled', True), True
        elif notification_type == 'push':
            return preference.get('push_enabled', False), True
        elif notification_type == 'sms':
            return preference.get('sms_enabled', False), True
        
        return False, True


class NotificationController:
    """通知控制器"""
    
    @TryExcept("获取用户通知列表失败")
    def get_user_notifications(self, user_id: str, is_read: bool = None,
                              priority: str = None, page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取用户通知列表"""
        return notification_model.get_user_notifications(user_id, is_read, priority, page, size)
    
    @TryExcept("获取未读通知数量失败")
    def get_unread_count(self, user_id: str) -> Tuple[Any, bool]:
        """获取未读通知数量"""
        return notification_model.get_unread_count(user_id)
    
    @TryExcept("标记通知为已读失败")
    def mark_notification_read(self, notification_id: str, user_id: str) -> Tuple[Any, bool]:
        """标记通知为已读"""
        return notification_model.mark_notification_read(notification_id, user_id)
    
    @TryExcept("标记所有通知为已读失败")
    def mark_all_notifications_read(self, user_id: str) -> Tuple[Any, bool]:
        """标记所有通知为已读"""
        return notification_model.mark_all_notifications_read(user_id)
    
    @TryExcept("删除通知失败")
    def delete_notification(self, notification_id: str, user_id: str) -> Tuple[Any, bool]:
        """删除通知"""
        return notification_model.delete_notification(notification_id, user_id)
    
    @TryExcept("创建应用内通知失败")
    def create_in_app_notification(self, user_id: str, title: str, content: str,
                                  notification_type: str = 'system',
                                  priority: str = 'normal', data: Dict = None,
                                  expires_hours: int = None) -> Tuple[Any, bool]:
        """创建应用内通知"""
        # 设置过期时间
        expires_at = None
        if expires_hours:
            expires_at = datetime.now() + timedelta(hours=expires_hours)
        
        # 转换优先级
        priority_enum = NotificationPriorityEnum.NORMAL
        if priority == 'low':
            priority_enum = NotificationPriorityEnum.LOW
        elif priority == 'high':
            priority_enum = NotificationPriorityEnum.HIGH
        elif priority == 'urgent':
            priority_enum = NotificationPriorityEnum.URGENT
        
        notification = NotificationModel(
            user_id=user_id,
            type=notification_type,
            priority=priority_enum,
            title=title,
            content=content,
            data=data or {},
            expires_at=expires_at
        )
        
        return notification_model.create_notification(notification)


class EmailController:
    """邮件控制器"""
    
    def __init__(self):
        # 邮件配置（应从配置文件读取）
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_username = ""
        self.smtp_password = ""
        self.from_email = ""
        self.from_name = "DevOps Central"
    
    @TryExcept("发送邮件失败")
    def send_email(self, to_email: str, subject: str, content: str,
                  html_content: str = None, to_name: str = None,
                  template_id: str = None, template_data: Dict = None,
                  attachments: List[Dict] = None, priority: str = 'normal',
                  scheduled_at: datetime = None) -> Tuple[Any, bool]:
        """发送邮件（添加到队列）"""
        # 转换优先级
        priority_enum = EmailPriorityEnum.NORMAL
        if priority == 'low':
            priority_enum = EmailPriorityEnum.LOW
        elif priority == 'high':
            priority_enum = EmailPriorityEnum.HIGH
        
        email = EmailQueueModel(
            to_email=to_email,
            to_name=to_name,
            from_email=self.from_email,
            from_name=self.from_name,
            subject=subject,
            content=content,
            html_content=html_content,
            template_id=template_id,
            template_data=template_data or {},
            attachments=attachments or [],
            priority=priority_enum,
            scheduled_at=scheduled_at or datetime.now()
        )
        
        result, success = email_queue_model.add_email_to_queue(email)
        
        if success:
            # 启动邮件发送线程（在实际应用中应使用队列处理）
            threading.Thread(target=self._process_email_queue, daemon=True).start()
        
        return result, success
    
    def _process_email_queue(self):
        """处理邮件队列（后台线程）"""
        try:
            pending_emails, success = email_queue_model.get_pending_emails(limit=5)
            
            if success and pending_emails:
                for email_data in pending_emails:
                    self._send_single_email(email_data)
                    time.sleep(1)  # 避免发送过快
                    
        except Exception as e:
            logger.error(f"处理邮件队列异常: {str(e)}")
    
    def _send_single_email(self, email_data: Dict):
        """发送单个邮件"""
        try:
            # 更新状态为处理中
            email_queue_model.update_email_status(
                email_data['id'], 
                EmailStatusEnum.PROCESSING
            )
            
            # 创建邮件
            msg = MIMEMultipart('alternative')
            msg['Subject'] = email_data['subject']
            msg['From'] = f"{email_data['from_name']} <{email_data['from_email']}>"
            msg['To'] = f"{email_data.get('to_name', '')} <{email_data['to_email']}>"
            
            # 添加文本内容
            text_part = MIMEText(email_data['content'], 'plain', 'utf-8')
            msg.attach(text_part)
            
            # 添加HTML内容
            if email_data.get('html_content'):
                html_part = MIMEText(email_data['html_content'], 'html', 'utf-8')
                msg.attach(html_part)
            
            # 添加附件
            if email_data.get('attachments'):
                for attachment in email_data['attachments']:
                    self._add_attachment(msg, attachment)
            
            # 发送邮件
            if self.smtp_username and self.smtp_password:
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
                
                # 更新状态为已发送
                email_queue_model.update_email_status(
                    email_data['id'], 
                    EmailStatusEnum.SENT
                )
                logger.info(f"邮件发送成功: {email_data['id']}")
            else:
                logger.warning("邮件配置未设置，跳过发送")
                
        except Exception as e:
            # 更新状态为失败，增加重试次数
            retry_count = email_data.get('retry_count', 0) + 1
            max_retries = email_data.get('max_retries', 3)
            
            if retry_count < max_retries:
                # 可以重试
                email_queue_model.update_email_status(
                    email_data['id'],
                    EmailStatusEnum.PENDING,
                    str(e),
                    retry_count
                )
                logger.warning(f"邮件发送失败，将重试: {email_data['id']}, 错误: {str(e)}")
            else:
                # 超过最大重试次数
                email_queue_model.update_email_status(
                    email_data['id'],
                    EmailStatusEnum.FAILED,
                    str(e),
                    retry_count
                )
                logger.error(f"邮件发送失败，超过最大重试次数: {email_data['id']}, 错误: {str(e)}")
    
    def _add_attachment(self, msg: MIMEMultipart, attachment: Dict):
        """添加附件"""
        try:
            filename = attachment.get('filename')
            content = attachment.get('content')
            content_type = attachment.get('content_type', 'application/octet-stream')
            
            if filename and content:
                part = MIMEBase(*content_type.split('/'))
                part.set_payload(content)
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {filename}'
                )
                msg.attach(part)
                
        except Exception as e:
            logger.error(f"添加附件失败: {str(e)}")


class PushNotificationController:
    """推送通知控制器"""
    
    def __init__(self):
        # 推送配置（应从配置文件读取）
        self.fcm_server_key = ""
        self.apns_certificate = ""
        self.apns_key_id = ""
        self.apns_team_id = ""
    
    @TryExcept("发送推送通知失败")
    def send_push_notification(self, user_id: str, title: str, body: str,
                              data: Dict = None, device_tokens: List[str] = None) -> Tuple[Any, bool]:
        """发送推送通知"""
        # 获取用户设备令牌
        if not device_tokens:
            tokens_result, success = user_device_model.get_user_active_tokens(user_id)
            if not success or not tokens_result.get('tokens'):
                return "用户没有可用的设备令牌", False
            device_tokens = tokens_result['tokens']
        
        # 为每个设备令牌创建推送记录
        push_results = []
        for token in device_tokens:
            push = PushNotificationModel(
                user_id=user_id,
                device_token=token,
                title=title,
                body=body,
                data=data or {}
            )
            
            result, success = push_notification_model.create_push_notification(push)
            if success:
                push_results.append(result)
        
        # 启动推送发送线程
        threading.Thread(target=self._process_push_queue, daemon=True).start()
        
        return {'push_notifications': push_results}, True
    
    def _process_push_queue(self):
        """处理推送队列（后台线程）"""
        try:
            pending_pushes, success = push_notification_model.get_pending_pushes(limit=10)
            
            if success and pending_pushes:
                for push_data in pending_pushes:
                    self._send_single_push(push_data)
                    
        except Exception as e:
            logger.error(f"处理推送队列异常: {str(e)}")
    
    def _send_single_push(self, push_data: Dict):
        """发送单个推送通知"""
        try:
            # 这里应该根据设备类型使用不同的推送服务
            # FCM for Android, APNs for iOS, Web Push for Web
            
            if self.fcm_server_key:
                # 使用FCM发送（示例）
                self._send_fcm_push(push_data)
            else:
                logger.warning("推送配置未设置，跳过发送")
                push_notification_model.update_push_status(
                    push_data['id'],
                    PushStatusEnum.SENT
                )
                
        except Exception as e:
            push_notification_model.update_push_status(
                push_data['id'],
                PushStatusEnum.FAILED,
                str(e)
            )
            logger.error(f"推送发送失败: {push_data['id']}, 错误: {str(e)}")
    
    def _send_fcm_push(self, push_data: Dict):
        """通过FCM发送推送"""
        try:
            fcm_url = "https://fcm.googleapis.com/fcm/send"
            headers = {
                'Authorization': f'key={self.fcm_server_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'to': push_data['device_token'],
                'notification': {
                    'title': push_data['title'],
                    'body': push_data['body']
                },
                'data': push_data.get('data', {})
            }
            
            response = requests.post(fcm_url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                push_notification_model.update_push_status(
                    push_data['id'],
                    PushStatusEnum.SENT
                )
                logger.info(f"FCM推送发送成功: {push_data['id']}")
            else:
                raise Exception(f"FCM返回错误: {response.status_code}, {response.text}")
                
        except Exception as e:
            raise e


class UserDeviceController:
    """用户设备控制器"""
    
    @TryExcept("注册设备失败")
    def register_device(self, user_id: str, device_token: str, device_type: str,
                       device_name: str = None) -> Tuple[Any, bool]:
        """注册用户设备"""
        # 转换设备类型
        device_type_enum = DeviceTypeEnum.WEB
        if device_type == 'ios':
            device_type_enum = DeviceTypeEnum.IOS
        elif device_type == 'android':
            device_type_enum = DeviceTypeEnum.ANDROID
        
        device = UserDeviceModel(
            user_id=user_id,
            device_token=device_token,
            device_type=device_type_enum,
            device_name=device_name
        )
        
        return user_device_model.register_device(device)
    
    @TryExcept("获取用户设备列表失败")
    def get_user_devices(self, user_id: str, is_active: bool = None) -> Tuple[Any, bool]:
        """获取用户设备列表"""
        return user_device_model.get_user_devices(user_id, is_active)
    
    @TryExcept("取消设备注册失败")
    def unregister_device(self, device_id: str, user_id: str) -> Tuple[Any, bool]:
        """取消设备注册"""
        return user_device_model.unregister_device(device_id, user_id)


class NotificationEngine:
    """通知引擎 - 统一通知发送入口"""
    
    def __init__(self):
        self.template_controller = NotificationTemplateController()
        self.preference_controller = NotificationPreferenceController()
        self.notification_controller = NotificationController()
        self.email_controller = EmailController()
        self.push_controller = PushNotificationController()
    
    @TryExcept("发送通知失败")
    def send_notification(self, user_id: str, event_type: str, variables: Dict,
                         notification_types: List[str] = None, priority: str = 'normal',
                         locale: str = 'en') -> Tuple[Any, bool]:
        """发送通知（统一入口）"""
        if not notification_types:
            notification_types = ['in_app', 'email', 'push']
        
        results = {}
        
        for notification_type in notification_types:
            # 检查用户偏好
            enabled_result, success = self.preference_controller.check_user_notification_enabled(
                user_id, event_type, notification_type
            )
            
            if not success or not enabled_result:
                results[notification_type] = {'sent': False, 'reason': '用户偏好关闭'}
                continue
            
            # 获取模板
            template_result, success = template_model.get_template_by_event(
                event_type, notification_type, locale
            )
            
            if not success:
                results[notification_type] = {'sent': False, 'reason': '模板不存在'}
                continue
            
            # 渲染模板
            rendered_result, success = self.template_controller.render_template(
                template_result, variables
            )
            
            if not success:
                results[notification_type] = {'sent': False, 'reason': '模板渲染失败'}
                continue
            
            # 发送通知
            if notification_type == 'in_app':
                result, success = self.notification_controller.create_in_app_notification(
                    user_id=user_id,
                    title=rendered_result.get('subject', ''),
                    content=rendered_result['content'],
                    notification_type=event_type,
                    priority=priority,
                    data=variables
                )
            elif notification_type == 'email':
                # 获取用户邮箱（这里需要从用户服务获取）
                user_email = variables.get('user_email')
                if not user_email:
                    results[notification_type] = {'sent': False, 'reason': '用户邮箱不存在'}
                    continue
                
                result, success = self.email_controller.send_email(
                    to_email=user_email,
                    subject=rendered_result.get('subject', ''),
                    content=rendered_result['content'],
                    html_content=rendered_result.get('html_content'),
                    to_name=variables.get('user_name'),
                    priority=priority
                )
            elif notification_type == 'push':
                result, success = self.push_controller.send_push_notification(
                    user_id=user_id,
                    title=rendered_result.get('subject', ''),
                    body=rendered_result['content'],
                    data=variables
                )
            else:
                results[notification_type] = {'sent': False, 'reason': '不支持的通知类型'}
                continue
            
            results[notification_type] = {
                'sent': success,
                'result': result if success else None,
                'error': result if not success else None
            }
        
        return results, True
    
    @TryExcept("批量发送通知失败")
    def send_bulk_notifications(self, notifications: List[Dict]) -> Tuple[Any, bool]:
        """批量发送通知"""
        results = []
        
        for notification in notifications:
            user_id = notification['user_id']
            event_type = notification['event_type']
            variables = notification['variables']
            notification_types = notification.get('notification_types', ['in_app', 'email'])
            priority = notification.get('priority', 'normal')
            locale = notification.get('locale', 'en')
            
            result, success = self.send_notification(
                user_id, event_type, variables, notification_types, priority, locale
            )
            
            results.append({
                'user_id': user_id,
                'event_type': event_type,
                'success': success,
                'result': result
            })
        
        return {'notifications': results}, True


# 初始化控制器实例
def init_notification_controller():
    """初始化通知控制器"""
    logger.info("通知控制器初始化完成")


# 全局控制器实例
template_controller = NotificationTemplateController()
preference_controller = NotificationPreferenceController()
notification_controller = NotificationController()
email_controller = EmailController()
push_controller = PushNotificationController()
device_controller = UserDeviceController()
notification_engine = NotificationEngine()