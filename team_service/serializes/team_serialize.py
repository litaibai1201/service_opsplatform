# -*- coding: utf-8 -*-
"""
@文件: team_serialize.py  
@說明: 群組序列化器 (Team Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from dbs.mysql_db import CommonModelDbSchema
from dbs.mysql_db.model_tables import (
    TeamModel, TeamMemberModel, TeamJoinRequestModel,
    TeamInvitationModel, TeamActivityModel
)
from marshmallow import post_load


# ==================== 群組管理相關Schema ====================

class TeamCreateSchema(Schema):
    """創建群組請求參數"""
    name = fields.String(
        required=True,
        validate=validate.And(
            validate.Length(min=2, max=255),
            validate.Regexp(r'^[a-zA-Z0-9\u4e00-\u9fff_\-\s]+$', error="群組名稱包含無效字符")
        ),
        metadata={"description": "群組名稱"}
    )
    description = fields.String(
        missing="",
        validate=validate.Length(max=1000),
        metadata={"description": "群組描述"}
    )
    avatar_url = fields.String(
        missing=None,
        validate=validate.Length(max=255),
        metadata={"description": "群組頭像URL"}
    )
    visibility = fields.String(
        missing='private',
        validate=validate.OneOf(['public', 'private', 'internal']),
        metadata={"description": "群組可見性"}
    )
    max_members = fields.Integer(
        missing=100,
        validate=validate.Range(min=1, max=10000),
        metadata={"description": "最大成員數"}
    )
    auto_approve_join = fields.Boolean(
        missing=False,
        metadata={"description": "自動批准加入"}
    )
    allow_member_invite = fields.Boolean(
        missing=False,
        metadata={"description": "允許成員邀請"}
    )
    require_approval_for_projects = fields.Boolean(
        missing=True,
        metadata={"description": "專案需要審批"}
    )
    default_project_visibility = fields.String(
        missing='private',
        validate=validate.OneOf(['public', 'private']),
        metadata={"description": "默認專案可見性"}
    )
    settings = fields.Dict(
        missing=dict,
        metadata={"description": "群組配置信息"}
    )


class TeamUpdateSchema(Schema):
    """更新群組請求參數"""
    name = fields.String(
        validate=validate.And(
            validate.Length(min=2, max=255),
            validate.Regexp(r'^[a-zA-Z0-9\u4e00-\u9fff_\-\s]+$', error="群組名稱包含無效字符")
        ),
        metadata={"description": "群組名稱"}
    )
    description = fields.String(
        validate=validate.Length(max=1000),
        metadata={"description": "群組描述"}
    )
    avatar_url = fields.String(
        validate=validate.Length(max=255),
        metadata={"description": "群組頭像URL"}
    )
    visibility = fields.String(
        validate=validate.OneOf(['public', 'private', 'internal']),
        metadata={"description": "群組可見性"}
    )
    max_members = fields.Integer(
        validate=validate.Range(min=1, max=10000),
        metadata={"description": "最大成員數"}
    )
    auto_approve_join = fields.Boolean(
        metadata={"description": "自動批准加入"}
    )
    allow_member_invite = fields.Boolean(
        metadata={"description": "允許成員邀請"}
    )
    require_approval_for_projects = fields.Boolean(
        metadata={"description": "專案需要審批"}
    )
    default_project_visibility = fields.String(
        validate=validate.OneOf(['public', 'private']),
        metadata={"description": "默認專案可見性"}
    )
    settings = fields.Dict(
        metadata={"description": "群組配置信息"}
    )


class TeamTransferOwnershipSchema(Schema):
    """轉讓群組所有權請求參數"""
    new_owner_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "新所有者ID"}
    )


# ==================== 成員管理相關Schema ====================

class TeamMemberPromoteSchema(Schema):
    """提升成員請求參數"""
    user_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "用戶ID"}
    )


class TeamMemberDemoteSchema(Schema):
    """降級成員請求參數"""
    user_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "用戶ID"}
    )


class TeamMemberRemoveSchema(Schema):
    """移除成員請求參數"""
    user_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "用戶ID"}
    )


# ==================== 邀請管理相關Schema ====================

class TeamMemberInviteSchema(Schema):
    """邀請成員請求參數"""
    invitee_email = fields.Email(
        required=True,
        validate=validate.Length(max=255),
        metadata={"description": "被邀請者郵箱"}
    )
    invited_role = fields.String(
        missing='member',
        validate=validate.OneOf(['admin', 'member']),
        metadata={"description": "邀請角色"}
    )
    message = fields.String(
        missing="",
        validate=validate.Length(max=500),
        metadata={"description": "邀請消息"}
    )


class InvitationAcceptSchema(Schema):
    """接受邀請請求參數"""
    invitation_token = fields.String(
        required=True,
        validate=validate.Length(min=1),
        metadata={"description": "邀請令牌"}
    )


class InvitationDeclineSchema(Schema):
    """拒絕邀請請求參數"""
    invitation_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "邀請ID"}
    )


# ==================== 加入申請相關Schema ====================

class TeamJoinRequestSchema(Schema):
    """申請加入群組請求參數"""
    email = fields.Email(
        required=True,
        validate=validate.Length(max=255),
        metadata={"description": "申請者郵箱"}
    )
    message = fields.String(
        missing="",
        validate=validate.Length(max=500),
        metadata={"description": "申請理由"}
    )


class JoinRequestApproveSchema(Schema):
    """批准加入申請請求參數"""
    request_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "申請ID"}
    )


class JoinRequestRejectSchema(Schema):
    """拒絕加入申請請求參數"""
    request_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "申請ID"}
    )
    reason = fields.String(
        missing="",
        validate=validate.Length(max=500),
        metadata={"description": "拒絕原因"}
    )


# ==================== 權限檢查相關Schema ====================

class TeamPermissionCheckSchema(Schema):
    """檢查權限請求參數"""
    permission = fields.String(
        required=True,
        validate=validate.OneOf([
            'manage_team', 'manage_members', 'invite_members', 
            'manage_projects', 'delete_team'
        ]),
        metadata={"description": "權限名稱"}
    )


# ==================== 響應Schema ====================

class TeamInfoSchema(Schema):
    """群組信息響應Schema"""
    team_id = fields.String(metadata={"description": "群組ID"})
    name = fields.String(metadata={"description": "群組名稱"})
    description = fields.String(metadata={"description": "群組描述"})
    avatar_url = fields.String(metadata={"description": "群組頭像URL"})
    visibility = fields.String(metadata={"description": "群組可見性"})
    max_members = fields.Integer(metadata={"description": "最大成員數"})
    settings = fields.Dict(metadata={"description": "群組配置信息"})
    auto_approve_join = fields.Boolean(metadata={"description": "自動批准加入"})
    allow_member_invite = fields.Boolean(metadata={"description": "允許成員邀請"})
    require_approval_for_projects = fields.Boolean(metadata={"description": "專案需要審批"})
    default_project_visibility = fields.String(metadata={"description": "默認專案可見性"})
    created_by = fields.String(metadata={"description": "創建者ID"})
    created_at = fields.String(metadata={"description": "創建時間"})
    member_count = fields.Integer(metadata={"description": "成員數量"})
    your_role = fields.String(metadata={"description": "您的角色"})
    is_member = fields.Boolean(metadata={"description": "是否為成員"})


class TeamMemberInfoSchema(Schema):
    """群組成員信息響應Schema"""
    member_id = fields.String(metadata={"description": "成員ID"})
    user_id = fields.String(metadata={"description": "用戶ID"})
    role = fields.String(metadata={"description": "群組角色"})
    invited_by = fields.String(metadata={"description": "邀請者ID"})
    joined_at = fields.String(metadata={"description": "加入時間"})
    last_active_at = fields.String(metadata={"description": "最後活躍時間"})


class TeamMembersListSchema(Schema):
    """群組成員列表響應Schema"""
    members = fields.List(
        fields.Nested(TeamMemberInfoSchema),
        metadata={"description": "成員列表"}
    )
    total = fields.Integer(metadata={"description": "總數"})
    page = fields.Integer(metadata={"description": "當前頁"})
    size = fields.Integer(metadata={"description": "每頁大小"})
    pages = fields.Integer(metadata={"description": "總頁數"})
    your_role = fields.String(metadata={"description": "您的角色"})


class TeamInvitationInfoSchema(Schema):
    """群組邀請信息響應Schema"""
    invitation_id = fields.String(metadata={"description": "邀請ID"})
    invitee_email = fields.String(metadata={"description": "被邀請者郵箱"})
    invited_role = fields.String(metadata={"description": "邀請角色"})
    invited_by = fields.String(metadata={"description": "邀請者ID"})
    status = fields.String(metadata={"description": "邀請狀態"})
    message = fields.String(metadata={"description": "邀請消息"})
    expires_at = fields.String(metadata={"description": "過期時間"})
    created_at = fields.String(metadata={"description": "創建時間"})


class TeamJoinRequestInfoSchema(Schema):
    """群組加入申請信息響應Schema"""
    request_id = fields.String(metadata={"description": "申請ID"})
    user_id = fields.String(metadata={"description": "申請者ID"})
    email = fields.String(metadata={"description": "申請者郵箱"})
    requested_role = fields.String(metadata={"description": "申請角色"})
    message = fields.String(metadata={"description": "申請理由"})
    status = fields.String(metadata={"description": "申請狀態"})
    expires_at = fields.String(metadata={"description": "過期時間"})
    created_at = fields.String(metadata={"description": "創建時間"})


class TeamActivityInfoSchema(Schema):
    """群組活動信息響應Schema"""
    activity_id = fields.String(metadata={"description": "活動ID"})
    user_id = fields.String(metadata={"description": "用戶ID"})
    activity_type = fields.String(metadata={"description": "活動類型"})
    description = fields.String(metadata={"description": "活動描述"})
    metadata = fields.Dict(metadata={"description": "活動元數據"})
    created_at = fields.String(metadata={"description": "創建時間"})


class TeamUserRoleInfoSchema(Schema):
    """用戶角色信息響應Schema"""
    team_id = fields.String(metadata={"description": "群組ID"})
    user_id = fields.String(metadata={"description": "用戶ID"})
    role = fields.String(metadata={"description": "角色"})
    is_member = fields.Boolean(metadata={"description": "是否為成員"})
    joined_at = fields.String(metadata={"description": "加入時間"})
    # permissions字段已移除，权限由permission-service管理


class TeamStatisticsSchema(Schema):
    """群組統計信息響應Schema"""
    members_count = fields.Integer(metadata={"description": "成員數量"})
    role_distribution = fields.Dict(metadata={"description": "角色分佈"})
    recent_activities = fields.Integer(metadata={"description": "最近活動數"})
    max_members = fields.Integer(metadata={"description": "最大成員數"})
    created_at = fields.String(metadata={"description": "創建時間"})


class UserTeamsRolesSchema(Schema):
    """用戶群組角色響應Schema"""
    user_id = fields.String(metadata={"description": "用戶ID"})
    teams = fields.List(
        fields.Dict(),
        metadata={"description": "群組列表"}
    )
    total_teams = fields.Integer(metadata={"description": "群組總數"})


# ==================== 數據庫模型序列化器 ====================

class TeamModelSchema(CommonModelDbSchema):
    """群組模型Schema"""
    __modelclass__ = TeamModel
    
    @post_load
    def post_load(self, instance, **kwargs):
        return TeamModel(**instance)
    
    class Meta:
        load_instance = True


class TeamMemberModelSchema(CommonModelDbSchema):
    """群組成員模型Schema"""
    __modelclass__ = TeamMemberModel
    
    @post_load
    def post_load(self, instance, **kwargs):
        return TeamMemberModel(**instance)
    
    class Meta:
        load_instance = True


class TeamJoinRequestModelSchema(CommonModelDbSchema):
    """群組加入申請模型Schema"""
    __modelclass__ = TeamJoinRequestModel
    
    @post_load
    def post_load(self, instance, **kwargs):
        return TeamJoinRequestModel(**instance)
    
    class Meta:
        load_instance = True


class TeamInvitationModelSchema(CommonModelDbSchema):
    """群組邀請模型Schema"""
    __modelclass__ = TeamInvitationModel
    
    invitation_token = fields.String(load_only=True)  # 敏感信息不輸出
    
    @post_load
    def post_load(self, instance, **kwargs):
        return TeamInvitationModel(**instance)
    
    class Meta:
        load_instance = True


class TeamActivityModelSchema(CommonModelDbSchema):
    """群組活動模型Schema"""
    __modelclass__ = TeamActivityModel
    
    @post_load
    def post_load(self, instance, **kwargs):
        return TeamActivityModel(**instance)
    
    class Meta:
        load_instance = True