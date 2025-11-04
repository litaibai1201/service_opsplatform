# -*- coding: utf-8 -*-
"""
@文件: internal_api.py
@說明: 內部API (Flow Diagram Service)
@時間: 2025-01-09
@作者: LiDong
"""

import psutil
from datetime import datetime, timezone
from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint

from common.common_method import fail_response_result, response_result
from controllers.flow_diagram_controller import flow_diagram_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from dbs.mongodb import get_db
from loggers import logger


blp = Blueprint("internal_api", __name__)


class BaseInternalView(MethodView):
    """內部API基類"""
    
    def __init__(self):
        super().__init__()
        self.fdc = flow_diagram_controller


# ==================== 健康檢查和監控 ====================

@blp.route("/internal/health")
class HealthCheckApi(BaseInternalView):
    """健康檢查API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """健康檢查"""
        try:
            health_status = {
                "service": "flow_diagram_service",
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
                if self.fdc is not None:
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
                "service": "flow_diagram_service",
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
            flow_diagrams_count = db.flow_diagrams.count_documents({})
            simulation_history_count = db.flow_simulation_history.count_documents({})
            
            # 獲取數據庫大小信息
            stats = db.command("dbStats")
            
            return {
                "collections": {
                    "flow_diagrams": {
                        "count": flow_diagrams_count,
                        "indexes": len(db.flow_diagrams.list_indexes())
                    },
                    "flow_simulation_history": {
                        "count": simulation_history_count,
                        "indexes": len(db.flow_simulation_history.list_indexes())
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
                "controller_initialized": self.fdc is not None,
                "supported_diagram_types": [
                    "business_process", "system_flow", "user_journey", 
                    "workflow", "decision_tree"
                ],
                "supported_node_types": [
                    "start", "process", "decision", "end", 
                    "parallel", "timer", "gateway"
                ],
                "supported_export_formats": [
                    "json", "xml", "png", "svg", "pdf"
                ]
            }
            
        except Exception as e:
            logger.error(f"獲取服務統計失敗: {str(e)}")
            return {"error": str(e)}


# ==================== 內部數據查詢 ====================

@blp.route("/internal/diagrams/search")
class InternalDiagramSearchApi(BaseInternalView):
    """內部流程圖搜索API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """搜索流程圖"""
        try:
            # 從查詢參數獲取搜索條件
            project_id = request.args.get("project_id")
            diagram_type = request.args.get("type")
            created_by = request.args.get("created_by")
            name_keyword = request.args.get("name")
            page = int(request.args.get("page", 1))
            limit = int(request.args.get("limit", 20))
            
            # 構建查詢條件
            query = {}
            if project_id:
                query["project_id"] = project_id
            if diagram_type:
                query["type"] = diagram_type
            if created_by:
                query["created_by"] = created_by
            if name_keyword:
                query["name"] = {"$regex": name_keyword, "$options": "i"}
            
            # 執行查詢
            db = get_db()
            skip = (page - 1) * limit
            
            cursor = db.flow_diagrams.find(query, {
                "flow_data": 0,  # 不返回詳細數據
                "simulation_results": 0
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            diagrams = []
            for diagram in cursor:
                diagram["_id"] = str(diagram["_id"])
                diagrams.append(diagram)
            
            total = db.flow_diagrams.count_documents(query)
            
            result = {
                "diagrams": diagrams,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return response_result(content=result, msg="搜索流程圖成功")
            
        except Exception as e:
            logger.error(f"內部搜索流程圖失敗: {str(e)}")
            return fail_response_result(msg="搜索流程圖失敗")


@blp.route("/internal/diagrams/<diagram_id>/info")
class InternalDiagramInfoApi(BaseInternalView):
    """內部流程圖信息API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """獲取流程圖基本信息"""
        try:
            flag, result = self.fdc.get_flow_diagram(diagram_id, include_full_data=False)
            
            if flag:
                return response_result(content=result, msg="獲取流程圖信息成功")
            else:
                return fail_response_result(msg=f"獲取流程圖信息失敗: {result}")
                
        except Exception as e:
            logger.error(f"內部獲取流程圖信息失敗: {str(e)}")
            return fail_response_result(msg="獲取流程圖信息失敗")


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
            total_diagrams = db.flow_diagrams.count_documents({})
            total_simulations = db.flow_simulation_history.count_documents({})
            
            # 按類型統計
            type_pipeline = [
                {"$group": {"_id": "$type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            type_stats = list(db.flow_diagrams.aggregate(type_pipeline))
            
            # 按項目統計
            project_pipeline = [
                {"$group": {"_id": "$project_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            project_stats = list(db.flow_diagrams.aggregate(project_pipeline))
            
            # 最近活動統計 (最近30天)
            from datetime import timedelta
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            recent_diagrams = db.flow_diagrams.count_documents({
                "created_at": {"$gte": thirty_days_ago}
            })
            recent_simulations = db.flow_simulation_history.count_documents({
                "created_at": {"$gte": thirty_days_ago}
            })
            
            # 分享統計
            shared_diagrams = db.flow_diagrams.count_documents({
                "sharing.is_public": True
            })
            
            statistics = {
                "overview": {
                    "total_diagrams": total_diagrams,
                    "total_simulations": total_simulations,
                    "shared_diagrams": shared_diagrams
                },
                "recent_activity": {
                    "new_diagrams_30d": recent_diagrams,
                    "new_simulations_30d": recent_simulations
                },
                "by_type": type_stats,
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
            
            # 項目流程圖統計
            total_diagrams = db.flow_diagrams.count_documents({"project_id": project_id})
            
            # 按類型統計
            type_pipeline = [
                {"$match": {"project_id": project_id}},
                {"$group": {"_id": "$type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            type_stats = list(db.flow_diagrams.aggregate(type_pipeline))
            
            # 按創建者統計
            creator_pipeline = [
                {"$match": {"project_id": project_id}},
                {"$group": {"_id": "$created_by", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            creator_stats = list(db.flow_diagrams.aggregate(creator_pipeline))
            
            # 模擬統計
            simulation_pipeline = [
                {
                    "$lookup": {
                        "from": "flow_diagrams",
                        "localField": "flow_diagram_id",
                        "foreignField": "_id",
                        "as": "diagram"
                    }
                },
                {"$match": {"diagram.project_id": project_id}},
                {"$count": "total"}
            ]
            simulation_result = list(db.flow_simulation_history.aggregate(simulation_pipeline))
            total_simulations = simulation_result[0]["total"] if simulation_result else 0
            
            statistics = {
                "project_id": project_id,
                "total_diagrams": total_diagrams,
                "total_simulations": total_simulations,
                "by_type": type_stats,
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
                "orphaned_simulations": 0,
                "expired_shares": 0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # 清理孤立的模擬記錄
            # 找出不再有對應流程圖的模擬記錄
            existing_diagram_ids = set(
                str(doc["_id"]) for doc in db.flow_diagrams.find({}, {"_id": 1})
            )
            
            orphaned_simulations = db.flow_simulation_history.find({}, {"flow_diagram_id": 1})
            orphaned_count = 0
            
            for sim in orphaned_simulations:
                if str(sim["flow_diagram_id"]) not in existing_diagram_ids:
                    db.flow_simulation_history.delete_one({"_id": sim["_id"]})
                    orphaned_count += 1
            
            cleanup_result["orphaned_simulations"] = orphaned_count
            
            # 清理過期的分享令牌 (這裡假設90天後過期)
            from datetime import timedelta
            ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
            
            expired_shares_result = db.flow_diagrams.update_many(
                {
                    "sharing.is_public": True,
                    "created_at": {"$lt": ninety_days_ago}
                },
                {
                    "$set": {
                        "sharing.is_public": False,
                        "sharing.share_token": None
                    }
                }
            )
            cleanup_result["expired_shares"] = expired_shares_result.modified_count
            
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