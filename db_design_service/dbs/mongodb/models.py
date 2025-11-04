# -*- coding: utf-8 -*-
"""
@文件: models.py
@說明: MongoDB 數據模型 (Database Design Service)
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
from common.common_tools import TryExcept


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


class DatabaseDesignModel(BaseDocument):
    """數據庫設計模型"""
    
    def __init__(self):
        super().__init__("database_designs")
    
    def create_design(self, project_id: str, name: str, description: str = None,
                     db_type: str = "mysql", version: str = "1.0.0",
                     schemas: List = None, relationships: List = None,
                     created_by: str = None) -> Tuple[bool, Any]:
        """創建數據庫設計"""
        try:
            # 默認架構結構
            if schemas is None:
                schemas = [
                    {
                        "name": "default",
                        "tables": [],
                        "views": [],
                        "procedures": [],
                        "functions": []
                    }
                ]
            
            if relationships is None:
                relationships = []
            
            design_doc = {
                "project_id": project_id,
                "name": name,
                "description": description,
                "db_type": db_type,
                "version": version,
                "schemas": schemas,
                "relationships": relationships,
                "optimization": {
                    "performance_analysis": {},
                    "index_suggestions": [],
                    "normalization_level": "3NF",
                    "query_optimization": []
                },
                "data_dictionary": {
                    "business_terms": {},
                    "data_lineage": {},
                    "privacy_classifications": {}
                },
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(design_doc)
            design_doc["_id"] = str(result.inserted_id)
            
            logger.info(f"數據庫設計創建成功: {name} (ID: {result.inserted_id})")
            return True, design_doc
            
        except Exception as e:
            logger.error(f"創建數據庫設計失敗: {str(e)}")
            return False, str(e)
    
    def get_design_by_id(self, design_id: str) -> Tuple[bool, Any]:
        """根據ID獲取數據庫設計"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            design = self.collection.find_one({"_id": ObjectId(design_id)})
            if design:
                design["_id"] = str(design["_id"])
                return True, design
            else:
                return False, "數據庫設計不存在"
                
        except Exception as e:
            logger.error(f"獲取數據庫設計失敗: {str(e)}")
            return False, str(e)
    
    def get_designs_by_project(self, project_id: str, db_type: str = None,
                              page: int = 1, limit: int = 20) -> Tuple[bool, Any]:
        """獲取項目的數據庫設計列表"""
        try:
            query = {"project_id": project_id}
            if db_type:
                query["db_type"] = db_type
            
            skip = (page - 1) * limit
            
            cursor = self.collection.find(query, {
                "schemas": 0,  # 列表不返回詳細架構
                "optimization": 0,
                "data_dictionary": 0
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            designs = []
            for design in cursor:
                design["_id"] = str(design["_id"])
                designs.append(design)
            
            total = self.collection.count_documents(query)
            
            result = {
                "designs": designs,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取項目數據庫設計列表失敗: {str(e)}")
            return False, str(e)
    
    def update_design(self, design_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新數據庫設計"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            # 添加更新時間
            updates["updated_at"] = datetime.now(timezone.utc)
            
            result = self.collection.update_one(
                {"_id": ObjectId(design_id)},
                {"$set": updates}
            )
            
            if result.matched_count == 0:
                return False, "數據庫設計不存在"
            
            # 獲取更新後的文檔
            return self.get_design_by_id(design_id)
            
        except Exception as e:
            logger.error(f"更新數據庫設計失敗: {str(e)}")
            return False, str(e)
    
    def delete_design(self, design_id: str) -> Tuple[bool, str]:
        """刪除數據庫設計"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            result = self.collection.delete_one({"_id": ObjectId(design_id)})
            
            if result.deleted_count == 0:
                return False, "數據庫設計不存在"
            
            # 同時刪除相關的遷移記錄
            migration_model = DatabaseMigrationModel()
            migration_model.delete_by_design_id(design_id)
            
            logger.info(f"數據庫設計刪除成功: {design_id}")
            return True, "數據庫設計刪除成功"
            
        except Exception as e:
            logger.error(f"刪除數據庫設計失敗: {str(e)}")
            return False, str(e)
    
    def duplicate_design(self, design_id: str, new_name: str, created_by: str) -> Tuple[bool, Any]:
        """複製數據庫設計"""
        try:
            # 獲取原始設計
            flag, original = self.get_design_by_id(design_id)
            if not flag:
                return False, original
            
            # 創建副本
            duplicate_data = {
                "project_id": original["project_id"],
                "name": new_name,
                "description": f"複製自: {original['name']}",
                "db_type": original["db_type"],
                "version": "1.0.0",  # 重置版本
                "schemas": original["schemas"],
                "relationships": original["relationships"],
                "created_by": created_by
            }
            
            return self.create_design(**duplicate_data)
            
        except Exception as e:
            logger.error(f"複製數據庫設計失敗: {str(e)}")
            return False, str(e)
    
    def add_table_to_schema(self, design_id: str, schema_name: str, table_data: Dict) -> Tuple[bool, Any]:
        """向架構添加表"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            # 獲取設計
            flag, design = self.get_design_by_id(design_id)
            if not flag:
                return False, design
            
            # 查找對應的架構
            schemas = design.get("schemas", [])
            schema_found = False
            
            for schema in schemas:
                if schema["name"] == schema_name:
                    schema["tables"].append(table_data)
                    schema_found = True
                    break
            
            if not schema_found:
                return False, f"架構 {schema_name} 不存在"
            
            # 更新設計
            result = self.collection.update_one(
                {"_id": ObjectId(design_id)},
                {
                    "$set": {
                        "schemas": schemas,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                return False, "更新失敗"
            
            return True, table_data
            
        except Exception as e:
            logger.error(f"添加表失敗: {str(e)}")
            return False, str(e)
    
    def update_optimization(self, design_id: str, optimization_data: Dict) -> Tuple[bool, str]:
        """更新優化信息"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            result = self.collection.update_one(
                {"_id": ObjectId(design_id)},
                {
                    "$set": {
                        "optimization": optimization_data,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                return False, "數據庫設計不存在"
            
            return True, "優化信息更新成功"
            
        except Exception as e:
            logger.error(f"更新優化信息失敗: {str(e)}")
            return False, str(e)
    
    def add_relationship(self, design_id: str, relationship_data: Dict) -> Tuple[bool, Any]:
        """添加表關係"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            result = self.collection.update_one(
                {"_id": ObjectId(design_id)},
                {
                    "$push": {"relationships": relationship_data},
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                }
            )
            
            if result.matched_count == 0:
                return False, "數據庫設計不存在"
            
            return True, relationship_data
            
        except Exception as e:
            logger.error(f"添加關係失敗: {str(e)}")
            return False, str(e)
    
    def get_erd_data(self, design_id: str) -> Tuple[bool, Any]:
        """獲取ERD圖數據"""
        try:
            flag, design = self.get_design_by_id(design_id)
            if not flag:
                return False, design
            
            # 構建ERD數據結構
            erd_data = {
                "entities": [],
                "relationships": design.get("relationships", []),
                "metadata": {
                    "design_name": design["name"],
                    "db_type": design["db_type"],
                    "version": design["version"]
                }
            }
            
            # 提取表作為實體
            for schema in design.get("schemas", []):
                for table in schema.get("tables", []):
                    entity = {
                        "name": table["name"],
                        "schema": schema["name"],
                        "comment": table.get("comment", ""),
                        "attributes": []
                    }
                    
                    # 提取列作為屬性
                    for column in table.get("columns", []):
                        attribute = {
                            "name": column["name"],
                            "type": column["type"],
                            "primary_key": column.get("primary_key", False),
                            "foreign_key": column.get("foreign_key"),
                            "nullable": column.get("nullable", True),
                            "unique": column.get("unique", False)
                        }
                        entity["attributes"].append(attribute)
                    
                    erd_data["entities"].append(entity)
            
            return True, erd_data
            
        except Exception as e:
            logger.error(f"獲取ERD數據失敗: {str(e)}")
            return False, str(e)


class DatabaseMigrationModel(BaseDocument):
    """數據庫遷移模型"""
    
    def __init__(self):
        super().__init__("db_migrations")
    
    def create_migration(self, design_id: str, version_from: str, version_to: str,
                        migration_script: str, rollback_script: str = None,
                        created_by: str = None) -> Tuple[bool, Any]:
        """創建遷移記錄"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            migration_doc = {
                "design_id": ObjectId(design_id),
                "version_from": version_from,
                "version_to": version_to,
                "migration_script": migration_script,
                "rollback_script": rollback_script or "",
                "applied": False,
                "applied_at": None,
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(migration_doc)
            migration_doc["_id"] = str(result.inserted_id)
            migration_doc["design_id"] = str(migration_doc["design_id"])
            
            logger.info(f"遷移記錄創建成功: {version_from} -> {version_to}")
            return True, migration_doc
            
        except Exception as e:
            logger.error(f"創建遷移記錄失敗: {str(e)}")
            return False, str(e)
    
    def get_migrations_by_design(self, design_id: str, page: int = 1,
                                limit: int = 20) -> Tuple[bool, Any]:
        """獲取設計的遷移列表"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            skip = (page - 1) * limit
            
            cursor = self.collection.find({
                "design_id": ObjectId(design_id)
            }).sort("created_at", -1).skip(skip).limit(limit)
            
            migrations = []
            for migration in cursor:
                migration["_id"] = str(migration["_id"])
                migration["design_id"] = str(migration["design_id"])
                migrations.append(migration)
            
            total = self.collection.count_documents({
                "design_id": ObjectId(design_id)
            })
            
            result = {
                "migrations": migrations,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取遷移列表失敗: {str(e)}")
            return False, str(e)
    
    def apply_migration(self, migration_id: str) -> Tuple[bool, str]:
        """應用遷移"""
        try:
            if not ObjectId.is_valid(migration_id):
                return False, "無效的遷移ID格式"
            
            result = self.collection.update_one(
                {"_id": ObjectId(migration_id)},
                {
                    "$set": {
                        "applied": True,
                        "applied_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                return False, "遷移記錄不存在"
            
            logger.info(f"遷移應用成功: {migration_id}")
            return True, "遷移應用成功"
            
        except Exception as e:
            logger.error(f"應用遷移失敗: {str(e)}")
            return False, str(e)
    
    def rollback_migration(self, migration_id: str) -> Tuple[bool, str]:
        """回滾遷移"""
        try:
            if not ObjectId.is_valid(migration_id):
                return False, "無效的遷移ID格式"
            
            result = self.collection.update_one(
                {"_id": ObjectId(migration_id)},
                {
                    "$set": {
                        "applied": False,
                        "applied_at": None
                    }
                }
            )
            
            if result.matched_count == 0:
                return False, "遷移記錄不存在"
            
            logger.info(f"遷移回滾成功: {migration_id}")
            return True, "遷移回滾成功"
            
        except Exception as e:
            logger.error(f"回滾遷移失敗: {str(e)}")
            return False, str(e)
    
    def get_migration_by_id(self, migration_id: str) -> Tuple[bool, Any]:
        """根據ID獲取遷移記錄"""
        try:
            if not ObjectId.is_valid(migration_id):
                return False, "無效的遷移ID格式"
            
            migration = self.collection.find_one({"_id": ObjectId(migration_id)})
            if migration:
                migration["_id"] = str(migration["_id"])
                migration["design_id"] = str(migration["design_id"])
                return True, migration
            else:
                return False, "遷移記錄不存在"
                
        except Exception as e:
            logger.error(f"獲取遷移記錄失敗: {str(e)}")
            return False, str(e)
    
    def delete_by_design_id(self, design_id: str) -> Tuple[bool, str]:
        """刪除設計的所有遷移記錄"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            result = self.collection.delete_many({
                "design_id": ObjectId(design_id)
            })
            
            logger.info(f"刪除設計遷移記錄: {design_id}, 共{result.deleted_count}條記錄")
            return True, f"刪除了{result.deleted_count}條遷移記錄"
            
        except Exception as e:
            logger.error(f"刪除遷移記錄失敗: {str(e)}")
            return False, str(e)
    
    def get_pending_migrations(self, design_id: str) -> Tuple[bool, Any]:
        """獲取待應用的遷移"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            cursor = self.collection.find({
                "design_id": ObjectId(design_id),
                "applied": False
            }).sort("created_at", 1)
            
            migrations = []
            for migration in cursor:
                migration["_id"] = str(migration["_id"])
                migration["design_id"] = str(migration["design_id"])
                migrations.append(migration)
            
            return True, migrations
            
        except Exception as e:
            logger.error(f"獲取待應用遷移失敗: {str(e)}")
            return False, str(e)
    
    def get_applied_migrations(self, design_id: str) -> Tuple[bool, Any]:
        """獲取已應用的遷移"""
        try:
            if not ObjectId.is_valid(design_id):
                return False, "無效的設計ID格式"
            
            cursor = self.collection.find({
                "design_id": ObjectId(design_id),
                "applied": True
            }).sort("applied_at", -1)
            
            migrations = []
            for migration in cursor:
                migration["_id"] = str(migration["_id"])
                migration["design_id"] = str(migration["design_id"])
                migrations.append(migration)
            
            return True, migrations
            
        except Exception as e:
            logger.error(f"獲取已應用遷移失敗: {str(e)}")
            return False, str(e)