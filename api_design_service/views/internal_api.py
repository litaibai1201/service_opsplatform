# -*- coding: utf-8 -*-
"""
@文件: internal_api.py
@說明: 內部API (API Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

import psutil
from datetime import datetime, timezone
from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint

from common.common_method import fail_response_result, response_result
from controllers.api_design_controller import api_design_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from dbs.mongodb import get_db
from loggers import logger


blp = Blueprint("internal_api", __name__)


class BaseInternalView(MethodView):
    """內部API基類"""
    
    def __init__(self):
        super().__init__()
        self.adc = api_design_controller


# ==================== 健康檢查和監控 ====================

@blp.route("/internal/health")
class HealthCheckApi(BaseInternalView):
    """健康檢查API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """健康檢查"""
        try:
            health_status = {
                "service": "api_design_service",
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "1.0.0",
                "components": {
                    "mongodb": "unknown",
                    "redis": "unknown",
                    "controller": "unknown"
                }
            }
            
            # 檢查 MongoDB 連接
            try:
                db = get_db()
                db.admin.command('ping')
                health_status["components"]["mongodb"] = "healthy"
            except Exception as e:
                health_status["components"]["mongodb"] = f"unhealthy: {str(e)}"
                health_status["status"] = "degraded"
            
            # 檢查控制器
            try:
                if self.adc is not None:
                    health_status["components"]["controller"] = "healthy"
                else:
                    health_status["components"]["controller"] = "unhealthy: not initialized"
                    health_status["status"] = "degraded"
            except Exception as e:
                health_status["components"]["controller"] = f"unhealthy: {str(e)}"
                health_status["status"] = "degraded"
            
            return response_result(content=health_status, msg="健康檢查完成")
            
        except Exception as e:
            logger.error(f"健康檢查失敗: {str(e)}")
            error_status = {
                "service": "api_design_service",
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }
            return fail_response_result(content=error_status, msg="健康檢查失敗")


@blp.route("/internal/metrics")
class MetricsApi(BaseInternalView):
    """系統指標API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """獲取系統指標"""
        try:
            # 獲取系統資源使用情況
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # 獲取數據庫統計
            db_stats = self._get_database_stats()
            
            # 獲取服務統計
            service_stats = self._get_service_stats()
            
            metrics = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "system": {
                    "cpu_usage_percent": cpu_percent,
                    "memory_usage_percent": memory.percent,
                    "memory_available_mb": memory.available // (1024 * 1024),
                    "disk_usage_percent": disk.percent,
                    "disk_free_gb": disk.free // (1024 * 1024 * 1024)
                },
                "database": db_stats,
                "service": service_stats
            }
            
            return response_result(content=metrics, msg="獲取系統指標成功")
            
        except Exception as e:
            logger.error(f"獲取系統指標失敗: {str(e)}")
            return fail_response_result(msg="獲取系統指標失敗")
    
    def _get_database_stats(self):
        """獲取數據庫統計信息"""
        try:
            db = get_db()
            
            # 獲取集合統計
            api_specs_count = db.api_specs.count_documents({})
            api_mocks_count = db.api_mocks.count_documents({})
            analytics_count = db.api_usage_analytics.count_documents({})
            
            # 獲取數據庫大小信息
            stats = db.command("dbStats")
            
            return {
                "collections": {
                    "api_specs": {
                        "count": api_specs_count,
                        "indexes": len(list(db.api_specs.list_indexes()))
                    },
                    "api_mocks": {
                        "count": api_mocks_count,
                        "indexes": len(list(db.api_mocks.list_indexes()))
                    },
                    "api_usage_analytics": {
                        "count": analytics_count,
                        "indexes": len(list(db.api_usage_analytics.list_indexes()))
                    }
                },
                "database_size_mb": stats.get("dataSize", 0) // (1024 * 1024),
                "storage_size_mb": stats.get("storageSize", 0) // (1024 * 1024),
                "index_size_mb": stats.get("indexSize", 0) // (1024 * 1024)
            }
            
        except Exception as e:
            logger.error(f"獲取數據庫統計失敗: {str(e)}")
            return {"error": str(e)}
    
    def _get_service_stats(self):
        """獲取服務統計信息"""
        try:
            return {
                "controller_initialized": self.adc is not None,
                "supported_api_types": ["rest", "graphql", "grpc", "websocket"],
                "supported_statuses": ["draft", "review", "published", "deprecated"],
                "supported_export_formats": ["json", "yaml", "html", "pdf", "markdown"],
                "supported_client_languages": ["javascript", "python", "java", "csharp", "go", "swift"],
                "supported_server_frameworks": ["express", "flask", "spring", "aspnet", "gin", "django"]
            }
            
        except Exception as e:
            logger.error(f"獲取服務統計失敗: {str(e)}")
            return {"error": str(e)}


# ==================== 內部數據查詢 ====================

@blp.route("/internal/specs/search")
class InternalSpecSearchApi(BaseInternalView):
    """內部API規範搜索API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """搜索API規範"""
        try:
            # 從查詢參數獲取搜索條件
            project_id = request.args.get("project_id")
            spec_type = request.args.get("type")
            status = request.args.get("status")
            created_by = request.args.get("created_by")
            name_keyword = request.args.get("name")
            page = int(request.args.get("page", 1))
            limit = int(request.args.get("limit", 20))
            
            # 構建查詢條件
            query = {}
            if project_id:
                query["project_id"] = project_id
            if spec_type:
                query["type"] = spec_type
            if status:
                query["status"] = status
            if created_by:
                query["created_by"] = created_by
            if name_keyword:
                query["name"] = {"$regex": name_keyword, "$options": "i"}
            
            # 執行查詢
            db = get_db()
            skip = (page - 1) * limit
            
            cursor = db.api_specs.find(query, {
                "spec": 0,  # 不返回詳細規範
                "testing.test_cases": 0
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            specs = []
            for spec in cursor:
                spec["_id"] = str(spec["_id"])
                specs.append(spec)
            
            total = db.api_specs.count_documents(query)
            
            result = {
                "specs": specs,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return response_result(content=result, msg="搜索API規範成功")
            
        except Exception as e:
            logger.error(f"內部搜索API規範失敗: {str(e)}")
            return fail_response_result(msg="搜索API規範失敗")


@blp.route("/internal/specs/<spec_id>/info")
class InternalSpecInfoApi(BaseInternalView):
    """內部API規範信息API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, spec_id):
        """獲取API規範基本信息"""
        try:
            flag, result = self.adc.get_api_spec(spec_id, include_full_spec=False)
            
            if flag:
                return response_result(content=result, msg="獲取API規範信息成功")
            else:
                return fail_response_result(msg=f"獲取API規範信息失敗: {result}")
                
        except Exception as e:
            logger.error(f"內部獲取API規範信息失敗: {str(e)}")
            return fail_response_result(msg="獲取API規範信息失敗")


# ==================== 數據統計 ====================

@blp.route("/internal/statistics/overview")
class StatisticsOverviewApi(BaseInternalView):
    """統計概覽API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """獲取統計概覽"""
        try:
            db = get_db()
            
            # 基本統計
            total_specs = db.api_specs.count_documents({})
            total_mocks = db.api_mocks.count_documents({})
            total_analytics = db.api_usage_analytics.count_documents({})
            
            # 按類型統計
            type_pipeline = [
                {"$group": {"_id": "$type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            type_stats = list(db.api_specs.aggregate(type_pipeline))
            
            # 按狀態統計
            status_pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            status_stats = list(db.api_specs.aggregate(status_pipeline))
            
            # 按項目統計
            project_pipeline = [
                {"$group": {"_id": "$project_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            project_stats = list(db.api_specs.aggregate(project_pipeline))
            
            # 最近活動統計 (最近30天)
            from datetime import timedelta
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            recent_specs = db.api_specs.count_documents({
                "created_at": {"$gte": thirty_days_ago}
            })
            recent_mocks = db.api_mocks.count_documents({
                "created_at": {"$gte": thirty_days_ago}
            })
            
            # 發布統計
            published_specs = db.api_specs.count_documents({
                "status": "published"
            })
            
            statistics = {
                "overview": {
                    "total_specs": total_specs,
                    "total_mocks": total_mocks,
                    "total_analytics": total_analytics,
                    "published_specs": published_specs
                },
                "recent_activity": {
                    "new_specs_30d": recent_specs,
                    "new_mocks_30d": recent_mocks
                },
                "by_type": type_stats,
                "by_status": status_stats,
                "by_project": project_stats,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            return response_result(content=statistics, msg="獲取統計概覽成功")
            
        except Exception as e:
            logger.error(f"獲取統計概覽失敗: {str(e)}")
            return fail_response_result(msg="獲取統計概覽失敗")


@blp.route("/internal/statistics/projects/<project_id>")
class ProjectStatisticsApi(BaseInternalView):
    """項目統計API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """獲取項目統計"""
        try:
            db = get_db()
            
            # 項目API規範統計
            total_specs = db.api_specs.count_documents({"project_id": project_id})
            
            # 按類型統計
            type_pipeline = [
                {"$match": {"project_id": project_id}},
                {"$group": {"_id": "$type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            type_stats = list(db.api_specs.aggregate(type_pipeline))
            
            # 按狀態統計
            status_pipeline = [
                {"$match": {"project_id": project_id}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            status_stats = list(db.api_specs.aggregate(status_pipeline))
            
            # 按創建者統計
            creator_pipeline = [
                {"$match": {"project_id": project_id}},
                {"$group": {"_id": "$created_by", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            creator_stats = list(db.api_specs.aggregate(creator_pipeline))
            
            # Mock統計
            mock_pipeline = [
                {
                    "$lookup": {
                        "from": "api_specs",
                        "localField": "api_spec_id",
                        "foreignField": "_id",
                        "as": "spec"
                    }
                },
                {"$match": {"spec.project_id": project_id}},
                {"$count": "total"}
            ]
            mock_result = list(db.api_mocks.aggregate(mock_pipeline))
            total_mocks = mock_result[0]["total"] if mock_result else 0
            
            statistics = {
                "project_id": project_id,
                "total_specs": total_specs,
                "total_mocks": total_mocks,
                "by_type": type_stats,
                "by_status": status_stats,
                "by_creator": creator_stats,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            return response_result(content=statistics, msg="獲取項目統計成功")
            
        except Exception as e:
            logger.error(f"獲取項目統計失敗: {str(e)}")
            return fail_response_result(msg="獲取項目統計失敗")


# ==================== 維護和管理 ====================

@blp.route("/internal/maintenance/cleanup")
class MaintenanceCleanupApi(BaseInternalView):
    """維護清理API"""
    
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """執行清理操作"""
        try:
            db = get_db()
            cleanup_result = {
                "orphaned_mocks": 0,
                "orphaned_analytics": 0,
                "expired_drafts": 0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # 清理孤立的Mock數據
            # 找出不再有對應API規範的Mock記錄
            existing_spec_ids = set(
                doc["_id"] for doc in db.api_specs.find({}, {"_id": 1})
            )
            
            orphaned_mocks = db.api_mocks.find({}, {"api_spec_id": 1})
            orphaned_mock_count = 0
            
            for mock in orphaned_mocks:
                if mock["api_spec_id"] not in existing_spec_ids:
                    db.api_mocks.delete_one({"_id": mock["_id"]})
                    orphaned_mock_count += 1
            
            cleanup_result["orphaned_mocks"] = orphaned_mock_count
            
            # 清理孤立的分析數據
            orphaned_analytics = db.api_usage_analytics.find({}, {"api_spec_id": 1})
            orphaned_analytics_count = 0
            
            for analytics in orphaned_analytics:
                if analytics["api_spec_id"] not in existing_spec_ids:
                    db.api_usage_analytics.delete_one({"_id": analytics["_id"]})
                    orphaned_analytics_count += 1
            
            cleanup_result["orphaned_analytics"] = orphaned_analytics_count
            
            # 清理過期的草稿 (超過90天未更新)
            from datetime import timedelta
            ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
            
            expired_drafts_result = db.api_specs.delete_many({
                "status": "draft",
                "updated_at": {"$lt": ninety_days_ago}
            })
            cleanup_result["expired_drafts"] = expired_drafts_result.deleted_count
            
            return response_result(content=cleanup_result, msg="清理操作完成")
            
        except Exception as e:
            logger.error(f"清理操作失敗: {str(e)}")
            return fail_response_result(msg="清理操作失敗")


@blp.route("/internal/cache/clear")
class CacheClearApi(BaseInternalView):
    """緩存清理API"""
    
    @blp.response(200, RspMsgSchema)
    def post(self):
        """清理緩存"""
        try:
            # 這裡可以添加緩存清理邏輯
            # 例如清理 Redis 中的相關緩存
            
            return response_result(msg="緩存清理完成")
            
        except Exception as e:
            logger.error(f"緩存清理失敗: {str(e)}")
            return fail_response_result(msg="緩存清理失敗")


# ==================== API規範驗證服務 ====================

@blp.route("/internal/validate/spec")
class InternalSpecValidateApi(BaseInternalView):
    """內部規範驗證API"""
    
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """批量驗證API規範"""
        try:
            # 獲取所有已發布的API規範
            db = get_db()
            published_specs = list(db.api_specs.find({
                "status": "published"
            }, {
                "_id": 1,
                "name": 1,
                "type": 1,
                "spec": 1
            }))
            
            validation_results = []
            
            for spec_doc in published_specs:
                try:
                    spec_id = str(spec_doc["_id"])
                    flag, result = self.adc.validate_api_spec(spec_id, strict_mode=True)
                    
                    validation_results.append({
                        "spec_id": spec_id,
                        "name": spec_doc["name"],
                        "type": spec_doc["type"],
                        "is_valid": result.get("is_valid", False) if flag else False,
                        "error_count": len(result.get("errors", [])) if flag else 1,
                        "warning_count": len(result.get("warnings", [])) if flag else 0
                    })
                    
                except Exception as e:
                    validation_results.append({
                        "spec_id": str(spec_doc["_id"]),
                        "name": spec_doc["name"],
                        "type": spec_doc["type"],
                        "is_valid": False,
                        "error_count": 1,
                        "warning_count": 0,
                        "error": str(e)
                    })
            
            # 統計結果
            total_specs = len(validation_results)
            valid_specs = sum(1 for r in validation_results if r["is_valid"])
            invalid_specs = total_specs - valid_specs
            
            summary = {
                "total_specs": total_specs,
                "valid_specs": valid_specs,
                "invalid_specs": invalid_specs,
                "validation_rate": (valid_specs / total_specs * 100) if total_specs > 0 else 0,
                "results": validation_results
            }
            
            return response_result(content=summary, msg="批量驗證完成")
            
        except Exception as e:
            logger.error(f"批量驗證失敗: {str(e)}")
            return fail_response_result(msg="批量驗證失敗")


# ==================== 使用情況報告 ====================

@blp.route("/internal/reports/usage")
class UsageReportApi(BaseInternalView):
    """使用情況報告API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """獲取使用情況報告"""
        try:
            days = int(request.args.get("days", 30))
            db = get_db()
            
            from datetime import timedelta
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # 獲取期間內的所有分析數據
            usage_data = list(db.api_usage_analytics.find({
                "date": {"$gte": start_date.date()}
            }))
            
            # 統計總體使用情況
            total_calls = sum(data["usage_stats"]["total_calls"] for data in usage_data)
            total_errors = sum(
                data["usage_stats"]["total_calls"] * data["usage_stats"]["error_rate"]
                for data in usage_data
            )
            
            # 按API規範分組統計
            spec_usage = {}
            for data in usage_data:
                spec_id = str(data["api_spec_id"])
                if spec_id not in spec_usage:
                    spec_usage[spec_id] = {
                        "total_calls": 0,
                        "total_errors": 0,
                        "endpoints": set()
                    }
                
                spec_usage[spec_id]["total_calls"] += data["usage_stats"]["total_calls"]
                spec_usage[spec_id]["total_errors"] += (
                    data["usage_stats"]["total_calls"] * data["usage_stats"]["error_rate"]
                )
                spec_usage[spec_id]["endpoints"].add(f"{data['method']} {data['endpoint']}")
            
            # 轉換為列表格式
            spec_usage_list = []
            for spec_id, usage in spec_usage.items():
                spec_usage_list.append({
                    "spec_id": spec_id,
                    "total_calls": usage["total_calls"],
                    "total_errors": int(usage["total_errors"]),
                    "error_rate": (usage["total_errors"] / usage["total_calls"]) if usage["total_calls"] > 0 else 0,
                    "unique_endpoints": len(usage["endpoints"])
                })
            
            # 按調用次數排序
            spec_usage_list.sort(key=lambda x: x["total_calls"], reverse=True)
            
            report = {
                "period_days": days,
                "summary": {
                    "total_calls": total_calls,
                    "total_errors": int(total_errors),
                    "overall_error_rate": (total_errors / total_calls) if total_calls > 0 else 0,
                    "active_specs": len(spec_usage_list),
                    "total_unique_endpoints": sum(len(usage["endpoints"]) for usage in spec_usage.values())
                },
                "spec_usage": spec_usage_list[:20],  # 取前20個最活躍的API規範
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return response_result(content=report, msg="生成使用情況報告成功")
            
        except Exception as e:
            logger.error(f"生成使用情況報告失敗: {str(e)}")
            return fail_response_result(msg="生成使用情況報告失敗")