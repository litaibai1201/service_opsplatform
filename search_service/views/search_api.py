# -*- coding: utf-8 -*-
"""
@文件: search_api.py
@說明: 搜索服务API视图
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
from datetime import datetime
from flask import request, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from common.common_method import response_result, fail_response_result
from controllers.search_controller import search_controller
from serializes.search_serialize import *
from serializes.response_serialize import RspMsgSchema, RspMsgDictSchema, RspMsgListSchema
from loggers import logger
from dbs.elasticsearch_db import es_client

blp = Blueprint(
    "search",
    __name__,
    url_prefix="/",
    description="搜索服务API"
)


class BaseSearchView(MethodView):
    """搜索服务基础视图类"""
    
    def __init__(self):
        self.sc = search_controller
        
    def _get_current_user(self):
        """获取当前用户ID"""
        try:
            return get_jwt_identity()
        except Exception:
            return None
            
    def _get_request_metadata(self):
        """获取请求元数据"""
        return {
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'session_id': request.headers.get('X-Session-ID', str(uuid.uuid4()))
        }
        
    def _build_response(self, result, flag, success_msg="操作成功"):
        """构建统一响应"""
        if flag:
            return response_result(content=result, msg=success_msg)
        else:
            return fail_response_result(msg=str(result))


# ==================== 全局搜索接口 ====================

@blp.route("/search")
class GlobalSearchApi(BaseSearchView):
    """全局搜索API"""

    @blp.arguments(GlobalSearchSchema, location="query")
    @blp.response(200, SearchResponseSchema)
    def get(self, query_params):
        """全局搜索"""
        try:
            user_id = self._get_current_user()
            metadata = self._get_request_metadata()
            
            search_data = {
                'query': query_params.get('query', ''),
                'filters': query_params.get('filters', {}),
                'page': query_params.get('page', 1),
                'size': query_params.get('size', 20),
                'sort_by': query_params.get('sort_by', '_score'),
                'user_id': user_id,
                **metadata
            }
            
            result, flag = self.sc.global_search(search_data)
            return self._build_response(result, flag, "搜索成功")
            
        except Exception as e:
            logger.error(f"全局搜索API异常: {str(e)}")
            return fail_response_result(msg="搜索失败")


@blp.route("/search/suggest")
class SearchSuggestionApi(BaseSearchView):
    """搜索建议API"""

    @blp.arguments(SearchSuggestionSchema, location="query")
    @blp.response(200, SuggestionResponseSchema)
    def get(self, query_params):
        """获取搜索建议"""
        try:
            result, flag = self.sc.get_search_suggestions(query_params)
            return self._build_response(result, flag, "获取搜索建议成功")
            
        except Exception as e:
            logger.error(f"搜索建议API异常: {str(e)}")
            return fail_response_result(msg="获取搜索建议失败")


@blp.route("/search/recent")
class RecentSearchApi(BaseSearchView):
    """最近搜索API"""

    @jwt_required()
    @blp.arguments(RecentSearchSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取最近搜索"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用户未登录")
                
            search_data = {
                'user_id': user_id,
                'limit': query_params.get('limit', 10)
            }
            
            result, flag = self.sc.get_recent_searches(search_data)
            return self._build_response(result, flag, "获取最近搜索成功")
            
        except Exception as e:
            logger.error(f"最近搜索API异常: {str(e)}")
            return fail_response_result(msg="获取最近搜索失败")


@blp.route("/search/trending")
class TrendingSearchApi(BaseSearchView):
    """热门搜索API"""

    @blp.arguments(TrendingSearchSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取热门搜索"""
        try:
            result, flag = self.sc.get_trending_searches(query_params)
            return self._build_response(result, flag, "获取热门搜索成功")
            
        except Exception as e:
            logger.error(f"热门搜索API异常: {str(e)}")
            return fail_response_result(msg="获取热门搜索失败")


@blp.route("/search/feedback")
class SearchFeedbackApi(BaseSearchView):
    """搜索反馈API"""

    @jwt_required()
    @blp.arguments(SearchFeedbackSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """提交搜索反馈"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用户未登录")
                
            # 这里可以实现搜索反馈的处理逻辑
            # 例如更新点击率、相关性评分等
            
            logger.info(f"用户 {user_id} 提交搜索反馈: {payload}")
            
            return response_result(msg="搜索反馈提交成功")
            
        except Exception as e:
            logger.error(f"搜索反馈API异常: {str(e)}")
            return fail_response_result(msg="搜索反馈提交失败")


# ==================== 高级搜索接口 ====================

@blp.route("/search/advanced")
class AdvancedSearchApi(BaseSearchView):
    """高级搜索API"""

    @blp.arguments(AdvancedSearchSchema)
    @blp.response(200, SearchResponseSchema)
    def post(self, payload):
        """高级搜索"""
        try:
            user_id = self._get_current_user()
            metadata = self._get_request_metadata()
            
            search_data = {
                **payload,
                'user_id': user_id,
                **metadata
            }
            
            result, flag = self.sc.advanced_search(search_data)
            return self._build_response(result, flag, "高级搜索成功")
            
        except Exception as e:
            logger.error(f"高级搜索API异常: {str(e)}")
            return fail_response_result(msg="高级搜索失败")


@blp.route("/search/filters")
class SearchFiltersApi(BaseSearchView):
    """搜索过滤器API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取可用过滤器"""
        try:
            user_id = self._get_current_user()
            
            filter_data = {
                'user_id': user_id
            }
            
            result, flag = self.sc.get_search_filters(filter_data)
            return self._build_response(result, flag, "获取过滤器成功")
            
        except Exception as e:
            logger.error(f"搜索过滤器API异常: {str(e)}")
            return fail_response_result(msg="获取过滤器失败")


@blp.route("/search/faceted")
class FacetedSearchApi(BaseSearchView):
    """分面搜索API"""

    @blp.arguments(FacetedSearchSchema)
    @blp.response(200, SearchResponseSchema)
    def post(self, payload):
        """分面搜索"""
        try:
            user_id = self._get_current_user()
            metadata = self._get_request_metadata()
            
            search_data = {
                **payload,
                'user_id': user_id,
                **metadata
            }
            
            result, flag = self.sc.faceted_search(search_data)
            return self._build_response(result, flag, "分面搜索成功")
            
        except Exception as e:
            logger.error(f"分面搜索API异常: {str(e)}")
            return fail_response_result(msg="分面搜索失败")


# ==================== 个性化搜索接口 ====================

@blp.route("/search/recommendations")
class PersonalizedRecommendationApi(BaseSearchView):
    """个性化推荐API"""

    @jwt_required()
    @blp.arguments(PersonalizedRecommendationSchema, location="query")
    @blp.response(200, RecommendationResponseSchema)
    def get(self, query_params):
        """获取个性化推荐"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用户未登录")
                
            recommendation_data = {
                'user_id': user_id,
                'size': query_params.get('size', 10),
                'recommendation_type': query_params.get('recommendation_type', 'general')
            }
            
            result, flag = self.sc.get_personalized_recommendations(recommendation_data)
            return self._build_response(result, flag, "获取个性化推荐成功")
            
        except Exception as e:
            logger.error(f"个性化推荐API异常: {str(e)}")
            return fail_response_result(msg="获取个性化推荐失败")


@blp.route("/search/related/<resource_id>")
class RelatedContentApi(BaseSearchView):
    """相关内容推荐API"""

    @blp.arguments(RelatedContentSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, resource_id):
        """获取相关内容推荐"""
        try:
            user_id = self._get_current_user()
            
            related_data = {
                'resource_id': resource_id,
                'size': query_params.get('size', 5),
                'user_id': user_id
            }
            
            result, flag = self.sc.get_related_content(related_data)
            return self._build_response(result, flag, "获取相关内容成功")
            
        except Exception as e:
            logger.error(f"相关内容API异常: {str(e)}")
            return fail_response_result(msg="获取相关内容失败")


@blp.route("/search/bookmark")
class SearchBookmarkApi(BaseSearchView):
    """搜索收藏API"""

    @jwt_required()
    @blp.arguments(SearchBookmarkSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """收藏搜索结果"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用户未登录")
                
            # 这里可以实现搜索收藏的逻辑
            logger.info(f"用户 {user_id} 收藏搜索: {payload}")
            
            return response_result(msg="搜索收藏成功")
            
        except Exception as e:
            logger.error(f"搜索收藏API异常: {str(e)}")
            return fail_response_result(msg="搜索收藏失败")


# ==================== 搜索分析接口 ====================

@blp.route("/search/analytics")
class SearchAnalyticsApi(BaseSearchView):
    """搜索分析API"""

    @jwt_required()
    @blp.arguments(SearchAnalyticsSchema, location="query")
    @blp.response(200, AnalyticsResponseSchema)
    def get(self, query_params):
        """获取搜索分析报告"""
        try:
            user_id = self._get_current_user()
            
            analytics_data = {
                'start_date': query_params.get('start_date'),
                'end_date': query_params.get('end_date'),
                'user_id': query_params.get('user_id') if user_id else None,  # 管理员可查看其他用户
                'report_type': query_params.get('report_type', 'summary')
            }
            
            result, flag = self.sc.get_search_analytics(analytics_data)
            return self._build_response(result, flag, "获取搜索分析成功")
            
        except Exception as e:
            logger.error(f"搜索分析API异常: {str(e)}")
            return fail_response_result(msg="获取搜索分析失败")


@blp.route("/search/popular-terms")
class PopularTermsApi(BaseSearchView):
    """热门搜索词API"""

    @blp.arguments(TrendingSearchSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取热门搜索词"""
        try:
            # 复用热门搜索的逻辑
            result, flag = self.sc.get_trending_searches(query_params)
            return self._build_response(result, flag, "获取热门搜索词成功")
            
        except Exception as e:
            logger.error(f"热门搜索词API异常: {str(e)}")
            return fail_response_result(msg="获取热门搜索词失败")


@blp.route("/search/user-behavior")
class UserBehaviorApi(BaseSearchView):
    """用户搜索行为分析API"""

    @jwt_required()
    @blp.arguments(SearchAnalyticsSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取用户搜索行为分析"""
        try:
            user_id = self._get_current_user()
            if not user_id:
                return fail_response_result(msg="用户未登录")
                
            # 分析特定用户的搜索行为
            analytics_data = {
                'start_date': query_params.get('start_date'),
                'end_date': query_params.get('end_date'),
                'user_id': user_id,
                'report_type': 'user_behavior'
            }
            
            result, flag = self.sc.get_search_analytics(analytics_data)
            return self._build_response(result, flag, "获取用户行为分析成功")
            
        except Exception as e:
            logger.error(f"用户行为分析API异常: {str(e)}")
            return fail_response_result(msg="获取用户行为分析失败")


# ==================== 内部索引接口 ====================

@blp.route("/internal/search/index")
class ResourceIndexApi(BaseSearchView):
    """资源索引API"""

    @blp.arguments(ResourceIndexSchema)
    @blp.response(200, IndexResponseSchema)
    def post(self, payload):
        """索引资源"""
        try:
            result, flag = self.sc.index_resource(payload)
            return self._build_response(result, flag, "资源索引成功")
            
        except Exception as e:
            logger.error(f"资源索引API异常: {str(e)}")
            return fail_response_result(msg="资源索引失败")


@blp.route("/internal/search/index/<resource_id>")
class ResourceIndexDetailApi(BaseSearchView):
    """资源索引详情API"""

    @blp.arguments(ResourceUpdateSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload, resource_id):
        """更新资源索引"""
        try:
            update_data = {
                'resource_id': resource_id,
                'update_data': payload.get('update_data', {})
            }
            
            result, flag = self.sc.update_resource_index(update_data)
            return self._build_response(result, flag, "更新资源索引成功")
            
        except Exception as e:
            logger.error(f"更新资源索引API异常: {str(e)}")
            return fail_response_result(msg="更新资源索引失败")

    @blp.response(200, RspMsgSchema)
    def delete(self, resource_id):
        """删除资源索引"""
        try:
            delete_data = {
                'resource_id': resource_id
            }
            
            result, flag = self.sc.delete_resource_index(delete_data)
            return self._build_response(result, flag, "删除资源索引成功")
            
        except Exception as e:
            logger.error(f"删除资源索引API异常: {str(e)}")
            return fail_response_result(msg="删除资源索引失败")


@blp.route("/internal/search/bulk-index")
class BulkIndexApi(BaseSearchView):
    """批量索引API"""

    @blp.arguments(BulkIndexSchema)
    @blp.response(200, IndexResponseSchema)
    def post(self, payload):
        """批量索引资源"""
        try:
            result, flag = self.sc.bulk_index_resources(payload)
            return self._build_response(result, flag, "批量索引成功")
            
        except Exception as e:
            logger.error(f"批量索引API异常: {str(e)}")
            return fail_response_result(msg="批量索引失败")


@blp.route("/internal/search/reindex")
class ReindexApi(BaseSearchView):
    """重建索引API"""

    @blp.arguments(ReindexSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """重建索引"""
        try:
            # 这里可以实现重建索引的逻辑
            index_name = payload.get('index_name', 'all')
            force = payload.get('force', False)
            
            logger.info(f"开始重建索引: {index_name}, force: {force}")
            
            # 实际的重建索引逻辑可以在这里实现
            # 例如：重新创建索引、重新索引所有数据等
            
            return response_result(msg="重建索引任务已启动")
            
        except Exception as e:
            logger.error(f"重建索引API异常: {str(e)}")
            return fail_response_result(msg="重建索引失败")


# ==================== 健康检查接口 ====================

@blp.route("/health")
class SearchServiceHealthApi(MethodView):
    """搜索服务健康检查API"""

    @blp.response(200, HealthResponseSchema)
    def get(self):
        """搜索服务健康检查"""
        try:
            # 检查Elasticsearch连接
            es_status = "connected" if es_client.is_connected() else "disconnected"
            
            # 检查缓存连接
            from cache import redis_client
            cache_status = "connected"
            try:
                redis_client.ping()
            except Exception:
                cache_status = "disconnected"
                
            # 获取集群健康状况
            cluster_health = es_client.get_cluster_health()
            
            health_data = {
                "status": "healthy" if es_status == "connected" and cache_status == "connected" else "unhealthy",
                "service": "search-service",
                "timestamp": datetime.now(),
                "version": "1.0.0",
                "elasticsearch": es_status,
                "cache": cache_status,
                "cluster_health": cluster_health
            }
            
            return response_result(content=health_data, msg="服务正常")
            
        except Exception as e:
            logger.error(f"健康检查异常: {str(e)}")
            return fail_response_result(msg="服务异常")


# ==================== 搜索统计接口 ====================

@blp.route("/search/stats")
class SearchStatsApi(BaseSearchView):
    """搜索统计API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取搜索统计信息"""
        try:
            # 获取索引统计信息
            platform_stats, success = es_client.get_index_stats(es_client.platform_resources_index)
            
            if success:
                stats = {
                    "total_documents": platform_stats.get("_all", {}).get("total", {}).get("docs", {}).get("count", 0),
                    "index_size": platform_stats.get("_all", {}).get("total", {}).get("store", {}).get("size_in_bytes", 0),
                    "service_status": "running",
                    "last_updated": datetime.now().isoformat()
                }
                
                return response_result(content=stats, msg="获取统计信息成功")
            else:
                return fail_response_result(msg="获取统计信息失败")
                
        except Exception as e:
            logger.error(f"搜索统计API异常: {str(e)}")
            return fail_response_result(msg="获取统计信息失败")