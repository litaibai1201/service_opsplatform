# -*- coding: utf-8 -*-
"""
@文件: version_control_api.py
@說明: 版本控制服務API (Version Control Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from common.common_method import fail_response_result, response_result
from controllers.version_control_controller import version_control_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.version_control_serialize import (
    BranchQuerySchema, BranchCreateSchema, BranchUpdateSchema, BranchResponseSchema,
    CommitCreateSchema, CommitQuerySchema, CommitResponseSchema, CommitHistoryResponseSchema,
    MergeRequestCreateSchema, MergeRequestUpdateSchema, MergeRequestQuerySchema,
    MergeRequestResponseSchema, MergeRequestListResponseSchema,
    TagCreateSchema, TagQuerySchema, TagResponseSchema,
    ReviewSubmitSchema, ReviewUpdateSchema, ReviewResponseSchema,
    VersionCompareSchema, DiffQuerySchema, DiffResponseSchema,
    BranchStatsSchema, DocumentVersionStatsSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("version_control_api", __name__)


class BaseVersionControlView(MethodView):
    """版本控制API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        # 使用全局控制器實例
        if not hasattr(g, 'version_control_controller'):
            g.version_control_controller = version_control_controller
        self.vc = g.version_control_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """統一響應構建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失敗: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 分支管理接口 ====================

@blp.route("/documents/<document_id>/branches")
class BranchManagementApi(BaseVersionControlView):
    """分支管理API"""

    @jwt_required()
    @blp.arguments(BranchQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, document_id):
        """獲取分支列表"""
        try:
            document_type = request.args.get('document_type', 'diagram')
            protected_only = query_params.get('protected', False)
            
            result, flag = self.vc.get_branches(
                document_id=document_id,
                document_type=document_type,
                protected_only=protected_only
            )
            return self._build_response(result, flag, "獲取分支列表成功")
        except Exception as e:
            logger.error(f"獲取分支列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(BranchCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, document_id):
        """創建分支"""
        try:
            result, flag = self.vc.create_branch(
                document_id=document_id,
                branch_name=payload['branch_name'],
                document_type=payload.get('document_type', 'diagram'),
                parent_branch_id=payload.get('parent_branch_id')
            )
            return self._build_response(result, flag, "創建分支成功")
        except Exception as e:
            logger.error(f"創建分支異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/branches/<branch_id>")
class BranchDetailApi(BaseVersionControlView):
    """分支詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, branch_id):
        """獲取分支詳情"""
        try:
            result, flag = self.vc.get_branch_detail(branch_id)
            return self._build_response(result, flag, "獲取分支詳情成功")
        except Exception as e:
            logger.error(f"獲取分支詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(BranchUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, branch_id):
        """更新分支配置"""
        try:
            result, flag = self.vc.update_branch_protection(
                branch_id=branch_id,
                is_protected=payload.get('is_protected'),
                protection_rules=payload.get('protection_rules')
            )
            return self._build_response(result, flag, "更新分支配置成功")
        except Exception as e:
            logger.error(f"更新分支配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, branch_id):
        """刪除分支"""
        try:
            result, flag = self.vc.delete_branch(branch_id)
            return self._build_response(result, flag, "刪除分支成功")
        except Exception as e:
            logger.error(f"刪除分支異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/branches/<branch_id>/stats")
class BranchStatsApi(BaseVersionControlView):
    """分支統計API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, branch_id):
        """獲取分支統計信息"""
        try:
            result, flag = self.vc.get_branch_stats(branch_id)
            return self._build_response(result, flag, "獲取分支統計成功")
        except Exception as e:
            logger.error(f"獲取分支統計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 提交管理接口 ====================

@blp.route("/branches/<branch_id>/commits")
class CommitManagementApi(BaseVersionControlView):
    """提交管理API"""

    @jwt_required()
    @blp.arguments(CommitQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, branch_id):
        """獲取提交歷史"""
        try:
            result, flag = self.vc.get_commit_history(
                document_id=query_params.get('document_id'),
                branch_id=branch_id,
                author_id=query_params.get('author_id'),
                since=query_params.get('since'),
                until=query_params.get('until'),
                limit=query_params.get('limit', 50),
                offset=query_params.get('offset', 0)
            )
            return self._build_response(result, flag, "獲取提交歷史成功")
        except Exception as e:
            logger.error(f"獲取提交歷史異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(CommitCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, branch_id):
        """創建提交"""
        try:
            # 確保branch_id一致
            payload['branch_id'] = branch_id
            
            result, flag = self.vc.create_commit(
                branch_id=payload['branch_id'],
                commit_message=payload['commit_message'],
                document_snapshot=payload['document_snapshot'],
                changes_summary=payload.get('changes_summary'),
                parent_commit_id=payload.get('parent_commit_id')
            )
            return self._build_response(result, flag, "創建提交成功")
        except Exception as e:
            logger.error(f"創建提交異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/commits/<commit_id>")
class CommitDetailApi(BaseVersionControlView):
    """提交詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, commit_id):
        """獲取提交詳情"""
        try:
            result, flag = self.vc.get_commit_detail(commit_id)
            return self._build_response(result, flag, "獲取提交詳情成功")
        except Exception as e:
            logger.error(f"獲取提交詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 合併請求接口 ====================

@blp.route("/documents/<document_id>/merge-requests")
class MergeRequestManagementApi(BaseVersionControlView):
    """合併請求管理API"""

    @jwt_required()
    @blp.arguments(MergeRequestQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, document_id):
        """獲取合併請求列表"""
        try:
            result, flag = self.vc.get_merge_requests(
                document_id=document_id,
                status=query_params.get('status'),
                created_by=query_params.get('created_by'),
                assignee_id=query_params.get('assignee_id'),
                reviewer_id=query_params.get('reviewer_id'),
                limit=query_params.get('limit', 50),
                offset=query_params.get('offset', 0)
            )
            return self._build_response(result, flag, "獲取合併請求列表成功")
        except Exception as e:
            logger.error(f"獲取合併請求列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(MergeRequestCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, document_id):
        """創建合併請求"""
        try:
            result, flag = self.vc.create_merge_request(
                document_id=document_id,
                source_branch_id=payload['source_branch_id'],
                target_branch_id=payload['target_branch_id'],
                title=payload['title'],
                description=payload.get('description'),
                reviewers=payload.get('reviewers', []),
                assignee_id=payload.get('assignee_id')
            )
            return self._build_response(result, flag, "創建合併請求成功")
        except Exception as e:
            logger.error(f"創建合併請求異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/merge-requests/<mr_id>")
class MergeRequestDetailApi(BaseVersionControlView):
    """合併請求詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, mr_id):
        """獲取合併請求詳情"""
        try:
            result, flag = self.vc.get_merge_request_detail(mr_id)
            return self._build_response(result, flag, "獲取合併請求詳情成功")
        except Exception as e:
            logger.error(f"獲取合併請求詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(MergeRequestUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, mr_id):
        """更新合併請求"""
        try:
            result, flag = self.vc.update_merge_request(
                mr_id=mr_id,
                title=payload.get('title'),
                description=payload.get('description'),
                status=payload.get('status'),
                reviewers=payload.get('reviewers'),
                assignee_id=payload.get('assignee_id')
            )
            return self._build_response(result, flag, "更新合併請求成功")
        except Exception as e:
            logger.error(f"更新合併請求異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, mr_id):
        """關閉合併請求"""
        try:
            result, flag = self.vc.close_merge_request(mr_id)
            return self._build_response(result, flag, "關閉合併請求成功")
        except Exception as e:
            logger.error(f"關閉合併請求異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/merge-requests/<mr_id>/merge")
class MergeRequestMergeApi(BaseVersionControlView):
    """合併請求執行合併API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, mr_id):
        """執行合併"""
        try:
            merge_message = request.json.get('merge_message', '')
            result, flag = self.vc.merge_request(mr_id, merge_message)
            return self._build_response(result, flag, "執行合併成功")
        except Exception as e:
            logger.error(f"執行合併異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 版本標籤接口 ====================

@blp.route("/documents/<document_id>/tags")
class TagManagementApi(BaseVersionControlView):
    """標籤管理API"""

    @jwt_required()
    @blp.arguments(TagQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, document_id):
        """獲取標籤列表"""
        try:
            document_type = request.args.get('document_type', 'diagram')
            result, flag = self.vc.get_tags(
                document_id=document_id,
                document_type=document_type,
                tag_type=query_params.get('tag_type')
            )
            return self._build_response(result, flag, "獲取標籤列表成功")
        except Exception as e:
            logger.error(f"獲取標籤列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(TagCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, document_id):
        """創建標籤"""
        try:
            result, flag = self.vc.create_tag(
                document_id=document_id,
                tag_name=payload['tag_name'],
                commit_id=payload['commit_id'],
                tag_type=payload.get('tag_type', 'milestone'),
                description=payload.get('description'),
                document_type=payload.get('document_type', 'diagram')
            )
            return self._build_response(result, flag, "創建標籤成功")
        except Exception as e:
            logger.error(f"創建標籤異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/tags/<tag_id>")
class TagDetailApi(BaseVersionControlView):
    """標籤詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, tag_id):
        """刪除標籤"""
        try:
            result, flag = self.vc.delete_tag(tag_id)
            return self._build_response(result, flag, "刪除標籤成功")
        except Exception as e:
            logger.error(f"刪除標籤異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 代碼審查接口 ====================

@blp.route("/merge-requests/<mr_id>/reviews")
class ReviewManagementApi(BaseVersionControlView):
    """審查管理API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, mr_id):
        """獲取審查列表"""
        try:
            result, flag = self.vc.get_reviews(mr_id)
            return self._build_response(result, flag, "獲取審查列表成功")
        except Exception as e:
            logger.error(f"獲取審查列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(ReviewSubmitSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, mr_id):
        """提交審查"""
        try:
            result, flag = self.vc.submit_review(
                mr_id=mr_id,
                status=payload['status'],
                comments=payload.get('comments', '')
            )
            return self._build_response(result, flag, "提交審查成功")
        except Exception as e:
            logger.error(f"提交審查異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/reviews/<review_id>")
class ReviewDetailApi(BaseVersionControlView):
    """審查詳情API"""

    @jwt_required()
    @blp.arguments(ReviewUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, review_id):
        """更新審查"""
        try:
            result, flag = self.vc.update_review(
                review_id=review_id,
                status=payload.get('status'),
                comments=payload.get('comments')
            )
            return self._build_response(result, flag, "更新審查成功")
        except Exception as e:
            logger.error(f"更新審查異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 版本比較接口 ====================

@blp.route("/compare")
class VersionCompareApi(BaseVersionControlView):
    """版本比較API"""

    @jwt_required()
    @blp.arguments(VersionCompareSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """版本比較"""
        try:
            result, flag = self.vc.compare_versions(
                commit_id1=query_params['commit_id1'],
                commit_id2=query_params['commit_id2'],
                compare_type=query_params.get('compare_type', 'full')
            )
            return self._build_response(result, flag, "版本比較成功")
        except Exception as e:
            logger.error(f"版本比較異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/diff")
class DiffApi(BaseVersionControlView):
    """差異查詢API"""

    @jwt_required()
    @blp.arguments(DiffQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """查詢差異"""
        try:
            result, flag = self.vc.get_diff(
                from_commit=query_params.get('from_commit'),
                to_commit=query_params.get('to_commit'),
                file_path=query_params.get('file_path'),
                context_lines=query_params.get('context_lines', 3)
            )
            return self._build_response(result, flag, "查詢差異成功")
        except Exception as e:
            logger.error(f"查詢差異異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 統計接口 ====================

@blp.route("/documents/<document_id>/stats")
class DocumentStatsApi(BaseVersionControlView):
    """文檔統計API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, document_id):
        """獲取文檔版本統計"""
        try:
            document_type = request.args.get('document_type', 'diagram')
            result, flag = self.vc.get_document_stats(document_id, document_type)
            return self._build_response(result, flag, "獲取文檔統計成功")
        except Exception as e:
            logger.error(f"獲取文檔統計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")