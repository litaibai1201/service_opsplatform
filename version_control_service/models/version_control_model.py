# -*- coding: utf-8 -*-
"""
@文件: version_control_model.py
@說明: 版本控制服務數據模型 (Version Control Service)
@時間: 2025-01-09
@作者: LiDong
"""

import uuid
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Any, Tuple
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.exc import IntegrityError

from dbs.mysql_db import db, DBFunction
from dbs.mysql_db.model_tables import VersionBranch, VersionCommit, MergeRequest, VersionTag, CodeReview
from common.common_tools import CommonTools
from loggers import logger


class VersionControlModel:
    """版本控制服務數據模型"""
    
    # ==================== 分支管理 ====================
    
    @staticmethod
    def create_branch(document_id: str, document_type: str, branch_name: str,
                     parent_branch_id: str = None, created_by: str = None) -> Tuple[Any, bool]:
        """創建分支"""
        try:
            # 檢查分支名是否已存在
            existing = VersionBranch.query.filter(
                and_(
                    VersionBranch.document_id == document_id,
                    VersionBranch.document_type == document_type,
                    VersionBranch.branch_name == branch_name
                )
            ).first()
            
            if existing:
                return "分支名已存在", False
            
            branch = VersionBranch(
                document_id=document_id,
                document_type=document_type,
                branch_name=branch_name,
                parent_branch_id=parent_branch_id,
                created_by=created_by
            )
            
            db.session.add(branch)
            result, success = DBFunction.do_commit("創建分支")
            
            if success:
                return branch.to_dict(), True
            return result, False
            
        except IntegrityError:
            DBFunction.db_rollback()
            return "分支名已存在", False
        except Exception as e:
            logger.error(f"創建分支失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_branches(document_id: str, document_type: str = None,
                    include_protected: bool = True) -> Tuple[Any, bool]:
        """獲取分支列表"""
        try:
            query = VersionBranch.query.filter(VersionBranch.document_id == document_id)
            
            if document_type:
                query = query.filter(VersionBranch.document_type == document_type)
            
            if not include_protected:
                query = query.filter(VersionBranch.is_protected == False)
            
            branches = query.order_by(VersionBranch.created_at.desc()).all()
            return [branch.to_dict() for branch in branches], True
            
        except Exception as e:
            logger.error(f"獲取分支列表失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def get_branch_by_id(branch_id: str) -> Tuple[Any, bool]:
        """根據ID獲取分支"""
        try:
            branch = VersionBranch.query.filter_by(id=branch_id).first()
            if not branch:
                return "分支不存在", False
            
            return branch.to_dict(), True
            
        except Exception as e:
            logger.error(f"獲取分支失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def update_branch(branch_id: str, **kwargs) -> Tuple[Any, bool]:
        """更新分支設置"""
        try:
            branch = VersionBranch.query.filter_by(id=branch_id).first()
            if not branch:
                return "分支不存在", False
            
            # 更新允許的字段
            allowed_fields = ['is_protected', 'protection_rules']
            for field, value in kwargs.items():
                if field in allowed_fields:
                    setattr(branch, field, value)
            
            result, success = DBFunction.do_commit("更新分支設置")
            
            if success:
                return branch.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"更新分支失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def delete_branch(branch_id: str, user_id: str) -> Tuple[Any, bool]:
        """刪除分支"""
        try:
            branch = VersionBranch.query.filter_by(id=branch_id).first()
            if not branch:
                return "分支不存在", False
            
            # 檢查分支保護
            if branch.is_protected:
                return "受保護的分支不能刪除", False
            
            # 檢查是否為主分支
            if branch.branch_name in ['main', 'master', 'develop']:
                return "主分支不能刪除", False
            
            # 檢查是否有未合併的提交
            unmerged_commits = VersionCommit.query.filter_by(branch_id=branch_id).count()
            if unmerged_commits > 0:
                return f"分支還有 {unmerged_commits} 個未合併的提交", False
            
            db.session.delete(branch)
            return DBFunction.do_commit("刪除分支")
            
        except Exception as e:
            logger.error(f"刪除分支失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    # ==================== 提交管理 ====================
    
    @staticmethod
    def create_commit(branch_id: str, author_id: str, commit_message: str,
                     document_snapshot: Dict, changes_summary: Dict = None,
                     parent_commit_id: str = None) -> Tuple[Any, bool]:
        """創建提交"""
        try:
            # 驗證分支是否存在
            branch = VersionBranch.query.filter_by(id=branch_id).first()
            if not branch:
                return "分支不存在", False
            
            # 如果沒有指定父提交，使用分支的HEAD提交
            if not parent_commit_id:
                parent_commit_id = branch.head_commit_id
            
            commit = VersionCommit(
                branch_id=branch_id,
                author_id=author_id,
                commit_message=commit_message,
                document_snapshot=document_snapshot,
                changes_summary=changes_summary,
                parent_commit_id=parent_commit_id
            )
            
            db.session.add(commit)
            db.session.flush()  # 獲取commit ID
            
            # 更新分支HEAD指針
            branch.head_commit_id = commit.id
            
            result, success = DBFunction.do_commit("創建提交")
            
            if success:
                return commit.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"創建提交失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_commits(document_id: str = None, branch_id: str = None, 
                   limit: int = 50, offset: int = 0) -> Tuple[Any, bool]:
        """獲取提交歷史"""
        try:
            query = VersionCommit.query
            
            if branch_id:
                query = query.filter(VersionCommit.branch_id == branch_id)
            elif document_id:
                query = query.join(VersionBranch).filter(VersionBranch.document_id == document_id)
            
            total = query.count()
            commits = query.order_by(desc(VersionCommit.created_at))\
                          .offset(offset).limit(limit).all()
            
            return {
                'commits': [commit.to_dict() for commit in commits],
                'total': total,
                'limit': limit,
                'offset': offset
            }, True
            
        except Exception as e:
            logger.error(f"獲取提交歷史失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def get_commit_by_id(commit_id: str) -> Tuple[Any, bool]:
        """根據ID獲取提交"""
        try:
            commit = VersionCommit.query.filter_by(id=commit_id).first()
            if not commit:
                return "提交不存在", False
            
            return commit.to_dict(), True
            
        except Exception as e:
            logger.error(f"獲取提交失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def get_commit_by_hash(commit_hash: str) -> Tuple[Any, bool]:
        """根據哈希獲取提交"""
        try:
            commit = VersionCommit.query.filter_by(commit_hash=commit_hash).first()
            if not commit:
                return "提交不存在", False
            
            return commit.to_dict(), True
            
        except Exception as e:
            logger.error(f"獲取提交失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def revert_commit(commit_id: str, reverter_id: str) -> Tuple[Any, bool]:
        """回滾提交"""
        try:
            original_commit = VersionCommit.query.filter_by(id=commit_id).first()
            if not original_commit:
                return "提交不存在", False
            
            # 獲取父提交的快照作為回滾版本
            if not original_commit.parent_commit_id:
                return "無法回滾初始提交", False
            
            parent_commit = VersionCommit.query.filter_by(id=original_commit.parent_commit_id).first()
            if not parent_commit:
                return "父提交不存在", False
            
            # 創建回滾提交
            revert_commit = VersionCommit(
                branch_id=original_commit.branch_id,
                author_id=reverter_id,
                commit_message=f"Revert \"{original_commit.commit_message}\"",
                document_snapshot=parent_commit.document_snapshot,
                changes_summary={
                    'type': 'revert',
                    'reverted_commit': commit_id,
                    'reverted_hash': original_commit.commit_hash
                },
                parent_commit_id=original_commit.branch.head_commit_id
            )
            
            db.session.add(revert_commit)
            db.session.flush()
            
            # 更新分支HEAD
            branch = VersionBranch.query.filter_by(id=original_commit.branch_id).first()
            branch.head_commit_id = revert_commit.id
            
            result, success = DBFunction.do_commit("回滾提交")
            
            if success:
                return revert_commit.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"回滾提交失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    # ==================== 合併請求管理 ====================
    
    @staticmethod
    def create_merge_request(source_branch_id: str, target_branch_id: str,
                           title: str, description: str = "", created_by: str = None,
                           reviewers: List[str] = None) -> Tuple[Any, bool]:
        """創建合併請求"""
        try:
            # 驗證分支存在
            source_branch = VersionBranch.query.filter_by(id=source_branch_id).first()
            target_branch = VersionBranch.query.filter_by(id=target_branch_id).first()
            
            if not source_branch or not target_branch:
                return "源分支或目標分支不存在", False
            
            # 檢查是否已存在相同的合併請求
            existing = MergeRequest.query.filter(
                and_(
                    MergeRequest.source_branch_id == source_branch_id,
                    MergeRequest.target_branch_id == target_branch_id,
                    MergeRequest.status.in_(['open', 'draft'])
                )
            ).first()
            
            if existing:
                return "已存在相同的合併請求", False
            
            # 檢測衝突
            conflicts = VersionControlModel._detect_merge_conflicts(source_branch, target_branch)
            
            merge_request = MergeRequest(
                source_branch_id=source_branch_id,
                target_branch_id=target_branch_id,
                title=title,
                description=description,
                created_by=created_by,
                reviewers=reviewers or [],
                conflicts=conflicts
            )
            
            db.session.add(merge_request)
            result, success = DBFunction.do_commit("創建合併請求")
            
            if success:
                return merge_request.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"創建合併請求失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_merge_requests(document_id: str = None, status: str = None,
                          created_by: str = None, assignee_id: str = None,
                          limit: int = 50, offset: int = 0) -> Tuple[Any, bool]:
        """獲取合併請求列表"""
        try:
            query = MergeRequest.query
            
            if document_id:
                query = query.join(VersionBranch, MergeRequest.source_branch_id == VersionBranch.id)\
                            .filter(VersionBranch.document_id == document_id)
            
            if status:
                query = query.filter(MergeRequest.status == status)
            
            if created_by:
                query = query.filter(MergeRequest.created_by == created_by)
            
            if assignee_id:
                query = query.filter(MergeRequest.assignee_id == assignee_id)
            
            total = query.count()
            merge_requests = query.order_by(desc(MergeRequest.created_at))\
                                 .offset(offset).limit(limit).all()
            
            return {
                'merge_requests': [mr.to_dict() for mr in merge_requests],
                'total': total,
                'limit': limit,
                'offset': offset
            }, True
            
        except Exception as e:
            logger.error(f"獲取合併請求失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def get_merge_request_by_id(mr_id: str) -> Tuple[Any, bool]:
        """根據ID獲取合併請求"""
        try:
            mr = MergeRequest.query.filter_by(id=mr_id).first()
            if not mr:
                return "合併請求不存在", False
            
            return mr.to_dict(), True
            
        except Exception as e:
            logger.error(f"獲取合併請求失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def update_merge_request(mr_id: str, **kwargs) -> Tuple[Any, bool]:
        """更新合併請求"""
        try:
            mr = MergeRequest.query.filter_by(id=mr_id).first()
            if not mr:
                return "合併請求不存在", False
            
            # 更新允許的字段
            allowed_fields = ['title', 'description', 'assignee_id', 'reviewers', 'status']
            for field, value in kwargs.items():
                if field in allowed_fields:
                    setattr(mr, field, value)
            
            result, success = DBFunction.do_commit("更新合併請求")
            
            if success:
                return mr.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"更新合併請求失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def merge_request(mr_id: str, merged_by: str) -> Tuple[Any, bool]:
        """執行合併請求"""
        try:
            mr = MergeRequest.query.filter_by(id=mr_id).first()
            if not mr:
                return "合併請求不存在", False
            
            if mr.status != 'open':
                return "合併請求狀態不允許合併", False
            
            if not mr.can_be_merged:
                return "合併請求未滿足合併條件", False
            
            # 執行合併操作
            source_branch = VersionBranch.query.filter_by(id=mr.source_branch_id).first()
            target_branch = VersionBranch.query.filter_by(id=mr.target_branch_id).first()
            
            if not source_branch or not target_branch:
                return "源分支或目標分支不存在", False
            
            # 獲取源分支的最新提交
            source_commit = VersionCommit.query.filter_by(id=source_branch.head_commit_id).first()
            if not source_commit:
                return "源分支沒有提交", False
            
            # 創建合併提交
            merge_commit = VersionCommit(
                branch_id=target_branch.id,
                author_id=merged_by,
                commit_message=f"Merge branch '{source_branch.branch_name}' into '{target_branch.branch_name}'",
                document_snapshot=source_commit.document_snapshot,
                changes_summary={
                    'type': 'merge',
                    'source_branch': source_branch.branch_name,
                    'target_branch': target_branch.branch_name,
                    'merge_request_id': mr_id
                },
                is_merge_commit=True,
                merge_from_branch=source_branch.id,
                parent_commit_id=target_branch.head_commit_id
            )
            
            db.session.add(merge_commit)
            db.session.flush()
            
            # 更新目標分支HEAD和合併請求狀態
            target_branch.head_commit_id = merge_commit.id
            mr.status = 'merged'
            mr.merged_by = merged_by
            mr.merge_commit_id = merge_commit.id
            mr.merged_at = datetime.utcnow()
            
            result, success = DBFunction.do_commit("執行合併")
            
            if success:
                return merge_commit.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"執行合併失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    # ==================== 標籤管理 ====================
    
    @staticmethod
    def create_tag(document_id: str, document_type: str, tag_name: str,
                  commit_id: str, tag_type: str = 'milestone',
                  description: str = "", created_by: str = None) -> Tuple[Any, bool]:
        """創建標籤"""
        try:
            # 檢查提交是否存在
            commit = VersionCommit.query.filter_by(id=commit_id).first()
            if not commit:
                return "提交不存在", False
            
            tag = VersionTag(
                document_id=document_id,
                document_type=document_type,
                tag_name=tag_name,
                commit_id=commit_id,
                tag_type=tag_type,
                description=description,
                created_by=created_by
            )
            
            db.session.add(tag)
            result, success = DBFunction.do_commit("創建標籤")
            
            if success:
                return tag.to_dict(), True
            return result, False
            
        except IntegrityError:
            DBFunction.db_rollback()
            return "標籤名已存在", False
        except Exception as e:
            logger.error(f"創建標籤失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_tags(document_id: str, document_type: str = None,
                tag_type: str = None) -> Tuple[Any, bool]:
        """獲取標籤列表"""
        try:
            query = VersionTag.query.filter(VersionTag.document_id == document_id)
            
            if document_type:
                query = query.filter(VersionTag.document_type == document_type)
            
            if tag_type:
                query = query.filter(VersionTag.tag_type == tag_type)
            
            tags = query.order_by(desc(VersionTag.created_at)).all()
            return [tag.to_dict() for tag in tags], True
            
        except Exception as e:
            logger.error(f"獲取標籤列表失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def delete_tag(tag_id: str) -> Tuple[Any, bool]:
        """刪除標籤"""
        try:
            tag = VersionTag.query.filter_by(id=tag_id).first()
            if not tag:
                return "標籤不存在", False
            
            db.session.delete(tag)
            return DBFunction.do_commit("刪除標籤")
            
        except Exception as e:
            logger.error(f"刪除標籤失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    # ==================== 代碼審查管理 ====================
    
    @staticmethod
    def submit_review(mr_id: str, reviewer_id: str, status: str,
                     comments: str = "") -> Tuple[Any, bool]:
        """提交審查"""
        try:
            # 檢查合併請求是否存在
            mr = MergeRequest.query.filter_by(id=mr_id).first()
            if not mr:
                return "合併請求不存在", False
            
            # 創建或更新審查記錄
            review = CodeReview.query.filter_by(
                merge_request_id=mr_id, 
                reviewer_id=reviewer_id
            ).first()
            
            if not review:
                review = CodeReview(
                    merge_request_id=mr_id,
                    reviewer_id=reviewer_id
                )
                db.session.add(review)
            
            # 更新審查狀態
            if status == 'approved':
                review.approve(comments)
            elif status == 'rejected':
                review.reject(comments)
            elif status == 'needs_changes':
                review.request_changes(comments)
            else:
                return "無效的審查狀態", False
            
            # 更新合併請求的批准狀態
            if not mr.approvals:
                mr.approvals = {}
            
            mr.approvals[reviewer_id] = {
                'status': status,
                'timestamp': datetime.utcnow().isoformat(),
                'comments': comments
            }
            
            result, success = DBFunction.do_commit("提交審查")
            
            if success:
                return review.to_dict(), True
            return result, False
            
        except Exception as e:
            logger.error(f"提交審查失敗: {str(e)}")
            DBFunction.db_rollback()
            return str(e), False
    
    @staticmethod
    def get_reviews(mr_id: str) -> Tuple[Any, bool]:
        """獲取審查列表"""
        try:
            reviews = CodeReview.query.filter_by(merge_request_id=mr_id).all()
            return [review.to_dict() for review in reviews], True
            
        except Exception as e:
            logger.error(f"獲取審查列表失敗: {str(e)}")
            return str(e), False
    
    # ==================== 輔助方法 ====================
    
    @staticmethod
    def _detect_merge_conflicts(source_branch: VersionBranch, 
                              target_branch: VersionBranch) -> Dict:
        """檢測合併衝突"""
        try:
            # 這裡實現衝突檢測邏輯
            # 簡化版本：比較兩個分支的最新提交
            conflicts = []
            
            if not source_branch.head_commit_id or not target_branch.head_commit_id:
                return {'conflicts': conflicts, 'has_conflicts': False}
            
            source_commit = VersionCommit.query.filter_by(id=source_branch.head_commit_id).first()
            target_commit = VersionCommit.query.filter_by(id=target_branch.head_commit_id).first()
            
            if source_commit and target_commit:
                # 實際項目中需要實現更複雜的衝突檢測算法
                # 這裡僅做示例
                source_snapshot = source_commit.document_snapshot or {}
                target_snapshot = target_commit.document_snapshot or {}
                
                # 檢查是否有相同路徑的不同修改
                for path in source_snapshot.keys():
                    if (path in target_snapshot and 
                        source_snapshot[path] != target_snapshot[path]):
                        conflicts.append({
                            'path': path,
                            'source_value': source_snapshot[path],
                            'target_value': target_snapshot[path],
                            'type': 'content_conflict'
                        })
            
            return {
                'conflicts': conflicts,
                'has_conflicts': len(conflicts) > 0
            }
            
        except Exception as e:
            logger.error(f"檢測合併衝突失敗: {str(e)}")
            return {'conflicts': [], 'has_conflicts': False}
    
    @staticmethod
    def compare_versions(commit_id1: str, commit_id2: str) -> Tuple[Any, bool]:
        """比較兩個版本"""
        try:
            commit1 = VersionCommit.query.filter_by(id=commit_id1).first()
            commit2 = VersionCommit.query.filter_by(id=commit_id2).first()
            
            if not commit1 or not commit2:
                return "提交不存在", False
            
            # 計算差異
            snapshot1 = commit1.document_snapshot or {}
            snapshot2 = commit2.document_snapshot or {}
            
            diff = VersionControlModel._calculate_diff(snapshot1, snapshot2)
            
            return {
                'commit1': commit1.to_dict(),
                'commit2': commit2.to_dict(),
                'diff': diff
            }, True
            
        except Exception as e:
            logger.error(f"比較版本失敗: {str(e)}")
            return str(e), False
    
    @staticmethod
    def _calculate_diff(snapshot1: Dict, snapshot2: Dict) -> Dict:
        """計算兩個快照的差異"""
        try:
            changes = {
                'added': [],
                'removed': [],
                'modified': []
            }
            
            # 檢查新增和修改
            for key, value in snapshot2.items():
                if key not in snapshot1:
                    changes['added'].append({'path': key, 'value': value})
                elif snapshot1[key] != value:
                    changes['modified'].append({
                        'path': key,
                        'old_value': snapshot1[key],
                        'new_value': value
                    })
            
            # 檢查刪除
            for key, value in snapshot1.items():
                if key not in snapshot2:
                    changes['removed'].append({'path': key, 'value': value})
            
            return changes
            
        except Exception as e:
            logger.error(f"計算差異失敗: {str(e)}")
            return {'added': [], 'removed': [], 'modified': []}