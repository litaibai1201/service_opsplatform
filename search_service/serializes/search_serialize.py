# -*- coding: utf-8 -*-
"""
@文件: search_serialize.py
@說明: 搜索服务序列化器
@時間: 2025-01-09
@作者: LiDong
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import datetime


# ==================== 基础Schema ====================

class PaginationSchema(Schema):
    """分页参数Schema"""
    page = fields.Integer(missing=1, validate=validate.Range(min=1))
    size = fields.Integer(missing=20, validate=validate.Range(min=1, max=100))


class SortSchema(Schema):
    """排序参数Schema"""
    sort_by = fields.String(missing="_score", validate=validate.OneOf([
        "_score", "created_at", "updated_at", "popularity", "title"
    ]))
    sort_order = fields.String(missing="desc", validate=validate.OneOf(["asc", "desc"]))


# ==================== 搜索请求Schema ====================

class GlobalSearchSchema(PaginationSchema, SortSchema):
    """全局搜索请求Schema"""
    query = fields.String(required=True, validate=validate.Length(min=1, max=500))
    filters = fields.Dict(missing={})
    
    
class SearchSuggestionSchema(Schema):
    """搜索建议请求Schema"""
    query = fields.String(required=True, validate=validate.Length(min=1, max=100))
    size = fields.Integer(missing=5, validate=validate.Range(min=1, max=20))


class RecentSearchSchema(Schema):
    """最近搜索请求Schema"""
    limit = fields.Integer(missing=10, validate=validate.Range(min=1, max=50))


class TrendingSearchSchema(Schema):
    """热门搜索请求Schema"""
    limit = fields.Integer(missing=10, validate=validate.Range(min=1, max=50))
    time_range = fields.String(missing="7d", validate=validate.OneOf(["7d", "30d", "90d"]))


# ==================== 高级搜索Schema ====================

class AdvancedSearchSchema(PaginationSchema, SortSchema):
    """高级搜索请求Schema"""
    query = fields.String(missing="", validate=validate.Length(max=500))
    resource_types = fields.List(fields.String(), missing=[])
    project_ids = fields.List(fields.String(), missing=[])
    team_ids = fields.List(fields.String(), missing=[])
    tags = fields.List(fields.String(), missing=[])
    creator_ids = fields.List(fields.String(), missing=[])
    date_from = fields.DateTime(missing=None, format='iso')
    date_to = fields.DateTime(missing=None, format='iso')
    
    @validates_schema
    def validate_dates(self, data, **kwargs):
        """验证日期范围"""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise ValidationError("開始日期不能晚於結束日期")


class FacetedSearchSchema(AdvancedSearchSchema):
    """分面搜索请求Schema"""
    include_facets = fields.Boolean(missing=True)
    facet_size = fields.Integer(missing=10, validate=validate.Range(min=1, max=100))


# ==================== 个性化搜索Schema ====================

class PersonalizedRecommendationSchema(Schema):
    """个性化推荐请求Schema"""
    size = fields.Integer(missing=10, validate=validate.Range(min=1, max=50))
    recommendation_type = fields.String(missing="general", validate=validate.OneOf([
        "general", "recent", "popular", "similar"
    ]))


class RelatedContentSchema(Schema):
    """相关内容请求Schema"""
    resource_id = fields.String(required=True, validate=validate.Length(min=1))
    size = fields.Integer(missing=5, validate=validate.Range(min=1, max=20))


class SearchBookmarkSchema(Schema):
    """搜索收藏请求Schema"""
    query = fields.String(required=True, validate=validate.Length(min=1, max=500))
    filters = fields.Dict(missing={})
    bookmark_name = fields.String(required=True, validate=validate.Length(min=1, max=100))


# ==================== 搜索分析Schema ====================

class SearchAnalyticsSchema(Schema):
    """搜索分析请求Schema"""
    start_date = fields.DateTime(missing=None, format='iso')
    end_date = fields.DateTime(missing=None, format='iso')
    user_id = fields.String(missing=None)
    report_type = fields.String(missing="summary", validate=validate.OneOf([
        "summary", "detailed", "trends", "user_behavior"
    ]))
    
    @validates_schema
    def validate_dates(self, data, **kwargs):
        """验证日期范围"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise ValidationError("開始日期不能晚於結束日期")


class SearchFeedbackSchema(Schema):
    """搜索反馈请求Schema"""
    query = fields.String(required=True, validate=validate.Length(min=1, max=500))
    result_id = fields.String(required=True)
    feedback_type = fields.String(required=True, validate=validate.OneOf([
        "clicked", "relevant", "not_relevant", "helpful", "not_helpful"
    ]))
    rating = fields.Integer(missing=None, validate=validate.Range(min=1, max=5))
    comment = fields.String(missing="", validate=validate.Length(max=1000))


# ==================== 内部索引Schema ====================

class PermissionSchema(Schema):
    """权限Schema"""
    user_id = fields.String(required=True)
    access_level = fields.String(required=True, validate=validate.OneOf([
        "read", "write", "admin"
    ]))


class ResourceIndexSchema(Schema):
    """资源索引请求Schema"""
    id = fields.String(missing=None)
    resource_type = fields.String(required=True, validate=validate.OneOf([
        "file", "project", "task", "issue", "wiki", "code", "document", 
        "comment", "meeting", "calendar", "contact", "other"
    ]))
    project_id = fields.String(missing=None)
    team_id = fields.String(missing=None)
    title = fields.String(required=True, validate=validate.Length(min=1, max=500))
    content = fields.String(missing="", validate=validate.Length(max=10000))
    description = fields.String(missing="", validate=validate.Length(max=2000))
    tags = fields.List(fields.String(validate=validate.Length(max=50)), missing=[])
    creator_id = fields.String(required=True)
    permissions = fields.List(fields.Nested(PermissionSchema), missing=[])
    metadata = fields.Dict(missing={})
    popularity_score = fields.Float(missing=0.0, validate=validate.Range(min=0.0, max=10.0))
    search_boost = fields.Float(missing=1.0, validate=validate.Range(min=0.1, max=10.0))


class ResourceUpdateSchema(Schema):
    """资源更新请求Schema"""
    resource_id = fields.String(required=True)
    update_data = fields.Dict(required=True)


class ResourceDeleteSchema(Schema):
    """资源删除请求Schema"""
    resource_id = fields.String(required=True)


class BulkIndexSchema(Schema):
    """批量索引请求Schema"""
    resources = fields.List(fields.Nested(ResourceIndexSchema), required=True, 
                           validate=validate.Length(min=1, max=1000))


class ReindexSchema(Schema):
    """重建索引请求Schema"""
    index_name = fields.String(missing="all")
    force = fields.Boolean(missing=False)
    chunk_size = fields.Integer(missing=100, validate=validate.Range(min=1, max=1000))


# ==================== 响应Schema ====================

class SearchResultItemSchema(Schema):
    """搜索结果项Schema"""
    id = fields.String()
    resource_type = fields.String()
    title = fields.String()
    content = fields.String()
    description = fields.String()
    tags = fields.List(fields.String())
    creator_id = fields.String()
    created_at = fields.DateTime(format='iso')
    updated_at = fields.DateTime(format='iso')
    score = fields.Float()
    highlight = fields.Dict()


class SearchResultSchema(Schema):
    """搜索结果Schema"""
    total = fields.Integer()
    results = fields.List(fields.Nested(SearchResultItemSchema))
    took = fields.Integer()
    facets = fields.Dict(missing={})


class SuggestionItemSchema(Schema):
    """搜索建议项Schema"""
    text = fields.String()
    score = fields.Float()


class SuggestionResultSchema(Schema):
    """搜索建议结果Schema"""
    suggestions = fields.List(fields.Nested(SuggestionItemSchema))


class RecentSearchItemSchema(Schema):
    """最近搜索项Schema"""
    query = fields.String()
    filters = fields.Dict()
    timestamp = fields.DateTime(format='iso')


class RecentSearchResultSchema(Schema):
    """最近搜索结果Schema"""
    searches = fields.List(fields.Nested(RecentSearchItemSchema))


class TrendingSearchItemSchema(Schema):
    """热门搜索项Schema"""
    query = fields.String()
    count = fields.Integer()


class TrendingSearchResultSchema(Schema):
    """热门搜索结果Schema"""
    trending = fields.List(fields.Nested(TrendingSearchItemSchema))


class FilterOptionSchema(Schema):
    """过滤器选项Schema"""
    value = fields.String()
    count = fields.Integer()


class FilterResultSchema(Schema):
    """过滤器结果Schema"""
    filters = fields.Dict(values=fields.List(fields.Nested(FilterOptionSchema)))


class RecommendationItemSchema(Schema):
    """推荐项Schema"""
    id = fields.String()
    resource_type = fields.String()
    title = fields.String()
    description = fields.String()
    popularity_score = fields.Float()
    updated_at = fields.DateTime(format='iso')


class RecommendationResultSchema(Schema):
    """推荐结果Schema"""
    recommendations = fields.List(fields.Nested(RecommendationItemSchema))


class RelatedContentItemSchema(Schema):
    """相关内容项Schema"""
    id = fields.String()
    resource_type = fields.String()
    title = fields.String()
    description = fields.String()
    score = fields.Float()
    updated_at = fields.DateTime(format='iso')


class RelatedContentResultSchema(Schema):
    """相关内容结果Schema"""
    related_content = fields.List(fields.Nested(RelatedContentItemSchema))


class AnalyticsResultSchema(Schema):
    """分析结果Schema"""
    total_searches = fields.Integer()
    popular_queries = fields.List(fields.Dict())
    query_types = fields.List(fields.Dict())
    daily_searches = fields.List(fields.Dict())
    avg_results_count = fields.Float()


class IndexResultSchema(Schema):
    """索引结果Schema"""
    indexed = fields.Integer()
    errors = fields.List(fields.Dict())


class HealthCheckSchema(Schema):
    """健康检查Schema"""
    status = fields.String()
    service = fields.String()
    timestamp = fields.DateTime(format='iso')
    version = fields.String()
    elasticsearch = fields.String()
    cache = fields.String()


# ==================== 通用响应Schema ====================

from serializes.response_serialize import RspMsgSchema, RspMsgDictSchema, RspMsgListSchema

# 搜索专用响应Schema
class SearchResponseSchema(RspMsgDictSchema):
    """搜索响应Schema"""
    content = fields.Nested(SearchResultSchema)


class SuggestionResponseSchema(RspMsgDictSchema):
    """搜索建议响应Schema"""
    content = fields.Nested(SuggestionResultSchema)


class RecommendationResponseSchema(RspMsgDictSchema):
    """推荐响应Schema"""
    content = fields.Nested(RecommendationResultSchema)


class AnalyticsResponseSchema(RspMsgDictSchema):
    """分析响应Schema"""
    content = fields.Nested(AnalyticsResultSchema)


class IndexResponseSchema(RspMsgDictSchema):
    """索引响应Schema"""
    content = fields.Nested(IndexResultSchema)


class HealthResponseSchema(RspMsgDictSchema):
    """健康检查响应Schema"""
    content = fields.Nested(HealthCheckSchema)