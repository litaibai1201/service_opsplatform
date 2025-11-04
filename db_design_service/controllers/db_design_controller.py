# -*- coding: utf-8 -*-
"""
@文件: db_design_controller.py
@說明: 數據庫設計控制器 (Database Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import re
import uuid
import secrets
import traceback
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional, List
from flask import request, g

from dbs.mongodb.models import DatabaseDesignModel, DatabaseMigrationModel
from loggers import logger
from cache import redis_client


class DatabaseDesignController:
    """數據庫設計控制器"""
    
    # 類級別的單例緩存
    _instance = None
    _initialized = False
    
    def __new__(cls, db_instance=None):
        if cls._instance is None:
            cls._instance = super(DatabaseDesignController, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, db_instance=None):
        # 避免重複初始化
        if DatabaseDesignController._initialized:
            return
            
        self.db = db_instance
        self.design_model = DatabaseDesignModel()
        self.migration_model = DatabaseMigrationModel()
        
        # 支持的數據庫類型
        self.supported_db_types = ["mysql", "postgresql", "mongodb", "redis", "oracle"]
        
        # 支持的索引類型
        self.supported_index_types = ["btree", "hash", "fulltext", "spatial"]
        
        # 支持的數據類型映射
        self.data_type_mappings = {
            "mysql": {
                "string": ["VARCHAR", "CHAR", "TEXT", "LONGTEXT"],
                "number": ["INT", "BIGINT", "DECIMAL", "FLOAT", "DOUBLE"],
                "datetime": ["DATE", "TIME", "DATETIME", "TIMESTAMP"],
                "boolean": ["BOOLEAN", "TINYINT"],
                "binary": ["BLOB", "LONGBLOB", "VARBINARY"]
            },
            "postgresql": {
                "string": ["VARCHAR", "CHAR", "TEXT"],
                "number": ["INTEGER", "BIGINT", "DECIMAL", "REAL", "DOUBLE PRECISION"],
                "datetime": ["DATE", "TIME", "TIMESTAMP", "TIMESTAMPTZ"],
                "boolean": ["BOOLEAN"],
                "binary": ["BYTEA"],
                "json": ["JSON", "JSONB"],
                "array": ["ARRAY"]
            },
            "mongodb": {
                "string": ["String"],
                "number": ["Number", "Int32", "Int64", "Double"],
                "datetime": ["Date"],
                "boolean": ["Boolean"],
                "object": ["Object"],
                "array": ["Array"]
            }
        }
        
        DatabaseDesignController._initialized = True
        logger.info("數據庫設計控制器初始化完成")
    
    # ==================== 數據庫設計管理 ====================
    
    def create_database_design(self, project_id: str, name: str, description: str = None,
                              db_type: str = "mysql", version: str = "1.0.0",
                              schemas: List = None, relationships: List = None,
                              created_by: str = None) -> Tuple[bool, Any]:
        """創建數據庫設計"""
        try:
            # 驗證輸入
            if not project_id or not name:
                return False, "項目ID和設計名稱不能為空"
            
            if db_type not in self.supported_db_types:
                return False, f"不支持的數據庫類型: {db_type}"
            
            # 驗證架構結構
            if schemas:
                flag, msg = self._validate_schemas(schemas, db_type)
                if not flag:
                    return False, f"架構驗證失敗: {msg}"
            
            return self.design_model.create_design(
                project_id=project_id,
                name=name,
                description=description,
                db_type=db_type,
                version=version,
                schemas=schemas,
                relationships=relationships,
                created_by=created_by
            )
            
        except Exception as e:
            logger.error(f"創建數據庫設計失敗: {str(e)}")
            logger.error(traceback.format_exc())
            return False, "創建數據庫設計失敗"
    
    def get_database_design(self, design_id: str, include_full_data: bool = True) -> Tuple[bool, Any]:
        """獲取數據庫設計詳情"""
        try:
            flag, result = self.design_model.get_design_by_id(design_id)
            if not flag:
                return False, result
            
            # 如果不需要完整數據，移除大型字段
            if not include_full_data:
                result.pop("schemas", None)
                result.pop("optimization", None)
                result.pop("data_dictionary", None)
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取數據庫設計失敗: {str(e)}")
            return False, "獲取數據庫設計失敗"
    
    def get_project_database_designs(self, project_id: str, db_type: str = None,
                                    page: int = 1, limit: int = 20) -> Tuple[bool, Any]:
        """獲取項目數據庫設計列表"""
        try:
            return self.design_model.get_designs_by_project(
                project_id=project_id,
                db_type=db_type,
                page=page,
                limit=limit
            )
            
        except Exception as e:
            logger.error(f"獲取項目數據庫設計列表失敗: {str(e)}")
            return False, "獲取數據庫設計列表失敗"
    
    def update_database_design(self, design_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新數據庫設計"""
        try:
            # 驗證更新數據
            if "db_type" in updates and updates["db_type"] not in self.supported_db_types:
                return False, f"不支持的數據庫類型: {updates['db_type']}"
            
            if "schemas" in updates:
                db_type = updates.get("db_type", "mysql")
                # 如果沒有指定類型，需要先獲取當前設計類型
                if "db_type" not in updates:
                    flag, current_design = self.get_database_design(design_id, include_full_data=False)
                    if flag:
                        db_type = current_design.get("db_type", "mysql")
                
                flag, msg = self._validate_schemas(updates["schemas"], db_type)
                if not flag:
                    return False, f"架構驗證失敗: {msg}"
            
            return self.design_model.update_design(design_id, updates)
            
        except Exception as e:
            logger.error(f"更新數據庫設計失敗: {str(e)}")
            return False, "更新數據庫設計失敗"
    
    def delete_database_design(self, design_id: str) -> Tuple[bool, str]:
        """刪除數據庫設計"""
        try:
            return self.design_model.delete_design(design_id)
            
        except Exception as e:
            logger.error(f"刪除數據庫設計失敗: {str(e)}")
            return False, "刪除數據庫設計失敗"
    
    def duplicate_database_design(self, design_id: str, new_name: str, 
                                 created_by: str) -> Tuple[bool, Any]:
        """複製數據庫設計"""
        try:
            return self.design_model.duplicate_design(design_id, new_name, created_by)
            
        except Exception as e:
            logger.error(f"複製數據庫設計失敗: {str(e)}")
            return False, "複製數據庫設計失敗"
    
    # ==================== ERD管理 ====================
    
    def get_erd_diagram(self, design_id: str) -> Tuple[bool, Any]:
        """獲取ERD圖"""
        try:
            return self.design_model.get_erd_data(design_id)
            
        except Exception as e:
            logger.error(f"獲取ERD圖失敗: {str(e)}")
            return False, "獲取ERD圖失敗"
    
    def generate_erd_diagram(self, design_id: str, layout: str = "auto") -> Tuple[bool, Any]:
        """生成ERD圖"""
        try:
            # 獲取ERD數據
            flag, erd_data = self.get_erd_diagram(design_id)
            if not flag:
                return False, erd_data
            
            # 生成圖表佈局
            diagram_layout = self._generate_erd_layout(erd_data, layout)
            
            return True, {
                "erd_data": erd_data,
                "layout": diagram_layout,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"生成ERD圖失敗: {str(e)}")
            return False, "生成ERD圖失敗"
    
    def update_erd_diagram(self, design_id: str, erd_updates: Dict) -> Tuple[bool, Any]:
        """更新ERD圖"""
        try:
            # 更新設計中的相關數據
            updates = {}
            
            if "entities" in erd_updates:
                # 將實體更新回架構中的表
                schemas = self._convert_entities_to_schemas(erd_updates["entities"])
                updates["schemas"] = schemas
            
            if "relationships" in erd_updates:
                updates["relationships"] = erd_updates["relationships"]
            
            if updates:
                return self.design_model.update_design(design_id, updates)
            else:
                return True, "無需更新"
            
        except Exception as e:
            logger.error(f"更新ERD圖失敗: {str(e)}")
            return False, "更新ERD圖失敗"
    
    # ==================== 驗證和優化 ====================
    
    def validate_design(self, design_id: str, strict_mode: bool = False) -> Tuple[bool, Any]:
        """驗證設計"""
        try:
            # 獲取數據庫設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 執行驗證
            validation_result = self._perform_design_validation(design_data, strict_mode)
            
            return True, validation_result
            
        except Exception as e:
            logger.error(f"驗證設計失敗: {str(e)}")
            return False, "驗證設計失敗"
    
    def optimize_design(self, design_id: str) -> Tuple[bool, Any]:
        """獲取優化建議"""
        try:
            # 獲取數據庫設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 生成優化建議
            optimization_suggestions = self._generate_optimization_suggestions(design_data)
            
            # 更新優化信息到設計中
            self.design_model.update_optimization(design_id, optimization_suggestions)
            
            return True, optimization_suggestions
            
        except Exception as e:
            logger.error(f"獲取優化建議失敗: {str(e)}")
            return False, "獲取優化建議失敗"
    
    def analyze_performance(self, design_id: str) -> Tuple[bool, Any]:
        """性能分析"""
        try:
            # 獲取數據庫設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 執行性能分析
            performance_analysis = self._perform_performance_analysis(design_data)
            
            return True, performance_analysis
            
        except Exception as e:
            logger.error(f"性能分析失敗: {str(e)}")
            return False, "性能分析失敗"
    
    def normalize_design(self, design_id: str, target_level: str = "3NF") -> Tuple[bool, Any]:
        """規範化分析"""
        try:
            # 獲取數據庫設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 執行規範化分析
            normalization_result = self._perform_normalization_analysis(design_data, target_level)
            
            return True, normalization_result
            
        except Exception as e:
            logger.error(f"規範化分析失敗: {str(e)}")
            return False, "規範化分析失敗"
    
    # ==================== 代碼生成 ====================
    
    def generate_sql_script(self, design_id: str, script_type: str = "ddl") -> Tuple[bool, Any]:
        """生成SQL腳本"""
        try:
            # 獲取數據庫設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 生成SQL腳本
            sql_script = self._generate_sql_script(design_data, script_type)
            
            return True, {
                "script_type": script_type,
                "sql_script": sql_script,
                "db_type": design_data["db_type"],
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"生成SQL腳本失敗: {str(e)}")
            return False, "生成SQL腳本失敗"
    
    def generate_migration_script(self, design_id: str, target_version: str,
                                 migration_type: str = "forward") -> Tuple[bool, Any]:
        """生成遷移腳本"""
        try:
            # 獲取當前設計
            flag, current_design = self.get_database_design(design_id)
            if not flag:
                return False, current_design
            
            current_version = current_design["version"]
            
            # 生成遷移腳本
            migration_script = self._generate_migration_script(
                current_design, current_version, target_version, migration_type
            )
            
            # 生成回滾腳本
            rollback_script = self._generate_migration_script(
                current_design, target_version, current_version, "rollback"
            )
            
            # 創建遷移記錄
            flag, migration_record = self.migration_model.create_migration(
                design_id=design_id,
                version_from=current_version,
                version_to=target_version,
                migration_script=migration_script,
                rollback_script=rollback_script,
                created_by=current_design.get("created_by")
            )
            
            if flag:
                return True, {
                    "migration_record": migration_record,
                    "migration_script": migration_script,
                    "rollback_script": rollback_script
                }
            else:
                return False, migration_record
            
        except Exception as e:
            logger.error(f"生成遷移腳本失敗: {str(e)}")
            return False, "生成遷移腳本失敗"
    
    def generate_documentation(self, design_id: str, doc_format: str = "html") -> Tuple[bool, Any]:
        """生成數據庫文檔"""
        try:
            # 獲取數據庫設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 生成文檔
            documentation = self._generate_database_documentation(design_data, doc_format)
            
            return True, {
                "format": doc_format,
                "documentation": documentation,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"生成數據庫文檔失敗: {str(e)}")
            return False, "生成數據庫文檔失敗"
    
    def generate_orm_models(self, design_id: str, orm_type: str = "sqlalchemy",
                           language: str = "python") -> Tuple[bool, Any]:
        """生成ORM模型"""
        try:
            # 獲取數據庫設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 生成ORM模型代碼
            model_code = self._generate_orm_models(design_data, orm_type, language)
            
            return True, {
                "orm_type": orm_type,
                "language": language,
                "model_code": model_code,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"生成ORM模型失敗: {str(e)}")
            return False, "生成ORM模型失敗"
    
    # ==================== 逆向工程 ====================
    
    def reverse_engineer_database(self, connection_config: Dict, 
                                 project_id: str, created_by: str) -> Tuple[bool, Any]:
        """從現有數據庫逆向生成設計"""
        try:
            # 連接數據庫並提取結構
            db_structure = self._extract_database_structure(connection_config)
            
            # 轉換為設計格式
            design_data = self._convert_structure_to_design(
                db_structure, project_id, created_by
            )
            
            # 創建設計
            return self.design_model.create_design(**design_data)
            
        except Exception as e:
            logger.error(f"逆向工程失敗: {str(e)}")
            return False, "逆向工程失敗"
    
    def import_sql_script(self, sql_script: str, project_id: str, 
                         design_name: str, created_by: str) -> Tuple[bool, Any]:
        """從SQL腳本導入設計"""
        try:
            # 解析SQL腳本
            parsed_structure = self._parse_sql_script(sql_script)
            
            # 轉換為設計格式
            design_data = {
                "project_id": project_id,
                "name": design_name,
                "description": "從SQL腳本導入",
                "db_type": parsed_structure.get("db_type", "mysql"),
                "schemas": parsed_structure.get("schemas", []),
                "relationships": parsed_structure.get("relationships", []),
                "created_by": created_by
            }
            
            # 創建設計
            return self.design_model.create_design(**design_data)
            
        except Exception as e:
            logger.error(f"導入SQL腳本失敗: {str(e)}")
            return False, "導入SQL腳本失敗"
    
    # ==================== 比較和同步 ====================
    
    def compare_designs(self, design_id: str, target_design_id: str) -> Tuple[bool, Any]:
        """比較不同設計"""
        try:
            # 獲取兩個設計
            flag1, design1 = self.get_database_design(design_id)
            flag2, design2 = self.get_database_design(target_design_id)
            
            if not flag1:
                return False, design1
            if not flag2:
                return False, design2
            
            # 執行比較
            comparison_result = self._compare_database_designs(design1, design2)
            
            return True, comparison_result
            
        except Exception as e:
            logger.error(f"比較設計失敗: {str(e)}")
            return False, "比較設計失敗"
    
    def sync_to_database(self, design_id: str, target_connection: Dict) -> Tuple[bool, Any]:
        """同步到目標數據庫"""
        try:
            # 獲取設計
            flag, design_data = self.get_database_design(design_id)
            if not flag:
                return False, design_data
            
            # 生成同步腳本
            sync_script = self._generate_sync_script(design_data, target_connection)
            
            # 執行同步（這裡只返回腳本，實際執行需要用戶確認）
            return True, {
                "sync_script": sync_script,
                "target_database": target_connection.get("database"),
                "estimated_operations": len(sync_script.split(";")),
                "requires_confirmation": True
            }
            
        except Exception as e:
            logger.error(f"同步到數據庫失敗: {str(e)}")
            return False, "同步到數據庫失敗"
    
    def get_version_diff(self, design_id: str, target_version: str) -> Tuple[bool, Any]:
        """獲取版本差異"""
        try:
            # 獲取當前設計
            flag, current_design = self.get_database_design(design_id)
            if not flag:
                return False, current_design
            
            # 獲取目標版本的遷移記錄
            flag, migrations = self.migration_model.get_migrations_by_design(design_id)
            if not flag:
                return False, migrations
            
            # 查找目標版本
            target_migration = None
            for migration in migrations["migrations"]:
                if migration["version_to"] == target_version:
                    target_migration = migration
                    break
            
            if not target_migration:
                return False, f"未找到版本 {target_version} 的遷移記錄"
            
            # 生成差異報告
            diff_result = {
                "current_version": current_design["version"],
                "target_version": target_version,
                "migration_script": target_migration["migration_script"],
                "rollback_script": target_migration["rollback_script"],
                "applied": target_migration["applied"],
                "created_at": target_migration["created_at"]
            }
            
            return True, diff_result
            
        except Exception as e:
            logger.error(f"獲取版本差異失敗: {str(e)}")
            return False, "獲取版本差異失敗"
    
    # ==================== 私有方法 ====================
    
    def _validate_schemas(self, schemas: List, db_type: str) -> Tuple[bool, str]:
        """驗證架構結構"""
        try:
            for schema in schemas:
                if not isinstance(schema, dict):
                    return False, "架構必須是字典格式"
                
                if "name" not in schema:
                    return False, "架構必須包含name字段"
                
                # 驗證表結構
                tables = schema.get("tables", [])
                for table in tables:
                    if not isinstance(table, dict):
                        return False, "表必須是字典格式"
                    
                    if "name" not in table:
                        return False, "表必須包含name字段"
                    
                    # 驗證列結構
                    columns = table.get("columns", [])
                    primary_key_count = 0
                    
                    for column in columns:
                        if not isinstance(column, dict):
                            return False, "列必須是字典格式"
                        
                        if "name" not in column or "type" not in column:
                            return False, "列必須包含name和type字段"
                        
                        # 驗證數據類型
                        if not self._is_valid_data_type(column["type"], db_type):
                            return False, f"無效的數據類型: {column['type']} for {db_type}"
                        
                        # 檢查主鍵
                        if column.get("primary_key", False):
                            primary_key_count += 1
                    
                    # 驗證索引結構
                    indexes = table.get("indexes", [])
                    for index in indexes:
                        if not isinstance(index, dict):
                            return False, "索引必須是字典格式"
                        
                        if "name" not in index or "columns" not in index:
                            return False, "索引必須包含name和columns字段"
                        
                        if index.get("type") not in self.supported_index_types:
                            return False, f"不支持的索引類型: {index.get('type')}"
            
            return True, "驗證通過"
            
        except Exception as e:
            return False, f"驗證過程中發生錯誤: {str(e)}"
    
    def _is_valid_data_type(self, data_type: str, db_type: str) -> bool:
        """檢查數據類型是否有效"""
        if db_type not in self.data_type_mappings:
            return True  # 對於不認識的數據庫類型，暫時通過
        
        type_mapping = self.data_type_mappings[db_type]
        for category, types in type_mapping.items():
            if data_type.upper() in [t.upper() for t in types]:
                return True
        
        return False
    
    def _perform_design_validation(self, design_data: Dict, strict_mode: bool) -> Dict:
        """執行設計驗證"""
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": [],
            "metrics": {}
        }
        
        try:
            schemas = design_data.get("schemas", [])
            relationships = design_data.get("relationships", [])
            
            # 統計指標
            total_tables = sum(len(schema.get("tables", [])) for schema in schemas)
            total_columns = sum(
                len(table.get("columns", []))
                for schema in schemas
                for table in schema.get("tables", [])
            )
            total_indexes = sum(
                len(table.get("indexes", []))
                for schema in schemas
                for table in schema.get("tables", [])
            )
            
            validation_result["metrics"] = {
                "total_schemas": len(schemas),
                "total_tables": total_tables,
                "total_columns": total_columns,
                "total_indexes": total_indexes,
                "total_relationships": len(relationships)
            }
            
            # 檢查表結構
            table_names = set()
            for schema in schemas:
                for table in schema.get("tables", []):
                    table_name = f"{schema['name']}.{table['name']}"
                    
                    # 檢查重複表名
                    if table_name in table_names:
                        validation_result["errors"].append(f"重複的表名: {table_name}")
                        validation_result["is_valid"] = False
                    table_names.add(table_name)
                    
                    # 檢查主鍵
                    primary_keys = [col for col in table.get("columns", []) if col.get("primary_key")]
                    if not primary_keys:
                        validation_result["warnings"].append(f"表 {table_name} 沒有主鍵")
                    elif len(primary_keys) > 1 and strict_mode:
                        validation_result["warnings"].append(f"表 {table_name} 有多個主鍵列")
                    
                    # 檢查外鍵關係
                    for column in table.get("columns", []):
                        foreign_key = column.get("foreign_key")
                        if foreign_key:
                            ref_table = foreign_key.get("table")
                            if ref_table and ref_table not in [t.split(".")[-1] for t in table_names]:
                                validation_result["warnings"].append(
                                    f"外鍵 {column['name']} 引用了不存在的表: {ref_table}"
                                )
            
            # 檢查關係完整性
            for relationship in relationships:
                from_table = relationship.get("from_table")
                to_table = relationship.get("to_table")
                
                if from_table and from_table not in [t.split(".")[-1] for t in table_names]:
                    validation_result["warnings"].append(f"關係引用了不存在的源表: {from_table}")
                
                if to_table and to_table not in [t.split(".")[-1] for t in table_names]:
                    validation_result["warnings"].append(f"關係引用了不存在的目標表: {to_table}")
            
            # 建議
            if total_tables > 50:
                validation_result["suggestions"].append("考慮將大型設計拆分為多個模塊")
            
            if total_indexes < total_tables * 0.5:
                validation_result["suggestions"].append("考慮為經常查詢的列添加索引")
            
        except Exception as e:
            validation_result["errors"].append(f"驗證過程中發生錯誤: {str(e)}")
            validation_result["is_valid"] = False
        
        return validation_result
    
    def _generate_optimization_suggestions(self, design_data: Dict) -> Dict:
        """生成優化建議"""
        optimization = {
            "performance_analysis": {},
            "index_suggestions": [],
            "normalization_level": "3NF",
            "query_optimization": []
        }
        
        try:
            schemas = design_data.get("schemas", [])
            
            # 索引建議
            for schema in schemas:
                for table in schema.get("tables", []):
                    table_name = table["name"]
                    columns = table.get("columns", [])
                    indexes = table.get("indexes", [])
                    
                    indexed_columns = set()
                    for index in indexes:
                        indexed_columns.update(index.get("columns", []))
                    
                    # 為外鍵列建議索引
                    for column in columns:
                        if column.get("foreign_key") and column["name"] not in indexed_columns:
                            optimization["index_suggestions"].append({
                                "table": table_name,
                                "column": column["name"],
                                "type": "btree",
                                "reason": "外鍵列建議添加索引以提高JOIN性能"
                            })
                    
                    # 為經常查詢的列建議索引
                    nullable_columns = [col for col in columns if col.get("nullable", True)]
                    if len(nullable_columns) > len(indexed_columns):
                        optimization["index_suggestions"].append({
                            "table": table_name,
                            "suggestion": "考慮為經常用於WHERE條件的列添加索引"
                        })
            
            # 性能分析
            total_tables = sum(len(schema.get("tables", [])) for schema in schemas)
            optimization["performance_analysis"] = {
                "complexity_score": total_tables,
                "estimated_storage": f"{total_tables * 100}MB (估算)",
                "query_performance": "中等" if total_tables < 50 else "需要優化"
            }
            
            # 查詢優化建議
            optimization["query_optimization"] = [
                "使用適當的JOIN類型",
                "避免SELECT *查詢",
                "使用LIMIT限制結果集大小",
                "考慮分區大表"
            ]
            
        except Exception as e:
            logger.error(f"生成優化建議失敗: {str(e)}")
            optimization["error"] = str(e)
        
        return optimization
    
    def _perform_performance_analysis(self, design_data: Dict) -> Dict:
        """執行性能分析"""
        analysis = {
            "overall_score": 0,
            "bottlenecks": [],
            "recommendations": [],
            "metrics": {}
        }
        
        try:
            schemas = design_data.get("schemas", [])
            relationships = design_data.get("relationships", [])
            
            # 計算指標
            total_tables = sum(len(schema.get("tables", [])) for schema in schemas)
            total_columns = sum(
                len(table.get("columns", []))
                for schema in schemas
                for table in schema.get("tables", [])
            )
            total_indexes = sum(
                len(table.get("indexes", []))
                for schema in schemas
                for table in schema.get("tables", [])
            )
            
            # 計算性能評分
            score = 100
            
            # 表數量影響
            if total_tables > 100:
                score -= 20
                analysis["bottlenecks"].append("表數量過多可能影響管理複雜度")
            
            # 索引覆蓋率
            index_coverage = (total_indexes / max(total_tables, 1)) * 100
            if index_coverage < 50:
                score -= 15
                analysis["bottlenecks"].append("索引覆蓋率不足")
            
            # 關係複雜度
            relationship_ratio = len(relationships) / max(total_tables, 1)
            if relationship_ratio > 2:
                score -= 10
                analysis["bottlenecks"].append("表關係過於複雜")
            
            analysis["overall_score"] = max(score, 0)
            
            # 性能指標
            analysis["metrics"] = {
                "table_count": total_tables,
                "average_columns_per_table": total_columns / max(total_tables, 1),
                "index_coverage_percent": index_coverage,
                "relationship_complexity": relationship_ratio
            }
            
            # 建議
            if analysis["overall_score"] < 70:
                analysis["recommendations"].extend([
                    "考慮重新設計表結構以降低複雜度",
                    "增加必要的索引以提高查詢性能",
                    "評估是否需要分庫分表"
                ])
            
        except Exception as e:
            logger.error(f"性能分析失敗: {str(e)}")
            analysis["error"] = str(e)
        
        return analysis
    
    def _perform_normalization_analysis(self, design_data: Dict, target_level: str) -> Dict:
        """執行規範化分析"""
        analysis = {
            "current_level": "Unknown",
            "target_level": target_level,
            "violations": [],
            "recommendations": [],
            "can_normalize": True
        }
        
        try:
            schemas = design_data.get("schemas", [])
            
            # 檢查第一範式（1NF）
            nf1_violations = []
            for schema in schemas:
                for table in schema.get("tables", []):
                    columns = table.get("columns", [])
                    
                    # 檢查原子值（簡單檢查列名是否包含分隔符）
                    for column in columns:
                        if "," in column.get("comment", "") or ";" in column.get("comment", ""):
                            nf1_violations.append(f"表 {table['name']} 的列 {column['name']} 可能包含非原子值")
            
            if nf1_violations:
                analysis["violations"].extend(nf1_violations)
                analysis["current_level"] = "未滿足1NF"
            else:
                analysis["current_level"] = "至少1NF"
            
            # 檢查第二範式（2NF）
            nf2_violations = []
            for schema in schemas:
                for table in schema.get("tables", []):
                    primary_keys = [col for col in table.get("columns", []) if col.get("primary_key")]
                    
                    if len(primary_keys) > 1:  # 複合主鍵
                        non_key_columns = [col for col in table.get("columns", []) if not col.get("primary_key")]
                        if non_key_columns:
                            nf2_violations.append(f"表 {table['name']} 有複合主鍵，需要檢查部分函數依賴")
            
            if nf2_violations:
                analysis["violations"].extend(nf2_violations)
                if analysis["current_level"] != "未滿足1NF":
                    analysis["current_level"] = "1NF但可能不滿足2NF"
            elif analysis["current_level"] == "至少1NF":
                analysis["current_level"] = "至少2NF"
            
            # 檢查第三範式（3NF）
            nf3_violations = []
            for schema in schemas:
                for table in schema.get("tables", []):
                    columns = table.get("columns", [])
                    
                    # 簡單檢查：查找可能的傳遞依賴
                    non_key_columns = [col for col in columns if not col.get("primary_key")]
                    if len(non_key_columns) > 5:  # 啟發式規則
                        nf3_violations.append(f"表 {table['name']} 有較多非鍵列，可能存在傳遞依賴")
            
            if nf3_violations:
                analysis["violations"].extend(nf3_violations)
                if "2NF" in analysis["current_level"]:
                    analysis["current_level"] = "2NF但可能不滿足3NF"
            elif "2NF" in analysis["current_level"]:
                analysis["current_level"] = "至少3NF"
            
            # 生成建議
            if target_level == "3NF" and "3NF" not in analysis["current_level"]:
                analysis["recommendations"].append("考慮拆分表以消除傳遞依賴")
                analysis["recommendations"].append("將非鍵屬性移動到單獨的表中")
            
        except Exception as e:
            logger.error(f"規範化分析失敗: {str(e)}")
            analysis["error"] = str(e)
        
        return analysis
    
    def _generate_sql_script(self, design_data: Dict, script_type: str) -> str:
        """生成SQL腳本"""
        try:
            db_type = design_data.get("db_type", "mysql")
            schemas = design_data.get("schemas", [])
            
            sql_parts = []
            
            if script_type == "ddl":
                # 生成DDL腳本
                sql_parts.append(f"-- Database Design: {design_data['name']}")
                sql_parts.append(f"-- Generated at: {datetime.now().isoformat()}")
                sql_parts.append(f"-- Database Type: {db_type}")
                sql_parts.append("")
                
                for schema in schemas:
                    if db_type in ["mysql", "postgresql"] and schema["name"] != "default":
                        sql_parts.append(f"CREATE SCHEMA IF NOT EXISTS {schema['name']};")
                        sql_parts.append("")
                    
                    for table in schema.get("tables", []):
                        table_sql = self._generate_table_ddl(table, schema["name"], db_type)
                        sql_parts.append(table_sql)
                        sql_parts.append("")
                    
                    # 生成視圖
                    for view in schema.get("views", []):
                        view_sql = f"CREATE VIEW {view['name']} AS\n{view['definition']};"
                        sql_parts.append(view_sql)
                        sql_parts.append("")
            
            elif script_type == "dml":
                # 生成示例DML腳本
                sql_parts.append("-- Sample DML Scripts")
                for schema in schemas:
                    for table in schema.get("tables", []):
                        columns = [col["name"] for col in table.get("columns", [])]
                        if columns:
                            sql_parts.append(f"-- INSERT INTO {table['name']} ({', '.join(columns)}) VALUES (...);")
            
            return "\n".join(sql_parts)
            
        except Exception as e:
            logger.error(f"生成SQL腳本失敗: {str(e)}")
            return f"-- 生成SQL腳本失敗: {str(e)}"
    
    def _generate_table_ddl(self, table: Dict, schema_name: str, db_type: str) -> str:
        """生成表DDL"""
        try:
            table_name = table["name"]
            if schema_name != "default":
                table_name = f"{schema_name}.{table_name}"
            
            ddl_parts = [f"CREATE TABLE {table_name} ("]
            
            # 生成列定義
            column_definitions = []
            for column in table.get("columns", []):
                col_def = f"  {column['name']} {column['type']}"
                
                # 長度和精度
                if column.get("length"):
                    col_def += f"({column['length']}"
                    if column.get("scale"):
                        col_def += f",{column['scale']}"
                    col_def += ")"
                
                # 可空性
                if not column.get("nullable", True):
                    col_def += " NOT NULL"
                
                # 自增
                if column.get("auto_increment", False):
                    if db_type == "mysql":
                        col_def += " AUTO_INCREMENT"
                    elif db_type == "postgresql":
                        col_def += " SERIAL"
                
                # 默認值
                if column.get("default_value"):
                    col_def += f" DEFAULT {column['default_value']}"
                
                # 註釋
                if column.get("comment"):
                    if db_type == "mysql":
                        col_def += f" COMMENT '{column['comment']}'"
                
                column_definitions.append(col_def)
            
            ddl_parts.append(",\n".join(column_definitions))
            
            # 主鍵
            primary_keys = [col["name"] for col in table.get("columns", []) if col.get("primary_key")]
            if primary_keys:
                ddl_parts.append(f",\n  PRIMARY KEY ({', '.join(primary_keys)})")
            
            # 外鍵
            for column in table.get("columns", []):
                foreign_key = column.get("foreign_key")
                if foreign_key:
                    fk_def = f",\n  FOREIGN KEY ({column['name']}) REFERENCES {foreign_key['table']}({foreign_key['column']})"
                    if foreign_key.get("on_delete"):
                        fk_def += f" ON DELETE {foreign_key['on_delete']}"
                    if foreign_key.get("on_update"):
                        fk_def += f" ON UPDATE {foreign_key['on_update']}"
                    ddl_parts.append(fk_def)
            
            ddl_parts.append("\n);")
            
            # 索引
            index_statements = []
            for index in table.get("indexes", []):
                index_type = index.get("type", "btree").upper()
                unique = "UNIQUE " if index.get("unique", False) else ""
                
                if db_type == "mysql":
                    index_sql = f"CREATE {unique}INDEX {index['name']} ON {table_name} ({', '.join(index['columns'])}) USING {index_type};"
                else:
                    index_sql = f"CREATE {unique}INDEX {index['name']} ON {table_name} ({', '.join(index['columns'])});"
                
                index_statements.append(index_sql)
            
            result = "".join(ddl_parts)
            if index_statements:
                result += "\n\n" + "\n".join(index_statements)
            
            return result
            
        except Exception as e:
            return f"-- 生成表DDL失敗: {str(e)}"
    
    def _generate_erd_layout(self, erd_data: Dict, layout: str) -> Dict:
        """生成ERD佈局"""
        layout_data = {
            "layout_type": layout,
            "entities": [],
            "relationships": erd_data.get("relationships", []),
            "settings": {
                "auto_arrange": True,
                "show_attributes": True,
                "show_relationships": True
            }
        }
        
        try:
            entities = erd_data.get("entities", [])
            
            # 簡單的網格佈局
            cols = int(len(entities) ** 0.5) + 1
            x_spacing = 200
            y_spacing = 150
            
            for i, entity in enumerate(entities):
                x = (i % cols) * x_spacing
                y = (i // cols) * y_spacing
                
                layout_entity = {
                    "name": entity["name"],
                    "position": {"x": x, "y": y},
                    "size": {"width": 150, "height": len(entity.get("attributes", [])) * 20 + 50}
                }
                layout_data["entities"].append(layout_entity)
        
        except Exception as e:
            logger.error(f"生成ERD佈局失敗: {str(e)}")
            layout_data["error"] = str(e)
        
        return layout_data
    
    def _convert_entities_to_schemas(self, entities: List) -> List:
        """將實體轉換回架構格式"""
        schemas = [{"name": "default", "tables": [], "views": [], "procedures": [], "functions": []}]
        
        try:
            for entity in entities:
                table = {
                    "name": entity["name"],
                    "comment": entity.get("comment", ""),
                    "columns": [],
                    "indexes": [],
                    "triggers": [],
                    "partitioning": {}
                }
                
                # 轉換屬性為列
                for attr in entity.get("attributes", []):
                    column = {
                        "name": attr["name"],
                        "type": attr["type"],
                        "nullable": attr.get("nullable", True),
                        "primary_key": attr.get("primary_key", False),
                        "unique": attr.get("unique", False),
                        "comment": ""
                    }
                    
                    if attr.get("foreign_key"):
                        column["foreign_key"] = attr["foreign_key"]
                    
                    table["columns"].append(column)
                
                # 根據schema分組
                schema_name = entity.get("schema", "default")
                target_schema = None
                for schema in schemas:
                    if schema["name"] == schema_name:
                        target_schema = schema
                        break
                
                if not target_schema:
                    target_schema = {
                        "name": schema_name,
                        "tables": [],
                        "views": [],
                        "procedures": [],
                        "functions": []
                    }
                    schemas.append(target_schema)
                
                target_schema["tables"].append(table)
        
        except Exception as e:
            logger.error(f"轉換實體到架構失敗: {str(e)}")
        
        return schemas
    
    def _generate_migration_script(self, design_data: Dict, version_from: str, 
                                  version_to: str, migration_type: str) -> str:
        """生成遷移腳本"""
        try:
            script_parts = [
                f"-- Migration: {version_from} -> {version_to}",
                f"-- Type: {migration_type}",
                f"-- Generated: {datetime.now().isoformat()}",
                ""
            ]
            
            if migration_type == "forward":
                script_parts.append("-- Forward migration script")
                script_parts.append("-- TODO: Add actual migration commands")
            elif migration_type == "rollback":
                script_parts.append("-- Rollback migration script")
                script_parts.append("-- TODO: Add rollback commands")
            
            return "\n".join(script_parts)
            
        except Exception as e:
            return f"-- 生成遷移腳本失敗: {str(e)}"
    
    def _generate_database_documentation(self, design_data: Dict, doc_format: str) -> str:
        """生成數據庫文檔"""
        try:
            if doc_format == "html":
                return self._generate_html_documentation(design_data)
            elif doc_format == "markdown":
                return self._generate_markdown_documentation(design_data)
            else:
                return json.dumps(design_data, indent=2, ensure_ascii=False)
                
        except Exception as e:
            return f"生成文檔失敗: {str(e)}"
    
    def _generate_html_documentation(self, design_data: Dict) -> str:
        """生成HTML文檔"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{design_data['name']} Database Documentation</title>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ color: #333; }}
                h2 {{ color: #666; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .table-section {{ margin: 30px 0; }}
            </style>
        </head>
        <body>
            <h1>{design_data['name']}</h1>
            <p>{design_data.get('description', '')}</p>
            <p><strong>Database Type:</strong> {design_data.get('db_type', '')}</p>
            <p><strong>Version:</strong> {design_data.get('version', '')}</p>
        """
        
        for schema in design_data.get("schemas", []):
            html += f'<h2>Schema: {schema["name"]}</h2>'
            
            for table in schema.get("tables", []):
                html += f'''
                <div class="table-section">
                    <h3>Table: {table["name"]}</h3>
                    <p>{table.get("comment", "")}</p>
                    <table>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>Key</th>
                            <th>Comment</th>
                        </tr>
                '''
                
                for column in table.get("columns", []):
                    key_info = ""
                    if column.get("primary_key"):
                        key_info = "PK"
                    elif column.get("foreign_key"):
                        key_info = "FK"
                    
                    html += f'''
                    <tr>
                        <td>{column["name"]}</td>
                        <td>{column["type"]}</td>
                        <td>{"Yes" if column.get("nullable", True) else "No"}</td>
                        <td>{key_info}</td>
                        <td>{column.get("comment", "")}</td>
                    </tr>
                    '''
                
                html += "</table></div>"
        
        html += "</body></html>"
        return html
    
    def _generate_markdown_documentation(self, design_data: Dict) -> str:
        """生成Markdown文檔"""
        markdown = f"""# {design_data['name']}

{design_data.get('description', '')}

**Database Type:** {design_data.get('db_type', '')}  
**Version:** {design_data.get('version', '')}

## Schemas

"""
        
        for schema in design_data.get("schemas", []):
            markdown += f"### Schema: {schema['name']}\n\n"
            
            for table in schema.get("tables", []):
                markdown += f"#### Table: {table['name']}\n\n"
                if table.get("comment"):
                    markdown += f"{table['comment']}\n\n"
                
                markdown += "| Column | Type | Nullable | Key | Comment |\n"
                markdown += "|--------|------|----------|-----|----------|\n"
                
                for column in table.get("columns", []):
                    key_info = ""
                    if column.get("primary_key"):
                        key_info = "PK"
                    elif column.get("foreign_key"):
                        key_info = "FK"
                    
                    nullable = "Yes" if column.get("nullable", True) else "No"
                    comment = column.get("comment", "")
                    
                    markdown += f"| {column['name']} | {column['type']} | {nullable} | {key_info} | {comment} |\n"
                
                markdown += "\n"
        
        return markdown
    
    def _generate_orm_models(self, design_data: Dict, orm_type: str, language: str) -> str:
        """生成ORM模型"""
        try:
            if language == "python" and orm_type == "sqlalchemy":
                return self._generate_sqlalchemy_models(design_data)
            else:
                return f"# {language} {orm_type} 模型生成待實現"
                
        except Exception as e:
            return f"# 生成ORM模型失敗: {str(e)}"
    
    def _generate_sqlalchemy_models(self, design_data: Dict) -> str:
        """生成SQLAlchemy模型"""
        code_parts = [
            "# -*- coding: utf-8 -*-",
            f'"""',
            f'{design_data["name"]} Database Models',
            f'Generated at: {datetime.now().isoformat()}',
            f'"""',
            "",
            "from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text",
            "from sqlalchemy.ext.declarative import declarative_base",
            "from sqlalchemy.orm import relationship",
            "from datetime import datetime",
            "",
            "Base = declarative_base()",
            ""
        ]
        
        for schema in design_data.get("schemas", []):
            for table in schema.get("tables", []):
                class_name = "".join(word.capitalize() for word in table["name"].split("_"))
                
                code_parts.append(f"class {class_name}(Base):")
                code_parts.append(f'    __tablename__ = "{table["name"]}"')
                code_parts.append("")
                
                for column in table.get("columns", []):
                    col_def = f'    {column["name"]} = Column('
                    
                    # 映射數據類型
                    if "INT" in column["type"].upper():
                        col_def += "Integer"
                    elif "VARCHAR" in column["type"].upper() or "CHAR" in column["type"].upper():
                        col_def += "String"
                    elif "TEXT" in column["type"].upper():
                        col_def += "Text"
                    elif "DATETIME" in column["type"].upper() or "TIMESTAMP" in column["type"].upper():
                        col_def += "DateTime"
                    elif "BOOLEAN" in column["type"].upper():
                        col_def += "Boolean"
                    else:
                        col_def += "String"
                    
                    # 主鍵
                    if column.get("primary_key"):
                        col_def += ", primary_key=True"
                    
                    # 可空性
                    if not column.get("nullable", True):
                        col_def += ", nullable=False"
                    
                    col_def += ")"
                    code_parts.append(col_def)
                
                code_parts.append("")
                code_parts.append("")
        
        return "\n".join(code_parts)
    
    def _extract_database_structure(self, connection_config: Dict) -> Dict:
        """從數據庫提取結構（模擬實現）"""
        # 這裡應該實現實際的數據庫連接和結構提取
        return {
            "db_type": connection_config.get("type", "mysql"),
            "schemas": [],
            "relationships": []
        }
    
    def _convert_structure_to_design(self, db_structure: Dict, project_id: str, created_by: str) -> Dict:
        """將數據庫結構轉換為設計格式"""
        return {
            "project_id": project_id,
            "name": "逆向工程設計",
            "description": "從現有數據庫逆向生成",
            "db_type": db_structure.get("db_type", "mysql"),
            "schemas": db_structure.get("schemas", []),
            "relationships": db_structure.get("relationships", []),
            "created_by": created_by
        }
    
    def _parse_sql_script(self, sql_script: str) -> Dict:
        """解析SQL腳本（簡化實現）"""
        # 這裡應該實現完整的SQL解析器
        return {
            "db_type": "mysql",  # 默認類型
            "schemas": [
                {
                    "name": "default",
                    "tables": [],
                    "views": [],
                    "procedures": [],
                    "functions": []
                }
            ],
            "relationships": []
        }
    
    def _compare_database_designs(self, design1: Dict, design2: Dict) -> Dict:
        """比較兩個數據庫設計"""
        comparison = {
            "differences": [],
            "additions": [],
            "deletions": [],
            "modifications": [],
            "summary": {}
        }
        
        try:
            # 簡化的比較邏輯
            schemas1 = {schema["name"]: schema for schema in design1.get("schemas", [])}
            schemas2 = {schema["name"]: schema for schema in design2.get("schemas", [])}
            
            # 找出差異
            for schema_name in set(schemas1.keys()) | set(schemas2.keys()):
                if schema_name not in schemas1:
                    comparison["additions"].append(f"新增架構: {schema_name}")
                elif schema_name not in schemas2:
                    comparison["deletions"].append(f"刪除架構: {schema_name}")
                else:
                    # 比較表
                    tables1 = {table["name"]: table for table in schemas1[schema_name].get("tables", [])}
                    tables2 = {table["name"]: table for table in schemas2[schema_name].get("tables", [])}
                    
                    for table_name in set(tables1.keys()) | set(tables2.keys()):
                        if table_name not in tables1:
                            comparison["additions"].append(f"新增表: {schema_name}.{table_name}")
                        elif table_name not in tables2:
                            comparison["deletions"].append(f"刪除表: {schema_name}.{table_name}")
            
            comparison["summary"] = {
                "total_differences": len(comparison["differences"]),
                "total_additions": len(comparison["additions"]),
                "total_deletions": len(comparison["deletions"]),
                "total_modifications": len(comparison["modifications"])
            }
            
        except Exception as e:
            comparison["error"] = str(e)
        
        return comparison
    
    def _generate_sync_script(self, design_data: Dict, target_connection: Dict) -> str:
        """生成同步腳本"""
        try:
            script_parts = [
                f"-- Sync script for {design_data['name']}",
                f"-- Target: {target_connection.get('database', 'unknown')}",
                f"-- Generated: {datetime.now().isoformat()}",
                "",
                "-- TODO: Add actual synchronization commands",
                "-- This would include ALTER TABLE statements, etc."
            ]
            
            return "\n".join(script_parts)
            
        except Exception as e:
            return f"-- 生成同步腳本失敗: {str(e)}"


# 全局控制器實例
db_design_controller = None


def init_db_design_controller(db_instance):
    """初始化數據庫設計控制器"""
    global db_design_controller
    db_design_controller = DatabaseDesignController(db_instance)
    return db_design_controller