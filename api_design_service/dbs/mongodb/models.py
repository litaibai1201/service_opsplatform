# -*- coding: utf-8 -*-
"""
@文件: models.py
@說明: MongoDB 數據模型 (API Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
import secrets
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from bson import ObjectId
from pymongo.errors import DuplicateKeyError, PyMongoError

from dbs.mongodb import get_db
from loggers import logger


class BaseDocument:
    """MongoDB 文檔基類"""
    
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self.db = get_db()
        self.collection = self.db[collection_name]


class ApiSpecModel(BaseDocument):
    """API規範模型"""
    
    def __init__(self):
        super().__init__("api_specs")
    
    def create_spec(self, project_id: str, name: str, description: str = None,
                   spec_type: str = "rest", spec: Dict = None, version: str = "1.0.0",
                   status: str = "draft", environments: List = None,
                   created_by: str = None) -> Tuple[bool, Any]:
        """創建API規範"""
        try:
            # 默認環境配置
            if environments is None:
                environments = [
                    {
                        "name": "dev",
                        "base_url": "https://dev.api.example.com",
                        "headers": {},
                        "auth_config": {},
                        "variables": {}
                    },
                    {
                        "name": "staging",
                        "base_url": "https://staging.api.example.com",
                        "headers": {},
                        "auth_config": {},
                        "variables": {}
                    },
                    {
                        "name": "prod",
                        "base_url": "https://api.example.com",
                        "headers": {},
                        "auth_config": {},
                        "variables": {}
                    }
                ]
            
            # 默認規範結構
            if spec is None:
                if spec_type == "rest":
                    spec = {
                        "openapi": "3.0.3",
                        "info": {
                            "title": name,
                            "description": description,
                            "version": version
                        },
                        "paths": {}
                    }
                elif spec_type == "graphql":
                    spec = {
                        "schema": "",
                        "types": {},
                        "queries": {},
                        "mutations": {},
                        "subscriptions": {}
                    }
                else:
                    spec = {}
            
            spec_doc = {
                "project_id": project_id,
                "name": name,
                "description": description,
                "type": spec_type,
                "spec": spec,
                "version": version,
                "status": status,
                "environments": environments,
                "testing": {
                    "test_cases": [],
                    "coverage_report": {},
                    "performance_metrics": {},
                    "last_test_run": None
                },
                "documentation": {
                    "examples": [],
                    "guides": [],
                    "changelogs": [],
                    "auto_generated": False
                },
                "collaboration": {
                    "reviewers": [],
                    "approval_status": "pending",
                    "comments": []
                },
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(spec_doc)
            spec_doc["_id"] = str(result.inserted_id)
            
            logger.info(f"API規範創建成功: {name} (ID: {result.inserted_id})")
            return True, spec_doc
            
        except Exception as e:
            logger.error(f"創建API規範失敗: {str(e)}")
            return False, str(e)
    
    def get_spec_by_id(self, spec_id: str) -> Tuple[bool, Any]:
        """根據ID獲取API規範"""
        try:
            if not ObjectId.is_valid(spec_id):
                return False, "無效的API規範ID格式"
            
            spec = self.collection.find_one({"_id": ObjectId(spec_id)})
            if spec:
                spec["_id"] = str(spec["_id"])
                return True, spec
            else:
                return False, "API規範不存在"
                
        except Exception as e:
            logger.error(f"獲取API規範失敗: {str(e)}")
            return False, str(e)
    
    def get_specs_by_project(self, project_id: str, spec_type: str = None,
                            status: str = None, page: int = 1, 
                            limit: int = 20) -> Tuple[bool, Any]:
        """獲取項目的API規範列表"""
        try:
            query = {"project_id": project_id}
            if spec_type:
                query["type"] = spec_type
            if status:
                query["status"] = status
            
            skip = (page - 1) * limit
            
            cursor = self.collection.find(query, {
                "spec": 0,  # 列表不返回詳細規範
                "testing.test_cases": 0
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            specs = []
            for spec in cursor:
                spec["_id"] = str(spec["_id"])
                specs.append(spec)
            
            total = self.collection.count_documents(query)
            
            result = {
                "specs": specs,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取項目API規範列表失敗: {str(e)}")
            return False, str(e)
    
    def update_spec(self, spec_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新API規範"""
        try:
            if not ObjectId.is_valid(spec_id):
                return False, "無效的API規範ID格式"
            
            # 添加更新時間
            updates["updated_at"] = datetime.now(timezone.utc)
            
            result = self.collection.update_one(
                {"_id": ObjectId(spec_id)},
                {"$set": updates}
            )
            
            if result.matched_count == 0:
                return False, "API規範不存在"
            
            # 獲取更新後的文檔
            return self.get_spec_by_id(spec_id)
            
        except Exception as e:
            logger.error(f"更新API規範失敗: {str(e)}")
            return False, str(e)
    
    def delete_spec(self, spec_id: str) -> Tuple[bool, str]:
        """刪除API規範"""
        try:
            if not ObjectId.is_valid(spec_id):
                return False, "無效的API規範ID格式"
            
            result = self.collection.delete_one({"_id": ObjectId(spec_id)})
            
            if result.deleted_count == 0:
                return False, "API規範不存在"
            
            # 同時刪除相關的Mock數據和分析數據
            mock_model = ApiMockModel()
            analytics_model = ApiUsageAnalyticsModel()
            mock_model.delete_by_spec_id(spec_id)
            analytics_model.delete_by_spec_id(spec_id)
            
            logger.info(f"API規範刪除成功: {spec_id}")
            return True, "API規範刪除成功"
            
        except Exception as e:
            logger.error(f"刪除API規範失敗: {str(e)}")
            return False, str(e)
    
    def duplicate_spec(self, spec_id: str, new_name: str, created_by: str) -> Tuple[bool, Any]:
        """複製API規範"""
        try:
            # 獲取原始規範
            flag, original = self.get_spec_by_id(spec_id)
            if not flag:
                return False, original
            
            # 創建副本
            duplicate_data = {
                "project_id": original["project_id"],
                "name": new_name,
                "description": f"複製自: {original['name']}",
                "spec_type": original["type"],
                "spec": original["spec"],
                "version": "1.0.0",  # 重置版本
                "status": "draft",   # 重置狀態
                "environments": original["environments"],
                "created_by": created_by
            }
            
            return self.create_spec(**duplicate_data)
            
        except Exception as e:
            logger.error(f"複製API規範失敗: {str(e)}")
            return False, str(e)
    
    def get_versions(self, spec_id: str) -> Tuple[bool, Any]:
        """獲取API規範版本列表"""
        try:
            if not ObjectId.is_valid(spec_id):
                return False, "無效的API規範ID格式"
            
            # 查找同一項目下同名的不同版本
            spec = self.collection.find_one({"_id": ObjectId(spec_id)})
            if not spec:
                return False, "API規範不存在"
            
            versions = list(self.collection.find({
                "project_id": spec["project_id"],
                "name": spec["name"]
            }, {
                "spec": 0,
                "testing.test_cases": 0
            }).sort("created_at", -1))
            
            for version in versions:
                version["_id"] = str(version["_id"])
            
            return True, {"versions": versions}
            
        except Exception as e:
            logger.error(f"獲取版本列表失敗: {str(e)}")
            return False, str(e)
    
    def create_version(self, spec_id: str, new_version: str, 
                      created_by: str) -> Tuple[bool, Any]:
        """創建新版本"""
        try:
            # 獲取當前規範
            flag, current_spec = self.get_spec_by_id(spec_id)
            if not flag:
                return False, current_spec
            
            # 創建新版本
            new_spec_data = current_spec.copy()
            new_spec_data.pop("_id", None)
            new_spec_data["version"] = new_version
            new_spec_data["status"] = "draft"
            new_spec_data["created_by"] = created_by
            new_spec_data["created_at"] = datetime.now(timezone.utc)
            new_spec_data["updated_at"] = datetime.now(timezone.utc)
            
            result = self.collection.insert_one(new_spec_data)
            new_spec_data["_id"] = str(result.inserted_id)
            
            return True, new_spec_data
            
        except Exception as e:
            logger.error(f"創建新版本失敗: {str(e)}")
            return False, str(e)
    
    def publish_spec(self, spec_id: str) -> Tuple[bool, str]:
        """發布規範"""
        try:
            return self.update_spec(spec_id, {"status": "published"})
            
        except Exception as e:
            logger.error(f"發布規範失敗: {str(e)}")
            return False, str(e)
    
    def deprecate_spec(self, spec_id: str) -> Tuple[bool, str]:
        """廢弃規範"""
        try:
            return self.update_spec(spec_id, {"status": "deprecated"})
            
        except Exception as e:
            logger.error(f"廢弃規範失敗: {str(e)}")
            return False, str(e)


class ApiMockModel(BaseDocument):
    """API Mock模型"""
    
    def __init__(self):
        super().__init__("api_mocks")
    
    def create_mock(self, api_spec_id: str, endpoint_path: str, method: str,
                   mock_data: Dict, rules: Dict = None, 
                   response_scenarios: List = None, created_by: str = None) -> Tuple[bool, Any]:
        """創建Mock數據"""
        try:
            if not ObjectId.is_valid(api_spec_id):
                return False, "無效的API規範ID格式"
            
            if rules is None:
                rules = {}
            
            if response_scenarios is None:
                response_scenarios = [
                    {
                        "name": "success",
                        "condition": {"status_code": 200},
                        "response": mock_data,
                        "delay_ms": 100
                    }
                ]
            
            mock_doc = {
                "api_spec_id": ObjectId(api_spec_id),
                "endpoint_path": endpoint_path,
                "method": method.upper(),
                "mock_data": mock_data,
                "rules": rules,
                "response_scenarios": response_scenarios,
                "is_active": True,
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(mock_doc)
            mock_doc["_id"] = str(result.inserted_id)
            mock_doc["api_spec_id"] = str(mock_doc["api_spec_id"])
            
            logger.info(f"Mock數據創建成功: {endpoint_path} {method}")
            return True, mock_doc
            
        except Exception as e:
            logger.error(f"創建Mock數據失敗: {str(e)}")
            return False, str(e)
    
    def get_mocks_by_spec(self, api_spec_id: str, page: int = 1, 
                         limit: int = 20) -> Tuple[bool, Any]:
        """獲取API規範的Mock列表"""
        try:
            if not ObjectId.is_valid(api_spec_id):
                return False, "無效的API規範ID格式"
            
            skip = (page - 1) * limit
            
            cursor = self.collection.find({
                "api_spec_id": ObjectId(api_spec_id)
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            mocks = []
            for mock in cursor:
                mock["_id"] = str(mock["_id"])
                mock["api_spec_id"] = str(mock["api_spec_id"])
                mocks.append(mock)
            
            total = self.collection.count_documents({
                "api_spec_id": ObjectId(api_spec_id)
            })
            
            result = {
                "mocks": mocks,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取Mock列表失敗: {str(e)}")
            return False, str(e)
    
    def get_mock_by_id(self, mock_id: str) -> Tuple[bool, Any]:
        """根據ID獲取Mock數據"""
        try:
            if not ObjectId.is_valid(mock_id):
                return False, "無效的Mock ID格式"
            
            mock = self.collection.find_one({"_id": ObjectId(mock_id)})
            if mock:
                mock["_id"] = str(mock["_id"])
                mock["api_spec_id"] = str(mock["api_spec_id"])
                return True, mock
            else:
                return False, "Mock數據不存在"
                
        except Exception as e:
            logger.error(f"獲取Mock數據失敗: {str(e)}")
            return False, str(e)
    
    def update_mock(self, mock_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新Mock數據"""
        try:
            if not ObjectId.is_valid(mock_id):
                return False, "無效的Mock ID格式"
            
            result = self.collection.update_one(
                {"_id": ObjectId(mock_id)},
                {"$set": updates}
            )
            
            if result.matched_count == 0:
                return False, "Mock數據不存在"
            
            return self.get_mock_by_id(mock_id)
            
        except Exception as e:
            logger.error(f"更新Mock數據失敗: {str(e)}")
            return False, str(e)
    
    def delete_mock(self, mock_id: str) -> Tuple[bool, str]:
        """刪除Mock數據"""
        try:
            if not ObjectId.is_valid(mock_id):
                return False, "無效的Mock ID格式"
            
            result = self.collection.delete_one({"_id": ObjectId(mock_id)})
            
            if result.deleted_count == 0:
                return False, "Mock數據不存在"
            
            logger.info(f"Mock數據刪除成功: {mock_id}")
            return True, "Mock數據刪除成功"
            
        except Exception as e:
            logger.error(f"刪除Mock數據失敗: {str(e)}")
            return False, str(e)
    
    def activate_mock(self, mock_id: str, is_active: bool = True) -> Tuple[bool, str]:
        """激活/停用Mock數據"""
        try:
            return self.update_mock(mock_id, {"is_active": is_active})
            
        except Exception as e:
            logger.error(f"更新Mock狀態失敗: {str(e)}")
            return False, str(e)
    
    def delete_by_spec_id(self, api_spec_id: str) -> Tuple[bool, str]:
        """刪除指定API規範的所有Mock數據"""
        try:
            if not ObjectId.is_valid(api_spec_id):
                return False, "無效的API規範ID格式"
            
            result = self.collection.delete_many({
                "api_spec_id": ObjectId(api_spec_id)
            })
            
            logger.info(f"刪除API規範Mock數據: {api_spec_id}, 共{result.deleted_count}條記錄")
            return True, f"刪除了{result.deleted_count}條Mock記錄"
            
        except Exception as e:
            logger.error(f"刪除Mock數據失敗: {str(e)}")
            return False, str(e)


class ApiUsageAnalyticsModel(BaseDocument):
    """API使用分析模型"""
    
    def __init__(self):
        super().__init__("api_usage_analytics")
    
    def record_usage(self, api_spec_id: str, endpoint: str, method: str,
                    response_time: float = None, status_code: int = 200) -> Tuple[bool, Any]:
        """記錄API使用數據"""
        try:
            if not ObjectId.is_valid(api_spec_id):
                return False, "無效的API規範ID格式"
            
            today = datetime.now(timezone.utc).date()
            
            # 查找今天的記錄
            existing = self.collection.find_one({
                "api_spec_id": ObjectId(api_spec_id),
                "endpoint": endpoint,
                "method": method.upper(),
                "date": today
            })
            
            if existing:
                # 更新現有記錄
                stats = existing["usage_stats"]
                stats["total_calls"] += 1
                
                if status_code >= 400:
                    error_count = stats.get("error_count", 0) + 1
                    stats["error_rate"] = error_count / stats["total_calls"]
                else:
                    stats["error_rate"] = stats.get("error_count", 0) / stats["total_calls"]
                
                if response_time:
                    current_avg = stats.get("avg_response_time", 0)
                    total_calls = stats["total_calls"]
                    stats["avg_response_time"] = ((current_avg * (total_calls - 1)) + response_time) / total_calls
                
                stats["last_called"] = datetime.now(timezone.utc)
                
                self.collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"usage_stats": stats}}
                )
                
                return True, "使用數據記錄成功"
            else:
                # 創建新記錄
                usage_doc = {
                    "api_spec_id": ObjectId(api_spec_id),
                    "endpoint": endpoint,
                    "method": method.upper(),
                    "usage_stats": {
                        "total_calls": 1,
                        "error_rate": 1.0 if status_code >= 400 else 0.0,
                        "avg_response_time": response_time or 0,
                        "last_called": datetime.now(timezone.utc),
                        "error_count": 1 if status_code >= 400 else 0
                    },
                    "date": today
                }
                
                result = self.collection.insert_one(usage_doc)
                return True, "使用數據記錄成功"
                
        except Exception as e:
            logger.error(f"記錄API使用數據失敗: {str(e)}")
            return False, str(e)
    
    def get_analytics_by_spec(self, api_spec_id: str, days: int = 30) -> Tuple[bool, Any]:
        """獲取API規範的使用分析"""
        try:
            if not ObjectId.is_valid(api_spec_id):
                return False, "無效的API規範ID格式"
            
            from datetime import timedelta
            start_date = datetime.now(timezone.utc).date() - timedelta(days=days)
            
            pipeline = [
                {
                    "$match": {
                        "api_spec_id": ObjectId(api_spec_id),
                        "date": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "endpoint": "$endpoint",
                            "method": "$method"
                        },
                        "total_calls": {"$sum": "$usage_stats.total_calls"},
                        "avg_response_time": {"$avg": "$usage_stats.avg_response_time"},
                        "avg_error_rate": {"$avg": "$usage_stats.error_rate"},
                        "last_called": {"$max": "$usage_stats.last_called"}
                    }
                },
                {
                    "$sort": {"total_calls": -1}
                }
            ]
            
            analytics = list(self.collection.aggregate(pipeline))
            
            # 計算總體統計
            total_calls = sum(item["total_calls"] for item in analytics)
            overall_avg_response_time = sum(item["avg_response_time"] * item["total_calls"] 
                                          for item in analytics) / total_calls if total_calls > 0 else 0
            overall_error_rate = sum(item["avg_error_rate"] * item["total_calls"] 
                                   for item in analytics) / total_calls if total_calls > 0 else 0
            
            result = {
                "period_days": days,
                "overall_stats": {
                    "total_calls": total_calls,
                    "avg_response_time": overall_avg_response_time,
                    "error_rate": overall_error_rate,
                    "unique_endpoints": len(analytics)
                },
                "endpoint_stats": [
                    {
                        "endpoint": item["_id"]["endpoint"],
                        "method": item["_id"]["method"],
                        "total_calls": item["total_calls"],
                        "avg_response_time": item["avg_response_time"],
                        "error_rate": item["avg_error_rate"],
                        "last_called": item["last_called"]
                    }
                    for item in analytics
                ]
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取使用分析失敗: {str(e)}")
            return False, str(e)
    
    def get_performance_analytics(self, api_spec_id: str, days: int = 7) -> Tuple[bool, Any]:
        """獲取性能分析"""
        try:
            if not ObjectId.is_valid(api_spec_id):
                return False, "無效的API規範ID格式"
            
            from datetime import timedelta
            start_date = datetime.now(timezone.utc).date() - timedelta(days=days)
            
            # 按日期統計
            daily_pipeline = [
                {
                    "$match": {
                        "api_spec_id": ObjectId(api_spec_id),
                        "date": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": "$date",
                        "total_calls": {"$sum": "$usage_stats.total_calls"},
                        "avg_response_time": {"$avg": "$usage_stats.avg_response_time"},
                        "error_rate": {"$avg": "$usage_stats.error_rate"}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            
            daily_stats = list(self.collection.aggregate(daily_pipeline))
            
            # 響應時間分布
            response_time_pipeline = [
                {
                    "$match": {
                        "api_spec_id": ObjectId(api_spec_id),
                        "date": {"$gte": start_date}
                    }
                },
                {
                    "$bucket": {
                        "groupBy": "$usage_stats.avg_response_time",
                        "boundaries": [0, 100, 500, 1000, 2000, 5000],
                        "default": "5000+",
                        "output": {
                            "count": {"$sum": 1},
                            "endpoints": {"$push": "$endpoint"}
                        }
                    }
                }
            ]
            
            response_time_distribution = list(self.collection.aggregate(response_time_pipeline))
            
            result = {
                "period_days": days,
                "daily_stats": [
                    {
                        "date": item["_id"].isoformat(),
                        "total_calls": item["total_calls"],
                        "avg_response_time": item["avg_response_time"],
                        "error_rate": item["error_rate"]
                    }
                    for item in daily_stats
                ],
                "response_time_distribution": response_time_distribution
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取性能分析失敗: {str(e)}")
            return False, str(e)
    
    def delete_by_spec_id(self, api_spec_id: str) -> Tuple[bool, str]:
        """刪除指定API規範的所有分析數據"""
        try:
            if not ObjectId.is_valid(api_spec_id):
                return False, "無效的API規範ID格式"
            
            result = self.collection.delete_many({
                "api_spec_id": ObjectId(api_spec_id)
            })
            
            logger.info(f"刪除API規範分析數據: {api_spec_id}, 共{result.deleted_count}條記錄")
            return True, f"刪除了{result.deleted_count}條分析記錄"
            
        except Exception as e:
            logger.error(f"刪除分析數據失敗: {str(e)}")
            return False, str(e)