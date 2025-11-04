# -*- coding: utf-8 -*-
"""
@文件: db_design_api.py
@說明: 數據庫設計API (Database Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.db_design_controller import db_design_controller
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("db_design_api", __name__)


class BaseDbDesignView(MethodView):
    """數據庫設計API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        self.ddc = db_design_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """統一響應構建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失敗: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 數據庫設計管理API ====================

@blp.route("/projects/<project_id>/db-designs")
class ProjectDbDesignsApi(BaseDbDesignView):
    """項目數據庫設計列表API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """獲取數據庫設計列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 獲取查詢參數
            page = request.args.get('page', 1, type=int)
            limit = request.args.get('limit', 20, type=int)
            db_type = request.args.get('db_type')
            
            result, flag = self.ddc.get_project_database_designs(
                project_id=project_id,
                db_type=db_type,
                page=page,
                limit=limit
            )
            return self._build_response(result, flag, "獲取數據庫設計列表成功")
            
        except Exception as e:
            logger.error(f"獲取數據庫設計列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, project_id):
        """創建數據庫設計"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data or not data.get('name'):
                return fail_response_result(msg="設計名稱不能為空")
            
            result, flag = self.ddc.create_database_design(
                project_id=project_id,
                name=data['name'],
                description=data.get('description'),
                db_type=data.get('db_type', 'mysql'),
                version=data.get('version', '1.0.0'),
                schemas=data.get('schemas'),
                relationships=data.get('relationships'),
                created_by=current_user_id
            )
            return self._build_response(result, flag, "創建數據庫設計成功")
            
        except Exception as e:
            logger.error(f"創建數據庫設計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>")
class DbDesignDetailApi(BaseDbDesignView):
    """數據庫設計詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, design_id):
        """獲取數據庫設計詳情"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            include_full_data = request.args.get('full', 'true').lower() == 'true'
            
            result, flag = self.ddc.get_database_design(design_id, include_full_data)
            return self._build_response(result, flag, "獲取數據庫設計詳情成功")
            
        except Exception as e:
            logger.error(f"獲取數據庫設計詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self, design_id):
        """更新數據庫設計"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data:
                return fail_response_result(msg="更新數據不能為空")
            
            result, flag = self.ddc.update_database_design(design_id, data)
            return self._build_response(result, flag, "更新數據庫設計成功")
            
        except Exception as e:
            logger.error(f"更新數據庫設計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def delete(self, design_id):
        """刪除數據庫設計"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.ddc.delete_database_design(design_id)
            return self._build_response(result, flag, "刪除數據庫設計成功")
            
        except Exception as e:
            logger.error(f"刪除數據庫設計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/duplicate")
class DbDesignDuplicateApi(BaseDbDesignView):
    """複製數據庫設計API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """複製數據庫設計"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            new_name = data.get('new_name')
            if not new_name:
                return fail_response_result(msg="新設計名稱不能為空")
            
            result, flag = self.ddc.duplicate_database_design(design_id, new_name, current_user_id)
            return self._build_response(result, flag, "複製數據庫設計成功")
            
        except Exception as e:
            logger.error(f"複製數據庫設計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== ERD管理API ====================

@blp.route("/db-designs/<design_id>/erd")
class DbDesignErdApi(BaseDbDesignView):
    """ERD圖API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, design_id):
        """獲取ERD圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.ddc.get_erd_diagram(design_id)
            return self._build_response(result, flag, "獲取ERD圖成功")
            
        except Exception as e:
            logger.error(f"獲取ERD圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def put(self, design_id):
        """更新ERD圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data:
                return fail_response_result(msg="ERD更新數據不能為空")
            
            result, flag = self.ddc.update_erd_diagram(design_id, data)
            return self._build_response(result, flag, "更新ERD圖成功")
            
        except Exception as e:
            logger.error(f"更新ERD圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/erd/generate")
class DbDesignErdGenerateApi(BaseDbDesignView):
    """生成ERD圖API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """生成ERD圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json() or {}
            layout = data.get('layout', 'auto')
            
            result, flag = self.ddc.generate_erd_diagram(design_id, layout)
            return self._build_response(result, flag, "生成ERD圖成功")
            
        except Exception as e:
            logger.error(f"生成ERD圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 驗證和優化API ====================

@blp.route("/db-designs/<design_id>/validate")
class DbDesignValidateApi(BaseDbDesignView):
    """驗證設計API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """驗證設計"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json() or {}
            strict_mode = data.get('strict_mode', False)
            
            result, flag = self.ddc.validate_design(design_id, strict_mode)
            return self._build_response(result, flag, "驗證設計成功")
            
        except Exception as e:
            logger.error(f"驗證設計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/optimize")
class DbDesignOptimizeApi(BaseDbDesignView):
    """獲取優化建議API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """獲取優化建議"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.ddc.optimize_design(design_id)
            return self._build_response(result, flag, "獲取優化建議成功")
            
        except Exception as e:
            logger.error(f"獲取優化建議異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/analyze")
class DbDesignAnalyzeApi(BaseDbDesignView):
    """性能分析API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """性能分析"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.ddc.analyze_performance(design_id)
            return self._build_response(result, flag, "性能分析成功")
            
        except Exception as e:
            logger.error(f"性能分析異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/normalize")
class DbDesignNormalizeApi(BaseDbDesignView):
    """規範化分析API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """規範化分析"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json() or {}
            target_level = data.get('target_level', '3NF')
            
            result, flag = self.ddc.normalize_design(design_id, target_level)
            return self._build_response(result, flag, "規範化分析成功")
            
        except Exception as e:
            logger.error(f"規範化分析異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 代碼生成API ====================

@blp.route("/db-designs/<design_id>/generate-sql")
class DbDesignGenerateSqlApi(BaseDbDesignView):
    """生成SQL腳本API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """生成SQL腳本"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json() or {}
            script_type = data.get('script_type', 'ddl')
            
            result, flag = self.ddc.generate_sql_script(design_id, script_type)
            return self._build_response(result, flag, "生成SQL腳本成功")
            
        except Exception as e:
            logger.error(f"生成SQL腳本異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/generate-migration")
class DbDesignGenerateMigrationApi(BaseDbDesignView):
    """生成遷移腳本API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """生成遷移腳本"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data or not data.get('target_version'):
                return fail_response_result(msg="目標版本不能為空")
            
            target_version = data['target_version']
            migration_type = data.get('migration_type', 'forward')
            
            result, flag = self.ddc.generate_migration_script(design_id, target_version, migration_type)
            return self._build_response(result, flag, "生成遷移腳本成功")
            
        except Exception as e:
            logger.error(f"生成遷移腳本異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/generate-docs")
class DbDesignGenerateDocsApi(BaseDbDesignView):
    """生成數據庫文檔API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """生成數據庫文檔"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json() or {}
            doc_format = data.get('format', 'html')
            
            result, flag = self.ddc.generate_documentation(design_id, doc_format)
            return self._build_response(result, flag, "生成數據庫文檔成功")
            
        except Exception as e:
            logger.error(f"生成數據庫文檔異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/generate-models")
class DbDesignGenerateModelsApi(BaseDbDesignView):
    """生成ORM模型API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """生成ORM模型"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json() or {}
            orm_type = data.get('orm_type', 'sqlalchemy')
            language = data.get('language', 'python')
            
            result, flag = self.ddc.generate_orm_models(design_id, orm_type, language)
            return self._build_response(result, flag, "生成ORM模型成功")
            
        except Exception as e:
            logger.error(f"生成ORM模型異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 逆向工程API ====================

@blp.route("/db-designs/reverse-engineer")
class DbDesignReverseEngineerApi(BaseDbDesignView):
    """逆向工程API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """從現有數據庫逆向生成設計"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data or not data.get('connection_config') or not data.get('project_id'):
                return fail_response_result(msg="連接配置和項目ID不能為空")
            
            connection_config = data['connection_config']
            project_id = data['project_id']
            
            result, flag = self.ddc.reverse_engineer_database(connection_config, project_id, current_user_id)
            return self._build_response(result, flag, "逆向工程成功")
            
        except Exception as e:
            logger.error(f"逆向工程異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/import-sql")
class DbDesignImportSqlApi(BaseDbDesignView):
    """導入SQL腳本API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """從SQL腳本導入設計"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data or not data.get('sql_script') or not data.get('project_id') or not data.get('design_name'):
                return fail_response_result(msg="SQL腳本、項目ID和設計名稱不能為空")
            
            sql_script = data['sql_script']
            project_id = data['project_id']
            design_name = data['design_name']
            
            result, flag = self.ddc.import_sql_script(sql_script, project_id, design_name, current_user_id)
            return self._build_response(result, flag, "導入SQL腳本成功")
            
        except Exception as e:
            logger.error(f"導入SQL腳本異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 比較和同步API ====================

@blp.route("/db-designs/<design_id>/compare")
class DbDesignCompareApi(BaseDbDesignView):
    """比較設計API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """比較不同版本"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data or not data.get('target_design_id'):
                return fail_response_result(msg="目標設計ID不能為空")
            
            target_design_id = data['target_design_id']
            
            result, flag = self.ddc.compare_designs(design_id, target_design_id)
            return self._build_response(result, flag, "比較設計成功")
            
        except Exception as e:
            logger.error(f"比較設計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/sync")
class DbDesignSyncApi(BaseDbDesignView):
    """同步到目標數據庫API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, design_id):
        """同步到目標數據庫"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            data = request.get_json()
            if not data or not data.get('target_connection'):
                return fail_response_result(msg="目標連接配置不能為空")
            
            target_connection = data['target_connection']
            
            result, flag = self.ddc.sync_to_database(design_id, target_connection)
            return self._build_response(result, flag, "生成同步腳本成功")
            
        except Exception as e:
            logger.error(f"同步到數據庫異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/db-designs/<design_id>/diff/<target_version>")
class DbDesignDiffApi(BaseDbDesignView):
    """獲取版本差異API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, design_id, target_version):
        """獲取版本差異"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.ddc.get_version_diff(design_id, target_version)
            return self._build_response(result, flag, "獲取版本差異成功")
            
        except Exception as e:
            logger.error(f"獲取版本差異異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 遷移管理API ====================

@blp.route("/db-designs/<design_id>/migrations")
class DbDesignMigrationsApi(BaseDbDesignView):
    """遷移列表API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, design_id):
        """獲取遷移列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            page = request.args.get('page', 1, type=int)
            limit = request.args.get('limit', 20, type=int)
            
            result, flag = self.ddc.migration_model.get_migrations_by_design(design_id, page, limit)
            return self._build_response(result, flag, "獲取遷移列表成功")
            
        except Exception as e:
            logger.error(f"獲取遷移列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/migrations/<migration_id>/apply")
class MigrationApplyApi(BaseDbDesignView):
    """應用遷移API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, migration_id):
        """應用遷移"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.ddc.migration_model.apply_migration(migration_id)
            return self._build_response(result, flag, "應用遷移成功")
            
        except Exception as e:
            logger.error(f"應用遷移異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/migrations/<migration_id>/rollback")
class MigrationRollbackApi(BaseDbDesignView):
    """回滾遷移API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, migration_id):
        """回滾遷移"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.ddc.migration_model.rollback_migration(migration_id)
            return self._build_response(result, flag, "回滾遷移成功")
            
        except Exception as e:
            logger.error(f"回滾遷移異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")