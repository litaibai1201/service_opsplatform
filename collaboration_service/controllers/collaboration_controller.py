# -*- coding: utf-8 -*-
"""
@文件: collaboration_controller.py
@說明: 協作服務控制器 (Collaboration Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from flask_jwt_extended import get_jwt_identity

from models.collaboration_model import CollaborationModel
from common.common_tools import CommonTools
from cache import redis_client
from loggers import logger


# 全局控制器實例
collaboration_controller = None


class CollaborationController:
    """協作服務控制器"""
    
    def __init__(self):
        self.model = CollaborationModel()
        self.redis = redis_client
    
    # ==================== 協作會話管理 ====================
    
    def join_collaboration(self, document_id: str, document_type: str, 
                          permissions: Dict = None) -> Tuple[Any, bool]:
        """加入協作會話"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 檢查用戶是否有權限訪問此文檔
            if not self._check_document_permission(user_id, document_id, 'view'):
                return "無權限訪問此文檔", False
            
            # 創建或更新會話
            result, success = self.model.create_session(
                document_id=document_id,
                document_type=document_type,
                user_id=user_id,
                permissions=permissions
            )
            
            if success:
                # 緩存會話信息到Redis
                session_key = f"collaboration_session:{result['session_token']}"
                session_data = {
                    'user_id': user_id,
                    'document_id': document_id,
                    'document_type': document_type,
                    'joined_at': datetime.utcnow().isoformat()
                }
                self.redis.setex(session_key, 3600, json.dumps(session_data))  # 1小時過期
                
                # 廣播用戶加入事件
                self._broadcast_event(document_id, {
                    'type': 'user_joined',
                    'user_id': user_id,
                    'session_data': result
                })
                
                logger.info(f"用戶 {user_id} 加入協作會話: {document_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"加入協作會話失敗: {str(e)}")
            return str(e), False
    
    def leave_collaboration(self, session_token: str) -> Tuple[Any, bool]:
        """離開協作會話"""
        try:
            # 獲取會話信息
            session_key = f"collaboration_session:{session_token}"
            session_data = self.redis.get(session_key)
            
            if not session_data:
                return "會話不存在或已過期", False
            
            session_info = json.loads(session_data)
            user_id = session_info['user_id']
            document_id = session_info['document_id']
            
            # 從數據庫移除會話
            result, success = self.model.leave_session(session_token)
            
            if success:
                # 從Redis移除會話緩存
                self.redis.delete(session_key)
                
                # 廣播用戶離開事件
                self._broadcast_event(document_id, {
                    'type': 'user_left',
                    'user_id': user_id
                })
                
                logger.info(f"用戶 {user_id} 離開協作會話: {document_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"離開協作會話失敗: {str(e)}")
            return str(e), False
    
    def get_active_sessions(self, document_id: str, document_type: str) -> Tuple[Any, bool]:
        """獲取文檔的活躍會話"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'view'):
                return "無權限訪問此文檔", False
            
            return self.model.get_active_sessions(document_id, document_type)
            
        except Exception as e:
            logger.error(f"獲取活躍會話失敗: {str(e)}")
            return str(e), False
    
    def send_heartbeat(self, session_token: str, cursor_position: Dict = None,
                      selection_range: Dict = None) -> Tuple[Any, bool]:
        """發送心跳保持會話"""
        try:
            # 更新會話活動時間
            result, success = self.model.update_session_activity(session_token)
            
            if not success:
                return result, False
            
            # 更新Redis緩存的過期時間
            session_key = f"collaboration_session:{session_token}"
            if self.redis.exists(session_key):
                self.redis.expire(session_key, 3600)
            
            # 如果提供了光標位置，同時更新
            if cursor_position:
                self.model.update_cursor_position(session_token, cursor_position)
            
            # 如果提供了選擇範圍，同時更新
            if selection_range:
                self.model.update_selection_range(session_token, selection_range)
            
            return "心跳成功", True
            
        except Exception as e:
            logger.error(f"發送心跳失敗: {str(e)}")
            return str(e), False
    
    # ==================== 實時操作 ====================
    
    def submit_operation(self, document_id: str, document_type: str,
                        operation_type: str, operation_data: Dict) -> Tuple[Any, bool]:
        """提交操作"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 檢查權限
            if not self._check_document_permission(user_id, document_id, 'edit'):
                return "無權限編輯此文檔", False
            
            # 檢查文檔鎖定狀態
            locks, _ = self.model.get_document_locks(document_id, document_type)
            if self._check_operation_conflicts_with_locks(operation_data, locks, user_id):
                return "操作與現有鎖定衝突", False
            
            # 記錄操作
            result, success = self.model.log_operation(
                document_id=document_id,
                document_type=document_type,
                user_id=user_id,
                operation_type=operation_type,
                operation_data=operation_data
            )
            
            if success:
                # 廣播操作到其他協作用戶
                self._broadcast_event(document_id, {
                    'type': 'operation',
                    'operation': result,
                    'user_id': user_id
                })
                
                # 檢測並處理衝突
                self._detect_and_handle_conflicts(result, document_id, document_type)
                
                logger.info(f"用戶 {user_id} 提交操作: {operation_type} on {document_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"提交操作失敗: {str(e)}")
            return str(e), False
    
    def get_operation_history(self, document_id: str, document_type: str,
                            since_sequence: int = None, limit: int = 100) -> Tuple[Any, bool]:
        """獲取操作歷史"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'view'):
                return "無權限訪問此文檔", False
            
            return self.model.get_operation_history(document_id, document_type, 
                                                  since_sequence, limit)
            
        except Exception as e:
            logger.error(f"獲取操作歷史失敗: {str(e)}")
            return str(e), False
    
    def update_cursor_position(self, session_token: str, cursor_position: Dict) -> Tuple[Any, bool]:
        """更新光標位置"""
        try:
            result, success = self.model.update_cursor_position(session_token, cursor_position)
            
            if success:
                # 獲取會話信息
                session_key = f"collaboration_session:{session_token}"
                session_data = self.redis.get(session_key)
                
                if session_data:
                    session_info = json.loads(session_data)
                    # 廣播光標更新
                    self._broadcast_event(session_info['document_id'], {
                        'type': 'cursor_update',
                        'user_id': session_info['user_id'],
                        'cursor_position': cursor_position
                    })
            
            return result, success
            
        except Exception as e:
            logger.error(f"更新光標位置失敗: {str(e)}")
            return str(e), False
    
    def update_selection_range(self, session_token: str, selection_range: Dict) -> Tuple[Any, bool]:
        """更新選擇範圍"""
        try:
            result, success = self.model.update_selection_range(session_token, selection_range)
            
            if success:
                # 獲取會話信息並廣播
                session_key = f"collaboration_session:{session_token}"
                session_data = self.redis.get(session_key)
                
                if session_data:
                    session_info = json.loads(session_data)
                    self._broadcast_event(session_info['document_id'], {
                        'type': 'selection_update',
                        'user_id': session_info['user_id'],
                        'selection_range': selection_range
                    })
            
            return result, success
            
        except Exception as e:
            logger.error(f"更新選擇範圍失敗: {str(e)}")
            return str(e), False
    
    # ==================== 文檔鎖定 ====================
    
    def lock_document(self, document_id: str, document_type: str, lock_type: str,
                     locked_elements: List[str] = None, duration_minutes: int = 30) -> Tuple[Any, bool]:
        """鎖定文檔或元素"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            if not self._check_document_permission(user_id, document_id, 'edit'):
                return "無權限鎖定此文檔", False
            
            result, success = self.model.create_document_lock(
                document_id=document_id,
                document_type=document_type,
                user_id=user_id,
                lock_type=lock_type,
                locked_elements=locked_elements,
                duration_minutes=duration_minutes
            )
            
            if success:
                # 廣播鎖定事件
                self._broadcast_event(document_id, {
                    'type': 'document_locked',
                    'lock_info': result,
                    'user_id': user_id
                })
                
                logger.info(f"用戶 {user_id} 鎖定文檔: {document_id} ({lock_type})")
            
            return result, success
            
        except Exception as e:
            logger.error(f"鎖定文檔失敗: {str(e)}")
            return str(e), False
    
    def unlock_document(self, document_id: str, document_type: str) -> Tuple[Any, bool]:
        """解鎖文檔"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            result, success = self.model.release_document_lock(document_id, document_type, user_id)
            
            if success:
                # 廣播解鎖事件
                self._broadcast_event(document_id, {
                    'type': 'document_unlocked',
                    'document_id': document_id,
                    'user_id': user_id
                })
                
                logger.info(f"用戶 {user_id} 解鎖文檔: {document_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"解鎖文檔失敗: {str(e)}")
            return str(e), False
    
    def get_document_locks(self, document_id: str, document_type: str) -> Tuple[Any, bool]:
        """獲取文檔鎖定狀態"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'view'):
                return "無權限訪問此文檔", False
            
            return self.model.get_document_locks(document_id, document_type)
            
        except Exception as e:
            logger.error(f"獲取文檔鎖定狀態失敗: {str(e)}")
            return str(e), False
    
    def force_unlock_document(self, document_id: str, document_type: str) -> Tuple[Any, bool]:
        """強制解鎖文檔"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'admin'):
                return "無權限強制解鎖", False
            
            result, success = self.model.force_unlock_document(document_id, document_type)
            
            if success:
                # 廣播強制解鎖事件
                self._broadcast_event(document_id, {
                    'type': 'document_force_unlocked',
                    'document_id': document_id,
                    'admin_user': user_id
                })
                
                logger.info(f"管理員 {user_id} 強制解鎖文檔: {document_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"強制解鎖文檔失敗: {str(e)}")
            return str(e), False
    
    # ==================== 衝突解決 ====================
    
    def resolve_conflict(self, document_id: str, operation_id: str, 
                        resolution: Dict) -> Tuple[Any, bool]:
        """解決操作衝突"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            if not self._check_document_permission(user_id, document_id, 'edit'):
                return "無權限解決衝突", False
            
            # 這裡應該實現具體的衝突解決邏輯
            # 根據解決策略處理衝突數據
            resolution_result = self._apply_conflict_resolution(operation_id, resolution)
            
            if resolution_result['success']:
                # 廣播衝突解決事件
                self._broadcast_event(document_id, {
                    'type': 'conflict_resolved',
                    'operation_id': operation_id,
                    'resolution': resolution,
                    'resolved_by': user_id
                })
                
                logger.info(f"用戶 {user_id} 解決衝突: {operation_id}")
            
            return resolution_result, resolution_result['success']
            
        except Exception as e:
            logger.error(f"解決衝突失敗: {str(e)}")
            return str(e), False
    
    def get_conflicts(self, document_id: str, document_type: str) -> Tuple[Any, bool]:
        """獲取文檔的衝突列表"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'view'):
                return "無權限訪問此文檔", False
            
            # 查詢有衝突的操作
            conflicts = self._get_document_conflicts(document_id, document_type)
            return conflicts, True
            
        except Exception as e:
            logger.error(f"獲取衝突列表失敗: {str(e)}")
            return str(e), False
    
    # ==================== 協作權限 ====================
    
    def get_collaboration_permissions(self, document_id: str) -> Tuple[Any, bool]:
        """獲取文檔協作權限"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'view'):
                return "無權限訪問此文檔", False
            
            # 從緩存或數據庫獲取權限配置
            permissions = self._get_document_permissions(document_id)
            return permissions, True
            
        except Exception as e:
            logger.error(f"獲取協作權限失敗: {str(e)}")
            return str(e), False
    
    def grant_permission(self, document_id: str, user_id: str, permissions: Dict) -> Tuple[Any, bool]:
        """授予用戶協作權限"""
        try:
            admin_user = get_jwt_identity()
            if not self._check_document_permission(admin_user, document_id, 'admin'):
                return "無權限管理此文檔權限", False
            
            # 存儲權限配置
            success = self._set_user_permissions(document_id, user_id, permissions)
            
            if success:
                logger.info(f"管理員 {admin_user} 為用戶 {user_id} 授予文檔 {document_id} 權限")
                return "權限授予成功", True
            else:
                return "權限授予失敗", False
                
        except Exception as e:
            logger.error(f"授予權限失敗: {str(e)}")
            return str(e), False
    
    def revoke_permission(self, document_id: str, user_id: str) -> Tuple[Any, bool]:
        """撤銷用戶協作權限"""
        try:
            admin_user = get_jwt_identity()
            if not self._check_document_permission(admin_user, document_id, 'admin'):
                return "無權限管理此文檔權限", False
            
            # 移除權限配置
            success = self._remove_user_permissions(document_id, user_id)
            
            if success:
                logger.info(f"管理員 {admin_user} 撤銷用戶 {user_id} 的文檔 {document_id} 權限")
                return "權限撤銷成功", True
            else:
                return "權限撤銷失敗", False
                
        except Exception as e:
            logger.error(f"撤銷權限失敗: {str(e)}")
            return str(e), False
    
    # ==================== 統計和監控 ====================
    
    def get_collaboration_statistics(self, document_id: str, document_type: str,
                                   start_date: datetime = None, 
                                   end_date: datetime = None) -> Tuple[Any, bool]:
        """獲取協作統計"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'view'):
                return "無權限訪問此文檔", False
            
            return self.model.get_collaboration_statistics(
                document_id, document_type, start_date, end_date
            )
            
        except Exception as e:
            logger.error(f"獲取協作統計失敗: {str(e)}")
            return str(e), False
    
    # ==================== 私有方法 ====================
    
    def _check_document_permission(self, user_id: str, document_id: str, 
                                 required_permission: str) -> bool:
        """檢查用戶對文檔的權限"""
        try:
            # 從緩存獲取權限信息
            permission_key = f"document_permission:{document_id}:{user_id}"
            cached_permissions = self.redis.get(permission_key)
            
            if cached_permissions:
                permissions = json.loads(cached_permissions)
                return self._validate_permission(permissions, required_permission)
            
            # 如果緩存中沒有，從數據庫或其他服務獲取
            permissions = self._fetch_user_permissions(user_id, document_id)
            
            # 緩存權限信息
            self.redis.setex(permission_key, 300, json.dumps(permissions))  # 5分鐘緩存
            
            return self._validate_permission(permissions, required_permission)
            
        except Exception as e:
            logger.error(f"檢查文檔權限失敗: {str(e)}")
            return False
    
    def _validate_permission(self, permissions: Dict, required: str) -> bool:
        """驗證權限"""
        permission_levels = {
            'view': 1,
            'comment': 2, 
            'edit': 3,
            'admin': 4
        }
        
        user_level = permission_levels.get(permissions.get('role', 'viewer'), 1)
        required_level = permission_levels.get(required, 1)
        
        return user_level >= required_level
    
    def _broadcast_event(self, document_id: str, event_data: Dict):
        """廣播事件到WebSocket連接"""
        try:
            # 發布事件到Redis頻道，WebSocket處理器會接收並廣播
            channel = f"collaboration_events:{document_id}"
            self.redis.publish(channel, json.dumps(event_data))
            
        except Exception as e:
            logger.error(f"廣播事件失敗: {str(e)}")
    
    def _check_operation_conflicts_with_locks(self, operation_data: Dict, 
                                            locks: List[Dict], user_id: str) -> bool:
        """檢查操作是否與鎖定衝突"""
        if not locks:
            return False
        
        for lock in locks:
            # 如果是自己的鎖定，允許操作
            if lock['locked_by'] == user_id:
                continue
                
            # 檢查是否影響鎖定的元素
            element_id = operation_data.get('element_id')
            if element_id and element_id in lock.get('locked_elements', []):
                return True
                
            # 檢查獨占鎖定
            if lock['lock_type'] == 'exclusive':
                return True
        
        return False
    
    def _detect_and_handle_conflicts(self, operation: Dict, document_id: str, 
                                   document_type: str):
        """檢測和處理操作衝突"""
        try:
            # 實現衝突檢測邏輯
            # 這是一個簡化的示例，實際實現會更複雜
            pass
            
        except Exception as e:
            logger.error(f"衝突檢測失敗: {str(e)}")
    
    def _apply_conflict_resolution(self, operation_id: str, resolution: Dict) -> Dict:
        """應用衝突解決方案"""
        try:
            # 實現衝突解決邏輯
            return {
                'success': True,
                'operation_id': operation_id,
                'resolution_applied': resolution['resolution_strategy']
            }
            
        except Exception as e:
            logger.error(f"應用衝突解決方案失敗: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _get_document_conflicts(self, document_id: str, document_type: str) -> List[Dict]:
        """獲取文檔的衝突操作"""
        # 實現獲取衝突的邏輯
        return []
    
    def _get_document_permissions(self, document_id: str) -> Dict:
        """獲取文檔權限配置"""
        # 實現權限獲取邏輯
        return {}
    
    def _fetch_user_permissions(self, user_id: str, document_id: str) -> Dict:
        """從數據庫獲取用戶權限"""
        # 實現從數據庫或其他服務獲取權限的邏輯
        return {'role': 'editor', 'can_edit': True, 'can_comment': True}
    
    def _set_user_permissions(self, document_id: str, user_id: str, permissions: Dict) -> bool:
        """設置用戶權限"""
        try:
            # 實現權限設置邏輯
            permission_key = f"document_permission:{document_id}:{user_id}"
            self.redis.setex(permission_key, 3600, json.dumps(permissions))
            return True
        except:
            return False
    
    def _remove_user_permissions(self, document_id: str, user_id: str) -> bool:
        """移除用戶權限"""
        try:
            permission_key = f"document_permission:{document_id}:{user_id}"
            self.redis.delete(permission_key)
            return True
        except:
            return False


def init_collaboration_controller():
    """初始化協作控制器"""
    global collaboration_controller
    collaboration_controller = CollaborationController()
    logger.info("協作控制器初始化完成")