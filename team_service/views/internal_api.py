# -*- coding: utf-8 -*-
"""
@文件: internal_api.py
@說明: Team service内部API - 提供给其他微服务调用
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, jsonify
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, validate

from controllers.team_controller import team_controller
from common.common_method import success_response_result, fail_response_result
from loggers import logger

# 创建蓝图
blp = Blueprint("internal", __name__, url_prefix="/internal", description="Internal API for team service")


# ==================== 内部验证Schema ====================

class InternalUserValidationSchema(Schema):
    """内部用户验证请求参数"""
    user_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "用户ID"}
    )
    team_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "团队ID"}
    )


class InternalPermissionCheckSchema(Schema):
    """内部权限检查请求参数"""
    user_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "用户ID"}
    )
    team_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "团队ID"}
    )
    permission = fields.String(
        required=True,
        validate=validate.OneOf([
            'manage_team', 'manage_members', 'invite_members', 
            'manage_projects', 'delete_team'
        ]),
        metadata={"description": "权限名称"}
    )


class InternalBatchUserTeamsSchema(Schema):
    """内部批量获取用户团队请求参数"""
    user_ids = fields.List(
        fields.String(validate=validate.Length(min=1, max=36)),
        required=True,
        validate=validate.Length(min=1, max=100),
        metadata={"description": "用户ID列表"}
    )


class InternalTeamMembersSchema(Schema):
    """内部获取团队成员请求参数"""
    team_ids = fields.List(
        fields.String(validate=validate.Length(min=1, max=36)),
        required=True,
        validate=validate.Length(min=1, max=50),
        metadata={"description": "团队ID列表"}
    )


# ==================== 内部API端点 ====================

@blp.route("/user/teams", methods=["POST"])
@blp.arguments(InternalBatchUserTeamsSchema)
def get_user_teams_internal(data):
    """
    内部API: 批量获取用户的团队信息
    供其他微服务调用，无需JWT验证
    """
    try:
        user_ids = data.get('user_ids', [])
        
        # 批量获取用户团队信息
        result = {}
        for user_id in user_ids:
            try:
                user_teams = team_controller.get_user_teams(user_id)
                if user_teams.get('success'):
                    result[user_id] = user_teams.get('data', [])
                else:
                    result[user_id] = []
            except Exception as e:
                logger.error(f"获取用户 {user_id} 团队信息失败: {str(e)}")
                result[user_id] = []
        
        return success_response_result(data=result)
        
    except Exception as e:
        logger.error(f"批量获取用户团队信息失败: {str(e)}")
        return fail_response_result(msg="内部服务错误")


@blp.route("/user/role", methods=["POST"])
@blp.arguments(InternalUserValidationSchema)
def get_user_role_internal(data):
    """
    内部API: 获取用户在指定团队中的角色
    供其他微服务调用，无需JWT验证
    """
    try:
        user_id = data.get('user_id')
        team_id = data.get('team_id')
        
        # 获取用户角色
        result = team_controller.get_user_role(team_id, user_id)
        
        return success_response_result(data=result.get('data', {}))
        
    except Exception as e:
        logger.error(f"获取用户角色失败: {str(e)}")
        return fail_response_result(msg="内部服务错误")


# 权限检查功能已移至permission-service
# 该接口已废弃，请调用permission-service的相关接口

# @blp.route("/user/permission/check", methods=["POST"])
# @blp.arguments(InternalPermissionCheckSchema)
# def check_user_permission_internal(data):
#     """
#     该功能已移至permission-service
#     请使用 permission-service 的 /internal/permissions/verify 接口
#     """
#     return fail_response_result(msg="该功能已移至permission-service")


@blp.route("/team/members", methods=["POST"])
@blp.arguments(InternalTeamMembersSchema)
def get_team_members_internal(data):
    """
    内部API: 批量获取团队成员信息
    供其他微服务调用，无需JWT验证
    """
    try:
        team_ids = data.get('team_ids', [])
        
        # 批量获取团队成员信息
        result = {}
        for team_id in team_ids:
            try:
                members_result = team_controller.get_team_members(team_id, page=1, size=1000)
                if members_result.get('success'):
                    members_data = members_result.get('data', {})
                    result[team_id] = members_data.get('members', [])
                else:
                    result[team_id] = []
            except Exception as e:
                logger.error(f"获取团队 {team_id} 成员信息失败: {str(e)}")
                result[team_id] = []
        
        return success_response_result(data=result)
        
    except Exception as e:
        logger.error(f"批量获取团队成员信息失败: {str(e)}")
        return fail_response_result(msg="内部服务错误")


@blp.route("/team/<string:team_id>/info", methods=["GET"])
def get_team_info_internal(team_id):
    """
    内部API: 获取团队基本信息
    供其他微服务调用，无需JWT验证
    """
    try:
        # 获取团队信息
        result = team_controller.get_team_detail(team_id, user_id="system")
        
        if result.get('success'):
            team_data = result.get('data', {})
            # 只返回基本信息，不包含敏感数据
            basic_info = {
                'team_id': team_data.get('team_id'),
                'name': team_data.get('name'),
                'description': team_data.get('description'),
                'avatar_url': team_data.get('avatar_url'),
                'visibility': team_data.get('visibility'),
                'created_by': team_data.get('created_by'),
                'created_at': team_data.get('created_at'),
                'member_count': team_data.get('member_count', 0)
            }
            return success_response_result(data=basic_info)
        else:
            return fail_response_result(msg="团队不存在")
        
    except Exception as e:
        logger.error(f"获取团队信息失败: {str(e)}")
        return fail_response_result(msg="内部服务错误")


@blp.route("/user/<string:user_id>/teams/count", methods=["GET"])
def get_user_teams_count_internal(user_id):
    """
    内部API: 获取用户的团队数量
    供其他微服务调用，无需JWT验证
    """
    try:
        # 获取用户团队数量
        result = team_controller.get_user_teams(user_id)
        
        if result.get('success'):
            teams_data = result.get('data', [])
            return success_response_result(data={
                'user_id': user_id,
                'total_teams': len(teams_data),
                'owner_teams': len([t for t in teams_data if t.get('role') == 'owner']),
                'admin_teams': len([t for t in teams_data if t.get('role') == 'admin']),
                'member_teams': len([t for t in teams_data if t.get('role') == 'member'])
            })
        else:
            return success_response_result(data={
                'user_id': user_id,
                'total_teams': 0,
                'owner_teams': 0,
                'admin_teams': 0,
                'member_teams': 0
            })
        
    except Exception as e:
        logger.error(f"获取用户团队数量失败: {str(e)}")
        return fail_response_result(msg="内部服务错误")


@blp.route("/team/<string:team_id>/statistics", methods=["GET"])
def get_team_statistics_internal(team_id):
    """
    内部API: 获取团队统计信息
    供其他微服务调用，无需JWT验证
    """
    try:
        # 获取团队统计信息
        result = team_controller.get_team_statistics(team_id, user_id="system")
        
        if result.get('success'):
            return success_response_result(data=result.get('data', {}))
        else:
            return fail_response_result(msg="团队不存在")
        
    except Exception as e:
        logger.error(f"获取团队统计信息失败: {str(e)}")
        return fail_response_result(msg="内部服务错误")


@blp.route("/health", methods=["GET"])
def health_check():
    """
    内部API: 健康检查
    """
    try:
        return success_response_result(data={
            'service': 'team_service',
            'status': 'healthy',
            'version': '1.0.0'
        })
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return fail_response_result(msg="服务不可用")


# ==================== 内部事件通知API ====================

class InternalUserEventSchema(Schema):
    """内部用户事件通知参数"""
    event_type = fields.String(
        required=True,
        validate=validate.OneOf(['user_deleted', 'user_suspended', 'user_activated']),
        metadata={"description": "事件类型"}
    )
    user_id = fields.String(
        required=True,
        validate=validate.Length(min=1, max=36),
        metadata={"description": "用户ID"}
    )
    metadata = fields.Dict(
        missing=dict,
        metadata={"description": "事件元数据"}
    )


@blp.route("/events/user", methods=["POST"])
@blp.arguments(InternalUserEventSchema)
def handle_user_event_internal(data):
    """
    内部API: 处理用户相关事件
    供其他微服务通知用户状态变更
    """
    try:
        event_type = data.get('event_type')
        user_id = data.get('user_id')
        metadata = data.get('metadata', {})
        
        if event_type == 'user_deleted':
            # 用户被删除，清理所有相关数据
            result = team_controller.handle_user_deleted(user_id)
        elif event_type == 'user_suspended':
            # 用户被暂停，记录事件
            result = team_controller.handle_user_suspended(user_id, metadata)
        elif event_type == 'user_activated':
            # 用户被激活，记录事件
            result = team_controller.handle_user_activated(user_id, metadata)
        else:
            return fail_response_result(msg="不支持的事件类型")
        
        if result.get('success'):
            return success_response_result(msg="事件处理成功")
        else:
            return fail_response_result(msg=result.get('message', '事件处理失败'))
        
    except Exception as e:
        logger.error(f"处理用户事件失败: {str(e)}")
        return fail_response_result(msg="内部服务错误")