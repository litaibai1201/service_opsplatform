# -*- coding: utf-8 -*-
"""
@文件: api_design_api.py
@說明: API設計API (API Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.api_design_controller import api_design_controller
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from serializes.api_design_serialize import (
    ApiSpecCreateSchema, ApiSpecUpdateSchema, ApiSpecDuplicateSchema,
    ApiSpecVersionSchema, ApiSpecValidateSchema, ApiSpecTestSchema,
    TestSuiteCreateSchema, DocumentationGenerateSchema, DocumentationExportSchema,
    ApiMockCreateSchema, ApiMockUpdateSchema, MockActivateSchema,
    CodeGenerateClientSchema, CodeGenerateServerSchema, ApiSpecQuerySchema,
    AnalyticsQuerySchema, PerformanceQuerySchema, UsageRecordSchema
)
from loggers import logger


blp = Blueprint("api_design_api", __name__)


class BaseApiDesignView(MethodView):
    """API設計API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        self.adc = api_design_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """統一響應構建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失敗: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== API規範管理API ====================

@blp.route("/projects/<project_id>/api-specs")
class ApiSpecsListApi(BaseApiDesignView):
    """項目API規範列表API"""
    
    @jwt_required()
    @blp.arguments(ApiSpecQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_args, project_id):
        """獲取項目API規範列表"""
        try:
            spec_type = query_args.get("type")
            status = query_args.get("status")
            page = query_args.get("page", 1)
            limit = query_args.get("limit", 20)
            
            flag, result = self.adc.get_project_api_specs(
                project_id=project_id,
                spec_type=spec_type,
                status=status,
                page=page,
                limit=limit
            )
            
            return self._build_response(
                result, flag,
                success_msg="獲取API規範列表成功",
                error_prefix="獲取API規範列表失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取API規範列表API異常: {str(e)}")
            return fail_response_result(msg="獲取API規範列表失敗")
    
    @jwt_required()
    @blp.arguments(ApiSpecCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, spec_data, project_id):
        """創建API規範"""
        try:
            current_user = get_jwt_identity()
            spec_data["project_id"] = project_id
            spec_data["created_by"] = current_user
            
            flag, result = self.adc.create_api_spec(**spec_data)
            
            return self._build_response(
                result, flag,
                success_msg="創建API規範成功",
                error_prefix="創建API規範失敗: "
            )
            
        except Exception as e:
            logger.error(f"創建API規範API異常: {str(e)}")
            return fail_response_result(msg="創建API規範失敗")


@blp.route("/api-specs/<spec_id>")
class ApiSpecDetailApi(BaseApiDesignView):
    """API規範詳情API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, spec_id):
        """獲取API規範詳情"""
        try:
            include_full_spec = request.args.get("include_full_spec", "true").lower() == "true"
            
            flag, result = self.adc.get_api_spec(
                spec_id=spec_id,
                include_full_spec=include_full_spec
            )
            
            return self._build_response(
                result, flag,
                success_msg="獲取API規範詳情成功",
                error_prefix="獲取API規範詳情失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取API規範詳情API異常: {str(e)}")
            return fail_response_result(msg="獲取API規範詳情失敗")
    
    @jwt_required()
    @blp.arguments(ApiSpecUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, update_data, spec_id):
        """更新API規範"""
        try:
            flag, result = self.adc.update_api_spec(spec_id, update_data)
            
            return self._build_response(
                result, flag,
                success_msg="更新API規範成功",
                error_prefix="更新API規範失敗: "
            )
            
        except Exception as e:
            logger.error(f"更新API規範API異常: {str(e)}")
            return fail_response_result(msg="更新API規範失敗")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, spec_id):
        """刪除API規範"""
        try:
            flag, result = self.adc.delete_api_spec(spec_id)
            
            return self._build_response(
                result, flag,
                success_msg="刪除API規範成功",
                error_prefix="刪除API規範失敗: "
            )
            
        except Exception as e:
            logger.error(f"刪除API規範API異常: {str(e)}")
            return fail_response_result(msg="刪除API規範失敗")


@blp.route("/api-specs/<spec_id>/duplicate")
class ApiSpecDuplicateApi(BaseApiDesignView):
    """API規範複製API"""
    
    @jwt_required()
    @blp.arguments(ApiSpecDuplicateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, duplicate_data, spec_id):
        """複製API規範"""
        try:
            current_user = get_jwt_identity()
            
            flag, result = self.adc.duplicate_api_spec(
                spec_id=spec_id,
                new_name=duplicate_data["new_name"],
                created_by=current_user
            )
            
            return self._build_response(
                result, flag,
                success_msg="複製API規範成功",
                error_prefix="複製API規範失敗: "
            )
            
        except Exception as e:
            logger.error(f"複製API規範API異常: {str(e)}")
            return fail_response_result(msg="複製API規範失敗")


# ==================== 版本管理API ====================

@blp.route("/api-specs/<spec_id>/versions")
class ApiSpecVersionsApi(BaseApiDesignView):
    """API規範版本API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, spec_id):
        """獲取版本列表"""
        try:
            flag, result = self.adc.get_spec_versions(spec_id)
            
            return self._build_response(
                result, flag,
                success_msg="獲取版本列表成功",
                error_prefix="獲取版本列表失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取版本列表API異常: {str(e)}")
            return fail_response_result(msg="獲取版本列表失敗")
    
    @jwt_required()
    @blp.arguments(ApiSpecVersionSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, version_data, spec_id):
        """創建新版本"""
        try:
            current_user = get_jwt_identity()
            
            flag, result = self.adc.create_spec_version(
                spec_id=spec_id,
                new_version=version_data["new_version"],
                created_by=current_user
            )
            
            return self._build_response(
                result, flag,
                success_msg="創建新版本成功",
                error_prefix="創建新版本失敗: "
            )
            
        except Exception as e:
            logger.error(f"創建新版本API異常: {str(e)}")
            return fail_response_result(msg="創建新版本失敗")


@blp.route("/api-specs/<spec_id>/publish")
class ApiSpecPublishApi(BaseApiDesignView):
    """API規範發布API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, spec_id):
        """發布版本"""
        try:
            flag, result = self.adc.publish_spec(spec_id)
            
            return self._build_response(
                result, flag,
                success_msg="發布版本成功",
                error_prefix="發布版本失敗: "
            )
            
        except Exception as e:
            logger.error(f"發布版本API異常: {str(e)}")
            return fail_response_result(msg="發布版本失敗")


@blp.route("/api-specs/<spec_id>/deprecate")
class ApiSpecDeprecateApi(BaseApiDesignView):
    """API規範廢弃API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, spec_id):
        """廢弃版本"""
        try:
            flag, result = self.adc.deprecate_spec(spec_id)
            
            return self._build_response(
                result, flag,
                success_msg="廢弃版本成功",
                error_prefix="廢弃版本失敗: "
            )
            
        except Exception as e:
            logger.error(f"廢弃版本API異常: {str(e)}")
            return fail_response_result(msg="廢弃版本失敗")


# ==================== 驗證和測試API ====================

@blp.route("/api-specs/<spec_id>/validate")
class ApiSpecValidateApi(BaseApiDesignView):
    """API規範驗證API"""
    
    @jwt_required()
    @blp.arguments(ApiSpecValidateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, validate_data, spec_id):
        """驗證API規範"""
        try:
            strict_mode = validate_data.get("strict_mode", False)
            
            flag, result = self.adc.validate_api_spec(spec_id, strict_mode)
            
            return self._build_response(
                result, flag,
                success_msg="API規範驗證完成",
                error_prefix="API規範驗證失敗: "
            )
            
        except Exception as e:
            logger.error(f"API規範驗證API異常: {str(e)}")
            return fail_response_result(msg="API規範驗證失敗")


@blp.route("/api-specs/<spec_id>/test")
class ApiSpecTestApi(BaseApiDesignView):
    """API規範測試API"""
    
    @jwt_required()
    @blp.arguments(ApiSpecTestSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, test_data, spec_id):
        """測試API端點"""
        try:
            environment = test_data.get("environment", "dev")
            test_config = test_data.get("test_config")
            
            flag, result = self.adc.test_api_endpoints(
                spec_id=spec_id,
                environment=environment,
                test_config=test_config
            )
            
            return self._build_response(
                result, flag,
                success_msg="API端點測試完成",
                error_prefix="API端點測試失敗: "
            )
            
        except Exception as e:
            logger.error(f"API端點測試API異常: {str(e)}")
            return fail_response_result(msg="API端點測試失敗")


@blp.route("/api-specs/<spec_id>/test-results")
class ApiSpecTestResultsApi(BaseApiDesignView):
    """API規範測試結果API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, spec_id):
        """獲取測試結果"""
        try:
            flag, result = self.adc.get_test_results(spec_id)
            
            return self._build_response(
                result, flag,
                success_msg="獲取測試結果成功",
                error_prefix="獲取測試結果失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取測試結果API異常: {str(e)}")
            return fail_response_result(msg="獲取測試結果失敗")


@blp.route("/api-specs/<spec_id>/test-suite")
class ApiSpecTestSuiteApi(BaseApiDesignView):
    """API規範測試套件API"""
    
    @jwt_required()
    @blp.arguments(TestSuiteCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, test_suite_data, spec_id):
        """創建測試套件"""
        try:
            test_cases = test_suite_data["test_cases"]
            
            flag, result = self.adc.create_test_suite(spec_id, test_cases)
            
            return self._build_response(
                result, flag,
                success_msg="創建測試套件成功",
                error_prefix="創建測試套件失敗: "
            )
            
        except Exception as e:
            logger.error(f"創建測試套件API異常: {str(e)}")
            return fail_response_result(msg="創建測試套件失敗")


# ==================== 文檔生成API ====================

@blp.route("/api-specs/<spec_id>/generate-docs")
class ApiSpecGenerateDocsApi(BaseApiDesignView):
    """API規範生成文檔API"""
    
    @jwt_required()
    @blp.arguments(DocumentationGenerateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, doc_data, spec_id):
        """生成文檔"""
        try:
            doc_type = doc_data.get("doc_type", "html")
            
            flag, result = self.adc.generate_documentation(spec_id, doc_type)
            
            return self._build_response(
                result, flag,
                success_msg="生成文檔成功",
                error_prefix="生成文檔失敗: "
            )
            
        except Exception as e:
            logger.error(f"生成文檔API異常: {str(e)}")
            return fail_response_result(msg="生成文檔失敗")


@blp.route("/api-specs/<spec_id>/docs")
class ApiSpecDocsApi(BaseApiDesignView):
    """API規範文檔API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, spec_id):
        """獲取API文檔"""
        try:
            flag, result = self.adc.get_api_docs(spec_id)
            
            return self._build_response(
                result, flag,
                success_msg="獲取API文檔成功",
                error_prefix="獲取API文檔失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取API文檔API異常: {str(e)}")
            return fail_response_result(msg="獲取API文檔失敗")


@blp.route("/api-specs/<spec_id>/export-docs")
class ApiSpecExportDocsApi(BaseApiDesignView):
    """API規範導出文檔API"""
    
    @jwt_required()
    @blp.arguments(DocumentationExportSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, export_data, spec_id):
        """導出文檔"""
        try:
            export_format = export_data.get("export_format", "html")
            
            flag, result = self.adc.export_documentation(spec_id, export_format)
            
            return self._build_response(
                result, flag,
                success_msg="導出文檔成功",
                error_prefix="導出文檔失敗: "
            )
            
        except Exception as e:
            logger.error(f"導出文檔API異常: {str(e)}")
            return fail_response_result(msg="導出文檔失敗")


# ==================== Mock服務API ====================

@blp.route("/api-specs/<spec_id>/mocks")
class ApiSpecMocksApi(BaseApiDesignView):
    """API規範Mock服務API"""
    
    @jwt_required()
    @blp.arguments(ApiSpecQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_args, spec_id):
        """獲取Mock列表"""
        try:
            page = query_args.get("page", 1)
            limit = query_args.get("limit", 20)
            
            flag, result = self.adc.get_api_mocks(
                spec_id=spec_id,
                page=page,
                limit=limit
            )
            
            return self._build_response(
                result, flag,
                success_msg="獲取Mock列表成功",
                error_prefix="獲取Mock列表失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取Mock列表API異常: {str(e)}")
            return fail_response_result(msg="獲取Mock列表失敗")
    
    @jwt_required()
    @blp.arguments(ApiMockCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, mock_data, spec_id):
        """創建Mock數據"""
        try:
            current_user = get_jwt_identity()
            
            flag, result = self.adc.create_api_mock(
                spec_id=spec_id,
                endpoint_path=mock_data["endpoint_path"],
                method=mock_data["method"],
                mock_data=mock_data["mock_data"],
                rules=mock_data.get("rules"),
                response_scenarios=mock_data.get("response_scenarios"),
                created_by=current_user
            )
            
            return self._build_response(
                result, flag,
                success_msg="創建Mock數據成功",
                error_prefix="創建Mock數據失敗: "
            )
            
        except Exception as e:
            logger.error(f"創建Mock數據API異常: {str(e)}")
            return fail_response_result(msg="創建Mock數據失敗")


@blp.route("/mocks/<mock_id>")
class ApiMockDetailApi(BaseApiDesignView):
    """Mock數據詳情API"""
    
    @jwt_required()
    @blp.arguments(ApiMockUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, update_data, mock_id):
        """更新Mock數據"""
        try:
            flag, result = self.adc.update_api_mock(mock_id, update_data)
            
            return self._build_response(
                result, flag,
                success_msg="更新Mock數據成功",
                error_prefix="更新Mock數據失敗: "
            )
            
        except Exception as e:
            logger.error(f"更新Mock數據API異常: {str(e)}")
            return fail_response_result(msg="更新Mock數據失敗")
    
    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, mock_id):
        """刪除Mock數據"""
        try:
            flag, result = self.adc.delete_api_mock(mock_id)
            
            return self._build_response(
                result, flag,
                success_msg="刪除Mock數據成功",
                error_prefix="刪除Mock數據失敗: "
            )
            
        except Exception as e:
            logger.error(f"刪除Mock數據API異常: {str(e)}")
            return fail_response_result(msg="刪除Mock數據失敗")


@blp.route("/mocks/<mock_id>/activate")
class ApiMockActivateApi(BaseApiDesignView):
    """Mock數據激活API"""
    
    @jwt_required()
    @blp.arguments(MockActivateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, activate_data, mock_id):
        """激活Mock"""
        try:
            is_active = activate_data["is_active"]
            
            flag, result = self.adc.activate_mock(mock_id, is_active)
            
            action = "激活" if is_active else "停用"
            return self._build_response(
                result, flag,
                success_msg=f"{action}Mock成功",
                error_prefix=f"{action}Mock失敗: "
            )
            
        except Exception as e:
            logger.error(f"激活Mock API異常: {str(e)}")
            return fail_response_result(msg="激活Mock失敗")


# ==================== 代碼生成API ====================

@blp.route("/api-specs/<spec_id>/generate-client")
class ApiSpecGenerateClientApi(BaseApiDesignView):
    """API規範生成客戶端代碼API"""
    
    @jwt_required()
    @blp.arguments(CodeGenerateClientSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, generate_data, spec_id):
        """生成客戶端代碼"""
        try:
            language = generate_data.get("language", "javascript")
            options = generate_data.get("options", {})
            
            flag, result = self.adc.generate_client_code(spec_id, language, options)
            
            return self._build_response(
                result, flag,
                success_msg="生成客戶端代碼成功",
                error_prefix="生成客戶端代碼失敗: "
            )
            
        except Exception as e:
            logger.error(f"生成客戶端代碼API異常: {str(e)}")
            return fail_response_result(msg="生成客戶端代碼失敗")


@blp.route("/api-specs/<spec_id>/generate-server")
class ApiSpecGenerateServerApi(BaseApiDesignView):
    """API規範生成服務端代碼API"""
    
    @jwt_required()
    @blp.arguments(CodeGenerateServerSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, generate_data, spec_id):
        """生成服務端代碼"""
        try:
            framework = generate_data.get("framework", "express")
            options = generate_data.get("options", {})
            
            flag, result = self.adc.generate_server_code(spec_id, framework, options)
            
            return self._build_response(
                result, flag,
                success_msg="生成服務端代碼成功",
                error_prefix="生成服務端代碼失敗: "
            )
            
        except Exception as e:
            logger.error(f"生成服務端代碼API異常: {str(e)}")
            return fail_response_result(msg="生成服務端代碼失敗")


@blp.route("/api-specs/<spec_id>/code-templates")
class ApiSpecCodeTemplatesApi(BaseApiDesignView):
    """API規範代碼模板API"""
    
    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, spec_id):
        """獲取代碼模板"""
        try:
            flag, result = self.adc.get_code_templates(spec_id)
            
            return self._build_response(
                result, flag,
                success_msg="獲取代碼模板成功",
                error_prefix="獲取代碼模板失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取代碼模板API異常: {str(e)}")
            return fail_response_result(msg="獲取代碼模板失敗")


# ==================== 分析統計API ====================

@blp.route("/api-specs/<spec_id>/analytics")
class ApiSpecAnalyticsApi(BaseApiDesignView):
    """API規範分析API"""
    
    @jwt_required()
    @blp.arguments(AnalyticsQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_args, spec_id):
        """獲取使用分析"""
        try:
            days = query_args.get("days", 30)
            
            flag, result = self.adc.get_api_analytics(spec_id, days)
            
            return self._build_response(
                result, flag,
                success_msg="獲取使用分析成功",
                error_prefix="獲取使用分析失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取使用分析API異常: {str(e)}")
            return fail_response_result(msg="獲取使用分析失敗")


@blp.route("/api-specs/<spec_id>/performance")
class ApiSpecPerformanceApi(BaseApiDesignView):
    """API規範性能分析API"""
    
    @jwt_required()
    @blp.arguments(PerformanceQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_args, spec_id):
        """獲取性能分析"""
        try:
            days = query_args.get("days", 7)
            
            flag, result = self.adc.get_performance_analytics(spec_id, days)
            
            return self._build_response(
                result, flag,
                success_msg="獲取性能分析成功",
                error_prefix="獲取性能分析失敗: "
            )
            
        except Exception as e:
            logger.error(f"獲取性能分析API異常: {str(e)}")
            return fail_response_result(msg="獲取性能分析失敗")


@blp.route("/api-specs/<spec_id>/usage")
class ApiSpecUsageApi(BaseApiDesignView):
    """API規範使用記錄API"""
    
    @blp.arguments(UsageRecordSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, usage_data, spec_id):
        """記錄API使用"""
        try:
            flag, result = self.adc.record_api_usage(
                spec_id=spec_id,
                endpoint=usage_data["endpoint"],
                method=usage_data["method"],
                response_time=usage_data.get("response_time"),
                status_code=usage_data.get("status_code", 200)
            )
            
            return self._build_response(
                result, flag,
                success_msg="記錄API使用成功",
                error_prefix="記錄API使用失敗: "
            )
            
        except Exception as e:
            logger.error(f"記錄API使用API異常: {str(e)}")
            return fail_response_result(msg="記錄API使用失敗")