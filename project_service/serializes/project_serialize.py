# -*- coding: utf-8 -*-
"""
@文件: project_serialize.py
@說明: 項目相關序列化模式 (Project Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates, ValidationError


class ProjectCreateSchema(Schema):
    """创建项目请求模式"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255), error_messages={'required': '項目名稱為必填項'})
    description = fields.String(missing=None, validate=validate.Length(max=1000))
    visibility = fields.String(validate=validate.OneOf(['public', 'private']), missing='private')
    template_id = fields.String(missing=None)
    settings = fields.Dict(missing=None)
    allow_member_edit = fields.Boolean(missing=False)
    allow_external_view = fields.Boolean(missing=False)
    allow_external_comment = fields.Boolean(missing=False)


class ProjectUpdateSchema(Schema):
    """更新项目请求模式"""
    name = fields.String(validate=validate.Length(min=1, max=255))
    description = fields.String(validate=validate.Length(max=1000))
    visibility = fields.String(validate=validate.OneOf(['public', 'private']))
    settings = fields.Dict()
    allow_member_edit = fields.Boolean()
    allow_external_view = fields.Boolean()
    allow_external_comment = fields.Boolean()


class ProjectPermissionsSchema(Schema):
    """项目权限设置模式"""
    allow_member_edit = fields.Boolean(required=True)
    allow_external_view = fields.Boolean(required=True)
    allow_external_comment = fields.Boolean(required=True)


class ProjectMaintainerAddSchema(Schema):
    """添加项目维护员请求模式"""
    user_id = fields.String(required=True, error_messages={'required': '用戶ID為必填項'})


class ProjectTemplateCreateSchema(Schema):
    """创建项目模板请求模式"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255), error_messages={'required': '模板名稱為必填項'})
    description = fields.String(missing=None, validate=validate.Length(max=1000))
    template_data = fields.Dict(required=True, error_messages={'required': '模板數據為必填項'})
    category = fields.String(missing=None, validate=validate.Length(max=100))
    is_public = fields.Boolean(missing=False)


class ProjectTemplateUpdateSchema(Schema):
    """更新项目模板请求模式"""
    name = fields.String(validate=validate.Length(min=1, max=255))
    description = fields.String(validate=validate.Length(max=1000))
    template_data = fields.Dict()
    category = fields.String(validate=validate.Length(max=100))
    is_public = fields.Boolean()


class TagCreateSchema(Schema):
    """创建标签请求模式"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255), error_messages={'required': '標籤名稱為必填項'})
    color = fields.String(missing='#6B7280', validate=validate.Regexp(r'^#[0-9A-Fa-f]{6}$', error='顏色格式不正確'))
    category = fields.String(missing=None, validate=validate.Length(max=100))
    description = fields.String(missing=None, validate=validate.Length(max=1000))


class TagUpdateSchema(Schema):
    """更新标签请求模式"""
    name = fields.String(validate=validate.Length(min=1, max=255))
    color = fields.String(validate=validate.Regexp(r'^#[0-9A-Fa-f]{6}$', error='顏色格式不正確'))
    category = fields.String(validate=validate.Length(max=100))
    description = fields.String(validate=validate.Length(max=1000))


class ProjectTagAddSchema(Schema):
    """项目添加标签请求模式"""
    tag_ids = fields.List(fields.String(), required=True, error_messages={'required': '標籤ID列表為必填項'})


class ProjectAccessRequestSchema(Schema):
    """项目访问申请请求模式"""
    access_type = fields.String(validate=validate.OneOf(['view', 'maintainer']), missing='view')
    message = fields.String(missing=None, validate=validate.Length(max=1000))


class AccessRequestApproveSchema(Schema):
    """批准访问申请请求模式"""
    pass


class AccessRequestRejectSchema(Schema):
    """拒绝访问申请请求模式"""
    rejection_reason = fields.String(required=True, validate=validate.Length(min=1, max=1000), error_messages={'required': '拒絕原因為必填項'})


class ExternalAccessTokenSchema(Schema):
    """生成外部访问令牌请求模式"""
    expires_hours = fields.Integer(validate=validate.Range(min=1, max=168), missing=24)