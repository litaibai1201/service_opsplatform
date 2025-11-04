# -*- coding: utf-8 -*-
"""
@文件: version_control_serialize.py
@說明: 版本控制服務序列化Schema (Version Control Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from marshmallow.validate import OneOf, Length, Range


# ==================== 分支管理Schema ====================

class BranchProtectionRulesSchema(Schema):
    """分支保護規則Schema"""
    require_pull_request_reviews = fields.Boolean(default=True, description="是否需要PR審查")
    required_approvals = fields.Integer(default=1, validate=Range(min=1, max=10), 
                                      description="所需批准數量")
    dismiss_stale_reviews = fields.Boolean(default=True, description="是否駁回過期審查")
    require_code_owner_reviews = fields.Boolean(default=False, description="是否需要代碼所有者審查")
    restrict_pushes = fields.Boolean(default=True, description="是否限制直接推送")
    allowed_push_users = fields.List(fields.String(), description="允許推送的用戶ID列表")


class BranchCreateSchema(Schema):
    """創建分支Schema"""
    branch_name = fields.String(required=True, validate=Length(min=1, max=255), 
                               description="分支名稱")
    parent_branch_id = fields.String(description="父分支ID", allow_none=True)
    document_type = fields.String(default="diagram", validate=Length(min=1, max=50), 
                                description="文檔類型")


class BranchUpdateSchema(Schema):
    """更新分支Schema"""
    is_protected = fields.Boolean(description="是否保護分支")
    protection_rules = fields.Nested(BranchProtectionRulesSchema, description="保護規則")


# ==================== 提交管理Schema ====================

class ChangesSummarySchema(Schema):
    """變更摘要Schema"""
    type = fields.String(validate=OneOf(['create', 'update', 'delete', 'move', 'merge', 'revert']),
                        description="變更類型")
    files_changed = fields.Integer(description="變更文件數")
    insertions = fields.Integer(description="插入行數")
    deletions = fields.Integer(description="刪除行數")
    description = fields.String(description="變更描述")


class CommitCreateSchema(Schema):
    """創建提交Schema"""
    branch_id = fields.String(required=True, validate=Length(min=1, max=36), 
                            description="分支ID")
    commit_message = fields.String(required=True, validate=Length(min=1, max=1000), 
                                 description="提交消息")
    document_snapshot = fields.Raw(required=True, description="文檔快照")
    changes_summary = fields.Nested(ChangesSummarySchema, description="變更摘要")
    parent_commit_id = fields.String(description="父提交ID", allow_none=True)


class CommitQuerySchema(Schema):
    """提交查詢Schema"""
    document_id = fields.String(description="文檔ID")
    branch_id = fields.String(description="分支ID")
    author_id = fields.String(description="作者ID")
    since = fields.DateTime(description="開始時間")
    until = fields.DateTime(description="結束時間")
    limit = fields.Integer(default=50, validate=Range(min=1, max=200), description="返回數量限制")
    offset = fields.Integer(default=0, validate=Range(min=0), description="偏移量")


# ==================== 合併請求Schema ====================

class MergeRequestCreateSchema(Schema):
    """創建合併請求Schema"""
    source_branch_id = fields.String(required=True, validate=Length(min=1, max=36),
                                   description="源分支ID")
    target_branch_id = fields.String(required=True, validate=Length(min=1, max=36),
                                   description="目標分支ID")
    title = fields.String(required=True, validate=Length(min=1, max=255), 
                         description="合併請求標題")
    description = fields.String(description="合併請求描述", allow_none=True)
    reviewers = fields.List(fields.String(), description="審查者ID列表")
    assignee_id = fields.String(description="指派人ID", allow_none=True)


class MergeRequestUpdateSchema(Schema):
    """更新合併請求Schema"""
    title = fields.String(validate=Length(min=1, max=255), description="標題")
    description = fields.String(description="描述")
    status = fields.String(validate=OneOf(['open', 'draft', 'closed']), 
                          description="狀態")
    reviewers = fields.List(fields.String(), description="審查者列表")
    assignee_id = fields.String(description="指派人ID", allow_none=True)


class MergeRequestQuerySchema(Schema):
    """合併請求查詢Schema"""
    document_id = fields.String(description="文檔ID")
    status = fields.String(validate=OneOf(['open', 'merged', 'closed', 'draft']), 
                          description="狀態")
    created_by = fields.String(description="創建者ID")
    assignee_id = fields.String(description="指派人ID")
    reviewer_id = fields.String(description="審查者ID")
    limit = fields.Integer(default=50, validate=Range(min=1, max=200), description="返回數量限制")
    offset = fields.Integer(default=0, validate=Range(min=0), description="偏移量")


# ==================== 版本標籤Schema ====================

class TagCreateSchema(Schema):
    """創建標籤Schema"""
    tag_name = fields.String(required=True, validate=Length(min=1, max=255), 
                           description="標籤名稱")
    commit_id = fields.String(required=True, validate=Length(min=1, max=36),
                            description="提交ID")
    tag_type = fields.String(default="milestone", 
                           validate=OneOf(['release', 'milestone', 'hotfix']),
                           description="標籤類型")
    description = fields.String(description="標籤描述", allow_none=True)
    document_type = fields.String(default="diagram", validate=Length(min=1, max=50),
                                description="文檔類型")


class TagQuerySchema(Schema):
    """標籤查詢Schema"""
    document_type = fields.String(description="文檔類型")
    tag_type = fields.String(validate=OneOf(['release', 'milestone', 'hotfix']),
                           description="標籤類型")


# ==================== 代碼審查Schema ====================

class ReviewSubmitSchema(Schema):
    """提交審查Schema"""
    status = fields.String(required=True, 
                          validate=OneOf(['approved', 'rejected', 'needs_changes']),
                          description="審查狀態")
    comments = fields.String(description="審查意見", allow_none=True)


class ReviewUpdateSchema(Schema):
    """更新審查Schema"""
    status = fields.String(validate=OneOf(['pending', 'approved', 'rejected', 'needs_changes']),
                          description="審查狀態")
    comments = fields.String(description="審查意見")


# ==================== 版本比較Schema ====================

class VersionCompareSchema(Schema):
    """版本比較Schema"""
    commit_id1 = fields.String(required=True, validate=Length(min=1, max=36),
                              description="第一個提交ID")
    commit_id2 = fields.String(required=True, validate=Length(min=1, max=36),
                              description="第二個提交ID")
    compare_type = fields.String(default="full", 
                               validate=OneOf(['full', 'summary', 'files_only']),
                               description="比較類型")


class DiffQuerySchema(Schema):
    """差異查詢Schema"""
    from_commit = fields.String(description="起始提交ID")
    to_commit = fields.String(description="結束提交ID")
    file_path = fields.String(description="指定文件路徑")
    context_lines = fields.Integer(default=3, validate=Range(min=0, max=20),
                                 description="上下文行數")


# ==================== 響應Schema ====================

class BranchResponseSchema(Schema):
    """分支響應Schema"""
    id = fields.String(description="分支ID")
    document_id = fields.String(description="文檔ID")
    document_type = fields.String(description="文檔類型")
    branch_name = fields.String(description="分支名稱")
    parent_branch_id = fields.String(description="父分支ID", allow_none=True)
    head_commit_id = fields.String(description="HEAD提交ID", allow_none=True)
    is_protected = fields.Boolean(description="是否受保護")
    protection_rules = fields.Nested(BranchProtectionRulesSchema, description="保護規則")
    created_by = fields.String(description="創建者ID")
    created_at = fields.DateTime(description="創建時間")
    commits_count = fields.Integer(description="提交數量")
    ahead_count = fields.Integer(description="領先提交數")
    behind_count = fields.Integer(description="落後提交數")


class CommitResponseSchema(Schema):
    """提交響應Schema"""
    id = fields.String(description="提交ID")
    branch_id = fields.String(description="分支ID")
    commit_hash = fields.String(description="提交哈希")
    parent_commit_id = fields.String(description="父提交ID", allow_none=True)
    author_id = fields.String(description="作者ID")
    commit_message = fields.String(description="提交消息")
    document_snapshot = fields.Raw(description="文檔快照")
    changes_summary = fields.Nested(ChangesSummarySchema, description="變更摘要")
    is_merge_commit = fields.Boolean(description="是否為合併提交")
    merge_from_branch = fields.String(description="合併源分支", allow_none=True)
    created_at = fields.DateTime(description="創建時間")


class MergeRequestResponseSchema(Schema):
    """合併請求響應Schema"""
    id = fields.String(description="合併請求ID")
    source_branch_id = fields.String(description="源分支ID")
    target_branch_id = fields.String(description="目標分支ID")
    title = fields.String(description="標題")
    description = fields.String(description="描述")
    status = fields.String(description="狀態")
    conflicts = fields.Raw(description="衝突信息")
    review_required = fields.Boolean(description="是否需要審查")
    created_by = fields.String(description="創建者ID")
    assignee_id = fields.String(description="指派人ID", allow_none=True)
    reviewers = fields.List(fields.String(), description="審查者列表")
    approvals = fields.Raw(description="批准記錄")
    merged_by = fields.String(description="合併者ID", allow_none=True)
    merge_commit_id = fields.String(description="合併提交ID", allow_none=True)
    created_at = fields.DateTime(description="創建時間")
    merged_at = fields.DateTime(description="合併時間", allow_none=True)
    can_be_merged = fields.Boolean(description="是否可以合併")
    is_approved = fields.Boolean(description="是否已批准")


class TagResponseSchema(Schema):
    """標籤響應Schema"""
    id = fields.String(description="標籤ID")
    document_id = fields.String(description="文檔ID")
    document_type = fields.String(description="文檔類型")
    tag_name = fields.String(description="標籤名稱")
    commit_id = fields.String(description="提交ID")
    tag_type = fields.String(description="標籤類型")
    description = fields.String(description="標籤描述")
    created_by = fields.String(description="創建者ID")
    created_at = fields.DateTime(description="創建時間")


class ReviewResponseSchema(Schema):
    """審查響應Schema"""
    id = fields.String(description="審查ID")
    merge_request_id = fields.String(description="合併請求ID")
    reviewer_id = fields.String(description="審查者ID")
    status = fields.String(description="審查狀態")
    comments = fields.String(description="審查意見")
    reviewed_at = fields.DateTime(description="審查時間", allow_none=True)


class DiffResponseSchema(Schema):
    """差異響應Schema"""
    commit1 = fields.Nested(CommitResponseSchema, description="第一個提交")
    commit2 = fields.Nested(CommitResponseSchema, description="第二個提交")
    diff = fields.Raw(description="差異詳情")
    stats = fields.Dict(description="統計信息")


class CommitHistoryResponseSchema(Schema):
    """提交歷史響應Schema"""
    commits = fields.List(fields.Nested(CommitResponseSchema), description="提交列表")
    total = fields.Integer(description="總數")
    limit = fields.Integer(description="限制數量")
    offset = fields.Integer(description="偏移量")
    has_more = fields.Boolean(description="是否有更多")


class MergeRequestListResponseSchema(Schema):
    """合併請求列表響應Schema"""
    merge_requests = fields.List(fields.Nested(MergeRequestResponseSchema), 
                                description="合併請求列表")
    total = fields.Integer(description="總數")
    limit = fields.Integer(description="限制數量")
    offset = fields.Integer(description="偏移量")
    has_more = fields.Boolean(description="是否有更多")


class BranchStatsSchema(Schema):
    """分支統計Schema"""
    total_commits = fields.Integer(description="總提交數")
    contributors = fields.Integer(description="貢獻者數量")
    last_activity = fields.DateTime(description="最後活動時間")
    ahead_count = fields.Integer(description="領先提交數")
    behind_count = fields.Integer(description="落後提交數")


class DocumentVersionStatsSchema(Schema):
    """文檔版本統計Schema"""
    total_branches = fields.Integer(description="總分支數")
    total_commits = fields.Integer(description="總提交數")
    total_tags = fields.Integer(description="總標籤數")
    active_merge_requests = fields.Integer(description="活躍合併請求數")
    contributors = fields.List(fields.String(), description="貢獻者列表")
    recent_activity = fields.List(fields.Dict(), description="最近活動")