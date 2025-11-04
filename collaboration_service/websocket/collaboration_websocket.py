# -*- coding: utf-8 -*-
"""
@文件: collaboration_websocket.py
@說明: 協作WebSocket處理器 (Collaboration Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Set, Optional, Any
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token, verify_jwt_in_request

from controllers.collaboration_controller import collaboration_controller
from cache import redis_client
from loggers import logger


class CollaborationWebSocket:
    """協作WebSocket處理器"""
    
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.redis = redis_client
        self.active_sessions: Dict[str, Dict] = {}  # session_id -> session_info
        self.document_rooms: Dict[str, Set[str]] = {}  # document_id -> set of session_ids
        
        # 註冊事件處理器
        self._register_events()
    
    def _register_events(self):
        """註冊WebSocket事件處理器"""
        
        @self.socketio.on('connect')
        def handle_connect(auth):
            """處理WebSocket連接"""
            try:
                # 驗證JWT Token
                if not auth or 'token' not in auth:
                    logger.warning("WebSocket連接缺少認證token")
                    disconnect()
                    return False
                
                # 解碼和驗證token
                try:
                    token_data = decode_token(auth['token'])
                    user_id = token_data['sub']
                except Exception as e:
                    logger.warning(f"WebSocket token驗證失敗: {str(e)}")
                    disconnect()
                    return False
                
                session_id = request.sid
                session_info = {
                    'user_id': user_id,
                    'session_id': session_id,
                    'connected_at': datetime.utcnow().isoformat(),
                    'document_id': None,
                    'document_type': None
                }
                
                self.active_sessions[session_id] = session_info
                
                logger.info(f"用戶 {user_id} WebSocket連接成功: {session_id}")
                
                # 發送連接確認
                emit('connection_confirmed', {
                    'session_id': session_id,
                    'user_id': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
            except Exception as e:
                logger.error(f"處理WebSocket連接失敗: {str(e)}")
                disconnect()
                return False
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """處理WebSocket斷開連接"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if session_info:
                    user_id = session_info['user_id']
                    document_id = session_info.get('document_id')
                    
                    # 從文檔房間移除
                    if document_id:
                        self._leave_document_room(session_id, document_id)
                    
                    # 清理會話信息
                    self.active_sessions.pop(session_id, None)
                    
                    logger.info(f"用戶 {user_id} WebSocket斷開連接: {session_id}")
                
            except Exception as e:
                logger.error(f"處理WebSocket斷開失敗: {str(e)}")
        
        @self.socketio.on('join_document')
        def handle_join_document(data):
            """處理加入文檔房間"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info:
                    emit('error', {'message': '會話不存在'})
                    return
                
                document_id = data.get('document_id')
                document_type = data.get('document_type', 'diagram')
                
                if not document_id:
                    emit('error', {'message': '文檔ID不能為空'})
                    return
                
                # 更新會話信息
                session_info['document_id'] = document_id
                session_info['document_type'] = document_type
                
                # 加入文檔房間
                self._join_document_room(session_id, document_id)
                
                # 通知房間內其他用戶
                emit('user_joined_document', {
                    'user_id': session_info['user_id'],
                    'document_id': document_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"document_{document_id}", include_self=False)
                
                # 發送確認
                emit('document_joined', {
                    'document_id': document_id,
                    'document_type': document_type,
                    'active_users': len(self.document_rooms.get(document_id, set()))
                })
                
                logger.info(f"用戶 {session_info['user_id']} 加入文檔房間: {document_id}")
                
            except Exception as e:
                logger.error(f"加入文檔房間失敗: {str(e)}")
                emit('error', {'message': '加入文檔房間失敗'})
        
        @self.socketio.on('leave_document')
        def handle_leave_document(data):
            """處理離開文檔房間"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info:
                    return
                
                document_id = session_info.get('document_id')
                if document_id:
                    # 離開文檔房間
                    self._leave_document_room(session_id, document_id)
                    
                    # 通知房間內其他用戶
                    emit('user_left_document', {
                        'user_id': session_info['user_id'],
                        'document_id': document_id,
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=f"document_{document_id}")
                    
                    # 清理會話的文檔信息
                    session_info['document_id'] = None
                    session_info['document_type'] = None
                    
                    emit('document_left', {'document_id': document_id})
                    
                    logger.info(f"用戶 {session_info['user_id']} 離開文檔房間: {document_id}")
                
            except Exception as e:
                logger.error(f"離開文檔房間失敗: {str(e)}")
        
        @self.socketio.on('submit_operation')
        def handle_submit_operation(data):
            """處理提交操作"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info or not session_info.get('document_id'):
                    emit('error', {'message': '未加入文檔房間'})
                    return
                
                # 提交操作到後端
                result, success = collaboration_controller.submit_operation(
                    document_id=session_info['document_id'],
                    document_type=session_info.get('document_type', 'diagram'),
                    operation_type=data.get('operation_type'),
                    operation_data=data.get('operation_data')
                )
                
                if success:
                    # 廣播操作到文檔房間的所有用戶
                    emit('operation_broadcast', {
                        'operation': result,
                        'user_id': session_info['user_id'],
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=f"document_{session_info['document_id']}", include_self=False)
                    
                    # 向提交者確認
                    emit('operation_confirmed', {
                        'operation_id': result.get('id'),
                        'sequence_number': result.get('sequence_number')
                    })
                    
                else:
                    emit('operation_failed', {'message': result})
                
            except Exception as e:
                logger.error(f"處理提交操作失敗: {str(e)}")
                emit('error', {'message': '操作提交失敗'})
        
        @self.socketio.on('cursor_update')
        def handle_cursor_update(data):
            """處理光標位置更新"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info or not session_info.get('document_id'):
                    return
                
                # 廣播光標位置到文檔房間
                emit('cursor_position', {
                    'user_id': session_info['user_id'],
                    'cursor_position': data.get('cursor_position'),
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"document_{session_info['document_id']}", include_self=False)
                
            except Exception as e:
                logger.error(f"處理光標更新失敗: {str(e)}")
        
        @self.socketio.on('selection_update')
        def handle_selection_update(data):
            """處理選擇範圍更新"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info or not session_info.get('document_id'):
                    return
                
                # 廣播選擇範圍到文檔房間
                emit('selection_range', {
                    'user_id': session_info['user_id'],
                    'selection_range': data.get('selection_range'),
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"document_{session_info['document_id']}", include_self=False)
                
            except Exception as e:
                logger.error(f"處理選擇更新失敗: {str(e)}")
        
        @self.socketio.on('lock_request')
        def handle_lock_request(data):
            """處理鎖定請求"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info or not session_info.get('document_id'):
                    emit('error', {'message': '未加入文檔房間'})
                    return
                
                # 處理鎖定請求
                result, success = collaboration_controller.lock_document(
                    document_id=session_info['document_id'],
                    document_type=session_info.get('document_type', 'diagram'),
                    lock_type=data.get('lock_type', 'write'),
                    locked_elements=data.get('locked_elements'),
                    duration_minutes=data.get('duration_minutes', 30)
                )
                
                if success:
                    # 廣播鎖定事件
                    emit('document_locked', {
                        'lock_info': result,
                        'user_id': session_info['user_id'],
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=f"document_{session_info['document_id']}")
                    
                else:
                    emit('lock_failed', {'message': result})
                
            except Exception as e:
                logger.error(f"處理鎖定請求失敗: {str(e)}")
                emit('error', {'message': '鎖定請求失敗'})
        
        @self.socketio.on('unlock_request')
        def handle_unlock_request(data):
            """處理解鎖請求"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info or not session_info.get('document_id'):
                    emit('error', {'message': '未加入文檔房間'})
                    return
                
                # 處理解鎖請求
                result, success = collaboration_controller.unlock_document(
                    document_id=session_info['document_id'],
                    document_type=session_info.get('document_type', 'diagram')
                )
                
                if success:
                    # 廣播解鎖事件
                    emit('document_unlocked', {
                        'document_id': session_info['document_id'],
                        'user_id': session_info['user_id'],
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=f"document_{session_info['document_id']}")
                    
                else:
                    emit('unlock_failed', {'message': result})
                
            except Exception as e:
                logger.error(f"處理解鎖請求失敗: {str(e)}")
                emit('error', {'message': '解鎖請求失敗'})
        
        @self.socketio.on('heartbeat')
        def handle_heartbeat(data):
            """處理心跳"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if session_info:
                    session_info['last_heartbeat'] = datetime.utcnow().isoformat()
                    emit('heartbeat_ack', {'timestamp': session_info['last_heartbeat']})
                
            except Exception as e:
                logger.error(f"處理心跳失敗: {str(e)}")
        
        @self.socketio.on('get_active_users')
        def handle_get_active_users(data):
            """獲取活躍用戶列表"""
            try:
                session_id = request.sid
                session_info = self.active_sessions.get(session_id)
                
                if not session_info:
                    emit('error', {'message': '會話不存在'})
                    return
                
                document_id = data.get('document_id') or session_info.get('document_id')
                if not document_id:
                    emit('error', {'message': '文檔ID不能為空'})
                    return
                
                # 獲取文檔房間的活躍用戶
                active_users = []
                document_sessions = self.document_rooms.get(document_id, set())
                
                for sid in document_sessions:
                    user_session = self.active_sessions.get(sid)
                    if user_session:
                        active_users.append({
                            'user_id': user_session['user_id'],
                            'session_id': user_session['session_id'],
                            'connected_at': user_session['connected_at']
                        })
                
                emit('active_users_list', {
                    'document_id': document_id,
                    'active_users': active_users,
                    'total_count': len(active_users),
                    'timestamp': datetime.utcnow().isoformat()
                })
                
            except Exception as e:
                logger.error(f"獲取活躍用戶失敗: {str(e)}")
                emit('error', {'message': '獲取活躍用戶失敗'})
    
    def _join_document_room(self, session_id: str, document_id: str):
        """加入文檔房間"""
        room_name = f"document_{document_id}"
        join_room(room_name, sid=session_id)
        
        # 更新房間用戶列表
        if document_id not in self.document_rooms:
            self.document_rooms[document_id] = set()
        self.document_rooms[document_id].add(session_id)
    
    def _leave_document_room(self, session_id: str, document_id: str):
        """離開文檔房間"""
        room_name = f"document_{document_id}"
        leave_room(room_name, sid=session_id)
        
        # 更新房間用戶列表
        if document_id in self.document_rooms:
            self.document_rooms[document_id].discard(session_id)
            if not self.document_rooms[document_id]:
                del self.document_rooms[document_id]
    
    def broadcast_to_document(self, document_id: str, event: str, data: Dict):
        """向文檔房間廣播事件"""
        try:
            room_name = f"document_{document_id}"
            self.socketio.emit(event, data, room=room_name)
            logger.debug(f"向文檔 {document_id} 廣播事件: {event}")
        except Exception as e:
            logger.error(f"廣播事件失敗: {str(e)}")
    
    def get_document_active_users(self, document_id: str) -> list:
        """獲取文檔的活躍用戶"""
        active_users = []
        document_sessions = self.document_rooms.get(document_id, set())
        
        for session_id in document_sessions:
            session_info = self.active_sessions.get(session_id)
            if session_info:
                active_users.append({
                    'user_id': session_info['user_id'],
                    'session_id': session_id,
                    'connected_at': session_info['connected_at']
                })
        
        return active_users
    
    def disconnect_user(self, user_id: str, reason: str = ""):
        """斷開指定用戶的連接"""
        try:
            sessions_to_disconnect = []
            for session_id, session_info in self.active_sessions.items():
                if session_info['user_id'] == user_id:
                    sessions_to_disconnect.append(session_id)
            
            for session_id in sessions_to_disconnect:
                self.socketio.emit('force_disconnect', {
                    'reason': reason,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=session_id)
                
                # 斷開連接
                self.socketio.disconnect(session_id)
                
            logger.info(f"強制斷開用戶 {user_id} 的 {len(sessions_to_disconnect)} 個連接")
            
        except Exception as e:
            logger.error(f"斷開用戶連接失敗: {str(e)}")


# 全局WebSocket實例
collaboration_websocket = None


def init_collaboration_websocket(socketio: SocketIO):
    """初始化協作WebSocket處理器"""
    global collaboration_websocket
    collaboration_websocket = CollaborationWebSocket(socketio)
    logger.info("協作WebSocket處理器初始化完成")
    return collaboration_websocket