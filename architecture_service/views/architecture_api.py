# -*- coding: utf-8 -*-
"""
@文件: architecture_api.py
@說明: 架構圖API (Architecture Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g, send_file, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.architecture_controller import architecture_controller
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from serializes.architecture_serialize import (
    DiagramCreateSchema, DiagramUpdateSchema, DiagramDuplicateSchema,
    DiagramVersionCreateSchema, DiagramVersionRestoreSchema, DiagramValidateSchema,
    DiagramAnalyzeSchema, DiagramComplianceCheckSchema, CommentCreateSchema,
    CommentUpdateSchema, CommentReplySchema, DiagramExportSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("architecture_api", __name__)


class BaseArchitectureView(MethodView):
    """架構API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        self.ac = architecture_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 架構圖管理API ====================

@blp.route("/projects/<string:project_id>/diagrams")
class ProjectDiagramsApi(BaseArchitectureView):
    """項目架構圖API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目的架构图列表"""
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result, flag = self.ac.get_diagrams_by_project(project_id, page, per_page)
        return self._build_response(result, flag, "獲取架構圖列表成功")
    
    @jwt_required()
    @blp.arguments(DiagramCreateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, project_id):
        """创建架构图"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.create_diagram(
            project_id=project_id,
            user_id=user_id,
            **json_data
        )
        return self._build_response(result, flag, "架構圖創建成功")


@blp.route("/diagrams/<string:diagram_id>")
class DiagramDetailApi(BaseArchitectureView):
    """架構圖詳情API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """获取架构图详情"""
        result, flag = self.ac.get_diagram_detail(diagram_id)
        return self._build_response(result, flag, "獲取架構圖詳情成功")
    
    @jwt_required()
    @blp.arguments(DiagramUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, diagram_id):
        """更新架构图"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.update_diagram(
            diagram_id=diagram_id,
            user_id=user_id,
            **json_data
        )
        return self._build_response(result, flag, "架構圖更新成功")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, diagram_id):
        """删除架构图"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.delete_diagram(diagram_id, user_id)
        return self._build_response(result, flag, "架構圖刪除成功")


@blp.route("/diagrams/<string:diagram_id>/duplicate")
class DiagramDuplicateApi(BaseArchitectureView):
    """架構圖複製API"""
    
    @jwt_required()
    @blp.arguments(DiagramDuplicateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, diagram_id):
        """复制架构图"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.duplicate_diagram(
            diagram_id=diagram_id,
            new_name=json_data['name'],
            user_id=user_id
        )
        return self._build_response(result, flag, "架構圖複製成功")


# ==================== 版本管理API ====================

@blp.route("/diagrams/<string:diagram_id>/versions")
class DiagramVersionsApi(BaseArchitectureView):
    """架構圖版本API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """获取版本历史"""
        result, flag = self.ac.get_diagram_versions(diagram_id)
        return self._build_response(result, flag, "獲取版本歷史成功")
    
    @jwt_required()
    @blp.arguments(DiagramVersionCreateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, diagram_id):
        """创建新版本"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.create_diagram_version(
            diagram_id=diagram_id,
            user_id=user_id,
            comment=json_data.get('comment'),
            is_major=json_data.get('is_major', False)
        )
        return self._build_response(result, flag, "創建新版本成功")


@blp.route("/diagrams/<string:diagram_id>/versions/<int:version>")
class DiagramVersionDetailApi(BaseArchitectureView):
    """架構圖版本詳情API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id, version):
        """获取特定版本"""
        result, flag = self.ac.get_diagram_version(diagram_id, version)
        return self._build_response(result, flag, "獲取版本詳情成功")


@blp.route("/diagrams/<string:diagram_id>/restore/<int:version>")
class DiagramVersionRestoreApi(BaseArchitectureView):
    """架構圖版本恢復API"""
    
    @jwt_required()
    @blp.arguments(DiagramVersionRestoreSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, diagram_id, version):
        """恢复到指定版本"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.restore_diagram_version(
            diagram_id=diagram_id,
            version=version,
            user_id=user_id,
            comment=json_data.get('comment')
        )
        return self._build_response(result, flag, "版本恢復成功")


# ==================== 驗證和分析API ====================

@blp.route("/diagrams/<string:diagram_id>/validate")
class DiagramValidateApi(BaseArchitectureView):
    """架構圖驗證API"""
    
    @jwt_required()
    @blp.arguments(DiagramValidateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data, diagram_id):
        """验证架构图"""
        result, flag = self.ac.validate_diagram(
            diagram_id=diagram_id,
            validation_rules=json_data.get('validation_rules'),
            compliance_checks=json_data.get('compliance_checks')
        )
        return self._build_response(result, flag, "架構圖驗證完成")


@blp.route("/diagrams/<string:diagram_id>/analyze")
class DiagramAnalyzeApi(BaseArchitectureView):
    """架構圖分析API"""
    
    @jwt_required()
    @blp.arguments(DiagramAnalyzeSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data, diagram_id):
        """分析架构复杂度"""
        result, flag = self.ac.analyze_diagram(
            diagram_id=diagram_id,
            analysis_type=json_data.get('analysis_type', 'complexity')
        )
        return self._build_response(result, flag, "架構圖分析完成")


@blp.route("/diagrams/<string:diagram_id>/suggestions")
class DiagramSuggestionsApi(BaseArchitectureView):
    """架構圖建議API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """获取优化建议"""
        result, flag = self.ac.get_diagram_suggestions(diagram_id)
        return self._build_response(result, flag, "獲取優化建議成功")


@blp.route("/diagrams/<string:diagram_id>/compliance-check")
class DiagramComplianceCheckApi(BaseArchitectureView):
    """架構圖合規檢查API"""
    
    @jwt_required()
    @blp.arguments(DiagramComplianceCheckSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data, diagram_id):
        """合规检查"""
        result, flag = self.ac.compliance_check(
            diagram_id=diagram_id,
            compliance_standards=json_data['compliance_standards']
        )
        return self._build_response(result, flag, "合規檢查完成")


# ==================== 評論系統API ====================

@blp.route("/diagrams/<string:diagram_id>/comments")
class DiagramCommentsApi(BaseArchitectureView):
    """架構圖評論API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """获取评论列表"""
        result, flag = self.ac.get_diagram_comments(diagram_id)
        return self._build_response(result, flag, "獲取評論列表成功")
    
    @jwt_required()
    @blp.arguments(CommentCreateSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, diagram_id):
        """添加评论"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.create_comment(
            diagram_id=diagram_id,
            user_id=user_id,
            content=json_data['content'],
            position=json_data.get('position')
        )
        return self._build_response(result, flag, "評論添加成功")


@blp.route("/comments/<string:comment_id>")
class CommentDetailApi(BaseArchitectureView):
    """評論詳情API"""
    
    @jwt_required()
    @blp.arguments(CommentUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, json_data, comment_id):
        """更新评论"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.update_comment(
            comment_id=comment_id,
            content=json_data['content'],
            user_id=user_id
        )
        return self._build_response(result, flag, "評論更新成功")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, comment_id):
        """删除评论"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.delete_comment(comment_id, user_id)
        return self._build_response(result, flag, "評論刪除成功")


@blp.route("/comments/<string:comment_id>/resolve")
class CommentResolveApi(BaseArchitectureView):
    """評論解決API"""
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def post(self, comment_id):
        """解决评论"""
        user_id = get_jwt_identity()
        
        result, flag = self.ac.resolve_comment(comment_id, user_id)
        return self._build_response(result, flag, "評論已解決")


# ==================== 導出功能API ====================

@blp.route("/diagrams/<string:diagram_id>/export")
class DiagramExportApi(BaseArchitectureView):
    """架構圖導出API"""
    
    @jwt_required()
    @blp.arguments(DiagramExportSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data, diagram_id):
        """导出架构图"""
        result, flag = self.ac.export_diagram(
            diagram_id=diagram_id,
            export_format=json_data['format'],
            options=json_data.get('options', {})
        )
        return self._build_response(result, flag, "架構圖導出成功")


@blp.route("/diagrams/<string:diagram_id>/export/<string:format>")
class DiagramExportDownloadApi(BaseArchitectureView):
    """架構圖導出下載API"""
    
    @jwt_required()
    def get(self, diagram_id, format):
        """下载导出文件"""
        try:
            result, flag = self.ac.export_diagram(diagram_id, format)
            
            if not flag:
                return fail_response_result(msg=result)
            
            if format == "json":
                # 直接返回JSON数据
                response = jsonify(result.get('data'))
                response.headers['Content-Disposition'] = f'attachment; filename="{result["file_info"]["filename"]}"'
                return response
            
            elif format == "xml":
                # 返回XML数据
                from flask import Response
                response = Response(
                    result.get('data'),
                    mimetype=result['file_info']['mime_type'],
                    headers={'Content-Disposition': f'attachment; filename="{result["file_info"]["filename"]}"'}
                )
                return response
            
            else:
                # 对于图像格式，返回下载链接
                return response_result(
                    content=result['file_info'],
                    msg="文件準備完成，請使用下載鏈接"
                )
                
        except Exception as e:
            logger.error(f"下载导出文件失败: {str(e)}")
            return fail_response_result(msg=f"下載文件失败: {str(e)}")


# ==================== 協作功能API ====================

@blp.route("/diagrams/<string:diagram_id>/collaboration")
class DiagramCollaborationApi(BaseArchitectureView):
    """架構圖協作API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """获取协作状态"""
        result, flag = self.ac.get_diagram_detail(diagram_id)
        if flag:
            collaboration_info = {
                "diagram_id": diagram_id,
                "collaboration": result.get('collaboration', {}),
                "active_editors": result.get('collaboration', {}).get('active_editors', []),
                "is_locked": result.get('collaboration', {}).get('locked_by') is not None
            }
            return response_result(content=collaboration_info, msg="獲取協作狀態成功")
        return self._build_response(result, flag)
    
    @jwt_required()
    @blp.arguments(schema={
        'type': 'object',
        'properties': {
            'action': {'type': 'string', 'enum': ['lock', 'unlock', 'join', 'leave']}
        },
        'required': ['action']
    })
    @blp.response(200, RspMsgSchema)
    def post(self, json_data, diagram_id):
        """协作操作"""
        user_id = get_jwt_identity()
        action = json_data['action']
        
        # 这里简化实现协作逻辑
        if action == "lock":
            # 锁定架构图
            result, flag = self.ac.update_diagram(
                diagram_id, user_id,
                collaboration={
                    "locked_by": user_id,
                    "locked_at": CommonTools.get_current_time()
                }
            )
            return self._build_response(result, flag, "架構圖已鎖定")
        
        elif action == "unlock":
            # 解锁架构图
            result, flag = self.ac.update_diagram(
                diagram_id, user_id,
                collaboration={
                    "locked_by": None,
                    "locked_at": None
                }
            )
            return self._build_response(result, flag, "架構圖已解鎖")
        
        return response_result(msg="協作操作完成")


# ==================== 搜索功能API ====================

@blp.route("/diagrams/search")
class DiagramSearchApi(BaseArchitectureView):
    """架構圖搜索API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """搜索架构图"""
        keyword = request.args.get('keyword')
        diagram_type = request.args.get('type')
        tags = request.args.getlist('tags')
        created_by = request.args.get('created_by')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 构建搜索条件
        search_filter = {}
        
        if keyword:
            search_filter['$or'] = [
                {'name': {'$regex': keyword, '$options': 'i'}},
                {'description': {'$regex': keyword, '$options': 'i'}}
            ]
        
        if diagram_type:
            search_filter['type'] = diagram_type
        
        if tags:
            search_filter['metadata.tags'] = {'$in': tags}
        
        if created_by:
            search_filter['metadata.created_by'] = created_by
        
        try:
            # 执行搜索
            skip = (page - 1) * per_page
            
            cursor = self.ac.db.diagrams.find(search_filter) \
                                        .sort("metadata.updated_at", -1) \
                                        .skip(skip) \
                                        .limit(per_page)
            
            diagrams = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                diagrams.append(doc)
            
            total = self.ac.db.diagrams.count_documents(search_filter)
            
            result = {
                "diagrams": diagrams,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                },
                "search_criteria": {
                    "keyword": keyword,
                    "type": diagram_type,
                    "tags": tags,
                    "created_by": created_by
                }
            }
            
            return response_result(content=result, msg="搜索完成")
            
        except Exception as e:
            logger.error(f"搜索架构图失败: {str(e)}")
            return fail_response_result(msg=f"搜索失败: {str(e)}")


# ==================== 統計信息API ====================

@blp.route("/diagrams/statistics")
class DiagramStatisticsApi(BaseArchitectureView):
    """架構圖統計API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取架构图统计信息"""
        try:
            # 总体统计
            total_diagrams = self.ac.db.diagrams.count_documents({})
            
            # 按类型统计
            type_stats = list(self.ac.db.diagrams.aggregate([
                {"$group": {"_id": "$type", "count": {"$sum": 1}}}
            ]))
            
            # 按状态统计
            status_stats = list(self.ac.db.diagrams.aggregate([
                {"$group": {"_id": "$metadata.validation_status", "count": {"$sum": 1}}}
            ]))
            
            # 最近更新的架构图
            recent_diagrams = list(self.ac.db.diagrams.find(
                {},
                {"name": 1, "type": 1, "metadata.updated_at": 1}
            ).sort("metadata.updated_at", -1).limit(5))
            
            # 转换ObjectId为字符串
            for diagram in recent_diagrams:
                diagram['_id'] = str(diagram['_id'])
            
            statistics = {
                "total_diagrams": total_diagrams,
                "type_distribution": {item['_id']: item['count'] for item in type_stats},
                "status_distribution": {item['_id']: item['count'] for item in status_stats},
                "recent_diagrams": recent_diagrams,
                "generated_at": CommonTools.get_current_time()
            }
            
            return response_result(content=statistics, msg="獲取統計信息成功")
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {str(e)}")
            return fail_response_result(msg=f"獲取統計信息失败: {str(e)}")