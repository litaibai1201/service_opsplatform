# -*- coding: utf-8 -*-
"""
@文件: models.py
@說明: MongoDB 數據模型 (Feature Map Service)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from bson import ObjectId
from pymongo.errors import DuplicateKeyError, PyMongoError

from dbs.mongodb import get_db
from loggers import logger
from common.common_tools import CommonTools


class BaseDocument:
    """MongoDB 文檔基類"""
    
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        try:
            self.db = get_db()
            self.collection = self.db[collection_name]
        except RuntimeError:
            # For testing purposes when MongoDB is not initialized
            self.db = None
            self.collection = None


class FeatureMapModel(BaseDocument):
    """功能導圖模型"""
    
    def __init__(self):
        super().__init__("feature_maps")
    
    def create_feature_map(self, project_id: str, name: str, description: str, 
                          map_type: str, created_by: str, mind_map: Dict = None) -> Tuple[Any, bool]:
        """創建功能導圖"""
        try:
            # 檢查名稱是否已存在
            existing = self.collection.find_one({
                "project_id": project_id,
                "name": name
            })
            if existing:
                return "功能導圖名稱已存在", False
            
            # 默認思維導圖結構
            default_mind_map = {
                "root": {
                    "id": str(uuid.uuid4()),
                    "title": name,
                    "description": description,
                    "children": []
                }
            }
            
            # 默認統計數據
            default_metrics = {
                "total_features": 0,
                "completed_features": 0,
                "total_estimated_hours": 0,
                "total_actual_hours": 0,
                "progress_percentage": 0,
                "velocity": 0
            }
            
            # 默認集成配置
            default_integration = {
                "jira_project_key": "",
                "github_repo": "",
                "sync_enabled": False,
                "last_sync": None
            }
            
            feature_map_doc = {
                "_id": ObjectId(),
                "project_id": project_id,
                "name": name,
                "description": description,
                "type": map_type,
                "mind_map": mind_map or default_mind_map,
                "metrics": default_metrics,
                "integration": default_integration,
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(feature_map_doc)
            feature_map_doc["_id"] = str(result.inserted_id)
            
            logger.info(f"創建功能導圖成功: {name}")
            return feature_map_doc, True
            
        except Exception as e:
            logger.error(f"創建功能導圖失敗: {str(e)}")
            return str(e), False
    
    def get_project_feature_maps(self, project_id: str, map_type: str = None, 
                                page: int = 1, limit: int = 20) -> Tuple[Any, bool]:
        """獲取項目功能導圖列表"""
        try:
            query = {"project_id": project_id}
            if map_type:
                query["type"] = map_type
            
            skip = (page - 1) * limit
            
            feature_maps = list(self.collection.find(query)
                               .sort("created_at", -1)
                               .skip(skip)
                               .limit(limit))
            
            total = self.collection.count_documents(query)
            
            # 轉換ObjectId為字符串
            for fm in feature_maps:
                fm["_id"] = str(fm["_id"])
                fm["created_at"] = fm["created_at"].isoformat()
                fm["updated_at"] = fm["updated_at"].isoformat()
            
            result = {
                "feature_maps": feature_maps,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return result, True
            
        except Exception as e:
            logger.error(f"獲取功能導圖列表失敗: {str(e)}")
            return str(e), False
    
    def get_feature_map(self, map_id: str) -> Tuple[Any, bool]:
        """獲取功能導圖詳情"""
        try:
            feature_map = self.collection.find_one({"_id": ObjectId(map_id)})
            
            if not feature_map:
                return "功能導圖不存在", False
            
            # 轉換數據格式
            feature_map["_id"] = str(feature_map["_id"])
            feature_map["created_at"] = feature_map["created_at"].isoformat()
            feature_map["updated_at"] = feature_map["updated_at"].isoformat()
            
            return feature_map, True
            
        except Exception as e:
            logger.error(f"獲取功能導圖詳情失敗: {str(e)}")
            return str(e), False
    
    def update_feature_map(self, map_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新功能導圖"""
        try:
            # 移除不允許更新的字段
            forbidden_fields = ["_id", "created_by", "created_at"]
            update_data = {k: v for k, v in update_data.items() if k not in forbidden_fields}
            
            if not update_data:
                return "沒有可更新的字段", False
            
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            result = self.collection.update_one(
                {"_id": ObjectId(map_id)},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                return "功能導圖不存在", False
            
            # 獲取更新後的數據
            updated_map, success = self.get_feature_map(map_id)
            if success:
                return updated_map, True
            return "獲取更新後數據失敗", False
            
        except Exception as e:
            logger.error(f"更新功能導圖失敗: {str(e)}")
            return str(e), False
    
    def delete_feature_map(self, map_id: str) -> Tuple[Any, bool]:
        """刪除功能導圖"""
        try:
            # 檢查是否存在
            feature_map = self.collection.find_one({"_id": ObjectId(map_id)})
            if not feature_map:
                return "功能導圖不存在", False
            
            # 刪除相關依賴關係
            dependency_model = FeatureDependencyModel()
            dependency_model.delete_all_by_map_id(map_id)
            
            # 刪除功能導圖
            self.collection.delete_one({"_id": ObjectId(map_id)})
            
            logger.info(f"刪除功能導圖成功: {map_id}")
            return {"deleted_id": map_id}, True
            
        except Exception as e:
            logger.error(f"刪除功能導圖失敗: {str(e)}")
            return str(e), False
    
    def duplicate_feature_map(self, map_id: str, new_name: str, created_by: str) -> Tuple[Any, bool]:
        """複製功能導圖"""
        try:
            # 獲取原始功能導圖
            original_map, success = self.get_feature_map(map_id)
            if not success:
                return original_map, False
            
            # 創建新的功能導圖
            new_map_data = {
                "project_id": original_map["project_id"],
                "name": new_name,
                "description": f"複製自: {original_map['name']}",
                "type": original_map["type"],
                "mind_map": original_map["mind_map"],
                "integration": {
                    "jira_project_key": "",
                    "github_repo": "",
                    "sync_enabled": False,
                    "last_sync": None
                }
            }
            
            result, flag = self.create_feature_map(
                new_map_data["project_id"],
                new_map_data["name"],
                new_map_data["description"],
                new_map_data["type"],
                created_by,
                new_map_data["mind_map"]
            )
            
            return result, flag
            
        except Exception as e:
            logger.error(f"複製功能導圖失敗: {str(e)}")
            return str(e), False
    
    def update_mind_map(self, map_id: str, mind_map: Dict) -> Tuple[Any, bool]:
        """更新思維導圖"""
        try:
            # 重新計算統計數據
            metrics = self._calculate_metrics(mind_map)
            
            result = self.collection.update_one(
                {"_id": ObjectId(map_id)},
                {
                    "$set": {
                        "mind_map": mind_map,
                        "metrics": metrics,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                return "功能導圖不存在", False
            
            return {"message": "思維導圖更新成功", "metrics": metrics}, True
            
        except Exception as e:
            logger.error(f"更新思維導圖失敗: {str(e)}")
            return str(e), False
    
    def add_node(self, map_id: str, parent_node_id: str, node_data: Dict) -> Tuple[Any, bool]:
        """添加節點"""
        try:
            feature_map, success = self.get_feature_map(map_id)
            if not success:
                return feature_map, False
            
            # 生成新節點ID
            new_node_id = str(uuid.uuid4())
            node_data["id"] = new_node_id
            node_data["children"] = node_data.get("children", [])
            
            # 在思維導圖中添加節點
            mind_map = feature_map["mind_map"]
            if self._add_node_to_tree(mind_map["root"], parent_node_id, node_data):
                # 更新數據庫
                result = self.update_mind_map(map_id, mind_map)
                if result[1]:
                    return {"node_id": new_node_id, "node_data": node_data}, True
                return result
            else:
                return "父節點不存在", False
            
        except Exception as e:
            logger.error(f"添加節點失敗: {str(e)}")
            return str(e), False
    
    def update_node(self, map_id: str, node_id: str, node_data: Dict) -> Tuple[Any, bool]:
        """更新節點"""
        try:
            feature_map, success = self.get_feature_map(map_id)
            if not success:
                return feature_map, False
            
            mind_map = feature_map["mind_map"]
            if self._update_node_in_tree(mind_map["root"], node_id, node_data):
                result = self.update_mind_map(map_id, mind_map)
                return result
            else:
                return "節點不存在", False
            
        except Exception as e:
            logger.error(f"更新節點失敗: {str(e)}")
            return str(e), False
    
    def delete_node(self, map_id: str, node_id: str) -> Tuple[Any, bool]:
        """刪除節點"""
        try:
            feature_map, success = self.get_feature_map(map_id)
            if not success:
                return feature_map, False
            
            mind_map = feature_map["mind_map"]
            if self._delete_node_from_tree(mind_map["root"], node_id):
                result = self.update_mind_map(map_id, mind_map)
                return result
            else:
                return "節點不存在", False
            
        except Exception as e:
            logger.error(f"刪除節點失敗: {str(e)}")
            return str(e), False
    
    def move_node(self, map_id: str, node_id: str, new_parent_id: str, position: int = -1) -> Tuple[Any, bool]:
        """移動節點"""
        try:
            feature_map, success = self.get_feature_map(map_id)
            if not success:
                return feature_map, False
            
            mind_map = feature_map["mind_map"]
            
            # 先取出節點
            node_data = self._extract_node_from_tree(mind_map["root"], node_id)
            if not node_data:
                return "節點不存在", False
            
            # 插入到新位置
            if self._add_node_to_tree(mind_map["root"], new_parent_id, node_data, position):
                result = self.update_mind_map(map_id, mind_map)
                return result
            else:
                return "新父節點不存在", False
            
        except Exception as e:
            logger.error(f"移動節點失敗: {str(e)}")
            return str(e), False
    
    def _calculate_metrics(self, mind_map: Dict) -> Dict:
        """計算統計數據"""
        metrics = {
            "total_features": 0,
            "completed_features": 0,
            "total_estimated_hours": 0,
            "total_actual_hours": 0,
            "progress_percentage": 0,
            "velocity": 0
        }
        
        def count_nodes(node):
            if node.get("type") in ["epic", "feature", "story", "task"]:
                metrics["total_features"] += 1
                if node.get("status") == "completed":
                    metrics["completed_features"] += 1
                metrics["total_estimated_hours"] += node.get("estimated_hours", 0)
                metrics["total_actual_hours"] += node.get("actual_hours", 0)
            
            for child in node.get("children", []):
                count_nodes(child)
        
        count_nodes(mind_map["root"])
        
        if metrics["total_features"] > 0:
            metrics["progress_percentage"] = (metrics["completed_features"] / metrics["total_features"]) * 100
        
        return metrics
    
    def _add_node_to_tree(self, root: Dict, parent_id: str, node_data: Dict, position: int = -1) -> bool:
        """在樹中添加節點"""
        if root["id"] == parent_id:
            if position == -1:
                root["children"].append(node_data)
            else:
                root["children"].insert(position, node_data)
            return True
        
        for child in root.get("children", []):
            if self._add_node_to_tree(child, parent_id, node_data, position):
                return True
        
        return False
    
    def _update_node_in_tree(self, root: Dict, node_id: str, node_data: Dict) -> bool:
        """在樹中更新節點"""
        if root["id"] == node_id:
            # 保留ID和children
            node_data["id"] = root["id"]
            node_data["children"] = root.get("children", [])
            root.update(node_data)
            return True
        
        for child in root.get("children", []):
            if self._update_node_in_tree(child, node_id, node_data):
                return True
        
        return False
    
    def _delete_node_from_tree(self, root: Dict, node_id: str) -> bool:
        """從樹中刪除節點"""
        children = root.get("children", [])
        for i, child in enumerate(children):
            if child["id"] == node_id:
                children.pop(i)
                return True
            if self._delete_node_from_tree(child, node_id):
                return True
        
        return False
    
    def _extract_node_from_tree(self, root: Dict, node_id: str) -> Optional[Dict]:
        """從樹中提取節點"""
        children = root.get("children", [])
        for i, child in enumerate(children):
            if child["id"] == node_id:
                return children.pop(i)
            extracted = self._extract_node_from_tree(child, node_id)
            if extracted:
                return extracted
        
        return None


class FeatureDependencyModel(BaseDocument):
    """功能依賴模型"""
    
    def __init__(self):
        super().__init__("feature_dependencies")
    
    def create_dependency(self, feature_map_id: str, source_feature_id: str, 
                         target_feature_id: str, dependency_type: str, 
                         description: str = "") -> Tuple[Any, bool]:
        """創建依賴關係"""
        try:
            # 檢查是否已存在
            existing = self.collection.find_one({
                "feature_map_id": feature_map_id,
                "source_feature_id": source_feature_id,
                "target_feature_id": target_feature_id
            })
            if existing:
                return "依賴關係已存在", False
            
            dependency_doc = {
                "_id": ObjectId(),
                "feature_map_id": feature_map_id,
                "source_feature_id": source_feature_id,
                "target_feature_id": target_feature_id,
                "dependency_type": dependency_type,
                "description": description,
                "created_at": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(dependency_doc)
            dependency_doc["_id"] = str(result.inserted_id)
            dependency_doc["created_at"] = dependency_doc["created_at"].isoformat()
            
            return dependency_doc, True
            
        except Exception as e:
            logger.error(f"創建依賴關係失敗: {str(e)}")
            return str(e), False
    
    def get_dependencies(self, feature_map_id: str) -> Tuple[Any, bool]:
        """獲取依賴關係列表"""
        try:
            dependencies = list(self.collection.find({"feature_map_id": feature_map_id}))
            
            for dep in dependencies:
                dep["_id"] = str(dep["_id"])
                dep["created_at"] = dep["created_at"].isoformat()
            
            return dependencies, True
            
        except Exception as e:
            logger.error(f"獲取依賴關係失敗: {str(e)}")
            return str(e), False
    
    def delete_dependency(self, dependency_id: str) -> Tuple[Any, bool]:
        """刪除依賴關係"""
        try:
            result = self.collection.delete_one({"_id": ObjectId(dependency_id)})
            
            if result.deleted_count == 0:
                return "依賴關係不存在", False
            
            return {"deleted_id": dependency_id}, True
            
        except Exception as e:
            logger.error(f"刪除依賴關係失敗: {str(e)}")
            return str(e), False
    
    def delete_all_by_map_id(self, feature_map_id: str) -> Tuple[Any, bool]:
        """刪除功能導圖的所有依賴關係"""
        try:
            result = self.collection.delete_many({"feature_map_id": feature_map_id})
            return {"deleted_count": result.deleted_count}, True
            
        except Exception as e:
            logger.error(f"刪除依賴關係失敗: {str(e)}")
            return str(e), False


class FeatureHistoryModel(BaseDocument):
    """功能歷史模型"""
    
    def __init__(self):
        super().__init__("feature_history")
    
    def add_history(self, feature_map_id: str, feature_id: str, action: str, 
                   changes: Dict, user_id: str) -> Tuple[Any, bool]:
        """添加歷史記錄"""
        try:
            history_doc = {
                "_id": ObjectId(),
                "feature_map_id": feature_map_id,
                "feature_id": feature_id,
                "action": action,
                "changes": changes,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(history_doc)
            return {"history_id": str(result.inserted_id)}, True
            
        except Exception as e:
            logger.error(f"添加歷史記錄失敗: {str(e)}")
            return str(e), False
    
    def get_history(self, feature_map_id: str, feature_id: str = None, 
                   page: int = 1, limit: int = 50) -> Tuple[Any, bool]:
        """獲取歷史記錄"""
        try:
            query = {"feature_map_id": feature_map_id}
            if feature_id:
                query["feature_id"] = feature_id
            
            skip = (page - 1) * limit
            
            history = list(self.collection.find(query)
                          .sort("timestamp", -1)
                          .skip(skip)
                          .limit(limit))
            
            total = self.collection.count_documents(query)
            
            for record in history:
                record["_id"] = str(record["_id"])
                record["timestamp"] = record["timestamp"].isoformat()
            
            result = {
                "history": history,
                "total": total,
                "page": page,
                "limit": limit
            }
            
            return result, True
            
        except Exception as e:
            logger.error(f"獲取歷史記錄失敗: {str(e)}")
            return str(e), False