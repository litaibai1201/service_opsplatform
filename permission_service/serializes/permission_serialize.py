# -*- coding: utf-8 -*-
"""
@文件: permission_serialize.py
@說明: 權限相關序列化模式 (Permission Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates, ValidationError


class PermissionVerifySchema(Schema):
    """单个权限验证请求模式"""
    user_id = fields.String(required=True, error_messages={'required': '用戶ID為必填項'})
    resource_type = fields.String(required=True, validate=validate.Length(min=1, max=50), error_messages={'required': '資源類型為必填項'})
    resource_id = fields.String(required=True, error_messages={'required': '資源ID為必填項'})
    action = fields.String(required=True, validate=validate.Length(min=1, max=50), error_messages={'required': '操作類型為必填項'})


class PermissionVerifyBatchSchema(Schema):
    """批量权限验证请求模式"""
    user_id = fields.String(required=True, error_messages={'required': '用戶ID為必填項'})
    permissions = fields.List(
        fields.Nested(PermissionVerifySchema(exclude=['user_id'])),
        required=True,
        validate=validate.Length(min=1, max=50),
        error_messages={'required': '權限列表為必填項'}
    )


class PermissionVerifyContextSchema(Schema):
    """基于用户上下文验证权限请求模式"""
    user_id = fields.String(required=True, error_messages={'required': '用戶ID為必填項'})
    resource_type = fields.String(required=True, validate=validate.Length(min=1, max=50))
    resource_id = fields.String(required=True)
    action = fields.String(required=True, validate=validate.Length(min=1, max=50))
    use_cache = fields.Boolean(missing=True)


class ContextRefreshSchema(Schema):
    """刷新用户权限上下文请求模式"""
    user_ids = fields.List(
        fields.String(),
        required=True,
        validate=validate.Length(min=1, max=100),
        error_messages={'required': '用戶ID列表為必填項'}
    )


class ContextClearSchema(Schema):
    """清除权限上下文缓存请求模式"""
    user_ids = fields.List(fields.String(), missing=None)
    clear_all = fields.Boolean(missing=False)


class TeamRoleChangedEventSchema(Schema):
    """群组角色变更事件请求模式"""
    user_id = fields.String(required=True, error_messages={'required': '用戶ID為必填項'})
    team_id = fields.String(required=True, error_messages={'required': '群組ID為必填項'})
    old_role = fields.String(missing=None)
    new_role = fields.String(missing=None)
    changed_by = fields.String(required=True, error_messages={'required': '變更者ID為必填項'})


class ProjectMaintainerChangedEventSchema(Schema):
    """项目维护员变更事件请求模式"""
    user_id = fields.String(required=True, error_messages={'required': '用戶ID為必填項'})
    project_id = fields.String(required=True, error_messages={'required': '項目ID為必填項'})
    action = fields.String(required=True, validate=validate.OneOf(['added', 'removed']), error_messages={'required': '操作類型為必填項'})
    changed_by = fields.String(required=True, error_messages={'required': '變更者ID為必填項'})


class UserPlatformRoleChangedEventSchema(Schema):
    """用户平台角色变更事件请求模式"""
    user_id = fields.String(required=True, error_messages={'required': '用戶ID為必填項'})
    old_role = fields.String(validate=validate.OneOf(['platform_admin', 'platform_user']), missing=None)
    new_role = fields.String(required=True, validate=validate.OneOf(['platform_admin', 'platform_user']), error_messages={'required': '新角色為必填項'})
    changed_by = fields.String(required=True, error_messages={'required': '變更者ID為必填項'})


class CacheInvalidateSchema(Schema):
    """缓存失效请求模式"""
    user_ids = fields.List(fields.String(), missing=None)
    resource_type = fields.String(missing=None)
    resource_ids = fields.List(fields.String(), missing=None)
    invalidate_all = fields.Boolean(missing=False)


class CacheWarmUpSchema(Schema):
    """缓存预热请求模式"""
    user_ids = fields.List(
        fields.String(),
        required=True,
        validate=validate.Length(min=1, max=100),
        error_messages={'required': '用戶ID列表為必填項'}
    )


class InternalPermissionVerifySchema(Schema):
    """内部权限验证请求模式"""
    user_id = fields.String(required=True)
    resource_type = fields.String(required=True)
    resource_id = fields.String(required=True)
    action = fields.String(required=True)
    context = fields.Dict(missing=None)


class InternalBuildContextSchema(Schema):
    """构建用户权限上下文请求模式"""
    user_id = fields.String(required=True)
    force_refresh = fields.Boolean(missing=False)


class InternalNotifyChangeSchema(Schema):
    """通知权限变更请求模式"""
    event_type = fields.String(
        required=True,
        validate=validate.OneOf(['user_role_changed', 'team_member_changed', 'project_maintainer_changed'])
    )
    user_id = fields.String(required=True)
    resource_type = fields.String(required=True)
    resource_id = fields.String(required=True)
    old_role = fields.String(missing=None)
    new_role = fields.String(missing=None)
    changed_by = fields.String(required=True)
    metadata = fields.Dict(missing=None)