# -*- coding: utf-8 -*-
"""
@文件: flow_diagram_api.py
@說明: 流程圖API (Flow Diagram Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.flow_diagram_controller import flow_diagram_controller
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from serializes.flow_diagram_serialize import (
    FlowDiagramCreateSchema, FlowDiagramUpdateSchema, FlowDiagramDuplicateSchema,
    FlowDiagramValidateSchema, FlowDiagramSimulateSchema, FlowDiagramExportSchema,
    FlowDiagramQuerySchema, ShareTokenSchema
)
from loggers import logger


blp = Blueprint("flow_diagram_api", __name__)


class BaseFlowDiagramView(MethodView):
    """流程圖API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        self.fdc = flow_diagram_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """統一響應構建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失敗: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 流程圖管理API ====================

@blp.route("/projects/<project_id>/flow-diagrams")
class FlowDiagramsListApi(BaseFlowDiagramView):
    """項目流程圖列表API"""
    
    @jwt_required()
    @blp.arguments(FlowDiagramQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_args, project_id):
        """獲取項目流程圖列表"""
        try:
            diagram_type = query_args.get("type")
            page = query_args.get("page", 1)
            limit = query_args.get("limit", 20)
            
            flag, result = self.fdc.get_project_flow_diagrams(
                project_id=project_id,
                diagram_type=diagram_type,
                page=page,
                limit=limit
            )
            
            return self._build_response(
                result, flag, 
                success_msg="獲取流程圖列表成功",
                error_prefix="獲取流程圖列表失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取流程圖列表API異常: {str(e)}")
            return fail_response_result(msg="獲取流程圖列表失敗")
    
    @jwt_required()
    @blp.arguments(FlowDiagramCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, flow_diagram_data, project_id):
        """創建流程圖"""
        try:
            current_user = get_jwt_identity()
            flow_diagram_data["project_id"] = project_id
            flow_diagram_data["created_by"] = current_user
            
            flag, result = self.fdc.create_flow_diagram(**flow_diagram_data)
            
            return self._build_response(
                result, flag,
                success_msg="創建流程圖成功",
                error_prefix="創建流程圖失敗: "
            )
            
        except Exception as e:
            logger.error(f"創建流程圖API異常: {str(e)}")
            return fail_response_result(msg="創建流程圖失敗")


@blp.route("/flow-diagrams/<diagram_id>")
class FlowDiagramDetailApi(BaseFlowDiagramView):
    """流程圖詳情API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """獲取流程圖詳情"""
        try:
            include_full_data = request.args.get("include_full_data", "true").lower() == "true"
            
            flag, result = self.fdc.get_flow_diagram(
                diagram_id=diagram_id,
                include_full_data=include_full_data
            )
            
            return self._build_response(
                result, flag,
                success_msg="獲取流程圖詳情成功",
                error_prefix="獲取流程圖詳情失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取流程圖詳情API異常: {str(e)}")
            return fail_response_result(msg="獲取流程圖詳情失敗")
    
    @jwt_required()
    @blp.arguments(FlowDiagramUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, update_data, diagram_id):
        """更新流程圖"""
        try:
            flag, result = self.fdc.update_flow_diagram(diagram_id, update_data)
            
            return self._build_response(
                result, flag,
                success_msg="更新流程圖成功",
                error_prefix="更新流程圖失敗: "
            )
            
        except Exception as e:
            logger.error(f"更新流程圖API異常: {str(e)}")
            return fail_response_result(msg="更新流程圖失敗")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, diagram_id):
        """刪除流程圖"""
        try:
            flag, result = self.fdc.delete_flow_diagram(diagram_id)
            
            return self._build_response(
                result, flag,
                success_msg="刪除流程圖成功",
                error_prefix="刪除流程圖失敗: "
            )
            
        except Exception as e:
            logger.error(f"刪除流程圖API異常: {str(e)}")
            return fail_response_result(msg="刪除流程圖失敗")


@blp.route("/flow-diagrams/<diagram_id>/duplicate")
class FlowDiagramDuplicateApi(BaseFlowDiagramView):
    """流程圖複製API"""
    
    @jwt_required()
    @blp.arguments(FlowDiagramDuplicateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, duplicate_data, diagram_id):
        """複製流程圖"""
        try:
            current_user = get_jwt_identity()
            
            flag, result = self.fdc.duplicate_flow_diagram(
                diagram_id=diagram_id,
                new_name=duplicate_data["new_name"],
                created_by=current_user
            )
            
            return self._build_response(
                result, flag,
                success_msg="複製流程圖成功",
                error_prefix="複製流程圖失敗: "
            )
            
        except Exception as e:
            logger.error(f"複製流程圖API異常: {str(e)}")
            return fail_response_result(msg="複製流程圖失敗")


# ==================== 驗證和模擬API ====================

@blp.route("/flow-diagrams/<diagram_id>/validate")
class FlowDiagramValidateApi(BaseFlowDiagramView):
    """流程圖驗證API"""
    
    @jwt_required()
    @blp.arguments(FlowDiagramValidateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, validate_data, diagram_id):
        """驗證流程圖"""
        try:
            flag, result = self.fdc.validate_flow_diagram(diagram_id)
            
            return self._build_response(
                result, flag,
                success_msg="流程圖驗證完成",
                error_prefix="流程圖驗證失敗: "
            )
            
        except Exception as e:
            logger.error(f"流程圖驗證API異常: {str(e)}")
            return fail_response_result(msg="流程圖驗證失敗")


@blp.route("/flow-diagrams/<diagram_id>/simulate")
class FlowDiagramSimulateApi(BaseFlowDiagramView):
    """流程圖模擬API"""
    
    @jwt_required()
    @blp.arguments(FlowDiagramSimulateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, simulate_data, diagram_id):
        """流程模擬"""
        try:
            current_user = get_jwt_identity()
            simulation_config = simulate_data.get("simulation_config")
            save_history = simulate_data.get("save_history", True)
            
            flag, result = self.fdc.simulate_flow_diagram(
                diagram_id=diagram_id,
                simulation_config=simulation_config,
                save_history=save_history,
                created_by=current_user
            )
            
            return self._build_response(
                result, flag,
                success_msg="流程模擬完成",
                error_prefix="流程模擬失敗: "
            )
            
        except Exception as e:
            logger.error(f"流程模擬API異常: {str(e)}")
            return fail_response_result(msg="流程模擬失敗")


@blp.route("/flow-diagrams/<diagram_id>/analysis")
class FlowDiagramAnalysisApi(BaseFlowDiagramView):
    """流程圖分析API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """獲取流程分析報告"""
        try:
            flag, result = self.fdc.get_flow_analysis(diagram_id)
            
            return self._build_response(
                result, flag,
                success_msg="獲取流程分析報告成功",
                error_prefix="獲取流程分析報告失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取流程分析報告API異常: {str(e)}")
            return fail_response_result(msg="獲取流程分析報告失敗")


@blp.route("/flow-diagrams/<diagram_id>/simulation-history")
class FlowDiagramSimulationHistoryApi(BaseFlowDiagramView):
    """流程圖模擬歷史API"""
    
    @jwt_required()
    @blp.arguments(FlowDiagramQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_args, diagram_id):
        """獲取模擬歷史"""
        try:
            page = query_args.get("page", 1)
            limit = query_args.get("limit", 20)
            
            flag, result = self.fdc.get_simulation_history(
                diagram_id=diagram_id,
                page=page,
                limit=limit
            )
            
            return self._build_response(
                result, flag,
                success_msg="獲取模擬歷史成功",
                error_prefix="獲取模擬歷史失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取模擬歷史API異常: {str(e)}")
            return fail_response_result(msg="獲取模擬歷史失敗")


# ==================== 優化建議API ====================

@blp.route("/flow-diagrams/<diagram_id>/optimize")
class FlowDiagramOptimizeApi(BaseFlowDiagramView):
    """流程圖優化API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, diagram_id):
        """獲取優化建議"""
        try:
            flag, result = self.fdc.get_optimization_suggestions(diagram_id)
            
            return self._build_response(
                result, flag,
                success_msg="獲取優化建議成功",
                error_prefix="獲取優化建議失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取優化建議API異常: {str(e)}")
            return fail_response_result(msg="獲取優化建議失敗")


@blp.route("/flow-diagrams/<diagram_id>/bottleneck-analysis")
class FlowDiagramBottleneckAnalysisApi(BaseFlowDiagramView):
    """流程圖瓶頸分析API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, diagram_id):
        """瓶頸分析"""
        try:
            flag, result = self.fdc.analyze_bottlenecks(diagram_id)
            
            return self._build_response(
                result, flag,
                success_msg="瓶頸分析完成",
                error_prefix="瓶頸分析失敗: "
            )
            
        except Exception as e:
            logger.error(f"瓶頸分析API異常: {str(e)}")
            return fail_response_result(msg="瓶頸分析失敗")


# ==================== 導出和分享API ====================

@blp.route("/flow-diagrams/<diagram_id>/export")
class FlowDiagramExportApi(BaseFlowDiagramView):
    """流程圖導出API"""
    
    @jwt_required()
    @blp.arguments(FlowDiagramExportSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, export_data, diagram_id):
        """導出流程圖"""
        try:
            export_format = export_data.get("format", "json")
            include_simulation = export_data.get("include_simulation", False)
            
            flag, result = self.fdc.export_flow_diagram(
                diagram_id=diagram_id,
                export_format=export_format,
                include_simulation=include_simulation
            )
            
            return self._build_response(
                result, flag,
                success_msg="導出流程圖成功",
                error_prefix="導出流程圖失敗: "
            )
            
        except Exception as e:
            logger.error(f"導出流程圖API異常: {str(e)}")
            return fail_response_result(msg="導出流程圖失敗")


@blp.route("/flow-diagrams/<diagram_id>/share")
class FlowDiagramShareApi(BaseFlowDiagramView):
    """流程圖分享API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, diagram_id):
        """生成分享鏈接"""
        try:
            flag, result = self.fdc.generate_share_link(diagram_id)
            
            return self._build_response(
                result, flag,
                success_msg="生成分享鏈接成功",
                error_prefix="生成分享鏈接失敗: "
            )
            
        except Exception as e:
            logger.error(f"生成分享鏈接API異常: {str(e)}")
            return fail_response_result(msg="生成分享鏈接失敗")


@blp.route("/shared/flow-diagrams")
class SharedFlowDiagramApi(BaseFlowDiagramView):
    """分享流程圖訪問API"""
    
    @blp.arguments(ShareTokenSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_args):
        """通過分享令牌獲取流程圖"""
        try:
            share_token = query_args["share_token"]
            
            flag, result = self.fdc.get_shared_diagram(share_token)
            
            return self._build_response(
                result, flag,
                success_msg="獲取分享流程圖成功",
                error_prefix="獲取分享流程圖失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取分享流程圖API異常: {str(e)}")
            return fail_response_result(msg="獲取分享流程圖失敗")