# -*- coding: utf-8 -*-
"""
@文件: internal_api.py
@說明: 內部API (Project Service - 微服務間通信)
@時間: 2025-01-09
@作者: LiDong
"""

from flask.views import MethodView
from flask_smorest import Blueprint

from common.common_method import fail_response_result, response_result
from controllers.project_controller import project_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("internal_api", __name__, url_prefix="/internal")


class BaseInternalView(MethodView):
    """內部API基類"""
    
    def __init__(self):
        super().__init__()
        self.pc = project_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"內部API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 項目維護員相關內部接口 ====================

@blp.route("/projects/<string:project_id>/maintainers")
class InternalProjectMaintainersApi(BaseInternalView):
    """獲取項目維護員列表 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目维护员列表"""
        try:
            result, flag = self.pc.get_project_detail(project_id=project_id)
            if flag:
                maintainers = result.get('maintainers', [])
                return response_result(content={'maintainers': maintainers}, msg="獲取維護員列表成功")
            return self._build_response(result, flag)
        except Exception as e:
            logger.error(f"內部API - 獲取項目維護員列表失敗: {str(e)}")
            return fail_response_result(msg=f"獲取維護員列表失敗: {str(e)}")


@blp.route("/projects/user/<string:user_id>/maintainer-projects")
class InternalUserMaintainerProjectsApi(BaseInternalView):
    """獲取用戶維護的項目列表 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户维护的项目列表"""
        try:
            # 这里简化实现，实际应该在控制器中实现专门的方法
            from dbs.mysql_db.model_tables import ProjectMaintainerModel, ProjectModel
            from dbs.mysql_db import db
            
            # 查询用户维护的项目
            maintainer_projects = db.session.query(ProjectModel).join(
                ProjectMaintainerModel,
                ProjectModel.id == ProjectMaintainerModel.project_id
            ).filter(
                ProjectMaintainerModel.user_id == user_id,
                ProjectModel.status != 'deleted'
            ).all()
            
            projects = []
            for project in maintainer_projects:
                projects.append({
                    'id': project.id,
                    'name': project.name,
                    'description': project.description,
                    'team_id': project.team_id,
                    'visibility': project.visibility,
                    'status': project.status,
                    'created_by': project.created_by,
                    'created_at': project.created_at.isoformat() if project.created_at else None
                })
            
            return response_result(
                content={'projects': projects, 'total': len(projects)},
                msg="獲取用戶維護項目列表成功"
            )
        except Exception as e:
            logger.error(f"內部API - 獲取用戶維護項目列表失敗: {str(e)}")
            return fail_response_result(msg=f"獲取用戶維護項目列表失敗: {str(e)}")


@blp.route("/projects/notify-maintainer-change")
class InternalNotifyMaintainerChangeApi(BaseInternalView):
    """通知維護員變更 - 內部接口"""
    
    @blp.arguments(schema={
        'type': 'object',
        'properties': {
            'project_id': {'type': 'string'},
            'user_id': {'type': 'string'},
            'action': {'type': 'string', 'enum': ['added', 'removed']},
            'operator_id': {'type': 'string'}
        },
        'required': ['project_id', 'user_id', 'action', 'operator_id']
    })
    @blp.response(200, RspMsgSchema)
    def post(self, json_data):
        """通知维护员变更"""
        try:
            project_id = json_data.get('project_id')
            user_id = json_data.get('user_id')
            action = json_data.get('action')
            operator_id = json_data.get('operator_id')
            
            # 记录活动
            activity_type = f'maintainer_{action}'
            description = f'維護員{"添加" if action == "added" else "移除"}: {user_id}'
            
            self.pc._record_activity(
                project_id=project_id,
                user_id=operator_id,
                activity_type=activity_type,
                description=description,
                metadata={
                    'target_user_id': user_id,
                    'action': action
                }
            )
            
            logger.info(f"維護員變更通知處理成功 - 項目: {project_id}, 用戶: {user_id}, 操作: {action}")
            return response_result(msg="維護員變更通知處理成功")
            
        except Exception as e:
            logger.error(f"內部API - 維護員變更通知處理失敗: {str(e)}")
            return fail_response_result(msg=f"維護員變更通知處理失敗: {str(e)}")


# ==================== 項目團隊相關內部接口 ====================

@blp.route("/projects/<string:project_id>/team")
class InternalProjectTeamApi(BaseInternalView):
    """獲取項目所屬群組 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目所属群组信息"""
        try:
            result, flag = self.pc.get_project_detail(project_id=project_id)
            if flag:
                team_info = {
                    'project_id': project_id,
                    'team_id': result.get('team_id'),
                    'project_name': result.get('name'),
                    'project_visibility': result.get('visibility'),
                    'project_status': result.get('status')
                }
                return response_result(content=team_info, msg="獲取項目團隊信息成功")
            return self._build_response(result, flag)
        except Exception as e:
            logger.error(f"內部API - 獲取項目團隊信息失敗: {str(e)}")
            return fail_response_result(msg=f"獲取項目團隊信息失敗: {str(e)}")


# ==================== 項目統計相關內部接口 ====================

@blp.route("/projects/statistics/team/<string:team_id>")
class InternalTeamProjectStatisticsApi(BaseInternalView):
    """獲取團隊項目統計 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, team_id):
        """获取团队项目统计信息"""
        try:
            from dbs.mysql_db.model_tables import ProjectModel
            from dbs.mysql_db import db
            from sqlalchemy import func
            
            # 统计团队项目信息
            total_projects = db.session.query(func.count(ProjectModel.id)).filter(
                ProjectModel.team_id == team_id,
                ProjectModel.status != 'deleted'
            ).scalar()
            
            active_projects = db.session.query(func.count(ProjectModel.id)).filter(
                ProjectModel.team_id == team_id,
                ProjectModel.status == 'active'
            ).scalar()
            
            archived_projects = db.session.query(func.count(ProjectModel.id)).filter(
                ProjectModel.team_id == team_id,
                ProjectModel.status == 'archived'
            ).scalar()
            
            public_projects = db.session.query(func.count(ProjectModel.id)).filter(
                ProjectModel.team_id == team_id,
                ProjectModel.visibility == 'public',
                ProjectModel.status != 'deleted'
            ).scalar()
            
            statistics = {
                'team_id': team_id,
                'total_projects': total_projects or 0,
                'active_projects': active_projects or 0,
                'archived_projects': archived_projects or 0,
                'public_projects': public_projects or 0
            }
            
            return response_result(content=statistics, msg="獲取團隊項目統計成功")
            
        except Exception as e:
            logger.error(f"內部API - 獲取團隊項目統計失敗: {str(e)}")
            return fail_response_result(msg=f"獲取團隊項目統計失敗: {str(e)}")


@blp.route("/projects/statistics/user/<string:user_id>")
class InternalUserProjectStatisticsApi(BaseInternalView):
    """獲取用戶項目統計 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户项目统计信息"""
        try:
            from dbs.mysql_db.model_tables import ProjectModel, ProjectMaintainerModel
            from dbs.mysql_db import db
            from sqlalchemy import func
            
            # 统计用户创建的项目
            created_projects = db.session.query(func.count(ProjectModel.id)).filter(
                ProjectModel.created_by == user_id,
                ProjectModel.status != 'deleted'
            ).scalar()
            
            # 统计用户维护的项目
            maintained_projects = db.session.query(func.count(ProjectMaintainerModel.id)).filter(
                ProjectMaintainerModel.user_id == user_id
            ).scalar()
            
            statistics = {
                'user_id': user_id,
                'created_projects': created_projects or 0,
                'maintained_projects': maintained_projects or 0,
                'total_involved_projects': (created_projects or 0) + (maintained_projects or 0)
            }
            
            return response_result(content=statistics, msg="獲取用戶項目統計成功")
            
        except Exception as e:
            logger.error(f"內部API - 獲取用戶項目統計失敗: {str(e)}")
            return fail_response_result(msg=f"獲取用戶項目統計失敗: {str(e)}")


# ==================== 健康檢查接口 ====================

@blp.route("/health")
class InternalHealthCheckApi(BaseInternalView):
    """健康檢查 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """服务健康检查"""
        try:
            from dbs.mysql_db import db
            
            # 检查数据库连接
            db.session.execute('SELECT 1')
            
            health_info = {
                'service': 'project-service',
                'status': 'healthy',
                'timestamp': CommonTools.get_current_time(),
                'database': 'connected'
            }
            
            return response_result(content=health_info, msg="服務健康檢查通過")
            
        except Exception as e:
            logger.error(f"內部API - 健康檢查失敗: {str(e)}")
            health_info = {
                'service': 'project-service',
                'status': 'unhealthy',
                'timestamp': CommonTools.get_current_time(),
                'error': str(e)
            }
            return fail_response_result(content=health_info, msg=f"服務健康檢查失敗: {str(e)}")