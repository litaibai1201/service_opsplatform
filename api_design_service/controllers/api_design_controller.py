# -*- coding: utf-8 -*-
"""
@文件: api_design_controller.py
@說明: API設計控制器 (API Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import yaml
import uuid
import secrets
import traceback
import requests
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional, List
from flask import request, g

from dbs.mongodb.models import ApiSpecModel, ApiMockModel, ApiUsageAnalyticsModel
from loggers import logger
from cache import redis_client


class ApiDesignController:
    """API設計控制器"""
    
    # 類級別的單例緩存
    _instance = None
    _initialized = False
    
    def __new__(cls, db_instance=None):
        if cls._instance is None:
            cls._instance = super(ApiDesignController, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, db_instance=None):
        # 避免重複初始化
        if ApiDesignController._initialized:
            return
            
        self.db = db_instance
        self.spec_model = ApiSpecModel()
        self.mock_model = ApiMockModel()
        self.analytics_model = ApiUsageAnalyticsModel()
        
        # 支持的API類型
        self.supported_types = ["rest", "graphql", "grpc", "websocket"]
        
        # 支持的狀態
        self.supported_statuses = ["draft", "review", "published", "deprecated"]
        
        # 支持的導出格式
        self.supported_export_formats = ["json", "yaml", "html", "pdf", "markdown"]
        
        ApiDesignController._initialized = True
        logger.info("API設計控制器初始化完成")
    
    # ==================== API規範管理 ====================
    
    def create_api_spec(self, project_id: str, name: str, description: str = None,
                       spec_type: str = "rest", spec: Dict = None, version: str = "1.0.0",
                       status: str = "draft", environments: List = None,
                       created_by: str = None) -> Tuple[bool, Any]:
        """創建API規範"""
        try:
            # 驗證輸入
            if not project_id or not name:
                return False, "項目ID和API規範名稱不能為空"
            
            if spec_type not in self.supported_types:
                return False, f"不支持的API類型: {spec_type}"
            
            if status not in self.supported_statuses:
                return False, f"不支持的狀態: {status}"
            
            # 驗證規範格式
            if spec:
                flag, msg = self._validate_spec_format(spec, spec_type)
                if not flag:
                    return False, f"規範格式驗證失敗: {msg}"
            
            return self.spec_model.create_spec(
                project_id=project_id,
                name=name,
                description=description,
                spec_type=spec_type,
                spec=spec,
                version=version,
                status=status,
                environments=environments,
                created_by=created_by
            )
            
        except Exception as e:
            logger.error(f"創建API規範失敗: {str(e)}")
            logger.error(traceback.format_exc())
            return False, "創建API規範失敗"
    
    def get_api_spec(self, spec_id: str, include_full_spec: bool = True) -> Tuple[bool, Any]:
        """獲取API規範詳情"""
        try:
            flag, result = self.spec_model.get_spec_by_id(spec_id)
            if not flag:
                return False, result
            
            # 如果不需要完整規範，移除大型字段
            if not include_full_spec:
                result.pop("spec", None)
                result.pop("testing", None)
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取API規範失敗: {str(e)}")
            return False, "獲取API規範失敗"
    
    def get_project_api_specs(self, project_id: str, spec_type: str = None,
                             status: str = None, page: int = 1, 
                             limit: int = 20) -> Tuple[bool, Any]:
        """獲取項目API規範列表"""
        try:
            return self.spec_model.get_specs_by_project(
                project_id=project_id,
                spec_type=spec_type,
                status=status,
                page=page,
                limit=limit
            )
            
        except Exception as e:
            logger.error(f"獲取項目API規範列表失敗: {str(e)}")
            return False, "獲取API規範列表失敗"
    
    def update_api_spec(self, spec_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新API規範"""
        try:
            # 驗證更新數據
            if "type" in updates and updates["type"] not in self.supported_types:
                return False, f"不支持的API類型: {updates['type']}"
            
            if "status" in updates and updates["status"] not in self.supported_statuses:
                return False, f"不支持的狀態: {updates['status']}"
            
            if "spec" in updates:
                spec_type = updates.get("type", "rest")
                # 如果沒有指定類型，需要先獲取當前規範類型
                if "type" not in updates:
                    flag, current_spec = self.get_api_spec(spec_id, include_full_spec=False)
                    if flag:
                        spec_type = current_spec.get("type", "rest")
                
                flag, msg = self._validate_spec_format(updates["spec"], spec_type)
                if not flag:
                    return False, f"規範格式驗證失敗: {msg}"
            
            return self.spec_model.update_spec(spec_id, updates)
            
        except Exception as e:
            logger.error(f"更新API規範失敗: {str(e)}")
            return False, "更新API規範失敗"
    
    def delete_api_spec(self, spec_id: str) -> Tuple[bool, str]:
        """刪除API規範"""
        try:
            return self.spec_model.delete_spec(spec_id)
            
        except Exception as e:
            logger.error(f"刪除API規範失敗: {str(e)}")
            return False, "刪除API規範失敗"
    
    def duplicate_api_spec(self, spec_id: str, new_name: str, 
                          created_by: str) -> Tuple[bool, Any]:
        """複製API規範"""
        try:
            return self.spec_model.duplicate_spec(spec_id, new_name, created_by)
            
        except Exception as e:
            logger.error(f"複製API規範失敗: {str(e)}")
            return False, "複製API規範失敗"
    
    # ==================== 版本管理 ====================
    
    def get_spec_versions(self, spec_id: str) -> Tuple[bool, Any]:
        """獲取API規範版本列表"""
        try:
            return self.spec_model.get_versions(spec_id)
            
        except Exception as e:
            logger.error(f"獲取版本列表失敗: {str(e)}")
            return False, "獲取版本列表失敗"
    
    def create_spec_version(self, spec_id: str, new_version: str, 
                           created_by: str) -> Tuple[bool, Any]:
        """創建新版本"""
        try:
            return self.spec_model.create_version(spec_id, new_version, created_by)
            
        except Exception as e:
            logger.error(f"創建新版本失敗: {str(e)}")
            return False, "創建新版本失敗"
    
    def publish_spec(self, spec_id: str) -> Tuple[bool, Any]:
        """發布規範"""
        try:
            return self.spec_model.publish_spec(spec_id)
            
        except Exception as e:
            logger.error(f"發布規範失敗: {str(e)}")
            return False, "發布規範失敗"
    
    def deprecate_spec(self, spec_id: str) -> Tuple[bool, Any]:
        """廢弃規範"""
        try:
            return self.spec_model.deprecate_spec(spec_id)
            
        except Exception as e:
            logger.error(f"廢弃規範失敗: {str(e)}")
            return False, "廢弃規範失敗"
    
    # ==================== 驗證和測試 ====================
    
    def validate_api_spec(self, spec_id: str, strict_mode: bool = False) -> Tuple[bool, Any]:
        """驗證API規範"""
        try:
            # 獲取API規範
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            spec = spec_data.get("spec", {})
            spec_type = spec_data.get("type", "rest")
            
            # 執行驗證
            validation_result = self._perform_validation(spec, spec_type, strict_mode)
            
            return True, validation_result
            
        except Exception as e:
            logger.error(f"驗證API規範失敗: {str(e)}")
            return False, "驗證API規範失敗"
    
    def test_api_endpoints(self, spec_id: str, environment: str = "dev",
                          test_config: Dict = None) -> Tuple[bool, Any]:
        """測試API端點"""
        try:
            # 獲取API規範
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            # 獲取環境配置
            env_config = None
            for env in spec_data.get("environments", []):
                if env["name"] == environment:
                    env_config = env
                    break
            
            if not env_config:
                return False, f"環境配置不存在: {environment}"
            
            # 執行測試
            test_results = self._perform_endpoint_testing(
                spec_data["spec"], env_config, test_config
            )
            
            # 更新測試結果
            self.spec_model.update_spec(spec_id, {
                "testing.last_test_run": datetime.now(timezone.utc),
                "testing.coverage_report": test_results.get("coverage", {}),
                "testing.performance_metrics": test_results.get("performance", {})
            })
            
            return True, test_results
            
        except Exception as e:
            logger.error(f"測試API端點失敗: {str(e)}")
            return False, "測試API端點失敗"
    
    def get_test_results(self, spec_id: str) -> Tuple[bool, Any]:
        """獲取測試結果"""
        try:
            flag, spec_data = self.get_api_spec(spec_id, include_full_spec=False)
            if not flag:
                return False, spec_data
            
            testing_data = spec_data.get("testing", {})
            
            return True, {
                "last_test_run": testing_data.get("last_test_run"),
                "coverage_report": testing_data.get("coverage_report", {}),
                "performance_metrics": testing_data.get("performance_metrics", {}),
                "test_cases": testing_data.get("test_cases", [])
            }
            
        except Exception as e:
            logger.error(f"獲取測試結果失敗: {str(e)}")
            return False, "獲取測試結果失敗"
    
    def create_test_suite(self, spec_id: str, test_cases: List[Dict]) -> Tuple[bool, Any]:
        """創建測試套件"""
        try:
            # 驗證測試用例
            for test_case in test_cases:
                if not self._validate_test_case(test_case):
                    return False, f"無效的測試用例: {test_case.get('name', 'unnamed')}"
            
            # 更新測試用例
            flag, result = self.spec_model.update_spec(spec_id, {
                "testing.test_cases": test_cases
            })
            
            if flag:
                return True, {"test_cases_count": len(test_cases), "message": "測試套件創建成功"}
            else:
                return False, result
            
        except Exception as e:
            logger.error(f"創建測試套件失敗: {str(e)}")
            return False, "創建測試套件失敗"
    
    # ==================== 文檔生成 ====================
    
    def generate_documentation(self, spec_id: str, doc_type: str = "html") -> Tuple[bool, Any]:
        """生成API文檔"""
        try:
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            # 生成文檔
            doc_content = self._generate_doc_content(spec_data, doc_type)
            
            # 更新文檔狀態
            self.spec_model.update_spec(spec_id, {
                "documentation.auto_generated": True,
                "documentation.last_generated": datetime.now(timezone.utc)
            })
            
            return True, {
                "type": doc_type,
                "content": doc_content,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"生成API文檔失敗: {str(e)}")
            return False, "生成API文檔失敗"
    
    def get_api_docs(self, spec_id: str) -> Tuple[bool, Any]:
        """獲取API文檔"""
        try:
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            documentation = spec_data.get("documentation", {})
            
            return True, {
                "examples": documentation.get("examples", []),
                "guides": documentation.get("guides", []),
                "changelogs": documentation.get("changelogs", []),
                "auto_generated": documentation.get("auto_generated", False),
                "last_generated": documentation.get("last_generated")
            }
            
        except Exception as e:
            logger.error(f"獲取API文檔失敗: {str(e)}")
            return False, "獲取API文檔失敗"
    
    def export_documentation(self, spec_id: str, export_format: str = "html") -> Tuple[bool, Any]:
        """導出API文檔"""
        try:
            if export_format not in self.supported_export_formats:
                return False, f"不支持的導出格式: {export_format}"
            
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            # 生成導出內容
            export_content = self._export_doc_content(spec_data, export_format)
            
            return True, {
                "format": export_format,
                "content": export_content,
                "filename": f"{spec_data['name']}_api_docs.{export_format}",
                "exported_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"導出API文檔失敗: {str(e)}")
            return False, "導出API文檔失敗"
    
    # ==================== Mock服務 ====================
    
    def get_api_mocks(self, spec_id: str, page: int = 1, limit: int = 20) -> Tuple[bool, Any]:
        """獲取API規範的Mock列表"""
        try:
            return self.mock_model.get_mocks_by_spec(spec_id, page, limit)
            
        except Exception as e:
            logger.error(f"獲取Mock列表失敗: {str(e)}")
            return False, "獲取Mock列表失敗"
    
    def create_api_mock(self, spec_id: str, endpoint_path: str, method: str,
                       mock_data: Dict, rules: Dict = None,
                       response_scenarios: List = None, 
                       created_by: str = None) -> Tuple[bool, Any]:
        """創建Mock數據"""
        try:
            return self.mock_model.create_mock(
                api_spec_id=spec_id,
                endpoint_path=endpoint_path,
                method=method,
                mock_data=mock_data,
                rules=rules,
                response_scenarios=response_scenarios,
                created_by=created_by
            )
            
        except Exception as e:
            logger.error(f"創建Mock數據失敗: {str(e)}")
            return False, "創建Mock數據失敗"
    
    def update_api_mock(self, mock_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新Mock數據"""
        try:
            return self.mock_model.update_mock(mock_id, updates)
            
        except Exception as e:
            logger.error(f"更新Mock數據失敗: {str(e)}")
            return False, "更新Mock數據失敗"
    
    def delete_api_mock(self, mock_id: str) -> Tuple[bool, str]:
        """刪除Mock數據"""
        try:
            return self.mock_model.delete_mock(mock_id)
            
        except Exception as e:
            logger.error(f"刪除Mock數據失敗: {str(e)}")
            return False, "刪除Mock數據失敗"
    
    def activate_mock(self, mock_id: str, is_active: bool = True) -> Tuple[bool, Any]:
        """激活/停用Mock數據"""
        try:
            return self.mock_model.activate_mock(mock_id, is_active)
            
        except Exception as e:
            logger.error(f"更新Mock狀態失敗: {str(e)}")
            return False, "更新Mock狀態失敗"
    
    # ==================== 代碼生成 ====================
    
    def generate_client_code(self, spec_id: str, language: str = "javascript",
                            options: Dict = None) -> Tuple[bool, Any]:
        """生成客戶端代碼"""
        try:
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            # 生成客戶端代碼
            client_code = self._generate_client_code(spec_data, language, options)
            
            return True, {
                "language": language,
                "code": client_code,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"生成客戶端代碼失敗: {str(e)}")
            return False, "生成客戶端代碼失敗"
    
    def generate_server_code(self, spec_id: str, framework: str = "express",
                            options: Dict = None) -> Tuple[bool, Any]:
        """生成服務端代碼"""
        try:
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            # 生成服務端代碼
            server_code = self._generate_server_code(spec_data, framework, options)
            
            return True, {
                "framework": framework,
                "code": server_code,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"生成服務端代碼失敗: {str(e)}")
            return False, "生成服務端代碼失敗"
    
    def get_code_templates(self, spec_id: str) -> Tuple[bool, Any]:
        """獲取代碼模板"""
        try:
            flag, spec_data = self.get_api_spec(spec_id)
            if not flag:
                return False, spec_data
            
            templates = self._get_available_templates(spec_data["type"])
            
            return True, templates
            
        except Exception as e:
            logger.error(f"獲取代碼模板失敗: {str(e)}")
            return False, "獲取代碼模板失敗"
    
    # ==================== 分析統計 ====================
    
    def get_api_analytics(self, spec_id: str, days: int = 30) -> Tuple[bool, Any]:
        """獲取API使用分析"""
        try:
            return self.analytics_model.get_analytics_by_spec(spec_id, days)
            
        except Exception as e:
            logger.error(f"獲取API分析失敗: {str(e)}")
            return False, "獲取API分析失敗"
    
    def get_performance_analytics(self, spec_id: str, days: int = 7) -> Tuple[bool, Any]:
        """獲取性能分析"""
        try:
            return self.analytics_model.get_performance_analytics(spec_id, days)
            
        except Exception as e:
            logger.error(f"獲取性能分析失敗: {str(e)}")
            return False, "獲取性能分析失敗"
    
    def record_api_usage(self, spec_id: str, endpoint: str, method: str,
                        response_time: float = None, status_code: int = 200) -> Tuple[bool, str]:
        """記錄API使用情況"""
        try:
            return self.analytics_model.record_usage(
                api_spec_id=spec_id,
                endpoint=endpoint,
                method=method,
                response_time=response_time,
                status_code=status_code
            )
            
        except Exception as e:
            logger.error(f"記錄API使用失敗: {str(e)}")
            return False, "記錄API使用失敗"
    
    # ==================== 私有方法 ====================
    
    def _validate_spec_format(self, spec: Dict, spec_type: str) -> Tuple[bool, str]:
        """驗證規範格式"""
        try:
            if spec_type == "rest":
                # 驗證OpenAPI規範
                if "openapi" not in spec and "swagger" not in spec:
                    return False, "OpenAPI規範缺少版本信息"
                
                if "info" not in spec:
                    return False, "OpenAPI規範缺少info字段"
                
                if "paths" not in spec:
                    return False, "OpenAPI規範缺少paths字段"
                
            elif spec_type == "graphql":
                # 驗證GraphQL規範
                if "schema" not in spec:
                    return False, "GraphQL規範缺少schema字段"
                
            elif spec_type == "grpc":
                # 驗證gRPC規範
                if "services" not in spec:
                    return False, "gRPC規範缺少services字段"
                
            return True, "驗證通過"
            
        except Exception as e:
            return False, f"驗證過程中發生錯誤: {str(e)}"
    
    def _perform_validation(self, spec: Dict, spec_type: str, strict_mode: bool) -> Dict:
        """執行規範驗證"""
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": [],
            "metrics": {}
        }
        
        try:
            if spec_type == "rest":
                # OpenAPI驗證
                paths = spec.get("paths", {})
                
                # 檢查路徑定義
                if not paths:
                    validation_result["warnings"].append("API沒有定義任何路徑")
                
                endpoint_count = 0
                method_count = 0
                
                for path, path_item in paths.items():
                    endpoint_count += 1
                    
                    # 檢查路徑格式
                    if not path.startswith("/"):
                        validation_result["errors"].append(f"路徑格式錯誤: {path}")
                        validation_result["is_valid"] = False
                    
                    # 檢查HTTP方法
                    http_methods = ["get", "post", "put", "delete", "patch", "options", "head"]
                    for method in http_methods:
                        if method in path_item:
                            method_count += 1
                            operation = path_item[method]
                            
                            # 檢查操作描述
                            if strict_mode and "description" not in operation:
                                validation_result["warnings"].append(f"操作缺少描述: {method.upper()} {path}")
                            
                            # 檢查響應定義
                            if "responses" not in operation:
                                validation_result["errors"].append(f"操作缺少響應定義: {method.upper()} {path}")
                                validation_result["is_valid"] = False
                
                validation_result["metrics"] = {
                    "total_endpoints": endpoint_count,
                    "total_operations": method_count,
                    "complexity_score": endpoint_count + method_count
                }
                
                # 建議
                if endpoint_count > 50:
                    validation_result["suggestions"].append("API端點較多，建議考慮拆分為多個規範")
                
                if method_count > 100:
                    validation_result["suggestions"].append("API操作較多，建議檢查是否存在冗餘")
            
            elif spec_type == "graphql":
                # GraphQL驗證
                schema = spec.get("schema", "")
                if not schema.strip():
                    validation_result["warnings"].append("GraphQL schema為空")
                
                types = spec.get("types", {})
                queries = spec.get("queries", {})
                mutations = spec.get("mutations", {})
                
                validation_result["metrics"] = {
                    "total_types": len(types),
                    "total_queries": len(queries),
                    "total_mutations": len(mutations)
                }
            
        except Exception as e:
            validation_result["errors"].append(f"驗證過程中發生錯誤: {str(e)}")
            validation_result["is_valid"] = False
        
        return validation_result
    
    def _perform_endpoint_testing(self, spec: Dict, env_config: Dict, 
                                 test_config: Dict = None) -> Dict:
        """執行端點測試"""
        test_results = {
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0
            },
            "details": [],
            "coverage": {},
            "performance": {}
        }
        
        try:
            base_url = env_config.get("base_url", "")
            headers = env_config.get("headers", {})
            
            if spec.get("openapi") or spec.get("swagger"):
                # 測試OpenAPI端點
                paths = spec.get("paths", {})
                
                for path, path_item in paths.items():
                    for method, operation in path_item.items():
                        if method.lower() in ["get", "post", "put", "delete", "patch"]:
                            test_results["summary"]["total_tests"] += 1
                            
                            try:
                                # 構建測試URL
                                test_url = f"{base_url}{path}"
                                
                                # 執行HTTP請求
                                response = self._execute_http_test(
                                    method.upper(), test_url, headers, operation
                                )
                                
                                if response["status"] == "success":
                                    test_results["summary"]["passed"] += 1
                                else:
                                    test_results["summary"]["failed"] += 1
                                
                                test_results["details"].append({
                                    "endpoint": f"{method.upper()} {path}",
                                    "status": response["status"],
                                    "response_time": response.get("response_time", 0),
                                    "status_code": response.get("status_code", 0),
                                    "message": response.get("message", "")
                                })
                                
                            except Exception as e:
                                test_results["summary"]["failed"] += 1
                                test_results["details"].append({
                                    "endpoint": f"{method.upper()} {path}",
                                    "status": "error",
                                    "message": str(e)
                                })
            
            # 計算覆蓋率
            if test_results["summary"]["total_tests"] > 0:
                test_results["coverage"]["percentage"] = (
                    test_results["summary"]["passed"] / test_results["summary"]["total_tests"]
                ) * 100
            
            # 計算平均響應時間
            response_times = [
                detail.get("response_time", 0) 
                for detail in test_results["details"]
                if detail.get("response_time")
            ]
            
            if response_times:
                test_results["performance"]["avg_response_time"] = sum(response_times) / len(response_times)
                test_results["performance"]["max_response_time"] = max(response_times)
                test_results["performance"]["min_response_time"] = min(response_times)
            
        except Exception as e:
            logger.error(f"端點測試失敗: {str(e)}")
            test_results["summary"]["error"] = str(e)
        
        return test_results
    
    def _execute_http_test(self, method: str, url: str, headers: Dict, 
                          operation: Dict) -> Dict:
        """執行HTTP測試"""
        try:
            import time
            start_time = time.time()
            
            # 簡化的HTTP請求（實際應該根據操作定義構建請求）
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json={}, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json={}, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return {"status": "skipped", "message": f"不支持的HTTP方法: {method}"}
            
            response_time = (time.time() - start_time) * 1000  # 轉換為毫秒
            
            # 檢查響應
            expected_responses = operation.get("responses", {})
            if str(response.status_code) in expected_responses:
                return {
                    "status": "success",
                    "response_time": response_time,
                    "status_code": response.status_code,
                    "message": "測試通過"
                }
            else:
                return {
                    "status": "failed",
                    "response_time": response_time,
                    "status_code": response.status_code,
                    "message": f"意外的響應狀態碼: {response.status_code}"
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "status": "failed",
                "message": f"請求失敗: {str(e)}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"測試執行錯誤: {str(e)}"
            }
    
    def _validate_test_case(self, test_case: Dict) -> bool:
        """驗證測試用例"""
        required_fields = ["name", "method", "path"]
        return all(field in test_case for field in required_fields)
    
    def _generate_doc_content(self, spec_data: Dict, doc_type: str) -> str:
        """生成文檔內容"""
        try:
            if doc_type == "html":
                return self._generate_html_docs(spec_data)
            elif doc_type == "markdown":
                return self._generate_markdown_docs(spec_data)
            else:
                return json.dumps(spec_data, indent=2, ensure_ascii=False)
                
        except Exception as e:
            logger.error(f"生成文檔內容失敗: {str(e)}")
            return f"文檔生成失敗: {str(e)}"
    
    def _generate_html_docs(self, spec_data: Dict) -> str:
        """生成HTML文檔"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{spec_data['name']} API Documentation</title>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ color: #333; }}
                h2 {{ color: #666; }}
                .endpoint {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; }}
                .method {{ font-weight: bold; text-transform: uppercase; }}
                .path {{ font-family: monospace; background: #f5f5f5; padding: 2px 5px; }}
            </style>
        </head>
        <body>
            <h1>{spec_data['name']}</h1>
            <p>{spec_data.get('description', '')}</p>
            <p><strong>Version:</strong> {spec_data.get('version', '')}</p>
            <p><strong>Type:</strong> {spec_data.get('type', '')}</p>
            <p><strong>Status:</strong> {spec_data.get('status', '')}</p>
            
            <h2>API Endpoints</h2>
        """
        
        spec = spec_data.get("spec", {})
        if spec.get("paths"):
            for path, methods in spec["paths"].items():
                for method, operation in methods.items():
                    if method.lower() in ["get", "post", "put", "delete", "patch"]:
                        html += f"""
                        <div class="endpoint">
                            <div><span class="method">{method}</span> <span class="path">{path}</span></div>
                            <p>{operation.get('description', operation.get('summary', ''))}</p>
                        </div>
                        """
        
        html += "</body></html>"
        return html
    
    def _generate_markdown_docs(self, spec_data: Dict) -> str:
        """生成Markdown文檔"""
        markdown = f"""# {spec_data['name']}

{spec_data.get('description', '')}

**Version:** {spec_data.get('version', '')}  
**Type:** {spec_data.get('type', '')}  
**Status:** {spec_data.get('status', '')}

## API Endpoints

"""
        
        spec = spec_data.get("spec", {})
        if spec.get("paths"):
            for path, methods in spec["paths"].items():
                for method, operation in methods.items():
                    if method.lower() in ["get", "post", "put", "delete", "patch"]:
                        markdown += f"""### {method.upper()} {path}

{operation.get('description', operation.get('summary', ''))}

"""
        
        return markdown
    
    def _export_doc_content(self, spec_data: Dict, export_format: str) -> str:
        """導出文檔內容"""
        if export_format == "json":
            return json.dumps(spec_data, indent=2, ensure_ascii=False)
        elif export_format == "yaml":
            return yaml.dump(spec_data, default_flow_style=False, allow_unicode=True)
        elif export_format == "html":
            return self._generate_html_docs(spec_data)
        elif export_format == "markdown":
            return self._generate_markdown_docs(spec_data)
        else:
            return str(spec_data)
    
    def _generate_client_code(self, spec_data: Dict, language: str, options: Dict = None) -> str:
        """生成客戶端代碼"""
        if language == "javascript":
            return self._generate_js_client(spec_data, options)
        elif language == "python":
            return self._generate_python_client(spec_data, options)
        else:
            return f"// {language} 客戶端代碼生成待實現"
    
    def _generate_js_client(self, spec_data: Dict, options: Dict = None) -> str:
        """生成JavaScript客戶端代碼"""
        code = f"""// {spec_data['name']} API Client
// Generated at {datetime.now().isoformat()}

class {spec_data['name'].replace(' ', '')}Client {{
    constructor(baseURL = 'https://api.example.com') {{
        this.baseURL = baseURL;
    }}

    async request(method, path, data = null) {{
        const url = `${{this.baseURL}}${{path}}`;
        const options = {{
            method: method,
            headers: {{
                'Content-Type': 'application/json',
            }},
        }};

        if (data) {{
            options.body = JSON.stringify(data);
        }}

        const response = await fetch(url, options);
        return response.json();
    }}
"""
        
        # 添加端點方法
        spec = spec_data.get("spec", {})
        if spec.get("paths"):
            for path, methods in spec["paths"].items():
                for method, operation in methods.items():
                    if method.lower() in ["get", "post", "put", "delete"]:
                        method_name = operation.get("operationId", f"{method}_{path.replace('/', '_').replace('{', '').replace('}', '')}")
                        code += f"""
    async {method_name}(data) {{
        return this.request('{method.upper()}', '{path}', data);
    }}
"""
        
        code += "\n}\n\nexport default " + spec_data['name'].replace(' ', '') + "Client;"
        return code
    
    def _generate_python_client(self, spec_data: Dict, options: Dict = None) -> str:
        """生成Python客戶端代碼"""
        code = f"""\"\"\"
{spec_data['name']} API Client
Generated at {datetime.now().isoformat()}
\"\"\"

import requests
from typing import Dict, Any, Optional


class {spec_data['name'].replace(' ', '')}Client:
    def __init__(self, base_url: str = "https://api.example.com"):
        self.base_url = base_url
        self.session = requests.Session()

    def request(self, method: str, path: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{{self.base_url}}{{path}}"
        response = self.session.request(method, url, json=data)
        response.raise_for_status()
        return response.json()
"""
        
        # 添加端點方法
        spec = spec_data.get("spec", {})
        if spec.get("paths"):
            for path, methods in spec["paths"].items():
                for method, operation in methods.items():
                    if method.lower() in ["get", "post", "put", "delete"]:
                        method_name = operation.get("operationId", f"{method}_{path.replace('/', '_').replace('{', '').replace('}', '')}")
                        code += f"""
    def {method_name}(self, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self.request("{method.upper()}", "{path}", data)
"""
        
        return code
    
    def _generate_server_code(self, spec_data: Dict, framework: str, options: Dict = None) -> str:
        """生成服務端代碼"""
        if framework == "express":
            return self._generate_express_server(spec_data, options)
        elif framework == "flask":
            return self._generate_flask_server(spec_data, options)
        else:
            return f"// {framework} 服務端代碼生成待實現"
    
    def _generate_express_server(self, spec_data: Dict, options: Dict = None) -> str:
        """生成Express服務端代碼"""
        code = f"""// {spec_data['name']} API Server
// Generated at {datetime.now().isoformat()}

const express = require('express');
const app = express();

app.use(express.json());

"""
        
        # 添加路由
        spec = spec_data.get("spec", {})
        if spec.get("paths"):
            for path, methods in spec["paths"].items():
                for method, operation in methods.items():
                    if method.lower() in ["get", "post", "put", "delete"]:
                        code += f"""
app.{method.lower()}('{path}', (req, res) => {{
    // TODO: 實現 {operation.get('summary', path)} 邏輯
    res.json({{ message: 'Not implemented' }});
}});
"""
        
        code += """
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
"""
        return code
    
    def _generate_flask_server(self, spec_data: Dict, options: Dict = None) -> str:
        """生成Flask服務端代碼"""
        code = f"""\"\"\"
{spec_data['name']} API Server
Generated at {datetime.now().isoformat()}
\"\"\"

from flask import Flask, request, jsonify

app = Flask(__name__)

"""
        
        # 添加路由
        spec = spec_data.get("spec", {})
        if spec.get("paths"):
            for path, methods in spec["paths"].items():
                for method, operation in methods.items():
                    if method.lower() in ["get", "post", "put", "delete"]:
                        flask_path = path.replace('{', '<').replace('}', '>')
                        code += f"""
@app.route('{flask_path}', methods=['{method.upper()}'])
def {operation.get('operationId', f"{method}_{path.replace('/', '_').replace('{', '').replace('}', '')}")}():
    # TODO: 實現 {operation.get('summary', path)} 邏輯
    return jsonify({{'message': 'Not implemented'}})
"""
        
        code += """
if __name__ == '__main__':
    app.run(debug=True)
"""
        return code
    
    def _get_available_templates(self, api_type: str) -> Dict:
        """獲取可用的代碼模板"""
        templates = {
            "client_languages": ["javascript", "python", "java", "csharp", "go"],
            "server_frameworks": ["express", "flask", "spring", "aspnet", "gin"],
            "documentation_formats": ["html", "markdown", "pdf", "swagger-ui"]
        }
        
        if api_type == "graphql":
            templates["client_languages"].extend(["apollo-client", "relay"])
            templates["server_frameworks"].extend(["apollo-server", "graphql-yoga"])
        
        return templates


# 全局控制器實例
api_design_controller = None


def init_api_design_controller(db_instance):
    """初始化API設計控制器"""
    global api_design_controller
    api_design_controller = ApiDesignController(db_instance)
    return api_design_controller