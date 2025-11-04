# -*- coding: utf-8 -*-
"""
@文件: project_api.py
@說明: 項目API (Project Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.project_controller import project_controller
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from serializes.project_serialize import (
    ProjectCreateSchema, ProjectUpdateSchema, ProjectPermissionsSchema,
    ProjectMaintainerAddSchema, ProjectTemplateCreateSchema, ProjectTemplateUpdateSchema,
    TagCreateSchema, TagUpdateSchema, ProjectTagAddSchema, ProjectAccessRequestSchema,
    AccessRequestApproveSchema, AccessRequestRejectSchema, ExternalAccessTokenSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("project_api", __name__)


class BaseProjectView(MethodView):
    """項目API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        self.pc = project_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 項目管理API ====================

@blp.route("/projects")
class ProjectsListApi(BaseProjectView):
    """項目列表API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取可访问的项目列表"""
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        visibility = request.args.get('visibility')
        team_id = request.args.get('team_id')
        
        result, flag = self.pc.get_project_list(
            user_id=user_id, 
            page=page, 
            per_page=per_page,
            visibility=visibility,
            team_id=team_id
        )
        return self._build_response(result, flag, "獲取項目列表成功")


@blp.route("/teams/<string:team_id>/projects")
class TeamProjectsApi(BaseProjectView):
    """團隊項目API"""
    
    @jwt_required()
    @blp.arguments(ProjectCreateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, team_id):
        """创建项目"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.create_project(
            team_id=team_id,
            user_id=user_id,
            **json_data
        )
        return self._build_response(result, flag, "項目創建成功")


@blp.route("/projects/from-template/<string:template_id>")
class ProjectFromTemplateApi(BaseProjectView):
    """從模板創建項目API"""
    
    @jwt_required()
    @blp.arguments(ProjectCreateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, template_id):
        """从模板创建项目"""
        user_id = get_jwt_identity()
        team_id = json_data.pop('team_id', None)
        
        if not team_id:
            return fail_response_result(msg="團隊ID為必填項")
        
        result, flag = self.pc.create_project_from_template(
            team_id=team_id,
            user_id=user_id,
            template_id=template_id,
            **json_data
        )
        return self._build_response(result, flag, "從模板創建項目成功")


@blp.route("/projects/<string:project_id>")
class ProjectDetailApi(BaseProjectView):
    """項目詳情API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目详情"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.get_project_detail(project_id=project_id, user_id=user_id)
        return self._build_response(result, flag, "獲取項目詳情成功")
    
    @jwt_required()
    @blp.arguments(ProjectUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, project_id):
        """更新项目信息"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.update_project(
            project_id=project_id,
            user_id=user_id,
            **json_data
        )
        return self._build_response(result, flag, "項目更新成功")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, project_id):
        """删除项目"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.delete_project(project_id=project_id, user_id=user_id)
        return self._build_response(result, flag, "項目刪除成功")


@blp.route("/projects/<string:project_id>/archive")
class ProjectArchiveApi(BaseProjectView):
    """項目歸檔API"""
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def post(self, project_id):
        """归档项目"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.archive_project(project_id=project_id, user_id=user_id)
        return self._build_response(result, flag, "項目歸檔成功")


# ==================== 項目模板API ====================

@blp.route("/project-templates")
class ProjectTemplatesApi(BaseProjectView):
    """項目模板API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取项目模板列表"""
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category = request.args.get('category')
        is_public = request.args.get('is_public', type=bool)
        
        result, flag = self.pc.get_template_list(
            page=page,
            per_page=per_page,
            category=category,
            is_public=is_public
        )
        return self._build_response(result, flag, "獲取項目模板列表成功")
    
    @jwt_required()
    @blp.arguments(ProjectTemplateCreateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data):
        """创建项目模板"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.create_template(user_id=user_id, **json_data)
        return self._build_response(result, flag, "項目模板創建成功")


@blp.route("/project-templates/<string:template_id>")
class ProjectTemplateDetailApi(BaseProjectView):
    """項目模板詳情API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, template_id):
        """获取模板详情"""
        # 这里简化实现，实际应该调用控制器方法
        return response_result(content={'id': template_id}, msg="獲取模板詳情成功")
    
    @jwt_required()
    @blp.arguments(ProjectTemplateUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, template_id):
        """更新模板"""
        # 这里简化实现
        return response_result(msg="模板更新成功")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, template_id):
        """删除模板"""
        # 这里简化实现
        return response_result(msg="模板刪除成功")


# ==================== 標籤管理API ====================

@blp.route("/tags")
class TagsApi(BaseProjectView):
    """標籤API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取标签列表"""
        # 这里简化实现
        return response_result(content={'tags': []}, msg="獲取標籤列表成功")
    
    @jwt_required()
    @blp.arguments(TagCreateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data):
        """创建标签"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.create_tag(user_id=user_id, **json_data)
        return self._build_response(result, flag, "標籤創建成功")


@blp.route("/tags/<string:tag_id>")
class TagDetailApi(BaseProjectView):
    """標籤詳情API"""
    
    @jwt_required()
    @blp.arguments(TagUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, tag_id):
        """更新标签"""
        # 这里简化实现
        return response_result(msg="標籤更新成功")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, tag_id):
        """删除标签"""
        # 这里简化实现
        return response_result(msg="標籤刪除成功")


@blp.route("/projects/<string:project_id>/tags")
class ProjectTagsApi(BaseProjectView):
    """項目標籤API"""
    
    @jwt_required()
    @blp.arguments(ProjectTagAddSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, project_id):
        """为项目添加标签"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.add_project_tags(
            project_id=project_id,
            tag_ids=json_data['tag_ids'],
            user_id=user_id
        )
        return self._build_response(result, flag, "項目標籤添加成功")


@blp.route("/projects/<string:project_id>/tags/<string:tag_id>")
class ProjectTagDetailApi(BaseProjectView):
    """項目標籤詳情API"""
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, project_id, tag_id):
        """移除项目标签"""
        # 这里简化实现
        return response_result(msg="項目標籤移除成功")


# ==================== 項目訪問控制API ====================

@blp.route("/projects/discover")
class ProjectsDiscoverApi(BaseProjectView):
    """發現公開項目API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """发现公开项目"""
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result, flag = self.pc.get_project_list(
            user_id=None,
            page=page,
            per_page=per_page,
            visibility='public'
        )
        return self._build_response(result, flag, "獲取公開項目成功")


@blp.route("/projects/accessible")
class ProjectsAccessibleApi(BaseProjectView):
    """用戶可訪問項目API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取用户可访问的项目列表"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.get_project_list(user_id=user_id)
        return self._build_response(result, flag, "獲取可訪問項目成功")


@blp.route("/projects/<string:project_id>/permissions")
class ProjectPermissionsApi(BaseProjectView):
    """項目權限API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目权限设置"""
        result, flag = self.pc.get_project_detail(project_id=project_id)
        if flag:
            permissions = {
                'allow_member_edit': result.get('allow_member_edit', False),
                'allow_external_view': result.get('allow_external_view', False),
                'allow_external_comment': result.get('allow_external_comment', False)
            }
            return response_result(content=permissions, msg="獲取項目權限設置成功")
        return self._build_response(result, flag)
    
    @jwt_required()
    @blp.arguments(ProjectPermissionsSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, project_id):
        """更新项目权限设置"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.update_project(
            project_id=project_id,
            user_id=user_id,
            **json_data
        )
        return self._build_response(result, flag, "項目權限設置更新成功")


# ==================== 項目維護員管理API ====================

@blp.route("/projects/<string:project_id>/maintainers")
class ProjectMaintainersApi(BaseProjectView):
    """項目維護員API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取维护员列表"""
        result, flag = self.pc.get_project_detail(project_id=project_id)
        if flag:
            maintainers = result.get('maintainers', [])
            return response_result(content={'maintainers': maintainers}, msg="獲取維護員列表成功")
        return self._build_response(result, flag)
    
    @jwt_required()
    @blp.arguments(ProjectMaintainerAddSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, project_id):
        """指定维护员"""
        assigned_by = get_jwt_identity()
        
        result, flag = self.pc.add_maintainer(
            project_id=project_id,
            user_id=json_data['user_id'],
            assigned_by=assigned_by
        )
        return self._build_response(result, flag, "維護員指定成功")


@blp.route("/projects/<string:project_id>/maintainers/<string:user_id>")
class ProjectMaintainerDetailApi(BaseProjectView):
    """項目維護員詳情API"""
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, project_id, user_id):
        """移除维护员"""
        removed_by = get_jwt_identity()
        
        result, flag = self.pc.remove_maintainer(
            project_id=project_id,
            user_id=user_id,
            removed_by=removed_by
        )
        return self._build_response(result, flag, "維護員移除成功")


# ==================== 項目訪問申請API ====================

@blp.route("/projects/<string:project_id>/access-requests")
class ProjectAccessRequestsApi(BaseProjectView):
    """項目訪問申請API"""
    
    @jwt_required()
    @blp.arguments(ProjectAccessRequestSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, project_id):
        """申请项目访问权限"""
        user_id = get_jwt_identity()
        
        result, flag = self.pc.create_access_request(
            project_id=project_id,
            user_id=user_id,
            **json_data
        )
        return self._build_response(result, flag, "訪問申請提交成功")
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取访问申请列表"""
        # 这里简化实现
        return response_result(content={'requests': []}, msg="獲取訪問申請列表成功")


@blp.route("/access-requests/<string:request_id>/approve")
class AccessRequestApproveApi(BaseProjectView):
    """批准訪問申請API"""
    
    @jwt_required()
    @blp.arguments(AccessRequestApproveSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, request_id):
        """批准访问申请"""
        # 这里简化实现
        return response_result(msg="訪問申請已批准")


@blp.route("/access-requests/<string:request_id>/reject")
class AccessRequestRejectApi(BaseProjectView):
    """拒絕訪問申請API"""
    
    @jwt_required()
    @blp.arguments(AccessRequestRejectSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, request_id):
        """拒绝访问申请"""
        # 这里简化实现
        return response_result(msg="訪問申請已拒絕")


# ==================== 外部訪問API ====================

@blp.route("/projects/<string:project_id>/external-access-token")
class ProjectExternalAccessTokenApi(BaseProjectView):
    """項目外部訪問令牌API"""
    
    @jwt_required()
    @blp.arguments(ExternalAccessTokenSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data, project_id):
        """生成外部访问令牌"""
        # 这里简化实现
        token = CommonTools.generate_uuid()
        return response_result(content={'access_token': token}, msg="外部訪問令牌生成成功")


@blp.route("/projects/external/<string:access_token>")
class ProjectExternalAccessApi(BaseProjectView):
    """項目外部訪問API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, access_token):
        """通过令牌访问项目"""
        # 这里简化实现
        return response_result(content={'project': {}}, msg="項目訪問成功")


# ==================== 活動記錄API ====================

@blp.route("/projects/<string:project_id>/activities")
class ProjectActivitiesApi(BaseProjectView):
    """項目活動記錄API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目活动记录"""
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result, flag = self.pc.get_project_activities(
            project_id=project_id,
            page=page,
            per_page=per_page
        )
        return self._build_response(result, flag, "獲取項目活動記錄成功")


# ==================== 統計信息API ====================

@blp.route("/projects/<string:project_id>/statistics")
class ProjectStatisticsApi(BaseProjectView):
    """項目統計信息API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目统计信息"""
        # 这里简化实现
        statistics = {
            'total_activities': 0,
            'total_maintainers': 0,
            'total_tags': 0,
            'recent_activities': 0
        }
        return response_result(content=statistics, msg="獲取項目統計信息成功")