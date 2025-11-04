# -*- coding: utf-8 -*-
"""
@文件: models.py
@說明: MongoDB 數據模型 (Flow Diagram Service)
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


class FlowDiagramModel(BaseDocument):
    """流程圖模型"""
    
    def __init__(self):
        super().__init__("flow_diagrams")
    
    def create_diagram(self, project_id: str, name: str, description: str = None, 
                      diagram_type: str = "business_process", flow_data: Dict = None, 
                      validation_rules: Dict = None, created_by: str = None) -> Tuple[bool, Any]:
        """創建流程圖"""
        try:
            # 默認流程數據結構
            if flow_data is None:
                flow_data = {"nodes": [], "edges": []}
            
            # 默認驗證規則
            if validation_rules is None:
                validation_rules = {
                    "required_nodes": ["start", "end"],
                    "forbidden_loops": False,
                    "max_complexity": 100,
                    "custom_rules": []
                }
            
            diagram_doc = {
                "project_id": project_id,
                "name": name,
                "description": description,
                "type": diagram_type,
                "flow_data": flow_data,
                "validation_rules": validation_rules,
                "simulation_results": {
                    "avg_execution_time": 0,
                    "bottlenecks": [],
                    "optimization_suggestions": [],
                    "performance_metrics": {}
                },
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "sharing": {
                    "is_public": False,
                    "share_token": None
                }
            }
            
            result = self.collection.insert_one(diagram_doc)
            diagram_doc["_id"] = str(result.inserted_id)
            
            logger.info(f"流程圖創建成功: {name} (ID: {result.inserted_id})")
            return True, diagram_doc
            
        except Exception as e:
            logger.error(f"創建流程圖失敗: {str(e)}")
            return False, str(e)
    
    def get_diagram_by_id(self, diagram_id: str) -> Tuple[bool, Any]:
        """根據ID獲取流程圖"""
        try:
            if not ObjectId.is_valid(diagram_id):
                return False, "無效的流程圖ID格式"
            
            diagram = self.collection.find_one({"_id": ObjectId(diagram_id)})
            if diagram:
                diagram["_id"] = str(diagram["_id"])
                return True, diagram
            else:
                return False, "流程圖不存在"
                
        except Exception as e:
            logger.error(f"獲取流程圖失敗: {str(e)}")
            return False, str(e)
    
    def get_diagrams_by_project(self, project_id: str, diagram_type: str = None, 
                               page: int = 1, limit: int = 20) -> Tuple[bool, Any]:
        """獲取項目的流程圖列表"""
        try:
            query = {"project_id": project_id}
            if diagram_type:
                query["type"] = diagram_type
            
            skip = (page - 1) * limit
            
            cursor = self.collection.find(query, {
                "flow_data": 0,  # 列表不返回詳細數據
                "simulation_results": 0
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            diagrams = []
            for diagram in cursor:
                diagram["_id"] = str(diagram["_id"])
                diagrams.append(diagram)
            
            total = self.collection.count_documents(query)
            
            result = {
                "diagrams": diagrams,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取項目流程圖列表失敗: {str(e)}")
            return False, str(e)
    
    def update_diagram(self, diagram_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新流程圖"""
        try:
            if not ObjectId.is_valid(diagram_id):
                return False, "無效的流程圖ID格式"
            
            # 添加更新時間
            updates["updated_at"] = datetime.now(timezone.utc)
            
            result = self.collection.update_one(
                {"_id": ObjectId(diagram_id)},
                {"$set": updates}
            )
            
            if result.matched_count == 0:
                return False, "流程圖不存在"
            
            # 獲取更新後的文檔
            return self.get_diagram_by_id(diagram_id)
            
        except Exception as e:
            logger.error(f"更新流程圖失敗: {str(e)}")
            return False, str(e)
    
    def delete_diagram(self, diagram_id: str) -> Tuple[bool, str]:
        """刪除流程圖"""
        try:
            if not ObjectId.is_valid(diagram_id):
                return False, "無效的流程圖ID格式"
            
            result = self.collection.delete_one({"_id": ObjectId(diagram_id)})
            
            if result.deleted_count == 0:
                return False, "流程圖不存在"
            
            # 同時刪除相關的模擬歷史
            simulation_model = FlowSimulationHistoryModel()
            simulation_model.delete_by_diagram_id(diagram_id)
            
            logger.info(f"流程圖刪除成功: {diagram_id}")
            return True, "流程圖刪除成功"
            
        except Exception as e:
            logger.error(f"刪除流程圖失敗: {str(e)}")
            return False, str(e)
    
    def duplicate_diagram(self, diagram_id: str, new_name: str, created_by: str) -> Tuple[bool, Any]:
        """複製流程圖"""
        try:
            # 獲取原始流程圖
            flag, original = self.get_diagram_by_id(diagram_id)
            if not flag:
                return False, original
            
            # 創建副本
            duplicate_data = {
                "project_id": original["project_id"],
                "name": new_name,
                "description": f"複製自: {original['name']}",
                "type": original["type"],
                "flow_data": original["flow_data"],
                "validation_rules": original["validation_rules"],
                "created_by": created_by
            }
            
            return self.create_diagram(**duplicate_data)
            
        except Exception as e:
            logger.error(f"複製流程圖失敗: {str(e)}")
            return False, str(e)
    
    def generate_share_token(self, diagram_id: str) -> Tuple[bool, Any]:
        """生成分享令牌"""
        try:
            if not ObjectId.is_valid(diagram_id):
                return False, "無效的流程圖ID格式"
            
            share_token = secrets.token_urlsafe(32)
            
            result = self.collection.update_one(
                {"_id": ObjectId(diagram_id)},
                {
                    "$set": {
                        "sharing.share_token": share_token,
                        "sharing.is_public": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                return False, "流程圖不存在"
            
            return True, {"share_token": share_token}
            
        except Exception as e:
            logger.error(f"生成分享令牌失敗: {str(e)}")
            return False, str(e)
    
    def get_diagram_by_share_token(self, share_token: str) -> Tuple[bool, Any]:
        """通過分享令牌獲取流程圖"""
        try:
            diagram = self.collection.find_one({
                "sharing.share_token": share_token,
                "sharing.is_public": True
            })
            
            if diagram:
                diagram["_id"] = str(diagram["_id"])
                return True, diagram
            else:
                return False, "分享鏈接無效或已過期"
                
        except Exception as e:
            logger.error(f"通過分享令牌獲取流程圖失敗: {str(e)}")
            return False, str(e)
    
    def update_simulation_results(self, diagram_id: str, simulation_results: Dict) -> Tuple[bool, str]:
        """更新模擬結果"""
        try:
            if not ObjectId.is_valid(diagram_id):
                return False, "無效的流程圖ID格式"
            
            result = self.collection.update_one(
                {"_id": ObjectId(diagram_id)},
                {
                    "$set": {
                        "simulation_results": simulation_results,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                return False, "流程圖不存在"
            
            return True, "模擬結果更新成功"
            
        except Exception as e:
            logger.error(f"更新模擬結果失敗: {str(e)}")
            return False, str(e)


class FlowSimulationHistoryModel(BaseDocument):
    """流程模擬歷史模型"""
    
    def __init__(self):
        super().__init__("flow_simulation_history")
    
    def create_simulation_record(self, flow_diagram_id: str, simulation_config: Dict, 
                               results: Dict, created_by: str) -> Tuple[bool, Any]:
        """創建模擬記錄"""
        try:
            if not ObjectId.is_valid(flow_diagram_id):
                return False, "無效的流程圖ID格式"
            
            simulation_doc = {
                "flow_diagram_id": ObjectId(flow_diagram_id),
                "simulation_config": simulation_config,
                "results": results,
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(simulation_doc)
            simulation_doc["_id"] = str(result.inserted_id)
            simulation_doc["flow_diagram_id"] = str(simulation_doc["flow_diagram_id"])
            
            logger.info(f"模擬記錄創建成功: {result.inserted_id}")
            return True, simulation_doc
            
        except Exception as e:
            logger.error(f"創建模擬記錄失敗: {str(e)}")
            return False, str(e)
    
    def get_simulation_history(self, flow_diagram_id: str, page: int = 1, 
                             limit: int = 20) -> Tuple[bool, Any]:
        """獲取模擬歷史"""
        try:
            if not ObjectId.is_valid(flow_diagram_id):
                return False, "無效的流程圖ID格式"
            
            skip = (page - 1) * limit
            
            cursor = self.collection.find({
                "flow_diagram_id": ObjectId(flow_diagram_id)
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            simulations = []
            for simulation in cursor:
                simulation["_id"] = str(simulation["_id"])
                simulation["flow_diagram_id"] = str(simulation["flow_diagram_id"])
                simulations.append(simulation)
            
            total = self.collection.count_documents({
                "flow_diagram_id": ObjectId(flow_diagram_id)
            })
            
            result = {
                "simulations": simulations,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取模擬歷史失敗: {str(e)}")
            return False, str(e)
    
    def delete_by_diagram_id(self, flow_diagram_id: str) -> Tuple[bool, str]:
        """刪除流程圖的所有模擬歷史"""
        try:
            if not ObjectId.is_valid(flow_diagram_id):
                return False, "無效的流程圖ID格式"
            
            result = self.collection.delete_many({
                "flow_diagram_id": ObjectId(flow_diagram_id)
            })
            
            logger.info(f"刪除流程圖模擬歷史: {flow_diagram_id}, 共{result.deleted_count}條記錄")
            return True, f"刪除了{result.deleted_count}條模擬歷史記錄"
            
        except Exception as e:
            logger.error(f"刪除模擬歷史失敗: {str(e)}")
            return False, str(e)