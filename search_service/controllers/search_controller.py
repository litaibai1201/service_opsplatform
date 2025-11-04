# -*- coding: utf-8 -*-
"""
@文件: search_controller.py
@說明: 搜索控制器
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

from models.search_model import search_model, PlatformResource, SearchAnalytics
from common.common_method import TryExcept
from cache import redis_client
from loggers import logger


class SearchController:
    """搜索控制器"""
    
    def __init__(self):
        self.sm = search_model
        self.cache = redis_client
        
    # ==================== 全局搜索功能 ====================
    
    @TryExcept("全局搜索失败")
    def global_search(self, data: Dict) -> Tuple[Any, bool]:
        """全局搜索"""
        try:
            query = data.get('query', '').strip()
            filters = data.get('filters', {})
            page = data.get('page', 1)
            size = data.get('size', 20)
            sort_by = data.get('sort_by', '_score')
            user_id = data.get('user_id')
            
            # 参数验证
            if page < 1:
                page = 1
            if size < 1 or size > 100:
                size = 20
                
            # 检查缓存
            cache_key = f"search:{hash(str(data))}"
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.info("返回缓存的搜索结果")
                return json.loads(cached_result), True
                
            # 执行搜索
            result, success = self.sm.global_search(
                query=query,
                filters=filters,
                page=page,
                size=size,
                sort_by=sort_by,
                user_id=user_id
            )
            
            if success:
                # 格式化返回结果
                formatted_result = self._format_search_results(result)
                
                # 缓存结果（缓存5分钟）
                self.cache.setex(cache_key, 300, json.dumps(formatted_result))
                
                return formatted_result, True
            else:
                return result, False
                
        except Exception as e:
            logger.error(f"全局搜索控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("搜索建议失败")
    def get_search_suggestions(self, data: Dict) -> Tuple[Any, bool]:
        """获取搜索建议"""
        try:
            query = data.get('query', '').strip()
            size = data.get('size', 5)
            
            if not query:
                return {"suggestions": []}, True
                
            if len(query) < 2:
                return {"suggestions": []}, True
                
            # 检查缓存
            cache_key = f"suggestions:{query}:{size}"
            cached_result = self.cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result), True
                
            result, success = self.sm.get_search_suggestions(query, size)
            
            if success:
                # 缓存结果（缓存30分钟）
                self.cache.setex(cache_key, 1800, json.dumps(result))
                return result, True
            else:
                return result, False
                
        except Exception as e:
            logger.error(f"搜索建议控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取最近搜索失败")
    def get_recent_searches(self, data: Dict) -> Tuple[Any, bool]:
        """获取最近搜索"""
        try:
            user_id = data.get('user_id')
            limit = data.get('limit', 10)
            
            if not user_id:
                return {"searches": []}, True
                
            cache_key = f"recent_searches:{user_id}"
            recent_searches = self.cache.lrange(cache_key, 0, limit - 1)
            
            searches = [json.loads(search) for search in recent_searches]
            
            return {"searches": searches}, True
            
        except Exception as e:
            logger.error(f"获取最近搜索异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取热门搜索失败")
    def get_trending_searches(self, data: Dict) -> Tuple[Any, bool]:
        """获取热门搜索"""
        try:
            limit = data.get('limit', 10)
            time_range = data.get('time_range', '7d')  # 7d, 30d, 90d
            
            # 检查缓存
            cache_key = f"trending_searches:{time_range}:{limit}"
            cached_result = self.cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result), True
                
            # 计算时间范围
            now = datetime.now()
            if time_range == '7d':
                start_date = (now - timedelta(days=7)).isoformat()
            elif time_range == '30d':
                start_date = (now - timedelta(days=30)).isoformat()
            elif time_range == '90d':
                start_date = (now - timedelta(days=90)).isoformat()
            else:
                start_date = (now - timedelta(days=7)).isoformat()
                
            # 获取热门搜索词
            result, success = self.sm.get_search_analytics(
                start_date=start_date,
                end_date=now.isoformat()
            )
            
            if success:
                trending = []
                popular_queries = result.get('aggregations', {}).get('popular_queries', {}).get('buckets', [])
                for bucket in popular_queries[:limit]:
                    trending.append({
                        'query': bucket.get('key', ''),
                        'count': bucket.get('doc_count', 0)
                    })
                    
                trending_result = {"trending": trending}
                
                # 缓存结果（缓存1小时）
                self.cache.setex(cache_key, 3600, json.dumps(trending_result))
                
                return trending_result, True
            else:
                return {"trending": []}, True
                
        except Exception as e:
            logger.error(f"获取热门搜索异常: {str(e)}")
            return str(e), False
            
    # ==================== 高级搜索功能 ====================
    
    @TryExcept("高级搜索失败")
    def advanced_search(self, data: Dict) -> Tuple[Any, bool]:
        """高级搜索"""
        try:
            # 构建复杂过滤条件
            filters = {}
            
            if data.get('resource_types'):
                filters['resource_type'] = data['resource_types']
                
            if data.get('project_ids'):
                filters['project_id'] = data['project_ids']
                
            if data.get('team_ids'):
                filters['team_id'] = data['team_ids']
                
            if data.get('tags'):
                filters['tags'] = data['tags']
                
            if data.get('creator_ids'):
                filters['creator_id'] = data['creator_ids']
                
            if data.get('date_from') or data.get('date_to'):
                date_range = {}
                if data.get('date_from'):
                    date_range['gte'] = data['date_from']
                if data.get('date_to'):
                    date_range['lte'] = data['date_to']
                filters['date_range'] = date_range
                
            # 执行搜索
            search_data = {
                'query': data.get('query', ''),
                'filters': filters,
                'page': data.get('page', 1),
                'size': data.get('size', 20),
                'sort_by': data.get('sort_by', '_score'),
                'user_id': data.get('user_id')
            }
            
            result, success = self.global_search(search_data)
            
            if success:
                # 记录高级搜索分析
                self.sm._record_search_analytics(
                    data.get('query', ''),
                    'advanced',
                    filters,
                    result.get('total', 0),
                    data.get('user_id')
                )
                
            return result, success
            
        except Exception as e:
            logger.error(f"高级搜索控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取搜索过滤器失败")
    def get_search_filters(self, data: Dict) -> Tuple[Any, bool]:
        """获取可用的搜索过滤器"""
        try:
            user_id = data.get('user_id')
            
            # 检查缓存
            cache_key = f"search_filters:{user_id or 'public'}"
            cached_result = self.cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result), True
                
            # 构建聚合查询获取可用过滤器
            search_body = {
                "size": 0,
                "query": {"match_all": {}},
                "aggs": {
                    "resource_types": {
                        "terms": {"field": "resource_type", "size": 50}
                    },
                    "tags": {
                        "terms": {"field": "tags", "size": 100}
                    },
                    "project_ids": {
                        "terms": {"field": "project_id", "size": 100}
                    },
                    "team_ids": {
                        "terms": {"field": "team_id", "size": 100}
                    }
                }
            }
            
            # 添加权限过滤
            if user_id:
                search_body["query"] = {
                    "bool": {
                        "filter": [{
                            "bool": {
                                "should": [
                                    {"term": {"creator_id": user_id}},
                                    {
                                        "nested": {
                                            "path": "permissions",
                                            "query": {
                                                "bool": {
                                                    "must": [
                                                        {"term": {"permissions.user_id": user_id}},
                                                        {"terms": {"permissions.access_level": ["read", "write", "admin"]}}
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }]
                    }
                }
                
            result, success = self.sm.client.search(
                index=self.sm.platform_index,
                body=search_body
            )
            
            if success:
                filters = {}
                aggs = result.get('aggregations', {})
                
                for filter_name, agg_data in aggs.items():
                    buckets = agg_data.get('buckets', [])
                    filters[filter_name] = [
                        {
                            'value': bucket.get('key'),
                            'count': bucket.get('doc_count', 0)
                        }
                        for bucket in buckets
                    ]
                    
                filter_result = {"filters": filters}
                
                # 缓存结果（缓存30分钟）
                self.cache.setex(cache_key, 1800, json.dumps(filter_result))
                
                return filter_result, True
            else:
                return result, False
                
        except Exception as e:
            logger.error(f"获取搜索过滤器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("分面搜索失败")
    def faceted_search(self, data: Dict) -> Tuple[Any, bool]:
        """分面搜索"""
        try:
            # 执行搜索并获取分面信息
            search_result, success = self.global_search(data)
            
            if not success:
                return search_result, False
                
            # 获取分面统计
            facets_result, facets_success = self.get_search_filters(data)
            
            if facets_success:
                search_result['facets'] = facets_result.get('filters', {})
                
            # 记录分面搜索分析
            self.sm._record_search_analytics(
                data.get('query', ''),
                'faceted',
                data.get('filters', {}),
                search_result.get('total', 0),
                data.get('user_id')
            )
            
            return search_result, True
            
        except Exception as e:
            logger.error(f"分面搜索控制器异常: {str(e)}")
            return str(e), False
            
    # ==================== 个性化搜索 ====================
    
    @TryExcept("个性化推荐失败")
    def get_personalized_recommendations(self, data: Dict) -> Tuple[Any, bool]:
        """获取个性化推荐"""
        try:
            user_id = data.get('user_id')
            size = data.get('size', 10)
            
            if not user_id:
                return {"recommendations": []}, True
                
            # 检查缓存
            cache_key = f"recommendations:{user_id}:{size}"
            cached_result = self.cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result), True
                
            # 基于用户历史搜索和行为推荐
            # 这里可以实现更复杂的推荐算法
            search_body = {
                "size": size,
                "query": {
                    "bool": {
                        "should": [
                            # 推荐用户创建的内容
                            {"term": {"creator_id": user_id}},
                            # 推荐最近更新的内容
                            {"range": {"updated_at": {"gte": "now-7d"}}},
                            # 推荐热门内容
                            {"range": {"popularity_score": {"gte": 0.5}}}
                        ],
                        "filter": [{
                            "bool": {
                                "should": [
                                    {"term": {"creator_id": user_id}},
                                    {
                                        "nested": {
                                            "path": "permissions",
                                            "query": {
                                                "bool": {
                                                    "must": [
                                                        {"term": {"permissions.user_id": user_id}},
                                                        {"terms": {"permissions.access_level": ["read", "write", "admin"]}}
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }]
                    }
                },
                "sort": [
                    {"popularity_score": {"order": "desc"}},
                    {"updated_at": {"order": "desc"}}
                ]
            }
            
            result, success = self.sm.client.search(
                index=self.sm.platform_index,
                body=search_body
            )
            
            if success:
                recommendations = []
                hits = result.get('hits', {}).get('hits', [])
                
                for hit in hits:
                    source = hit['_source']
                    recommendations.append({
                        'id': source.get('id'),
                        'resource_type': source.get('resource_type'),
                        'title': source.get('title'),
                        'description': source.get('description'),
                        'popularity_score': source.get('popularity_score', 0),
                        'updated_at': source.get('updated_at')
                    })
                    
                recommendation_result = {"recommendations": recommendations}
                
                # 缓存结果（缓存1小时）
                self.cache.setex(cache_key, 3600, json.dumps(recommendation_result))
                
                return recommendation_result, True
            else:
                return {"recommendations": []}, True
                
        except Exception as e:
            logger.error(f"个性化推荐异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取相关内容失败")
    def get_related_content(self, data: Dict) -> Tuple[Any, bool]:
        """获取相关内容推荐"""
        try:
            resource_id = data.get('resource_id')
            size = data.get('size', 5)
            user_id = data.get('user_id')
            
            if not resource_id:
                return "资源ID不能为空", False
                
            result, success = self.sm.get_related_content(resource_id, size, user_id)
            
            if success:
                related_content = []
                hits = result.get('hits', {}).get('hits', [])
                
                for hit in hits:
                    source = hit['_source']
                    related_content.append({
                        'id': source.get('id'),
                        'resource_type': source.get('resource_type'),
                        'title': source.get('title'),
                        'description': source.get('description'),
                        'score': hit.get('_score', 0),
                        'updated_at': source.get('updated_at')
                    })
                    
                return {"related_content": related_content}, True
            else:
                return result, False
                
        except Exception as e:
            logger.error(f"获取相关内容控制器异常: {str(e)}")
            return str(e), False
            
    # ==================== 搜索分析 ====================
    
    @TryExcept("获取搜索分析失败")
    def get_search_analytics(self, data: Dict) -> Tuple[Any, bool]:
        """获取搜索分析报告"""
        try:
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            user_id = data.get('user_id')
            
            result, success = self.sm.get_search_analytics(start_date, end_date, user_id)
            
            if success:
                analytics = {
                    'total_searches': result.get('hits', {}).get('total', {}).get('value', 0),
                    'popular_queries': [],
                    'query_types': [],
                    'daily_searches': [],
                    'avg_results_count': 0
                }
                
                aggs = result.get('aggregations', {})
                
                # 热门查询
                popular_queries = aggs.get('popular_queries', {}).get('buckets', [])
                for bucket in popular_queries:
                    analytics['popular_queries'].append({
                        'query': bucket.get('key'),
                        'count': bucket.get('doc_count', 0)
                    })
                    
                # 查询类型分布
                query_types = aggs.get('query_types', {}).get('buckets', [])
                for bucket in query_types:
                    analytics['query_types'].append({
                        'type': bucket.get('key'),
                        'count': bucket.get('doc_count', 0)
                    })
                    
                # 每日搜索统计
                daily_searches = aggs.get('daily_searches', {}).get('buckets', [])
                for bucket in daily_searches:
                    analytics['daily_searches'].append({
                        'date': bucket.get('key_as_string'),
                        'count': bucket.get('doc_count', 0)
                    })
                    
                # 平均结果数量
                avg_results = aggs.get('avg_results_count', {}).get('value')
                if avg_results:
                    analytics['avg_results_count'] = round(avg_results, 2)
                    
                return analytics, True
            else:
                return result, False
                
        except Exception as e:
            logger.error(f"获取搜索分析控制器异常: {str(e)}")
            return str(e), False
            
    # ==================== 内部索引接口 ====================
    
    @TryExcept("索引资源失败")
    def index_resource(self, data: Dict) -> Tuple[Any, bool]:
        """索引平台资源"""
        try:
            # 创建资源对象
            resource = PlatformResource(
                id=data.get('id', str(uuid.uuid4())),
                resource_type=data.get('resource_type'),
                project_id=data.get('project_id'),
                team_id=data.get('team_id'),
                title=data.get('title', ''),
                content=data.get('content', ''),
                description=data.get('description', ''),
                tags=data.get('tags', []),
                creator_id=data.get('creator_id', ''),
                permissions=data.get('permissions', []),
                metadata=data.get('metadata', {}),
                popularity_score=data.get('popularity_score', 0.0),
                search_boost=data.get('search_boost', 1.0)
            )
            
            result, success = self.sm.index_resource(resource)
            
            if success:
                # 清除相关缓存
                self._clear_search_cache()
                
            return result, success
            
        except Exception as e:
            logger.error(f"索引资源控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("更新资源索引失败")
    def update_resource_index(self, data: Dict) -> Tuple[Any, bool]:
        """更新资源索引"""
        try:
            resource_id = data.get('resource_id')
            update_data = data.get('update_data', {})
            
            if not resource_id:
                return "资源ID不能为空", False
                
            result, success = self.sm.update_resource(resource_id, update_data)
            
            if success:
                # 清除相关缓存
                self._clear_search_cache()
                
            return result, success
            
        except Exception as e:
            logger.error(f"更新资源索引控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("删除资源索引失败")
    def delete_resource_index(self, data: Dict) -> Tuple[Any, bool]:
        """删除资源索引"""
        try:
            resource_id = data.get('resource_id')
            
            if not resource_id:
                return "资源ID不能为空", False
                
            result, success = self.sm.delete_resource(resource_id)
            
            if success:
                # 清除相关缓存
                self._clear_search_cache()
                
            return result, success
            
        except Exception as e:
            logger.error(f"删除资源索引控制器异常: {str(e)}")
            return str(e), False
            
    @TryExcept("批量索引资源失败")
    def bulk_index_resources(self, data: Dict) -> Tuple[Any, bool]:
        """批量索引资源"""
        try:
            resources_data = data.get('resources', [])
            
            if not resources_data:
                return "资源列表不能为空", False
                
            resources = []
            for resource_data in resources_data:
                resource = PlatformResource(
                    id=resource_data.get('id', str(uuid.uuid4())),
                    resource_type=resource_data.get('resource_type'),
                    project_id=resource_data.get('project_id'),
                    team_id=resource_data.get('team_id'),
                    title=resource_data.get('title', ''),
                    content=resource_data.get('content', ''),
                    description=resource_data.get('description', ''),
                    tags=resource_data.get('tags', []),
                    creator_id=resource_data.get('creator_id', ''),
                    permissions=resource_data.get('permissions', []),
                    metadata=resource_data.get('metadata', {}),
                    popularity_score=resource_data.get('popularity_score', 0.0),
                    search_boost=resource_data.get('search_boost', 1.0)
                )
                resources.append(resource)
                
            result, success = self.sm.bulk_index_resources(resources)
            
            if success:
                # 清除相关缓存
                self._clear_search_cache()
                
            return result, success
            
        except Exception as e:
            logger.error(f"批量索引资源控制器异常: {str(e)}")
            return str(e), False
            
    # ==================== 辅助方法 ====================
    
    def _format_search_results(self, result: Dict) -> Dict:
        """格式化搜索结果"""
        hits = result.get('hits', {})
        
        formatted_result = {
            'total': hits.get('total', {}).get('value', 0),
            'results': [],
            'took': result.get('took', 0)
        }
        
        for hit in hits.get('hits', []):
            source = hit['_source']
            formatted_hit = {
                'id': source.get('id'),
                'resource_type': source.get('resource_type'),
                'title': source.get('title'),
                'content': source.get('content', '')[:200],  # 限制内容长度
                'description': source.get('description'),
                'tags': source.get('tags', []),
                'creator_id': source.get('creator_id'),
                'created_at': source.get('created_at'),
                'updated_at': source.get('updated_at'),
                'score': hit.get('_score', 0),
                'highlight': hit.get('highlight', {})
            }
            formatted_result['results'].append(formatted_hit)
            
        return formatted_result
        
    def _clear_search_cache(self):
        """清除搜索相关缓存"""
        try:
            # 获取所有搜索相关的缓存键
            cache_patterns = [
                "search:*",
                "suggestions:*", 
                "trending_searches:*",
                "search_filters:*",
                "recommendations:*"
            ]
            
            for pattern in cache_patterns:
                keys = self.cache.keys(pattern)
                if keys:
                    self.cache.delete(*keys)
                    
        except Exception as e:
            logger.error(f"清除搜索缓存异常: {str(e)}")
            
    def _record_recent_search(self, user_id: str, query: str, filters: Dict = None):
        """记录用户最近搜索"""
        try:
            if not user_id or not query.strip():
                return
                
            cache_key = f"recent_searches:{user_id}"
            search_record = {
                'query': query,
                'filters': filters or {},
                'timestamp': datetime.now().isoformat()
            }
            
            # 添加到最近搜索列表
            self.cache.lpush(cache_key, json.dumps(search_record))
            # 只保留最近20条搜索记录
            self.cache.ltrim(cache_key, 0, 19)
            # 设置过期时间（30天）
            self.cache.expire(cache_key, 2592000)
            
        except Exception as e:
            logger.error(f"记录最近搜索异常: {str(e)}")


def init_search_controller():
    """初始化搜索控制器"""
    global search_controller
    search_controller = SearchController()
    logger.info("搜索控制器初始化完成")


# 全局搜索控制器实例
search_controller = None