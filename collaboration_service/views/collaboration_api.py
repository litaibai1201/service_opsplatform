# -*- coding: utf-8 -*-
"""
@文件: collaboration_api.py
@說明: 協作服務API視圖 (Collaboration Service)
@時間: 2025-01-09
@作者: LiDong
"""

from datetime import datetime
from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from serializes.collaboration_serialize import (
    # 請求Schema
    JoinCollaborationSchema, LeaveCollaborationSchema, HeartbeatSchema,
    SubmitOperationSchema, CursorUpdateSchema, SelectionUpdateSchema,
    ResolveConflictSchema, LockDocumentSchema, UnlockDocumentSchema,
    GrantPermissionSchema, RevokePermissionSchema,
    DocumentQuerySchema, OperationHistoryQuerySchema, StatisticsQuerySchema,
    
    # 響應Schema
    CollaborationSessionResponseSchema, OperationLogResponseSchema,
    DocumentLockResponseSchema, CollaborationStatisticsResponseSchema,
    ActiveUsersResponseSchema
)
from serializes.response_serialize import RspMsgDictSchema
from controllers.collaboration_controller import collaboration_controller
from common.common_method import response_result, fail_response_result
from loggers import logger


blp = Blueprint(
    'collaboration_api',
    __name__,
    url_prefix='/collaboration',
    description='協作服務API'
)


# ==================== 協作會話管理 ====================

@blp.route('/join')
class JoinCollaborationAPI(MethodView):
    """加入協作會話API"""
    
    @blp.arguments(JoinCollaborationSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='加入協作會話')
    @jwt_required()
    def post(self, join_data):
        """加入協作會話"""
        try:
            result, success = collaboration_controller.join_collaboration(
                document_id=join_data['document_id'],
                document_type=join_data['document_type'],
                permissions=join_data.get('permissions')
            )
            
            if success:
                return response_result(content=result, msg="加入協作會話成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"加入協作會話API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/leave')
class LeaveCollaborationAPI(MethodView):
    """離開協作會話API"""
    
    @blp.arguments(LeaveCollaborationSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='離開協作會話')
    @jwt_required()
    def post(self, leave_data):
        """離開協作會話"""
        try:
            result, success = collaboration_controller.leave_collaboration(
                session_token=leave_data['session_token']
            )
            
            if success:
                return response_result(msg="離開協作會話成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"離開協作會話API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/sessions/<document_id>')
class CollaborationSessionsAPI(MethodView):
    """協作會話狀態API"""
    
    @blp.arguments(DocumentQuerySchema, location='query')
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='獲取文檔協作狀態')
    @jwt_required()
    def get(self, query_args, document_id):
        """獲取文檔協作狀態"""
        try:
            document_type = query_args.get('document_type', 'diagram')
            
            result, success = collaboration_controller.get_active_sessions(
                document_id=document_id,
                document_type=document_type
            )
            
            if success:
                return response_result(
                    content={'sessions': result, 'total_count': len(result)},
                    msg="獲取協作狀態成功"
                )
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"獲取協作狀態API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/active-users/<document_id>')
class ActiveUsersAPI(MethodView):
    """在線用戶列表API"""
    
    @blp.arguments(DocumentQuerySchema, location='query')
    @blp.response(200, ActiveUsersResponseSchema)
    @blp.doc(summary='獲取在線用戶列表')
    @jwt_required()
    def get(self, query_args, document_id):
        """獲取在線用戶列表"""
        try:
            document_type = query_args.get('document_type', 'diagram')
            
            result, success = collaboration_controller.get_active_sessions(
                document_id=document_id,
                document_type=document_type
            )
            
            if success:
                return response_result(
                    content={
                        'sessions': result,
                        'total_count': len(result),
                        'last_updated': None
                    },
                    msg="獲取在線用戶成功"
                )
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"獲取在線用戶API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/heartbeat')
class HeartbeatAPI(MethodView):
    """心跳API"""
    
    @blp.arguments(HeartbeatSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='發送心跳保持會話')
    @jwt_required()
    def post(self, heartbeat_data):
        """發送心跳保持會話"""
        try:
            result, success = collaboration_controller.send_heartbeat(
                session_token=heartbeat_data['session_token'],
                cursor_position=heartbeat_data.get('cursor_position'),
                selection_range=heartbeat_data.get('selection_range')
            )
            
            if success:
                return response_result(msg="心跳成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"心跳API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


# ==================== 實時操作 ====================

@blp.route('/operations')
class OperationsAPI(MethodView):
    """操作管理API"""
    
    @blp.arguments(SubmitOperationSchema)
    @blp.response(200, OperationLogResponseSchema)
    @blp.doc(summary='提交操作')
    @jwt_required()
    def post(self, operation_data):
        """提交操作"""
        try:
            result, success = collaboration_controller.submit_operation(
                document_id=operation_data['document_id'],
                document_type=operation_data['document_type'],
                operation_type=operation_data['operation_type'],
                operation_data=operation_data['operation_data']
            )
            
            if success:
                return response_result(content=result, msg="操作提交成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"提交操作API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/operations/<document_id>')
class OperationHistoryAPI(MethodView):
    """操作歷史API"""
    
    @blp.arguments(OperationHistoryQuerySchema, location='query')
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='獲取操作歷史')
    @jwt_required()
    def get(self, query_args, document_id):
        """獲取操作歷史"""
        try:
            result, success = collaboration_controller.get_operation_history(
                document_id=document_id,
                document_type=query_args['document_type'],
                since_sequence=query_args.get('since_sequence'),
                limit=query_args.get('limit', 100)
            )
            
            if success:
                return response_result(
                    content={'operations': result, 'count': len(result)},
                    msg="獲取操作歷史成功"
                )
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"獲取操作歷史API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/cursor-update')
class CursorUpdateAPI(MethodView):
    """光標更新API"""
    
    @blp.arguments(CursorUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='更新光標位置')
    @jwt_required()
    def post(self, cursor_data):
        """更新光標位置"""
        try:
            result, success = collaboration_controller.update_cursor_position(
                session_token=cursor_data['session_token'],
                cursor_position=cursor_data['cursor_position']
            )
            
            if success:
                return response_result(msg="光標位置更新成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"更新光標位置API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/selection-update')
class SelectionUpdateAPI(MethodView):
    """選擇範圍更新API"""
    
    @blp.arguments(SelectionUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='更新選擇範圍')
    @jwt_required()
    def post(self, selection_data):
        """更新選擇範圍"""
        try:
            result, success = collaboration_controller.update_selection_range(
                session_token=selection_data['session_token'],
                selection_range=selection_data['selection_range']
            )
            
            if success:
                return response_result(msg="選擇範圍更新成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"更新選擇範圍API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


# ==================== 衝突解決 ====================

@blp.route('/resolve-conflict')
class ResolveConflictAPI(MethodView):
    """解決衝突API"""
    
    @blp.arguments(ResolveConflictSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='解決衝突')
    @jwt_required()
    def post(self, conflict_data):
        """解決衝突"""
        try:
            result, success = collaboration_controller.resolve_conflict(
                document_id=conflict_data['document_id'],
                operation_id=conflict_data['operation_id'],
                resolution=conflict_data['resolution']
            )
            
            if success:
                return response_result(content=result, msg="衝突解決成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"解決衝突API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/conflicts/<document_id>')
class ConflictsAPI(MethodView):
    """衝突列表API"""
    
    @blp.arguments(DocumentQuerySchema, location='query')
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='獲取衝突列表')
    @jwt_required()
    def get(self, query_args, document_id):
        """獲取衝突列表"""
        try:
            document_type = query_args.get('document_type', 'diagram')
            
            result, success = collaboration_controller.get_conflicts(
                document_id=document_id,
                document_type=document_type
            )
            
            if success:
                return response_result(
                    content={'conflicts': result, 'count': len(result)},
                    msg="獲取衝突列表成功"
                )
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"獲取衝突列表API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


# ==================== 文檔鎖定 ====================

@blp.route('/lock')
class LockDocumentAPI(MethodView):
    """鎖定文檔API"""
    
    @blp.arguments(LockDocumentSchema)
    @blp.response(200, DocumentLockResponseSchema)
    @blp.doc(summary='鎖定文檔或元素')
    @jwt_required()
    def post(self, lock_data):
        """鎖定文檔或元素"""
        try:
            result, success = collaboration_controller.lock_document(
                document_id=lock_data['document_id'],
                document_type=lock_data['document_type'],
                lock_type=lock_data['lock_type'],
                locked_elements=lock_data.get('locked_elements'),
                duration_minutes=lock_data.get('duration_minutes', 30)
            )
            
            if success:
                return response_result(content=result, msg="文檔鎖定成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"鎖定文檔API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/unlock')
class UnlockDocumentAPI(MethodView):
    """解鎖文檔API"""
    
    @blp.arguments(UnlockDocumentSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='解鎖文檔或元素')
    @jwt_required()
    def post(self, unlock_data):
        """解鎖文檔或元素"""
        try:
            result, success = collaboration_controller.unlock_document(
                document_id=unlock_data['document_id'],
                document_type=unlock_data['document_type']
            )
            
            if success:
                return response_result(msg="文檔解鎖成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"解鎖文檔API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/locks/<document_id>')
class DocumentLocksAPI(MethodView):
    """文檔鎖定狀態API"""
    
    @blp.arguments(DocumentQuerySchema, location='query')
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='獲取鎖定狀態')
    @jwt_required()
    def get(self, query_args, document_id):
        """獲取鎖定狀態"""
        try:
            document_type = query_args.get('document_type', 'diagram')
            
            result, success = collaboration_controller.get_document_locks(
                document_id=document_id,
                document_type=document_type
            )
            
            if success:
                return response_result(
                    content={'locks': result, 'count': len(result)},
                    msg="獲取鎖定狀態成功"
                )
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"獲取鎖定狀態API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/force-unlock')
class ForceUnlockAPI(MethodView):
    """強制解鎖API"""
    
    @blp.arguments(UnlockDocumentSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='強制解鎖')
    @jwt_required()
    def post(self, unlock_data):
        """強制解鎖"""
        try:
            result, success = collaboration_controller.force_unlock_document(
                document_id=unlock_data['document_id'],
                document_type=unlock_data['document_type']
            )
            
            if success:
                return response_result(msg=result)
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"強制解鎖API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


# ==================== 協作權限 ====================

@blp.route('/permissions/<document_id>')
class CollaborationPermissionsAPI(MethodView):
    """協作權限API"""
    
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='獲取協作權限')
    @jwt_required()
    def get(self, document_id):
        """獲取協作權限"""
        try:
            result, success = collaboration_controller.get_collaboration_permissions(
                document_id=document_id
            )
            
            if success:
                return response_result(content=result, msg="獲取協作權限成功")
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"獲取協作權限API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/grant-permission')
class GrantPermissionAPI(MethodView):
    """授予權限API"""
    
    @blp.arguments(GrantPermissionSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='授予協作權限')
    @jwt_required()
    def post(self, permission_data):
        """授予協作權限"""
        try:
            result, success = collaboration_controller.grant_permission(
                document_id=permission_data['document_id'],
                user_id=permission_data['user_id'],
                permissions=permission_data['permissions']
            )
            
            if success:
                return response_result(msg=result)
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"授予權限API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


@blp.route('/revoke-permission')
class RevokePermissionAPI(MethodView):
    """撤銷權限API"""
    
    @blp.arguments(RevokePermissionSchema)
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='撤銷協作權限')
    @jwt_required()
    def post(self, permission_data):
        """撤銷協作權限"""
        try:
            result, success = collaboration_controller.revoke_permission(
                document_id=permission_data['document_id'],
                user_id=permission_data['user_id']
            )
            
            if success:
                return response_result(msg=result)
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"撤銷權限API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


# ==================== 統計和監控 ====================

@blp.route('/statistics/<document_id>')
class CollaborationStatisticsAPI(MethodView):
    """協作統計API"""
    
    @blp.arguments(StatisticsQuerySchema, location='query')
    @blp.response(200, CollaborationStatisticsResponseSchema)
    @blp.doc(summary='獲取協作統計')
    @jwt_required()
    def get(self, query_args, document_id):
        """獲取協作統計"""
        try:
            result, success = collaboration_controller.get_collaboration_statistics(
                document_id=document_id,
                document_type=query_args['document_type'],
                start_date=query_args.get('start_date'),
                end_date=query_args.get('end_date')
            )
            
            if success:
                return response_result(
                    content={'statistics': result, 'count': len(result)},
                    msg="獲取協作統計成功"
                )
            else:
                return fail_response_result(msg=result)
                
        except Exception as e:
            logger.error(f"獲取協作統計API錯誤: {str(e)}")
            return fail_response_result(msg="服務器內部錯誤")


# ==================== 健康檢查 ====================

@blp.route('/health')
class HealthCheckAPI(MethodView):
    """健康檢查API"""
    
    @blp.response(200, RspMsgDictSchema)
    @blp.doc(summary='健康檢查')
    def get(self):
        """健康檢查"""
        try:
            return response_result(
                content={
                    'status': 'healthy',
                    'service': 'collaboration_service',
                    'timestamp': datetime.utcnow().isoformat()
                },
                msg="協作服務運行正常"
            )
        except Exception as e:
            logger.error(f"健康檢查錯誤: {str(e)}")
            return fail_response_result(msg="服務異常")