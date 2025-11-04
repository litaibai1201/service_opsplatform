# -*- coding: utf-8 -*-
"""
@文件: notification_model.py
@說明: 通知服务模型操作类
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy import and_, or_, desc, asc
from sqlalchemy.exc import IntegrityError

from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    NotificationTemplateModel, UserNotificationPreferenceModel, NotificationModel,
    EmailQueueModel, PushNotificationModel, UserDeviceModel,
    NotificationPriorityEnum, EmailStatusEnum, EmailPriorityEnum,
    PushStatusEnum, DeviceTypeEnum
)
from common.common_method import TryExcept
from loggers import logger


class OperNotificationTemplateModel:
    """通知模板模型操作类"""
    
    @TryExcept("创建通知模板失败")
    def create_template(self, template_data: NotificationTemplateModel) -> Tuple[Any, bool]:
        """创建通知模板"""
        def _create_template_operation():
            if not template_data.id:
                template_data.id = str(uuid.uuid4())
            
            db.session.add(template_data)
            db.session.commit()
            logger.info(f"创建通知模板成功: {template_data.id}")
            return template_data.to_dict(), True
            
        return db.session.execute(_create_template_operation)
    
    @TryExcept("获取通知模板列表失败")
    def get_templates(self, event_type: str = None, template_type: str = None, 
                     is_active: bool = None, locale: str = None,
                     page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取通知模板列表"""
        def _get_templates_operation():
            query = NotificationTemplateModel.query
            
            if event_type:
                query = query.filter(NotificationTemplateModel.event_type == event_type)
            if template_type:
                query = query.filter(NotificationTemplateModel.type == template_type)
            if is_active is not None:
                query = query.filter(NotificationTemplateModel.is_active == is_active)
            if locale:
                query = query.filter(NotificationTemplateModel.locale == locale)
                
            total = query.count()
            templates = query.offset((page - 1) * size).limit(size).all()
            
            result = {
                'templates': [template.to_dict() for template in templates],
                'total': total,
                'page': page,
                'size': size
            }
            
            return result, True
            
        return db.session.execute(_get_templates_operation)
    
    @TryExcept("获取通知模板详情失败")
    def get_template_by_id(self, template_id: str) -> Tuple[Any, bool]:
        """根据ID获取通知模板"""
        def _get_template_operation():
            template = NotificationTemplateModel.query.filter_by(id=template_id).first()
            if not template:
                return "通知模板不存在", False
            return template.to_dict(), True
            
        return db.session.execute(_get_template_operation)
    
    @TryExcept("根据事件类型获取模板失败")
    def get_template_by_event(self, event_type: str, template_type: str = None, 
                             locale: str = 'en') -> Tuple[Any, bool]:
        """根据事件类型获取模板"""
        def _get_template_operation():
            query = NotificationTemplateModel.query.filter(
                NotificationTemplateModel.event_type == event_type,
                NotificationTemplateModel.is_active == True,
                NotificationTemplateModel.locale == locale
            )
            
            if template_type:
                query = query.filter(NotificationTemplateModel.type == template_type)
                
            template = query.first()
            if not template:
                return "未找到对应的通知模板", False
            return template.to_dict(), True
            
        return db.session.execute(_get_template_operation)
    
    @TryExcept("更新通知模板失败")
    def update_template(self, template_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新通知模板"""
        def _update_template_operation():
            template = NotificationTemplateModel.query.filter_by(id=template_id).first()
            if not template:
                return "通知模板不存在", False
                
            for key, value in update_data.items():
                if hasattr(template, key):
                    setattr(template, key, value)
                    
            template.updated_at = datetime.now()
            db.session.commit()
            logger.info(f"更新通知模板成功: {template_id}")
            return template.to_dict(), True
            
        return db.session.execute(_update_template_operation)
    
    @TryExcept("删除通知模板失败")
    def delete_template(self, template_id: str) -> Tuple[Any, bool]:
        """删除通知模板"""
        def _delete_template_operation():
            template = NotificationTemplateModel.query.filter_by(id=template_id).first()
            if not template:
                return "通知模板不存在", False
                
            db.session.delete(template)
            db.session.commit()
            logger.info(f"删除通知模板成功: {template_id}")
            return "删除成功", True
            
        return db.session.execute(_delete_template_operation)


class OperUserNotificationPreferenceModel:
    """用户通知偏好模型操作类"""
    
    @TryExcept("获取用户通知偏好失败")
    def get_user_preferences(self, user_id: str) -> Tuple[Any, bool]:
        """获取用户通知偏好"""
        def _get_preferences_operation():
            preferences = UserNotificationPreferenceModel.query.filter_by(user_id=user_id).all()
            
            result = {
                'user_id': user_id,
                'preferences': [pref.to_dict() for pref in preferences]
            }
            
            return result, True
            
        return db.session.execute(_get_preferences_operation)
    
    @TryExcept("获取用户事件偏好失败")
    def get_user_event_preference(self, user_id: str, event_type: str) -> Tuple[Any, bool]:
        """获取用户特定事件的通知偏好"""
        def _get_preference_operation():
            preference = UserNotificationPreferenceModel.query.filter_by(
                user_id=user_id, event_type=event_type
            ).first()
            
            if not preference:
                # 返回默认偏好
                default_preference = {
                    'user_id': user_id,
                    'event_type': event_type,
                    'email_enabled': True,
                    'in_app_enabled': True,
                    'push_enabled': False,
                    'sms_enabled': False,
                    'frequency': 'immediate'
                }
                return default_preference, True
                
            return preference.to_dict(), True
            
        return db.session.execute(_get_preference_operation)
    
    @TryExcept("更新用户通知偏好失败")
    def update_user_preferences(self, user_id: str, preferences_data: List[Dict]) -> Tuple[Any, bool]:
        """更新用户通知偏好"""
        def _update_preferences_operation():
            updated_preferences = []
            
            for pref_data in preferences_data:
                event_type = pref_data.get('event_type')
                
                # 查找现有偏好
                preference = UserNotificationPreferenceModel.query.filter_by(
                    user_id=user_id, event_type=event_type
                ).first()
                
                if preference:
                    # 更新现有偏好
                    for key, value in pref_data.items():
                        if hasattr(preference, key) and key != 'user_id':
                            setattr(preference, key, value)
                else:
                    # 创建新偏好
                    preference = UserNotificationPreferenceModel(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        **pref_data
                    )
                    db.session.add(preference)
                
                updated_preferences.append(preference.to_dict() if hasattr(preference, 'to_dict') else pref_data)
            
            db.session.commit()
            logger.info(f"更新用户通知偏好成功: {user_id}")
            
            return {
                'user_id': user_id,
                'preferences': updated_preferences
            }, True
            
        return db.session.execute(_update_preferences_operation)
    
    @TryExcept("重置用户通知偏好失败")
    def reset_user_preferences(self, user_id: str) -> Tuple[Any, bool]:
        """重置用户通知偏好为默认设置"""
        def _reset_preferences_operation():
            # 删除现有偏好
            UserNotificationPreferenceModel.query.filter_by(user_id=user_id).delete()
            db.session.commit()
            
            logger.info(f"重置用户通知偏好成功: {user_id}")
            return "重置成功", True
            
        return db.session.execute(_reset_preferences_operation)


class OperNotificationModel:
    """通知模型操作类"""
    
    @TryExcept("创建通知失败")
    def create_notification(self, notification_data: NotificationModel) -> Tuple[Any, bool]:
        """创建通知"""
        def _create_notification_operation():
            if not notification_data.id:
                notification_data.id = str(uuid.uuid4())
            
            db.session.add(notification_data)
            db.session.commit()
            logger.info(f"创建通知成功: {notification_data.id}")
            return notification_data.to_dict(), True
            
        return db.session.execute(_create_notification_operation)
    
    @TryExcept("获取用户通知列表失败")
    def get_user_notifications(self, user_id: str, is_read: bool = None, 
                              priority: str = None, page: int = 1, size: int = 20) -> Tuple[Any, bool]:
        """获取用户通知列表"""
        def _get_notifications_operation():
            query = NotificationModel.query.filter(NotificationModel.user_id == user_id)
            
            if is_read is not None:
                query = query.filter(NotificationModel.is_read == is_read)
            if priority:
                query = query.filter(NotificationModel.priority == priority)
                
            # 过滤未过期的通知
            now = datetime.now()
            query = query.filter(
                or_(
                    NotificationModel.expires_at.is_(None),
                    NotificationModel.expires_at > now
                )
            )
            
            query = query.order_by(desc(NotificationModel.created_at))
            
            total = query.count()
            notifications = query.offset((page - 1) * size).limit(size).all()
            
            result = {
                'notifications': [notification.to_dict() for notification in notifications],
                'total': total,
                'page': page,
                'size': size
            }
            
            return result, True
            
        return db.session.execute(_get_notifications_operation)
    
    @TryExcept("获取未读通知数量失败")
    def get_unread_count(self, user_id: str) -> Tuple[Any, bool]:
        """获取用户未读通知数量"""
        def _get_unread_count_operation():
            now = datetime.now()
            count = NotificationModel.query.filter(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read == False,
                or_(
                    NotificationModel.expires_at.is_(None),
                    NotificationModel.expires_at > now
                )
            ).count()
            
            return {'unread_count': count}, True
            
        return db.session.execute(_get_unread_count_operation)
    
    @TryExcept("标记通知为已读失败")
    def mark_notification_read(self, notification_id: str, user_id: str) -> Tuple[Any, bool]:
        """标记通知为已读"""
        def _mark_read_operation():
            notification = NotificationModel.query.filter_by(
                id=notification_id, user_id=user_id
            ).first()
            
            if not notification:
                return "通知不存在", False
                
            notification.is_read = True
            notification.read_at = datetime.now()
            db.session.commit()
            
            logger.info(f"标记通知为已读: {notification_id}")
            return notification.to_dict(), True
            
        return db.session.execute(_mark_read_operation)
    
    @TryExcept("标记所有通知为已读失败")
    def mark_all_notifications_read(self, user_id: str) -> Tuple[Any, bool]:
        """标记用户所有通知为已读"""
        def _mark_all_read_operation():
            now = datetime.now()
            notifications = NotificationModel.query.filter(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read == False,
                or_(
                    NotificationModel.expires_at.is_(None),
                    NotificationModel.expires_at > now
                )
            ).all()
            
            count = 0
            for notification in notifications:
                notification.is_read = True
                notification.read_at = now
                count += 1
            
            db.session.commit()
            logger.info(f"标记所有通知为已读: {user_id}, 数量: {count}")
            
            return {'marked_count': count}, True
            
        return db.session.execute(_mark_all_read_operation)
    
    @TryExcept("删除通知失败")
    def delete_notification(self, notification_id: str, user_id: str) -> Tuple[Any, bool]:
        """删除通知"""
        def _delete_notification_operation():
            notification = NotificationModel.query.filter_by(
                id=notification_id, user_id=user_id
            ).first()
            
            if not notification:
                return "通知不存在", False
                
            db.session.delete(notification)
            db.session.commit()
            logger.info(f"删除通知成功: {notification_id}")
            return "删除成功", True
            
        return db.session.execute(_delete_notification_operation)


class OperEmailQueueModel:
    """邮件队列模型操作类"""
    
    @TryExcept("添加邮件到队列失败")
    def add_email_to_queue(self, email_data: EmailQueueModel) -> Tuple[Any, bool]:
        """添加邮件到队列"""
        def _add_email_operation():
            if not email_data.id:
                email_data.id = str(uuid.uuid4())
            
            db.session.add(email_data)
            db.session.commit()
            logger.info(f"邮件添加到队列成功: {email_data.id}")
            return email_data.to_dict(), True
            
        return db.session.execute(_add_email_operation)
    
    @TryExcept("获取待发送邮件失败")
    def get_pending_emails(self, limit: int = 10) -> Tuple[Any, bool]:
        """获取待发送的邮件"""
        def _get_pending_emails_operation():
            now = datetime.now()
            emails = EmailQueueModel.query.filter(
                EmailQueueModel.status == EmailStatusEnum.PENDING,
                EmailQueueModel.scheduled_at <= now
            ).order_by(
                EmailQueueModel.priority.desc(),
                EmailQueueModel.scheduled_at.asc()
            ).limit(limit).all()
            
            result = [email.to_dict() for email in emails]
            return result, True
            
        return db.session.execute(_get_pending_emails_operation)
    
    @TryExcept("更新邮件状态失败")
    def update_email_status(self, email_id: str, status: EmailStatusEnum, 
                           error_message: str = None, retry_count: int = None) -> Tuple[Any, bool]:
        """更新邮件状态"""
        def _update_status_operation():
            email = EmailQueueModel.query.filter_by(id=email_id).first()
            if not email:
                return "邮件不存在", False
                
            email.status = status
            if error_message:
                email.error_message = error_message
            if retry_count is not None:
                email.retry_count = retry_count
            if status == EmailStatusEnum.SENT:
                email.sent_at = datetime.now()
                
            db.session.commit()
            logger.info(f"更新邮件状态: {email_id} -> {status.value}")
            return email.to_dict(), True
            
        return db.session.execute(_update_status_operation)


class OperPushNotificationModel:
    """推送通知模型操作类"""
    
    @TryExcept("创建推送通知失败")
    def create_push_notification(self, push_data: PushNotificationModel) -> Tuple[Any, bool]:
        """创建推送通知"""
        def _create_push_operation():
            if not push_data.id:
                push_data.id = str(uuid.uuid4())
            
            db.session.add(push_data)
            db.session.commit()
            logger.info(f"创建推送通知成功: {push_data.id}")
            return push_data.to_dict(), True
            
        return db.session.execute(_create_push_operation)
    
    @TryExcept("获取待发送推送失败")
    def get_pending_pushes(self, limit: int = 10) -> Tuple[Any, bool]:
        """获取待发送的推送通知"""
        def _get_pending_pushes_operation():
            pushes = PushNotificationModel.query.filter(
                PushNotificationModel.status == PushStatusEnum.PENDING
            ).order_by(
                PushNotificationModel.created_at.asc()
            ).limit(limit).all()
            
            result = [push.to_dict() for push in pushes]
            return result, True
            
        return db.session.execute(_get_pending_pushes_operation)
    
    @TryExcept("更新推送状态失败")
    def update_push_status(self, push_id: str, status: PushStatusEnum, 
                          error_message: str = None) -> Tuple[Any, bool]:
        """更新推送状态"""
        def _update_push_status_operation():
            push = PushNotificationModel.query.filter_by(id=push_id).first()
            if not push:
                return "推送通知不存在", False
                
            push.status = status
            if error_message:
                push.error_message = error_message
            if status == PushStatusEnum.SENT:
                push.sent_at = datetime.now()
                
            db.session.commit()
            logger.info(f"更新推送状态: {push_id} -> {status.value}")
            return push.to_dict(), True
            
        return db.session.execute(_update_push_status_operation)


class OperUserDeviceModel:
    """用户设备模型操作类"""
    
    @TryExcept("注册设备失败")
    def register_device(self, device_data: UserDeviceModel) -> Tuple[Any, bool]:
        """注册设备"""
        def _register_device_operation():
            # 检查设备是否已存在
            existing_device = UserDeviceModel.query.filter_by(
                user_id=device_data.user_id,
                device_token=device_data.device_token
            ).first()
            
            if existing_device:
                # 更新设备信息
                existing_device.device_name = device_data.device_name or existing_device.device_name
                existing_device.is_active = True
                existing_device.last_used_at = datetime.now()
                db.session.commit()
                logger.info(f"更新设备信息: {existing_device.id}")
                return existing_device.to_dict(), True
            else:
                # 注册新设备
                if not device_data.id:
                    device_data.id = str(uuid.uuid4())
                
                db.session.add(device_data)
                db.session.commit()
                logger.info(f"注册新设备成功: {device_data.id}")
                return device_data.to_dict(), True
            
        return db.session.execute(_register_device_operation)
    
    @TryExcept("获取用户设备列表失败")
    def get_user_devices(self, user_id: str, is_active: bool = None) -> Tuple[Any, bool]:
        """获取用户设备列表"""
        def _get_devices_operation():
            query = UserDeviceModel.query.filter(UserDeviceModel.user_id == user_id)
            
            if is_active is not None:
                query = query.filter(UserDeviceModel.is_active == is_active)
                
            devices = query.order_by(desc(UserDeviceModel.last_used_at)).all()
            
            result = {
                'user_id': user_id,
                'devices': [device.to_dict() for device in devices]
            }
            
            return result, True
            
        return db.session.execute(_get_devices_operation)
    
    @TryExcept("获取用户活跃设备令牌失败")
    def get_user_active_tokens(self, user_id: str, device_type: str = None) -> Tuple[Any, bool]:
        """获取用户活跃的设备令牌"""
        def _get_tokens_operation():
            query = UserDeviceModel.query.filter(
                UserDeviceModel.user_id == user_id,
                UserDeviceModel.is_active == True
            )
            
            if device_type:
                query = query.filter(UserDeviceModel.device_type == device_type)
                
            devices = query.all()
            tokens = [device.device_token for device in devices]
            
            return {'tokens': tokens}, True
            
        return db.session.execute(_get_tokens_operation)
    
    @TryExcept("取消设备注册失败")
    def unregister_device(self, device_id: str, user_id: str) -> Tuple[Any, bool]:
        """取消设备注册"""
        def _unregister_device_operation():
            device = UserDeviceModel.query.filter_by(
                id=device_id, user_id=user_id
            ).first()
            
            if not device:
                return "设备不存在", False
                
            device.is_active = False
            db.session.commit()
            logger.info(f"取消设备注册: {device_id}")
            return "取消注册成功", True
            
        return db.session.execute(_unregister_device_operation)


# 全局模型实例
template_model = OperNotificationTemplateModel()
preference_model = OperUserNotificationPreferenceModel()
notification_model = OperNotificationModel()
email_queue_model = OperEmailQueueModel()
push_notification_model = OperPushNotificationModel()
user_device_model = OperUserDeviceModel()