# -*- coding: utf-8 -*-
"""
@文件: team_api.py
@說明: 群組API (Team Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.team_controller import team_controller
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from serializes.team_serialize import (
    TeamCreateSchema, TeamUpdateSchema, TeamMemberInviteSchema,
    TeamJoinRequestSchema, InvitationAcceptSchema, JoinRequestApproveSchema,
    JoinRequestRejectSchema, TeamMemberPromoteSchema, TeamMemberRemoveSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("team_api", __name__)


class BaseTeamView(MethodView):
    """群組API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        self.tc = team_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 群組管理API ====================

@blp.route("/teams")
class TeamsListApi(BaseTeamView):
    """群組列表API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """獲取群組列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 獲取查詢參數
            page = request.args.get('page', 1, type=int)
            size = request.args.get('size', 20, type=int)
            visibility = request.args.get('visibility')
            search = request.args.get('search')
            
            if visibility == 'public':
                # 獲取公開群組
                result = self.tc.oper_team.get_public_teams(page, size, search)
                teams_data = []
                for team in result.items:
                    teams_data.append({
                        'team_id': team.id,
                        'name': team.name,
                        'description': team.description,
                        'avatar_url': team.avatar_url,
                        'visibility': team.visibility,
                        'member_count': len(team.members) if team.members else 0,
                        'created_at': team.created_at.isoformat() if team.created_at else None
                    })
                
                return response_result(content={
                    'teams': teams_data,
                    'total': result.total,
                    'page': page,
                    'size': size,
                    'pages': result.pages
                }, msg="獲取公開群組列表成功")
            else:
                # 獲取用戶相關群組
                result = self.tc.oper_team.get_teams_by_user(current_user_id, page, size, visibility)
                teams_data = []
                for team in result.items:
                    # 獲取用戶在該群組的角色
                    member = self.tc.oper_member.get_by_team_and_user(team.id, current_user_id)
                    teams_data.append({
                        'team_id': team.id,
                        'name': team.name,
                        'description': team.description,
                        'avatar_url': team.avatar_url,
                        'visibility': team.visibility,
                        'member_count': len(team.members) if team.members else 0,
                        'your_role': member.role if member else None,
                        'created_at': team.created_at.isoformat() if team.created_at else None
                    })
                
                return response_result(content={
                    'teams': teams_data,
                    'total': result.total,
                    'page': page,
                    'size': size,
                    'pages': result.pages
                }, msg="獲取群組列表成功")
                
        except Exception as e:
            logger.error(f"獲取群組列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """創建群組"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data or not data.get('name'):
                return fail_response_result(msg="群組名稱不能為空")
            
            result, flag = self.tc.create_team(current_user_id, data)
            return self._build_response(result, flag, "創建群組成功")
            
        except Exception as e:
            logger.error(f"創建群組異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/teams/<team_id>")
class TeamDetailApi(BaseTeamView):
    """群組詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """獲取群組詳情"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.tc.get_team_detail(team_id, current_user_id)
            return self._build_response(result, flag, "獲取群組詳情成功")
            
        except Exception as e:
            logger.error(f"獲取群組詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self, team_id):
        """更新群組信息"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data:
                return fail_response_result(msg="更新數據不能為空")
            
            result, flag = self.tc.update_team(team_id, current_user_id, data)
            return self._build_response(result, flag, "更新群組信息成功")
            
        except Exception as e:
            logger.error(f"更新群組信息異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def delete(self, team_id):
        """刪除群組"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.tc.delete_team(team_id, current_user_id)
            return self._build_response(result, flag, "刪除群組成功")
            
        except Exception as e:
            logger.error(f"刪除群組異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/teams/<team_id>/transfer")
class TeamTransferApi(BaseTeamView):
    """群組所有權轉讓API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, team_id):
        """轉讓群組所有權"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            new_owner_id = data.get('new_owner_id')
            if not new_owner_id:
                return fail_response_result(msg="新所有者ID不能為空")
            
            result, flag = self.tc.transfer_ownership(team_id, current_user_id, new_owner_id)
            return self._build_response(result, flag, "轉讓群組所有權成功")
            
        except Exception as e:
            logger.error(f"轉讓群組所有權異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 成員管理API ====================

@blp.route("/teams/<team_id>/members")
class TeamMembersApi(BaseTeamView):
    """群組成員API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """獲取成員列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            page = request.args.get('page', 1, type=int)
            size = request.args.get('size', 20, type=int)
            role = request.args.get('role')
            
            result, flag = self.tc.get_team_members(team_id, current_user_id, page, size, role)
            return self._build_response(result, flag, "獲取成員列表成功")
            
        except Exception as e:
            logger.error(f"獲取成員列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/teams/<team_id>/members/<user_id>/promote")
class TeamMemberPromoteApi(BaseTeamView):
    """提升成員API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, team_id, user_id):
        """提升成員為管理員"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.tc.promote_member(team_id, current_user_id, user_id)
            return self._build_response(result, flag, "提升成員為管理員成功")
            
        except Exception as e:
            logger.error(f"提升成員為管理員異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/teams/<team_id>/members/<user_id>/demote")
class TeamMemberDemoteApi(BaseTeamView):
    """降級成員API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, team_id, user_id):
        """降級管理員為成員"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.tc.demote_member(team_id, current_user_id, user_id)
            return self._build_response(result, flag, "降級管理員為成員成功")
            
        except Exception as e:
            logger.error(f"降級管理員為成員異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/teams/<team_id>/members/<user_id>")
class TeamMemberRemoveApi(BaseTeamView):
    """移除成員API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def delete(self, team_id, user_id):
        """移除群組成員"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.tc.remove_member(team_id, current_user_id, user_id)
            return self._build_response(result, flag, "移除群組成員成功")
            
        except Exception as e:
            logger.error(f"移除群組成員異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 邀請管理API ====================

@blp.route("/teams/<team_id>/invitations")
class TeamInvitationsApi(BaseTeamView):
    """群組邀請API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """獲取邀請列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 檢查權限
            if not self.tc.oper_member.is_team_admin_or_owner(team_id, current_user_id):
                return fail_response_result(msg="沒有權限查看邀請列表")
            
            page = request.args.get('page', 1, type=int)
            size = request.args.get('size', 20, type=int)
            status = request.args.get('status')
            
            paginated = self.tc.oper_invitation.get_team_invitations(team_id, page, size, status)
            
            invitations_data = []
            for invitation in paginated.items:
                invitations_data.append({
                    'invitation_id': invitation.id,
                    'invitee_email': invitation.invitee_email,
                    'invited_role': invitation.invited_role,
                    'invited_by': invitation.invited_by,
                    'status': invitation.status,
                    'message': invitation.message,
                    'expires_at': invitation.expires_at.isoformat() if invitation.expires_at else None,
                    'created_at': invitation.created_at.isoformat() if invitation.created_at else None
                })
            
            return response_result(content={
                'invitations': invitations_data,
                'total': paginated.total,
                'page': page,
                'size': size,
                'pages': paginated.pages
            }, msg="獲取邀請列表成功")
            
        except Exception as e:
            logger.error(f"獲取邀請列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, team_id):
        """發送邀請"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            invitee_email = data.get('invitee_email')
            role = data.get('role', 'member')
            message = data.get('message')
            
            if not invitee_email:
                return fail_response_result(msg="被邀請者郵箱不能為空")
            
            result, flag = self.tc.create_invitation(team_id, current_user_id, invitee_email, role, message)
            return self._build_response(result, flag, "發送邀請成功")
            
        except Exception as e:
            logger.error(f"發送邀請異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/invitations/<invitation_id>/accept")
class InvitationAcceptApi(BaseTeamView):
    """接受邀請API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self, invitation_id):
        """接受邀請"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 通過邀請ID獲取邀請令牌
            invitation = self.tc.oper_invitation.get_by_id(invitation_id)
            if not invitation:
                return fail_response_result(msg="邀請不存在")
            
            result, flag = self.tc.accept_invitation(invitation.invitation_token, current_user_id)
            return self._build_response(result, flag, "接受邀請成功")
            
        except Exception as e:
            logger.error(f"接受邀請異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/invitations/<invitation_id>/decline")
class InvitationDeclineApi(BaseTeamView):
    """拒絕邀請API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self, invitation_id):
        """拒絕邀請"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            invitation = self.tc.oper_invitation.get_by_id(invitation_id)
            if not invitation:
                return fail_response_result(msg="邀請不存在")
            
            decline_result, decline_flag = self.tc.oper_invitation.decline_invitation(invitation)
            return self._build_response(
                {'invitation_id': invitation_id, 'message': '拒絕邀請成功'}, 
                decline_flag, 
                "拒絕邀請成功"
            )
            
        except Exception as e:
            logger.error(f"拒絕邀請異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/invitations/<invitation_id>")
class InvitationCancelApi(BaseTeamView):
    """取消邀請API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def delete(self, invitation_id):
        """取消邀請"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            invitation = self.tc.oper_invitation.get_by_id(invitation_id)
            if not invitation:
                return fail_response_result(msg="邀請不存在")
            
            # 檢查權限
            if not self.tc.oper_member.is_team_admin_or_owner(invitation.team_id, current_user_id):
                return fail_response_result(msg="沒有權限取消邀請")
            
            # 將邀請狀態改為已過期
            invitation.status = 'expired'
            from dbs.mysql_db import DBFunction
            commit_result, commit_flag = DBFunction.do_commit("取消邀請", True)
            
            if commit_flag:
                return response_result(content={'invitation_id': invitation_id}, msg="取消邀請成功")
            else:
                return fail_response_result(msg="取消邀請失敗")
            
        except Exception as e:
            logger.error(f"取消邀請異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 加入申請API ====================

@blp.route("/teams/<team_id>/join-requests")
class TeamJoinRequestsApi(BaseTeamView):
    """群組加入申請API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """獲取加入申請列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 檢查權限
            if not self.tc.oper_member.is_team_admin_or_owner(team_id, current_user_id):
                return fail_response_result(msg="沒有權限查看加入申請")
            
            page = request.args.get('page', 1, type=int)
            size = request.args.get('size', 20, type=int)
            
            paginated = self.tc.oper_join_request.get_pending_requests_by_team(team_id, page, size)
            
            requests_data = []
            for join_request in paginated.items:
                requests_data.append({
                    'request_id': join_request.id,
                    'user_id': join_request.user_id,
                    'email': join_request.email,
                    'requested_role': join_request.requested_role,
                    'message': join_request.message,
                    'status': join_request.status,
                    'expires_at': join_request.expires_at.isoformat() if join_request.expires_at else None,
                    'created_at': join_request.created_at.isoformat() if join_request.created_at else None
                })
            
            return response_result(content={
                'join_requests': requests_data,
                'total': paginated.total,
                'page': page,
                'size': size,
                'pages': paginated.pages
            }, msg="獲取加入申請列表成功")
            
        except Exception as e:
            logger.error(f"獲取加入申請列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, team_id):
        """申請加入群組"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            email = data.get('email')
            message = data.get('message')
            
            if not email:
                return fail_response_result(msg="郵箱不能為空")
            
            result, flag = self.tc.create_join_request(team_id, current_user_id, email, message)
            return self._build_response(result, flag, "申請加入群組成功")
            
        except Exception as e:
            logger.error(f"申請加入群組異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/join-requests/<request_id>/approve")
class JoinRequestApproveApi(BaseTeamView):
    """批准加入申請API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self, request_id):
        """批准申請"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.tc.approve_join_request(request_id, current_user_id)
            return self._build_response(result, flag, "批准申請成功")
            
        except Exception as e:
            logger.error(f"批准申請異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/join-requests/<request_id>/reject")
class JoinRequestRejectApi(BaseTeamView):
    """拒絕加入申請API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self, request_id):
        """拒絕申請"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            reason = data.get('reason') if data else None
            
            join_request = self.tc.oper_join_request.get_by_id(request_id)
            if not join_request:
                return fail_response_result(msg="申請不存在")
            
            # 檢查權限
            if not self.tc.oper_member.is_team_admin_or_owner(join_request.team_id, current_user_id):
                return fail_response_result(msg="沒有權限處理申請")
            
            reject_result, reject_flag = self.tc.oper_join_request.reject_request(
                join_request, current_user_id, reason
            )
            
            if reject_flag:
                from dbs.mysql_db import DBFunction
                commit_result, commit_flag = DBFunction.do_commit("拒絕申請", True)
                if commit_flag:
                    return response_result(content={
                        'request_id': request_id,
                        'message': '拒絕申請成功'
                    }, msg="拒絕申請成功")
            
            return fail_response_result(msg="拒絕申請失敗")
            
        except Exception as e:
            logger.error(f"拒絕申請異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 權限檢查API ====================

@blp.route("/teams/<team_id>/my-role")
class TeamMyRoleApi(BaseTeamView):
    """獲取當前用戶角色API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """獲取當前用戶在群組中的角色"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.tc.get_user_role_in_team(team_id, current_user_id)
            return self._build_response(result, flag, "獲取用戶角色成功")
            
        except Exception as e:
            logger.error(f"獲取用戶角色異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# 权限检查功能已移至permission-service
# 如需检查权限，请调用permission-service的相关接口


# ==================== 活動記錄API ====================

@blp.route("/teams/<team_id>/activities")
class TeamActivitiesApi(BaseTeamView):
    """群組活動記錄API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """獲取活動記錄"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 檢查是否為群組成員
            member = self.tc.oper_member.get_by_team_and_user(team_id, current_user_id)
            if not member:
                return fail_response_result(msg="只有群組成員可以查看活動記錄")
            
            page = request.args.get('page', 1, type=int)
            size = request.args.get('size', 20, type=int)
            activity_type = request.args.get('activity_type')
            
            paginated = self.tc.oper_activity.get_team_activities(team_id, page, size, activity_type)
            
            activities_data = []
            for activity in paginated.items:
                activities_data.append({
                    'activity_id': activity.id,
                    'user_id': activity.user_id,
                    'activity_type': activity.activity_type,
                    'description': activity.description,
                    'metadata': activity.metadata,
                    'created_at': activity.created_at.isoformat() if activity.created_at else None
                })
            
            return response_result(content={
                'activities': activities_data,
                'total': paginated.total,
                'page': page,
                'size': size,
                'pages': paginated.pages
            }, msg="獲取活動記錄成功")
            
        except Exception as e:
            logger.error(f"獲取活動記錄異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 統計信息API ====================

@blp.route("/teams/<team_id>/statistics")
class TeamStatisticsApi(BaseTeamView):
    """群組統計信息API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """獲取群組統計信息"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 檢查權限 - 只有管理員和所有者可以查看統計信息
            if not self.tc.oper_member.is_team_admin_or_owner(team_id, current_user_id):
                return fail_response_result(msg="沒有權限查看統計信息")
            
            stats = self.tc.oper_team.get_team_statistics(team_id)
            if stats:
                return response_result(content=stats, msg="獲取統計信息成功")
            else:
                return fail_response_result(msg="群組不存在")
            
        except Exception as e:
            logger.error(f"獲取統計信息異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 內部服務API ====================

@blp.route("/internal/teams/<team_id>/member/<user_id>/role")
class InternalTeamMemberRoleApi(BaseTeamView):
    """內部服務獲取用戶角色API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id, user_id):
        """獲取用戶在群組中的角色（內部服務）"""
        try:
            result, flag = self.tc.get_user_role_in_team(team_id, user_id)
            return self._build_response(result, flag, "獲取用戶角色成功")
            
        except Exception as e:
            logger.error(f"內部服務獲取用戶角色異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/teams/user/<user_id>/roles")
class InternalUserTeamsRolesApi(BaseTeamView):
    """內部服務獲取用戶所有群組角色API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """獲取用戶在所有群組中的角色（內部服務）"""
        try:
            result, flag = self.tc.get_user_teams_roles(user_id)
            return self._build_response(result, flag, "獲取用戶群組角色成功")
            
        except Exception as e:
            logger.error(f"內部服務獲取用戶群組角色異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/teams/notify-role-change")
class InternalRoleChangeNotifyApi(BaseTeamView):
    """內部服務角色變更通知API"""

    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """通知角色變更（內部服務）"""
        try:
            data = request.get_json()
            team_id = data.get('team_id')
            user_id = data.get('user_id')
            old_role = data.get('old_role')
            new_role = data.get('new_role')
            changed_by = data.get('changed_by')
            
            if not all([team_id, user_id, new_role, changed_by]):
                return fail_response_result(msg="缺少必要參數")
            
            # 記錄角色變更活動
            activity_result, activity_flag = self.tc.oper_activity.record_role_changed(
                team_id, changed_by, user_id, old_role, new_role
            )
            
            if activity_flag:
                from dbs.mysql_db import DBFunction
                commit_result, commit_flag = DBFunction.do_commit("記錄角色變更", True)
                if commit_flag:
                    return response_result(content={
                        'team_id': team_id,
                        'user_id': user_id,
                        'message': '角色變更通知處理成功'
                    }, msg="角色變更通知處理成功")
            
            return fail_response_result(msg="角色變更通知處理失敗")
            
        except Exception as e:
            logger.error(f"角色變更通知處理異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")