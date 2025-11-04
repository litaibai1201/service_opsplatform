# -*- coding: utf-8 -*-
"""
@文件: project_controller.py
@說明: 項目控制器 (Project Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional
from sqlalchemy import func, and_, or_
from sqlalchemy.exc import IntegrityError

from common.common_tools import CommonTools
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    ProjectModel, ProjectMaintainerModel, ProjectTemplateModel,
    TagModel, ProjectTagModel, ProjectActivityModel,
    ProjectAccessRequestModel, ProjectExternalAccessModel
)
from loggers import logger


class ProjectController:
    """项目控制器"""

    @staticmethod
    def create_project(team_id: str, user_id: str, **kwargs) -> Tuple[bool, Any]:
        """创建项目"""
        try:
            project = ProjectModel(
                team_id=team_id,
                created_by=user_id,
                **kwargs
            )
            db.session.add(project)
            db.session.commit()
            
            # 记录活动
            ProjectController._record_activity(
                project.id, user_id, 'project_created',
                f'創建項目: {project.name}'
            )
            
            return True, {
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'team_id': project.team_id,
                'visibility': project.visibility,
                'status': project.status,
                'created_by': project.created_by,
                'created_at': project.created_at.isoformat() if project.created_at else None
            }
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"創建項目失敗 - 數據庫完整性錯誤: {str(e)}")
            return False, "項目創建失敗，請檢查數據完整性"
        except Exception as e:
            db.session.rollback()
            logger.error(f"創建項目失敗: {str(e)}")
            return False, f"創建項目失敗: {str(e)}"

    @staticmethod
    def create_project_from_template(team_id: str, user_id: str, template_id: str, **kwargs) -> Tuple[bool, Any]:
        """从模板创建项目"""
        try:
            template = ProjectTemplateModel.query.get(template_id)
            if not template:
                return False, "項目模板不存在"
            
            # 合并模板数据和用户提供的数据
            project_data = template.template_data.copy() if template.template_data else {}
            project_data.update(kwargs)
            
            project = ProjectModel(
                team_id=team_id,
                created_by=user_id,
                template_id=template_id,
                settings=project_data.get('settings'),
                **{k: v for k, v in project_data.items() if k not in ['settings']}
            )
            db.session.add(project)
            
            # 更新模板使用次数
            template.usage_count += 1
            
            db.session.commit()
            
            # 记录活动
            ProjectController._record_activity(
                project.id, user_id, 'project_created_from_template',
                f'從模板創建項目: {project.name} (模板: {template.name})'
            )
            
            return True, {
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'team_id': project.team_id,
                'template_id': template_id,
                'created_by': project.created_by,
                'created_at': project.created_at.isoformat() if project.created_at else None
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"從模板創建項目失敗: {str(e)}")
            return False, f"從模板創建項目失敗: {str(e)}"

    @staticmethod
    def get_project_list(user_id: str, page: int = 1, per_page: int = 20, 
                        visibility: str = None, team_id: str = None) -> Tuple[bool, Any]:
        """获取用户可访问的项目列表"""
        try:
            query = ProjectModel.query.filter(
                ProjectModel.status != 'deleted'
            )
            
            # 过滤条件
            if visibility:
                query = query.filter(ProjectModel.visibility == visibility)
            if team_id:
                query = query.filter(ProjectModel.team_id == team_id)
            
            # 访问权限过滤 (这里简化处理，实际权限检查在权限微服务中)
            query = query.filter(
                or_(
                    ProjectModel.visibility == 'public',
                    ProjectModel.created_by == user_id,
                    ProjectModel.team_id.in_(
                        # 这里应该调用团队服务获取用户所在的团队
                        # 暂时简化处理
                        []
                    )
                )
            )
            
            # 排序和分页
            query = query.order_by(ProjectModel.updated_at.desc())
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            
            projects = []
            for project in pagination.items:
                projects.append({
                    'id': project.id,
                    'name': project.name,
                    'description': project.description,
                    'team_id': project.team_id,
                    'visibility': project.visibility,
                    'status': project.status,
                    'created_by': project.created_by,
                    'created_at': project.created_at.isoformat() if project.created_at else None,
                    'updated_at': project.updated_at.isoformat() if project.updated_at else None
                })
            
            return True, {
                'projects': projects,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_prev': pagination.has_prev,
                    'has_next': pagination.has_next
                }
            }
        except Exception as e:
            logger.error(f"獲取項目列表失敗: {str(e)}")
            return False, f"獲取項目列表失敗: {str(e)}"

    @staticmethod
    def get_project_detail(project_id: str, user_id: str = None) -> Tuple[bool, Any]:
        """获取项目详情"""
        try:
            project = ProjectModel.query.get(project_id)
            if not project or project.status == 'deleted':
                return False, "項目不存在"
            
            # 获取维护员列表
            maintainers = ProjectMaintainerModel.query.filter_by(project_id=project_id).all()
            maintainer_list = [{
                'user_id': m.user_id,
                'assigned_by': m.assigned_by,
                'assigned_at': m.assigned_at.isoformat() if m.assigned_at else None
            } for m in maintainers]
            
            # 获取标签
            tags = db.session.query(TagModel).join(ProjectTagModel).filter(
                ProjectTagModel.project_id == project_id
            ).all()
            tag_list = [{
                'id': t.id,
                'name': t.name,
                'color': t.color,
                'category': t.category
            } for t in tags]
            
            return True, {
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'team_id': project.team_id,
                'visibility': project.visibility,
                'status': project.status,
                'template_id': project.template_id,
                'settings': project.settings,
                'allow_member_edit': project.allow_member_edit,
                'allow_external_view': project.allow_external_view,
                'allow_external_comment': project.allow_external_comment,
                'created_by': project.created_by,
                'created_at': project.created_at.isoformat() if project.created_at else None,
                'updated_at': project.updated_at.isoformat() if project.updated_at else None,
                'maintainers': maintainer_list,
                'tags': tag_list
            }
        except Exception as e:
            logger.error(f"獲取項目詳情失敗: {str(e)}")
            return False, f"獲取項目詳情失敗: {str(e)}"

    @staticmethod
    def update_project(project_id: str, user_id: str, **kwargs) -> Tuple[bool, Any]:
        """更新项目"""
        try:
            project = ProjectModel.query.get(project_id)
            if not project or project.status == 'deleted':
                return False, "項目不存在"
            
            for key, value in kwargs.items():
                if hasattr(project, key):
                    setattr(project, key, value)
            
            db.session.commit()
            
            # 记录活动
            ProjectController._record_activity(
                project_id, user_id, 'project_updated',
                f'更新項目: {project.name}'
            )
            
            return True, "項目更新成功"
        except Exception as e:
            db.session.rollback()
            logger.error(f"更新項目失敗: {str(e)}")
            return False, f"更新項目失敗: {str(e)}"

    @staticmethod
    def archive_project(project_id: str, user_id: str) -> Tuple[bool, Any]:
        """归档项目"""
        try:
            project = ProjectModel.query.get(project_id)
            if not project or project.status == 'deleted':
                return False, "項目不存在"
            
            project.status = 'archived'
            db.session.commit()
            
            # 记录活动
            ProjectController._record_activity(
                project_id, user_id, 'project_archived',
                f'歸檔項目: {project.name}'
            )
            
            return True, "項目歸檔成功"
        except Exception as e:
            db.session.rollback()
            logger.error(f"歸檔項目失敗: {str(e)}")
            return False, f"歸檔項目失敗: {str(e)}"

    @staticmethod
    def delete_project(project_id: str, user_id: str) -> Tuple[bool, Any]:
        """删除项目"""
        try:
            project = ProjectModel.query.get(project_id)
            if not project or project.status == 'deleted':
                return False, "項目不存在"
            
            project.status = 'deleted'
            db.session.commit()
            
            # 记录活动
            ProjectController._record_activity(
                project_id, user_id, 'project_deleted',
                f'刪除項目: {project.name}'
            )
            
            return True, "項目刪除成功"
        except Exception as e:
            db.session.rollback()
            logger.error(f"刪除項目失敗: {str(e)}")
            return False, f"刪除項目失敗: {str(e)}"

    # 项目模板相关方法
    @staticmethod
    def create_template(user_id: str, **kwargs) -> Tuple[bool, Any]:
        """创建项目模板"""
        try:
            template = ProjectTemplateModel(
                created_by=user_id,
                **kwargs
            )
            db.session.add(template)
            db.session.commit()
            
            return True, {
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'category': template.category,
                'is_public': template.is_public,
                'created_by': template.created_by,
                'created_at': template.created_at.isoformat() if template.created_at else None
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"創建項目模板失敗: {str(e)}")
            return False, f"創建項目模板失敗: {str(e)}"

    @staticmethod
    def get_template_list(user_id: str = None, category: str = None, 
                         is_public: bool = None, page: int = 1, per_page: int = 20) -> Tuple[bool, Any]:
        """获取项目模板列表"""
        try:
            query = ProjectTemplateModel.query
            
            if is_public is not None:
                query = query.filter(ProjectTemplateModel.is_public == is_public)
            if category:
                query = query.filter(ProjectTemplateModel.category == category)
            if user_id and is_public is False:
                query = query.filter(ProjectTemplateModel.created_by == user_id)
            
            query = query.order_by(ProjectTemplateModel.usage_count.desc(), ProjectTemplateModel.created_at.desc())
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            
            templates = []
            for template in pagination.items:
                templates.append({
                    'id': template.id,
                    'name': template.name,
                    'description': template.description,
                    'category': template.category,
                    'is_public': template.is_public,
                    'usage_count': template.usage_count,
                    'created_by': template.created_by,
                    'created_at': template.created_at.isoformat() if template.created_at else None
                })
            
            return True, {
                'templates': templates,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages
                }
            }
        except Exception as e:
            logger.error(f"獲取項目模板列表失敗: {str(e)}")
            return False, f"獲取項目模板列表失敗: {str(e)}"

    # 标签相关方法
    @staticmethod
    def create_tag(user_id: str, **kwargs) -> Tuple[bool, Any]:
        """创建标签"""
        try:
            tag = TagModel(
                created_by=user_id,
                **kwargs
            )
            db.session.add(tag)
            db.session.commit()
            
            return True, {
                'id': tag.id,
                'name': tag.name,
                'color': tag.color,
                'category': tag.category,
                'description': tag.description,
                'created_by': tag.created_by,
                'created_at': tag.created_at.isoformat() if tag.created_at else None
            }
        except IntegrityError as e:
            db.session.rollback()
            return False, "標籤名稱和分類組合已存在"
        except Exception as e:
            db.session.rollback()
            logger.error(f"創建標籤失敗: {str(e)}")
            return False, f"創建標籤失敗: {str(e)}"

    @staticmethod
    def add_project_tags(project_id: str, tag_ids: List[str], user_id: str) -> Tuple[bool, Any]:
        """为项目添加标签"""
        try:
            # 检查项目是否存在
            project = ProjectModel.query.get(project_id)
            if not project or project.status == 'deleted':
                return False, "項目不存在"
            
            # 检查标签是否存在
            tags = TagModel.query.filter(TagModel.id.in_(tag_ids)).all()
            if len(tags) != len(tag_ids):
                return False, "部分標籤不存在"
            
            # 添加标签关联
            for tag_id in tag_ids:
                existing = ProjectTagModel.query.filter_by(
                    project_id=project_id, tag_id=tag_id
                ).first()
                if not existing:
                    project_tag = ProjectTagModel(project_id=project_id, tag_id=tag_id)
                    db.session.add(project_tag)
                    
                    # 更新标签使用次数
                    tag = TagModel.query.get(tag_id)
                    if tag:
                        tag.usage_count += 1
            
            db.session.commit()
            
            # 记录活动
            tag_names = [tag.name for tag in tags]
            ProjectController._record_activity(
                project_id, user_id, 'project_tags_added',
                f'為項目添加標籤: {", ".join(tag_names)}'
            )
            
            return True, "標籤添加成功"
        except Exception as e:
            db.session.rollback()
            logger.error(f"添加項目標籤失敗: {str(e)}")
            return False, f"添加項目標籤失敗: {str(e)}"

    # 维护员相关方法
    @staticmethod
    def add_maintainer(project_id: str, user_id: str, assigned_by: str) -> Tuple[bool, Any]:
        """添加项目维护员"""
        try:
            # 检查项目是否存在
            project = ProjectModel.query.get(project_id)
            if not project or project.status == 'deleted':
                return False, "項目不存在"
            
            # 检查是否已经是维护员
            existing = ProjectMaintainerModel.query.filter_by(
                project_id=project_id, user_id=user_id
            ).first()
            if existing:
                return False, "用戶已經是該項目的維護員"
            
            maintainer = ProjectMaintainerModel(
                project_id=project_id,
                user_id=user_id,
                assigned_by=assigned_by
            )
            db.session.add(maintainer)
            db.session.commit()
            
            # 记录活动
            ProjectController._record_activity(
                project_id, assigned_by, 'maintainer_added',
                f'添加項目維護員: {user_id}'
            )
            
            return True, "維護員添加成功"
        except Exception as e:
            db.session.rollback()
            logger.error(f"添加項目維護員失敗: {str(e)}")
            return False, f"添加項目維護員失敗: {str(e)}"

    @staticmethod
    def remove_maintainer(project_id: str, user_id: str, removed_by: str) -> Tuple[bool, Any]:
        """移除项目维护员"""
        try:
            maintainer = ProjectMaintainerModel.query.filter_by(
                project_id=project_id, user_id=user_id
            ).first()
            if not maintainer:
                return False, "維護員不存在"
            
            db.session.delete(maintainer)
            db.session.commit()
            
            # 记录活动
            ProjectController._record_activity(
                project_id, removed_by, 'maintainer_removed',
                f'移除項目維護員: {user_id}'
            )
            
            return True, "維護員移除成功"
        except Exception as e:
            db.session.rollback()
            logger.error(f"移除項目維護員失敗: {str(e)}")
            return False, f"移除項目維護員失敗: {str(e)}"

    # 访问申请相关方法
    @staticmethod
    def create_access_request(project_id: str, user_id: str, access_type: str = 'view', message: str = None) -> Tuple[bool, Any]:
        """创建项目访问申请"""
        try:
            # 检查项目是否存在
            project = ProjectModel.query.get(project_id)
            if not project or project.status == 'deleted':
                return False, "項目不存在"
            
            # 检查是否已有待处理的申请
            existing = ProjectAccessRequestModel.query.filter_by(
                project_id=project_id, 
                user_id=user_id, 
                status='pending'
            ).first()
            if existing:
                return False, "您已有待處理的訪問申請"
            
            request = ProjectAccessRequestModel(
                project_id=project_id,
                user_id=user_id,
                access_type=access_type,
                message=message,
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.session.add(request)
            db.session.commit()
            
            return True, {
                'id': request.id,
                'project_id': project_id,
                'access_type': access_type,
                'status': 'pending',
                'created_at': request.created_at.isoformat() if request.created_at else None
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"創建項目訪問申請失敗: {str(e)}")
            return False, f"創建項目訪問申請失敗: {str(e)}"

    # 活动记录
    @staticmethod
    def _record_activity(project_id: str, user_id: str, activity_type: str, description: str, metadata: dict = None):
        """记录项目活动"""
        try:
            activity = ProjectActivityModel(
                project_id=project_id,
                user_id=user_id,
                activity_type=activity_type,
                description=description,
                metadata=metadata
            )
            db.session.add(activity)
            db.session.commit()
        except Exception as e:
            logger.error(f"記錄項目活動失敗: {str(e)}")

    @staticmethod
    def get_project_activities(project_id: str, page: int = 1, per_page: int = 20) -> Tuple[bool, Any]:
        """获取项目活动记录"""
        try:
            query = ProjectActivityModel.query.filter_by(project_id=project_id)
            query = query.order_by(ProjectActivityModel.created_at.desc())
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            
            activities = []
            for activity in pagination.items:
                activities.append({
                    'id': activity.id,
                    'user_id': activity.user_id,
                    'activity_type': activity.activity_type,
                    'description': activity.description,
                    'metadata': activity.metadata,
                    'created_at': activity.created_at.isoformat() if activity.created_at else None
                })
            
            return True, {
                'activities': activities,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages
                }
            }
        except Exception as e:
            logger.error(f"獲取項目活動記錄失敗: {str(e)}")
            return False, f"獲取項目活動記錄失敗: {str(e)}"


# 创建全局控制器实例
project_controller = ProjectController()