# -*- coding: utf-8 -*-
"""
@文件: version_control_controller.py
@說明: 版本控制服務控制器 (Version Control Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from flask_jwt_extended import get_jwt_identity

from models.version_control_model import VersionControlModel
from common.common_tools import CommonTools
from cache import redis_client
from loggers import logger


# 全局控制器實例
version_control_controller = None


class VersionControlController:
    """版本控制服務控制器"""
    
    def __init__(self):
        self.model = VersionControlModel()
        self.redis = redis_client
    
    # ==================== 分支管理 ====================
    
    def create_branch(self, document_id: str, branch_name: str, 
                     document_type: str = "diagram", 
                     parent_branch_id: str = None) -> Tuple[Any, bool]:
        """創建分支"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 檢查權限
            if not self._check_document_permission(user_id, document_id, 'write'):
                return "無權限創建分支", False
            
            # 驗證分支名稱
            if not self._validate_branch_name(branch_name):
                return "分支名稱格式不正確", False
            
            # 如果沒有指定父分支，使用主分支
            if not parent_branch_id:
                parent_branch_id = self._get_main_branch_id(document_id, document_type)
            
            result, success = self.model.create_branch(
                document_id=document_id,
                document_type=document_type,
                branch_name=branch_name,
                parent_branch_id=parent_branch_id,
                created_by=user_id
            )
            
            if success:
                # 清除分支列表緩存
                self._clear_branches_cache(document_id, document_type)
                logger.info(f"用戶 {user_id} 創建分支: {branch_name} ({document_id})")
            
            return result, success
            
        except Exception as e:
            logger.error(f"創建分支失敗: {str(e)}")
            return str(e), False
    
    def get_branches(self, document_id: str, document_type: str = None,
                    include_protected: bool = True) -> Tuple[Any, bool]:
        """獲取分支列表"""
        try:
            user_id = get_jwt_identity()
            if not self._check_document_permission(user_id, document_id, 'read'):
                return "無權限訪問此文檔", False
            
            # 嘗試從緩存獲取
            cache_key = f"branches:{document_id}:{document_type}:{include_protected}"
            cached_result = self.redis.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result), True
            
            result, success = self.model.get_branches(
                document_id=document_id,
                document_type=document_type,
                include_protected=include_protected
            )
            
            if success:
                # 緩存結果，5分鐘過期
                self.redis.setex(cache_key, 300, json.dumps(result))
            
            return result, success
            
        except Exception as e:
            logger.error(f"獲取分支列表失敗: {str(e)}")
            return str(e), False
    
    def get_branch_detail(self, branch_id: str) -> Tuple[Any, bool]:
        """獲取分支詳情"""
        try:
            user_id = get_jwt_identity()
            
            result, success = self.model.get_branch_by_id(branch_id)
            if not success:
                return result, success
            
            # 檢查權限
            if not self._check_document_permission(user_id, result['document_id'], 'read'):
                return "無權限訪問此分支", False
            
            # 添加統計信息
            stats = self._get_branch_stats(branch_id)
            result['stats'] = stats
            
            return result, True
            
        except Exception as e:
            logger.error(f"獲取分支詳情失敗: {str(e)}")
            return str(e), False
    
    def update_branch(self, branch_id: str, **kwargs) -> Tuple[Any, bool]:
        """更新分支設置"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 獲取分支信息以檢查權限
            branch_result, branch_success = self.model.get_branch_by_id(branch_id)
            if not branch_success:
                return branch_result, False
            
            if not self._check_document_permission(user_id, branch_result['document_id'], 'admin'):
                return "無權限修改分支設置", False
            
            result, success = self.model.update_branch(branch_id, **kwargs)
            
            if success:
                # 清除相關緩存
                self._clear_branches_cache(branch_result['document_id'], 
                                         branch_result['document_type'])
                logger.info(f"用戶 {user_id} 更新分支設置: {branch_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"更新分支失敗: {str(e)}")
            return str(e), False
    
    def delete_branch(self, branch_id: str) -> Tuple[Any, bool]:
        """刪除分支"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 獲取分支信息以檢查權限
            branch_result, branch_success = self.model.get_branch_by_id(branch_id)
            if not branch_success:
                return branch_result, False
            
            if not self._check_document_permission(user_id, branch_result['document_id'], 'admin'):
                return "無權限刪除分支", False
            
            result, success = self.model.delete_branch(branch_id, user_id)
            
            if success:
                # 清除相關緩存
                self._clear_branches_cache(branch_result['document_id'], 
                                         branch_result['document_type'])
                logger.info(f"用戶 {user_id} 刪除分支: {branch_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"刪除分支失敗: {str(e)}")
            return str(e), False
    
    def protect_branch(self, branch_id: str, protection_rules: Dict) -> Tuple[Any, bool]:
        """保護分支"""
        try:
            return self.update_branch(
                branch_id=branch_id,
                is_protected=True,
                protection_rules=protection_rules
            )
            
        except Exception as e:
            logger.error(f"保護分支失敗: {str(e)}")
            return str(e), False
    
    # ==================== 提交管理 ====================
    
    def create_commit(self, branch_id: str, commit_message: str, 
                     document_snapshot: Dict, changes_summary: Dict = None,
                     parent_commit_id: str = None) -> Tuple[Any, bool]:
        """創建提交"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 獲取分支信息以檢查權限
            branch_result, branch_success = self.model.get_branch_by_id(branch_id)
            if not branch_success:
                return branch_result, False
            
            if not self._check_document_permission(user_id, branch_result['document_id'], 'write'):
                return "無權限提交到此分支", False
            
            # 檢查分支保護
            if branch_result.get('is_protected') and not self._can_push_to_protected_branch(
                user_id, branch_result
            ):
                return "受保護的分支不允許直接提交", False
            
            result, success = self.model.create_commit(
                branch_id=branch_id,
                author_id=user_id,
                commit_message=commit_message,
                document_snapshot=document_snapshot,
                changes_summary=changes_summary,
                parent_commit_id=parent_commit_id
            )
            
            if success:
                # 清除相關緩存
                self._clear_commits_cache(branch_result['document_id'])
                logger.info(f"用戶 {user_id} 創建提交: {result['commit_hash'][:8]} ({branch_id})")
            
            return result, success
            
        except Exception as e:
            logger.error(f"創建提交失敗: {str(e)}")
            return str(e), False
    
    def get_commits(self, document_id: str = None, branch_id: str = None,
                   limit: int = 50, offset: int = 0) -> Tuple[Any, bool]:
        """獲取提交歷史"""
        try:
            user_id = get_jwt_identity()
            
            # 驗證權限
            check_document_id = document_id
            if not check_document_id and branch_id:
                branch_result, branch_success = self.model.get_branch_by_id(branch_id)
                if branch_success:
                    check_document_id = branch_result['document_id']
            
            if check_document_id and not self._check_document_permission(
                user_id, check_document_id, 'read'
            ):
                return "無權限訪問此文檔", False
            
            # 嘗試從緩存獲取
            cache_key = f"commits:{document_id}:{branch_id}:{limit}:{offset}"
            cached_result = self.redis.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result), True
            
            result, success = self.model.get_commits(
                document_id=document_id,
                branch_id=branch_id,
                limit=limit,
                offset=offset
            )
            
            if success:
                # 緩存結果，3分鐘過期
                result['has_more'] = result['total'] > (offset + limit)
                self.redis.setex(cache_key, 180, json.dumps(result))
            
            return result, success
            
        except Exception as e:
            logger.error(f"獲取提交歷史失敗: {str(e)}")
            return str(e), False
    
    def get_commit_detail(self, commit_id: str) -> Tuple[Any, bool]:
        """獲取提交詳情"""
        try:
            user_id = get_jwt_identity()
            
            result, success = self.model.get_commit_by_id(commit_id)
            if not success:
                return result, success
            
            # 通過分支檢查權限
            branch_result, branch_success = self.model.get_branch_by_id(result['branch_id'])
            if branch_success and not self._check_document_permission(
                user_id, branch_result['document_id'], 'read'
            ):
                return "無權限訪問此提交", False
            
            return result, True
            
        except Exception as e:
            logger.error(f"獲取提交詳情失敗: {str(e)}")
            return str(e), False
    
    def revert_commit(self, commit_id: str) -> Tuple[Any, bool]:
        """回滾提交"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 獲取提交信息
            commit_result, commit_success = self.model.get_commit_by_id(commit_id)
            if not commit_success:
                return commit_result, False
            
            # 檢查權限
            branch_result, branch_success = self.model.get_branch_by_id(commit_result['branch_id'])
            if not branch_success:
                return "分支不存在", False
            
            if not self._check_document_permission(user_id, branch_result['document_id'], 'write'):
                return "無權限回滾此提交", False
            
            result, success = self.model.revert_commit(commit_id, user_id)
            
            if success:
                # 清除相關緩存
                self._clear_commits_cache(branch_result['document_id'])
                logger.info(f"用戶 {user_id} 回滾提交: {commit_result['commit_hash'][:8]}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"回滾提交失敗: {str(e)}")
            return str(e), False
    
    # ==================== 合併請求管理 ====================
    
    def create_merge_request(self, source_branch_id: str, target_branch_id: str,
                           title: str, description: str = "",
                           reviewers: List[str] = None) -> Tuple[Any, bool]:
        """創建合併請求"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 驗證分支權限
            source_branch, source_success = self.model.get_branch_by_id(source_branch_id)
            target_branch, target_success = self.model.get_branch_by_id(target_branch_id)
            
            if not source_success or not target_success:
                return "源分支或目標分支不存在", False
            
            if not self._check_document_permission(user_id, source_branch['document_id'], 'write'):
                return "無權限創建合併請求", False
            
            result, success = self.model.create_merge_request(
                source_branch_id=source_branch_id,
                target_branch_id=target_branch_id,
                title=title,
                description=description,
                created_by=user_id,
                reviewers=reviewers
            )
            
            if success:
                # 清除合併請求列表緩存
                self._clear_merge_requests_cache(source_branch['document_id'])
                logger.info(f"用戶 {user_id} 創建合併請求: {title} ({source_branch_id} -> {target_branch_id})")
            
            return result, success
            
        except Exception as e:
            logger.error(f"創建合併請求失敗: {str(e)}")
            return str(e), False
    
    def get_merge_requests(self, document_id: str = None, status: str = None,
                          created_by: str = None, assignee_id: str = None,
                          limit: int = 50, offset: int = 0) -> Tuple[Any, bool]:
        """獲取合併請求列表"""
        try:
            user_id = get_jwt_identity()
            
            if document_id and not self._check_document_permission(user_id, document_id, 'read'):
                return "無權限訪問此文檔", False
            
            # 嘗試從緩存獲取
            cache_key = f"merge_requests:{document_id}:{status}:{created_by}:{assignee_id}:{limit}:{offset}"
            cached_result = self.redis.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result), True
            
            result, success = self.model.get_merge_requests(
                document_id=document_id,
                status=status,
                created_by=created_by,
                assignee_id=assignee_id,
                limit=limit,
                offset=offset
            )
            
            if success:
                # 添加額外信息
                for mr in result['merge_requests']:
                    mr['can_be_merged'] = self._can_merge_request(mr)
                    mr['is_approved'] = self._is_merge_request_approved(mr)
                
                result['has_more'] = result['total'] > (offset + limit)
                
                # 緩存結果，2分鐘過期
                self.redis.setex(cache_key, 120, json.dumps(result))
            
            return result, success
            
        except Exception as e:
            logger.error(f"獲取合併請求失敗: {str(e)}")
            return str(e), False
    
    def get_merge_request_detail(self, mr_id: str) -> Tuple[Any, bool]:
        """獲取合併請求詳情"""
        try:
            user_id = get_jwt_identity()
            
            result, success = self.model.get_merge_request_by_id(mr_id)
            if not success:
                return result, success
            
            # 檢查權限
            source_branch, source_success = self.model.get_branch_by_id(result['source_branch_id'])
            if source_success and not self._check_document_permission(
                user_id, source_branch['document_id'], 'read'
            ):
                return "無權限訪問此合併請求", False
            
            # 添加額外信息
            result['can_be_merged'] = self._can_merge_request(result)
            result['is_approved'] = self._is_merge_request_approved(result)
            
            return result, True
            
        except Exception as e:
            logger.error(f"獲取合併請求詳情失敗: {str(e)}")
            return str(e), False
    
    def update_merge_request(self, mr_id: str, **kwargs) -> Tuple[Any, bool]:
        """更新合併請求"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 獲取合併請求信息
            mr_result, mr_success = self.model.get_merge_request_by_id(mr_id)
            if not mr_success:
                return mr_result, False
            
            # 檢查權限（創建者或管理員可以修改）
            if mr_result['created_by'] != user_id:
                source_branch, source_success = self.model.get_branch_by_id(mr_result['source_branch_id'])
                if not source_success or not self._check_document_permission(
                    user_id, source_branch['document_id'], 'admin'
                ):
                    return "無權限修改此合併請求", False
            
            result, success = self.model.update_merge_request(mr_id, **kwargs)
            
            if success:
                # 清除相關緩存
                if 'source_branch_id' in mr_result:
                    source_branch, _ = self.model.get_branch_by_id(mr_result['source_branch_id'])
                    if source_branch:
                        self._clear_merge_requests_cache(source_branch['document_id'])
                
                logger.info(f"用戶 {user_id} 更新合併請求: {mr_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"更新合併請求失敗: {str(e)}")
            return str(e), False
    
    def merge_request(self, mr_id: str) -> Tuple[Any, bool]:
        """執行合併請求"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 獲取合併請求信息
            mr_result, mr_success = self.model.get_merge_request_by_id(mr_id)
            if not mr_success:
                return mr_result, False
            
            # 檢查權限
            target_branch, target_success = self.model.get_branch_by_id(mr_result['target_branch_id'])
            if not target_success:
                return "目標分支不存在", False
            
            if not self._check_document_permission(user_id, target_branch['document_id'], 'write'):
                return "無權限執行合併", False
            
            # 檢查是否可以合併
            if not self._can_merge_request(mr_result):
                return "合併請求不滿足合併條件", False
            
            result, success = self.model.merge_request(mr_id, user_id)
            
            if success:
                # 清除相關緩存
                self._clear_commits_cache(target_branch['document_id'])
                self._clear_merge_requests_cache(target_branch['document_id'])
                
                logger.info(f"用戶 {user_id} 執行合併請求: {mr_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"執行合併請求失敗: {str(e)}")
            return str(e), False
    
    def close_merge_request(self, mr_id: str) -> Tuple[Any, bool]:
        """關閉合併請求"""
        try:
            return self.update_merge_request(mr_id, status='closed')
            
        except Exception as e:
            logger.error(f"關閉合併請求失敗: {str(e)}")
            return str(e), False
    
    # ==================== 標籤管理 ====================
    
    def create_tag(self, document_id: str, tag_name: str, commit_id: str,
                  tag_type: str = 'milestone', description: str = "",
                  document_type: str = "diagram") -> Tuple[Any, bool]:
        """創建標籤"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            if not self._check_document_permission(user_id, document_id, 'write'):
                return "無權限創建標籤", False
            
            result, success = self.model.create_tag(
                document_id=document_id,
                document_type=document_type,
                tag_name=tag_name,
                commit_id=commit_id,
                tag_type=tag_type,
                description=description,
                created_by=user_id
            )
            
            if success:
                # 清除標籤列表緩存
                self._clear_tags_cache(document_id, document_type)
                logger.info(f"用戶 {user_id} 創建標籤: {tag_name} ({document_id})")
            
            return result, success
            
        except Exception as e:
            logger.error(f"創建標籤失敗: {str(e)}")
            return str(e), False
    
    def get_tags(self, document_id: str, document_type: str = None,
                tag_type: str = None) -> Tuple[Any, bool]:
        """獲取標籤列表"""
        try:
            user_id = get_jwt_identity()
            
            if not self._check_document_permission(user_id, document_id, 'read'):
                return "無權限訪問此文檔", False
            
            # 嘗試從緩存獲取
            cache_key = f"tags:{document_id}:{document_type}:{tag_type}"
            cached_result = self.redis.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result), True
            
            result, success = self.model.get_tags(
                document_id=document_id,
                document_type=document_type,
                tag_type=tag_type
            )
            
            if success:
                # 緩存結果，10分鐘過期
                self.redis.setex(cache_key, 600, json.dumps(result))
            
            return result, success
            
        except Exception as e:
            logger.error(f"獲取標籤列表失敗: {str(e)}")
            return str(e), False
    
    def delete_tag(self, tag_id: str) -> Tuple[Any, bool]:
        """刪除標籤"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 獲取標籤信息以檢查權限
            tags_result, tags_success = self.model.get_tags(None)  # 需要先獲取標籤信息
            # 這裡簡化處理，實際需要實現 get_tag_by_id 方法
            
            result, success = self.model.delete_tag(tag_id)
            
            if success:
                logger.info(f"用戶 {user_id} 刪除標籤: {tag_id}")
            
            return result, success
            
        except Exception as e:
            logger.error(f"刪除標籤失敗: {str(e)}")
            return str(e), False
    
    # ==================== 代碼審查管理 ====================
    
    def submit_review(self, mr_id: str, status: str, comments: str = "") -> Tuple[Any, bool]:
        """提交審查"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 檢查是否為指定的審查者
            mr_result, mr_success = self.model.get_merge_request_by_id(mr_id)
            if not mr_success:
                return mr_result, False
            
            reviewers = mr_result.get('reviewers', [])
            if reviewers and user_id not in reviewers:
                return "您不是此合併請求的指定審查者", False
            
            result, success = self.model.submit_review(mr_id, user_id, status, comments)
            
            if success:
                # 清除合併請求緩存
                source_branch, _ = self.model.get_branch_by_id(mr_result['source_branch_id'])
                if source_branch:
                    self._clear_merge_requests_cache(source_branch['document_id'])
                
                logger.info(f"用戶 {user_id} 提交審查: {status} ({mr_id})")
            
            return result, success
            
        except Exception as e:
            logger.error(f"提交審查失敗: {str(e)}")
            return str(e), False
    
    def get_reviews(self, mr_id: str) -> Tuple[Any, bool]:
        """獲取審查列表"""
        try:
            user_id = get_jwt_identity()
            
            # 檢查權限
            mr_result, mr_success = self.model.get_merge_request_by_id(mr_id)
            if not mr_success:
                return mr_result, False
            
            source_branch, source_success = self.model.get_branch_by_id(mr_result['source_branch_id'])
            if source_success and not self._check_document_permission(
                user_id, source_branch['document_id'], 'read'
            ):
                return "無權限訪問此合併請求的審查", False
            
            return self.model.get_reviews(mr_id)
            
        except Exception as e:
            logger.error(f"獲取審查列表失敗: {str(e)}")
            return str(e), False
    
    # ==================== 版本比較 ====================
    
    def compare_versions(self, commit_id1: str, commit_id2: str) -> Tuple[Any, bool]:
        """比較版本"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return "用戶未認證", False
            
            # 檢查提交是否存在及權限
            commit1_result, commit1_success = self.model.get_commit_by_id(commit_id1)
            commit2_result, commit2_success = self.model.get_commit_by_id(commit_id2)
            
            if not commit1_success or not commit2_success:
                return "提交不存在", False
            
            # 檢查權限
            branch1, branch1_success = self.model.get_branch_by_id(commit1_result['branch_id'])
            branch2, branch2_success = self.model.get_branch_by_id(commit2_result['branch_id'])
            
            if branch1_success and not self._check_document_permission(
                user_id, branch1['document_id'], 'read'
            ):
                return "無權限比較此版本", False
            
            return self.model.compare_versions(commit_id1, commit_id2)
            
        except Exception as e:
            logger.error(f"版本比較失敗: {str(e)}")
            return str(e), False
    
    def get_commit_diff(self, commit_id: str) -> Tuple[Any, bool]:
        """獲取提交差異"""
        try:
            user_id = get_jwt_identity()
            
            # 獲取提交信息
            commit_result, commit_success = self.model.get_commit_by_id(commit_id)
            if not commit_success:
                return commit_result, False
            
            # 檢查權限
            branch, branch_success = self.model.get_branch_by_id(commit_result['branch_id'])
            if branch_success and not self._check_document_permission(
                user_id, branch['document_id'], 'read'
            ):
                return "無權限訪問此提交", False
            
            # 如果有父提交，比較父提交和當前提交
            if commit_result.get('parent_commit_id'):
                return self.model.compare_versions(
                    commit_result['parent_commit_id'], 
                    commit_id
                )
            else:
                # 初始提交，返回所有內容作為新增
                return {
                    'commit1': None,
                    'commit2': commit_result,
                    'diff': {
                        'added': [{'path': k, 'value': v} for k, v in commit_result['document_snapshot'].items()],
                        'removed': [],
                        'modified': []
                    }
                }, True
            
        except Exception as e:
            logger.error(f"獲取提交差異失敗: {str(e)}")
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
            
            # 如果緩存中沒有，假設有權限（實際項目中需要從權限服務獲取）
            permissions = {'role': 'editor', 'can_read': True, 'can_write': True, 'can_admin': False}
            
            # 緩存權限信息
            self.redis.setex(permission_key, 300, json.dumps(permissions))
            
            return self._validate_permission(permissions, required_permission)
            
        except Exception as e:
            logger.error(f"檢查文檔權限失敗: {str(e)}")
            return False
    
    def _validate_permission(self, permissions: Dict, required: str) -> bool:
        """驗證權限"""
        permission_mapping = {
            'read': permissions.get('can_read', False),
            'write': permissions.get('can_write', False),
            'admin': permissions.get('can_admin', False)
        }
        
        return permission_mapping.get(required, False)
    
    def _validate_branch_name(self, branch_name: str) -> bool:
        """驗證分支名稱"""
        # 實現分支名稱驗證邏輯
        if not branch_name or len(branch_name) > 255:
            return False
        
        # 不允許的字符
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in invalid_chars:
            if char in branch_name:
                return False
        
        return True
    
    def _get_main_branch_id(self, document_id: str, document_type: str) -> str:
        """獲取主分支ID"""
        # 查找主分支
        branches, success = self.model.get_branches(document_id, document_type)
        if success:
            for branch in branches:
                if branch['branch_name'] in ['main', 'master']:
                    return branch['id']
        return None
    
    def _can_push_to_protected_branch(self, user_id: str, branch: Dict) -> bool:
        """檢查是否可以推送到保護分支"""
        protection_rules = branch.get('protection_rules', {})
        allowed_users = protection_rules.get('allowed_push_users', [])
        
        return user_id in allowed_users
    
    def _get_branch_stats(self, branch_id: str) -> Dict:
        """獲取分支統計信息"""
        # 實現分支統計邏輯
        return {
            'total_commits': 0,
            'contributors': 0,
            'last_activity': None,
            'ahead_count': 0,
            'behind_count': 0
        }
    
    def _can_merge_request(self, mr: Dict) -> bool:
        """檢查合併請求是否可以合併"""
        return (
            mr.get('status') == 'open' and
            not mr.get('conflicts') and
            self._is_merge_request_approved(mr)
        )
    
    def _is_merge_request_approved(self, mr: Dict) -> bool:
        """檢查合併請求是否已批准"""
        if not mr.get('review_required', True):
            return True
        
        reviewers = mr.get('reviewers', [])
        approvals = mr.get('approvals', {})
        
        if not reviewers:
            return True
        
        # 檢查所有審查者是否都已批准
        for reviewer in reviewers:
            approval = approvals.get(reviewer, {})
            if approval.get('status') != 'approved':
                return False
        
        return True
    
    def _clear_branches_cache(self, document_id: str, document_type: str):
        """清除分支相關緩存"""
        pattern = f"branches:{document_id}:{document_type}:*"
        # Redis 模式匹配刪除（簡化實現）
        cache_keys = [f"branches:{document_id}:{document_type}:True", 
                     f"branches:{document_id}:{document_type}:False"]
        for key in cache_keys:
            self.redis.delete(key)
    
    def _clear_commits_cache(self, document_id: str):
        """清除提交相關緩存"""
        # 簡化實現，實際需要模式匹配刪除
        pass
    
    def _clear_merge_requests_cache(self, document_id: str):
        """清除合併請求相關緩存"""
        # 簡化實現，實際需要模式匹配刪除
        pass
    
    def _clear_tags_cache(self, document_id: str, document_type: str):
        """清除標籤相關緩存"""
        cache_keys = [
            f"tags:{document_id}:{document_type}:None",
            f"tags:{document_id}:{document_type}:release",
            f"tags:{document_id}:{document_type}:milestone",
            f"tags:{document_id}:{document_type}:hotfix"
        ]
        for key in cache_keys:
            self.redis.delete(key)


def init_version_control_controller():
    """初始化版本控制控制器"""
    global version_control_controller
    version_control_controller = VersionControlController()
    logger.info("版本控制控制器初始化完成")