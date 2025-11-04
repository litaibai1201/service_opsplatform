# -*- coding: utf-8 -*-
"""
@文件: test_collaboration_service.py
@說明: 協作服務完整測試腳本
@時間: 2025-01-09
@作者: LiDong
"""

import json
import requests
import time
import socketio
from datetime import datetime

class CollaborationServiceTester:
    """協作服務測試器"""
    
    def __init__(self, base_url="http://localhost:25699"):
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json"
        }
        self.auth_headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer test_token"  # 在實際測試中需要有效token
        }
        self.document_id = "test_document_001"
        self.session_token = None
        
    def test_health_check(self):
        """測試服務健康檢查"""
        print("\n🔍 測試服務健康檢查...")
        try:
            response = requests.get(f"{self.base_url}/collaboration/health")
            print(f"狀態碼: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print("✅ 服務正常運行")
                print(f"   服務狀態: {result.get('data', {}).get('status', 'unknown')}")
                return True
            else:
                print("❌ 服務無響應")
                return False
        except Exception as e:
            print(f"❌ 連接失敗: {str(e)}")
            return False
    
    def test_join_collaboration(self):
        """測試加入協作會話"""
        print("\n📝 測試加入協作會話...")
        
        join_data = {
            "document_id": self.document_id,
            "document_type": "diagram",
            "permissions": {
                "can_edit": True,
                "can_comment": True,
                "can_view_cursors": True,
                "role": "editor"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/collaboration/join",
                headers=self.auth_headers,
                json=join_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                self.session_token = result["data"].get("session_token")
                print(f"✅ 加入協作會話成功")
                print(f"   會話令牌: {self.session_token[:20]}...")
                return True
            else:
                print(f"❌ 加入失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_get_active_sessions(self):
        """測試獲取活躍會話"""
        print("\n👥 測試獲取活躍會話...")
        
        try:
            response = requests.get(
                f"{self.base_url}/collaboration/sessions/{self.document_id}",
                headers=self.auth_headers,
                params={"document_type": "diagram"}
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                sessions = result["data"].get("sessions", [])
                print(f"✅ 獲取活躍會話成功")
                print(f"   活躍會話數: {len(sessions)}")
                return True
            else:
                print(f"❌ 獲取失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_submit_operation(self):
        """測試提交操作"""
        print("\n⚡ 測試提交操作...")
        
        operation_data = {
            "document_id": self.document_id,
            "document_type": "diagram",
            "operation_type": "create",
            "operation_data": {
                "element_id": "element_001",
                "operation_path": "/elements",
                "new_value": {
                    "type": "rectangle",
                    "x": 100,
                    "y": 100,
                    "width": 200,
                    "height": 100,
                    "text": "測試元素"
                },
                "properties": {
                    "color": "#ffffff",
                    "border": "#000000"
                }
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/collaboration/operations",
                headers=self.auth_headers,
                json=operation_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                print(f"✅ 操作提交成功")
                print(f"   操作ID: {result['data'].get('id', 'N/A')}")
                print(f"   序列號: {result['data'].get('sequence_number', 'N/A')}")
                return True
            else:
                print(f"❌ 操作提交失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_get_operation_history(self):
        """測試獲取操作歷史"""
        print("\n📜 測試獲取操作歷史...")
        
        try:
            response = requests.get(
                f"{self.base_url}/collaboration/operations/{self.document_id}",
                headers=self.auth_headers,
                params={
                    "document_type": "diagram",
                    "limit": 50
                }
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                operations = result["data"].get("operations", [])
                print(f"✅ 獲取操作歷史成功")
                print(f"   操作記錄數: {len(operations)}")
                return True
            else:
                print(f"❌ 獲取失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_cursor_update(self):
        """測試光標更新"""
        print("\n🎯 測試光標更新...")
        
        if not self.session_token:
            print("❌ 沒有可用的會話令牌")
            return False
        
        cursor_data = {
            "session_token": self.session_token,
            "cursor_position": {
                "x": 150.5,
                "y": 200.3,
                "element_id": "element_001"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/collaboration/cursor-update",
                headers=self.auth_headers,
                json=cursor_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                print("✅ 光標更新成功")
                return True
            else:
                print(f"❌ 光標更新失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_document_lock(self):
        """測試文檔鎖定"""
        print("\n🔒 測試文檔鎖定...")
        
        lock_data = {
            "document_id": self.document_id,
            "document_type": "diagram",
            "lock_type": "write",
            "locked_elements": ["element_001"],
            "duration_minutes": 10
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/collaboration/lock",
                headers=self.auth_headers,
                json=lock_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                print("✅ 文檔鎖定成功")
                print(f"   鎖定類型: {result['data'].get('lock_type', 'N/A')}")
                print(f"   過期時間: {result['data'].get('expires_at', 'N/A')}")
                return True
            else:
                print(f"❌ 文檔鎖定失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_get_document_locks(self):
        """測試獲取文檔鎖定狀態"""
        print("\n🔓 測試獲取文檔鎖定狀態...")
        
        try:
            response = requests.get(
                f"{self.base_url}/collaboration/locks/{self.document_id}",
                headers=self.auth_headers,
                params={"document_type": "diagram"}
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                locks = result["data"].get("locks", [])
                print(f"✅ 獲取鎖定狀態成功")
                print(f"   當前鎖定數: {len(locks)}")
                return True
            else:
                print(f"❌ 獲取失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def test_websocket_connection(self):
        """測試WebSocket連接"""
        print("\n🔌 測試WebSocket連接...")
        
        try:
            # 創建SocketIO客戶端
            sio = socketio.Client()
            connection_success = False
            
            @sio.event
            def connect():
                nonlocal connection_success
                connection_success = True
                print("✅ WebSocket連接成功")
            
            @sio.event
            def connection_confirmed(data):
                print(f"   會話確認: {data.get('session_id', 'N/A')[:20]}...")
            
            @sio.event
            def disconnect():
                print("🔌 WebSocket連接斷開")
            
            # 連接到WebSocket服務器
            sio.connect(
                self.base_url, 
                auth={'token': 'test_token'},
                wait_timeout=5
            )
            
            time.sleep(1)  # 等待連接建立
            
            if connection_success:
                # 測試加入文檔房間
                sio.emit('join_document', {
                    'document_id': self.document_id,
                    'document_type': 'diagram'
                })
                
                time.sleep(1)
                
                # 測試發送心跳
                sio.emit('heartbeat', {})
                
                time.sleep(1)
                
                # 斷開連接
                sio.disconnect()
                return True
            else:
                print("❌ WebSocket連接失敗")
                return False
                
        except Exception as e:
            print(f"❌ WebSocket測試失敗: {str(e)}")
            return False
    
    def test_leave_collaboration(self):
        """測試離開協作會話"""
        print("\n👋 測試離開協作會話...")
        
        if not self.session_token:
            print("❌ 沒有可用的會話令牌")
            return True  # 如果沒有會話，視為成功
        
        leave_data = {
            "session_token": self.session_token
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/collaboration/leave",
                headers=self.auth_headers,
                json=leave_data
            )
            
            print(f"狀態碼: {response.status_code}")
            result = response.json()
            
            if result.get("success"):
                print("✅ 離開協作會話成功")
                self.session_token = None
                return True
            else:
                print(f"❌ 離開失敗: {result.get('msg', '未知錯誤')}")
                return False
                
        except Exception as e:
            print(f"❌ 請求失敗: {str(e)}")
            return False
    
    def run_all_tests(self):
        """運行所有測試"""
        print("🚀 開始協作服務完整測試...")
        print("=" * 70)
        
        tests = [
            ("服務健康檢查", self.test_health_check),
            ("加入協作會話", self.test_join_collaboration),
            ("獲取活躍會話", self.test_get_active_sessions),
            ("提交操作", self.test_submit_operation),
            ("獲取操作歷史", self.test_get_operation_history),
            ("光標位置更新", self.test_cursor_update),
            ("文檔鎖定", self.test_document_lock),
            ("獲取鎖定狀態", self.test_get_document_locks),
            ("WebSocket連接", self.test_websocket_connection),
            ("離開協作會話", self.test_leave_collaboration)
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
        
        print("\n" + "=" * 70)
        print(f"📊 測試結果: {passed}/{total} 通過")
        
        if passed == total:
            print("🎉 所有測試都通過了！")
        else:
            print(f"⚠️  {total - passed} 個測試失敗")
            print("\n💡 提示：某些測試可能需要有效的JWT Token才能通過")
        
        return passed == total


if __name__ == "__main__":
    tester = CollaborationServiceTester()
    tester.run_all_tests()