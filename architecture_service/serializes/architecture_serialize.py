# -*- coding: utf-8 -*-
"""
@文件: architecture_serialize.py
@說明: 架構圖相關序列化模式 (Architecture Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates, ValidationError


class DiagramCreateSchema(Schema):
    """创建架构图请求模式"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255), error_messages={'required': '架構圖名稱為必填項'})
    description = fields.String(missing=None, validate=validate.Length(max=1000))
    type = fields.String(
        validate=validate.OneOf(['system_architecture', 'deployment', 'network', 'data_flow', 'component']),
        missing='system_architecture'
    )
    data = fields.Dict(missing=None)


class DiagramUpdateSchema(Schema):
    """更新架构图请求模式"""
    name = fields.String(validate=validate.Length(min=1, max=255))
    description = fields.String(validate=validate.Length(max=1000))
    type = fields.String(validate=validate.OneOf(['system_architecture', 'deployment', 'network', 'data_flow', 'component']))
    data = fields.Dict()
    tags = fields.List(fields.String())


class DiagramDuplicateSchema(Schema):
    """复制架构图请求模式"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255), error_messages={'required': '新架構圖名稱為必填項'})


class DiagramVersionCreateSchema(Schema):
    """创建版本请求模式"""
    comment = fields.String(missing=None, validate=validate.Length(max=500))
    is_major = fields.Boolean(missing=False)


class DiagramVersionRestoreSchema(Schema):
    """恢复版本请求模式"""
    comment = fields.String(missing=None, validate=validate.Length(max=500))


class DiagramValidateSchema(Schema):
    """验证架构图请求模式"""
    validation_rules = fields.List(fields.String(), missing=[])
    compliance_checks = fields.List(fields.String(), missing=[])


class DiagramAnalyzeSchema(Schema):
    """分析架构图请求模式"""
    analysis_type = fields.String(
        validate=validate.OneOf(['complexity', 'performance', 'security', 'maintainability']),
        missing='complexity'
    )


class DiagramComplianceCheckSchema(Schema):
    """合规检查请求模式"""
    compliance_standards = fields.List(
        fields.String(),
        required=True,
        error_messages={'required': '合規標準為必填項'}
    )


class CommentCreateSchema(Schema):
    """创建评论请求模式"""
    content = fields.String(required=True, validate=validate.Length(min=1, max=1000), error_messages={'required': '評論內容為必填項'})
    position = fields.Dict(missing=None)


class CommentUpdateSchema(Schema):
    """更新评论请求模式"""
    content = fields.String(required=True, validate=validate.Length(min=1, max=1000), error_messages={'required': '評論內容為必填項'})


class CommentReplySchema(Schema):
    """评论回复请求模式"""
    content = fields.String(required=True, validate=validate.Length(min=1, max=1000), error_messages={'required': '回覆內容為必填項'})


class DiagramExportSchema(Schema):
    """导出架构图请求模式"""
    format = fields.String(
        required=True,
        validate=validate.OneOf(['png', 'jpg', 'svg', 'pdf', 'json', 'xml']),
        error_messages={'required': '導出格式為必填項'}
    )
    options = fields.Dict(missing={})


class DiagramSharingUpdateSchema(Schema):
    """更新分享设置请求模式"""
    is_public = fields.Boolean(required=True)
    allowed_users = fields.List(fields.String(), missing=[])


class DiagramCollaborationSchema(Schema):
    """协作设置请求模式"""
    action = fields.String(
        required=True,
        validate=validate.OneOf(['lock', 'unlock', 'join', 'leave']),
        error_messages={'required': '協作操作為必填項'}
    )


class DiagramSearchSchema(Schema):
    """搜索架构图请求模式"""
    keyword = fields.String(missing=None)
    type = fields.String(validate=validate.OneOf(['system_architecture', 'deployment', 'network', 'data_flow', 'component']))
    tags = fields.List(fields.String(), missing=[])
    created_by = fields.String(missing=None)
    date_from = fields.DateTime(missing=None)
    date_to = fields.DateTime(missing=None)


class DiagramBulkOperationSchema(Schema):
    """批量操作架构图请求模式"""
    diagram_ids = fields.List(
        fields.String(),
        required=True,
        validate=validate.Length(min=1, max=50),
        error_messages={'required': '架構圖ID列表為必填項'}
    )
    operation = fields.String(
        required=True,
        validate=validate.OneOf(['delete', 'export', 'duplicate', 'tag']),
        error_messages={'required': '操作類型為必填項'}
    )
    options = fields.Dict(missing={})


class DiagramStatsSchema(Schema):
    """架构图统计请求模式"""
    period = fields.String(
        validate=validate.OneOf(['day', 'week', 'month', 'year']),
        missing='week'
    )
    metrics = fields.List(
        fields.String(validate=validate.OneOf(['views', 'edits', 'comments', 'exports'])),
        missing=['views', 'edits']
    )