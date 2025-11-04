# -*- coding: utf-8 -*-
"""
@文件: test_feature_map_service.py
@說明: 功能導圖服務完整測試腳本
@時間: 2025-01-09
@作者: LiDong
"""

import json
import requests
import time
from datetime import datetime

class FeatureMapServiceTester:
    """功能導圖服務測試器"""
    
    def __init__(self, base_url="http://localhost:25698"):
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json"
        }
        self.project_id = "test_project_001"
        self.feature_map_id = None
        
    def test_health_check(self):
        """測試服務健康檢查"""
        print("\n🔍 測試服務健康檢查...")
        try:
            response = requests.get(f"{self.base_url}/health")
            print(f"狀態碼: {response.status_code}")
            if response.status_code == 200:
                print("✅ 服務正常運行")
                return True
            else:
                print("❌ 服務無響應")
                return False
        except Exception as e:
            print(f"❌ 連接失敗: {str(e)}")
            return False
    
    def test_create_feature_map(self):
        """測試創建功能導圖"""
        print("\n📝 測試創建功能導圖...")
        
        create_data = {
            "name": "電商平台功能導圖",
            "description": "完整的電商平台功能架構圖",
            "type": "feature_breakdown",
            "mind_map": {
                "root": {
                    "id": "root",
                    "title": "電商平台",
                    "description": "核心電商功能",
                    "status": "planned",
                    "priority": "high",
                    "assignee": "team_lead",
                    "estimated_hours": 2000,
                    "tags": ["核心", "平台"],
                    "children": [
                        {
                            "id": "user_mgmt",
                            "title": "用戶管理",
                            "description": "用戶註冊、登錄、權限管理",
                            "status": "in_progress",
                            "priority": "high",
                            "assignee": "dev_team_1",
                            "estimated_hours": 200,
                            "tags": ["用戶", "認證"],
                            "children": []
                        },
                        {
                            "id": "product_mgmt",
                            "title": "商品管理",
                            "description": "商品展示、分類、庫存管理",
                            "status": "planned",
                            "priority": "medium",
                            "assignee": "dev_team_2",
                            "estimated_hours": 300,
                            "tags": ["商品", "庫存"],
                            "children": []
                        }
                    ]
                }
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/projects/{self.project_id}/feature-maps",
                headers=self.headers,
                json=create_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                self.feature_map_id = result["data"]["id"]
                print(f"✅ 創建成功，導圖ID: {self.feature_map_id}")
                return True
            else:
                print(f"❌ 創建失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_get_feature_maps(self):
        """測試獲取功能導圖列表"""
        print("\n📋 測試獲取功能導圖列表...")
        
        try:
            response = requests.get(
                f"{self.base_url}/projects/{self.project_id}/feature-maps",
                headers=self.headers
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                maps_count = len(result["data"]["items"])
                print(f"✅ 獲取成功，共 {maps_count} 個導圖")
                return True
            else:
                print(f"❌ 獲取失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_get_feature_map_detail(self):
        """測試獲取功能導圖詳情"""
        print("\n🔍 測試獲取功能導圖詳情...")
        
        if not self.feature_map_id:
            print("❌ 沒有可用的導圖ID")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/feature-maps/{self.feature_map_id}",
                headers=self.headers
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                feature_map = result["data"]
                print(f"✅ 獲取成功，導圖名稱: {feature_map['name']}")
                print(f"   節點數量: {len(feature_map.get('mind_map_data', {}).get('root_node', {}).get('children', []))}")
                return True
            else:
                print(f"❌ 獲取失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_add_node(self):
        """測試添加節點"""
        print("\n➕ 測試添加節點...")
        
        if not self.feature_map_id:
            print("❌ 沒有可用的導圖ID")
            return False
        
        node_data = {
            "parent_node_id": "root",
            "title": "訂單管理",
            "description": "訂單創建、支付、發貨流程",
            "status": "planned",
            "priority": "high",
            "assignee": "dev_team_3",
            "estimated_hours": 150,
            "tags": ["訂單", "支付"]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/feature-maps/{self.feature_map_id}/nodes",
                headers=self.headers,
                json=node_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                print("✅ 節點添加成功")
                return True
            else:
                print(f"❌ 節點添加失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_create_dependency(self):
        """測試創建依賴關係"""
        print("\n🔗 測試創建依賴關係...")
        
        if not self.feature_map_id:
            print("❌ 沒有可用的導圖ID")
            return False
        
        dependency_data = {
            "source_feature_id": "user_mgmt",
            "target_feature_id": "order_mgmt",
            "dependency_type": "requires",
            "description": "用戶管理是訂單管理的前置條件"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/feature-maps/{self.feature_map_id}/dependencies",
                headers=self.headers,
                json=dependency_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                print("✅ 依賴關係創建成功")
                return True
            else:
                print(f"❌ 依賴關係創建失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_get_project_stats(self):
        """測試獲取項目統計"""
        print("\n📊 測試獲取項目統計...")
        
        if not self.feature_map_id:
            print("❌ 沒有可用的導圖ID")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/feature-maps/{self.feature_map_id}/metrics",
                headers=self.headers
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                stats = result["data"]
                print(f"✅ 統計獲取成功")
                print(f"   節點數量: {stats.get('node_count', 0)}")
                print(f"   完成節點: {stats.get('completed_nodes', 0)}")
                print(f"   依賴數量: {stats.get('dependency_count', 0)}")
                return True
            else:
                print(f"❌ 統計獲取失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_export_feature_map(self):
        """測試導出功能導圖"""
        print("\n📤 測試導出功能導圖...")
        
        if not self.feature_map_id:
            print("❌ 沒有可用的導圖ID")
            return False
        
        try:
            response = requests.post(
                f"{self.base_url}/feature-maps/{self.feature_map_id}/export",
                headers=self.headers,
                json={"format": "json"}
            )
            
            print(f"狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ 導出成功")
                return True
            else:
                result = response.json()
                print(f"❌ 導出失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def run_all_tests(self):
        """運行所有測試"""
        print("🚀 開始功能導圖服務完整測試...")
        print("=" * 60)
        
        tests = [
            ("服務健康檢查", self.test_health_check),
            ("創建功能導圖", self.test_create_feature_map),
            ("獲取導圖列表", self.test_get_feature_maps),
            ("獲取導圖詳情", self.test_get_feature_map_detail),
            ("添加節點", self.test_add_node),
            ("創建依賴關係", self.test_create_dependency),
            ("獲取項目統計", self.test_get_project_stats),
            ("導出功能導圖", self.test_export_feature_map)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 執行測試: {test_name}")
            try:
                if test_func():
                    passed += 1
                    print(f"✅ {test_name} - 通過")
                else:
                    print(f"❌ {test_name} - 失敗")
            except Exception as e:
                print(f"❌ {test_name} - 異常: {str(e)}")
            
            time.sleep(0.5)  # 短暫延遲
        
        print("\n" + "=" * 60)
        print(f"📊 測試結果: {passed}/{total} 通過")
        
        if passed == total:
            print("🎉 所有測試都通過了！")
        else:
            print(f"⚠️  {total - passed} 個測試失敗")
        
        return passed == total


if __name__ == "__main__":
    tester = FeatureMapServiceTester()
    tester.run_all_tests()