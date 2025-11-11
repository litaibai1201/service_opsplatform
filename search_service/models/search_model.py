# -*- coding: utf-8 -*-
"""
@文件: search_model.py
@說明: 搜索模型操作类
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

from dbs.elasticsearch_db import es_client
from common.common_tools import TryExcept
from loggers import logger


@dataclass
class PlatformResource:
    """平台资源数据类"""
    id: str
    resource_type: str  # file, project, task, issue, wiki, code, etc.
    project_id: Optional[str] = None
    team_id: Optional[str] = None
    title: str = ""
    content: str = ""
    description: str = ""
    tags: List[str] = None
    creator_id: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    permissions: List[Dict] = None
    metadata: Dict = None
    popularity_score: float = 0.0
    search_boost: float = 1.0
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.permissions is None:
            self.permissions = []
        if self.metadata is None:
            self.metadata = {}
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
            
    def to_dict(self) -> Dict:
        """转换为字典"""
        data = asdict(self)
        # 处理datetime字段
        if isinstance(data['created_at'], datetime):
            data['created_at'] = data['created_at'].isoformat()
        if isinstance(data['updated_at'], datetime):
            data['updated_at'] = data['updated_at'].isoformat()
        
        # 添加搜索建议字段
        suggest_input = []
        if self.title:
            suggest_input.append(self.title)
        if self.tags:
            suggest_input.extend(self.tags)
        if suggest_input:
            data['suggest'] = {
                "input": suggest_input,
                "weight": int(self.popularity_score * 100) if self.popularity_score else 1
            }
            
        return data


@dataclass
class SearchAnalytics:
    """搜索分析数据类"""
    id: str
    user_id: str
    query: str
    query_type: str  # basic, advanced, faceted
    filters: Dict = None
    results_count: int = 0
    click_through_rate: float = 0.0
    search_time_ms: int = 0
    timestamp: Optional[datetime] = None
    session_id: str = ""
    ip_address: str = ""
    user_agent: str = ""
    
    def __post_init__(self):
        if self.filters is None:
            self.filters = {}
        if self.timestamp is None:
            self.timestamp = datetime.now()
            
    def to_dict(self) -> Dict:
        """转换为字典"""
        data = asdict(self)
        if isinstance(data['timestamp'], datetime):
            data['timestamp'] = data['timestamp'].isoformat()
        return data


class OperSearchModel:
    """搜索模型操作类"""
    
    def __init__(self):
        self.client = es_client
        self.platform_index = es_client.platform_resources_index
        self.analytics_index = es_client.search_analytics_index
        
    @TryExcept("索引资源失败")
    def index_resource(self, resource: PlatformResource) -> Tuple[Any, bool]:
        """索引平台资源"""
        try:
            if not resource.id:
                resource.id = str(uuid.uuid4())
                
            result, success = self.client.index_document(
                index=self.platform_index,
                doc_id=resource.id,
                body=resource.to_dict()
            )
            
            if success:
                logger.info(f"成功索引资源: {resource.id}")
                return result, True
            else:
                logger.error(f"索引资源失败: {result}")
                return result, False
                
        except Exception as e:
            logger.error(f"索引资源异常: {str(e)}")
            return str(e), False
            
    @TryExcept("更新资源索引失败")
    def update_resource(self, resource_id: str, update_data: Dict) -> Tuple[Any, bool]:
        """更新资源索引"""
        try:
            # 更新时间戳
            update_data['updated_at'] = datetime.now().isoformat()
            
            result, success = self.client.update_document(
                index=self.platform_index,
                doc_id=resource_id,
                body=update_data
            )
            
            if success:
                logger.info(f"成功更新资源索引: {resource_id}")
                return result, True
            else:
                logger.error(f"更新资源索引失败: {result}")
                return result, False
                
        except Exception as e:
            logger.error(f"更新资源索引异常: {str(e)}")
            return str(e), False
            
    @TryExcept("删除资源索引失败")
    def delete_resource(self, resource_id: str) -> Tuple[Any, bool]:
        """删除资源索引"""
        try:
            result, success = self.client.delete_document(
                index=self.platform_index,
                doc_id=resource_id
            )
            
            if success:
                logger.info(f"成功删除资源索引: {resource_id}")
                return result, True
            else:
                logger.error(f"删除资源索引失败: {result}")
                return result, False
                
        except Exception as e:
            logger.error(f"删除资源索引异常: {str(e)}")
            return str(e), False
            
    @TryExcept("批量索引资源失败")
    def bulk_index_resources(self, resources: List[PlatformResource]) -> Tuple[Any, bool]:
        """批量索引资源"""
        try:
            actions = []
            for resource in resources:
                if not resource.id:
                    resource.id = str(uuid.uuid4())
                    
                action = {
                    "_index": self.platform_index,
                    "_id": resource.id,
                    "_source": resource.to_dict()
                }
                actions.append(action)
                
            result, success = self.client.bulk_index(actions)
            
            if success:
                logger.info(f"成功批量索引 {len(resources)} 个资源")
                return result, True
            else:
                logger.error(f"批量索引失败: {result}")
                return result, False
                
        except Exception as e:
            logger.error(f"批量索引异常: {str(e)}")
            return str(e), False
            
    @TryExcept("全局搜索失败")
    def global_search(self, query: str, filters: Dict = None, page: int = 1, 
                     size: int = 20, sort_by: str = "_score", 
                     user_id: str = None) -> Tuple[Any, bool]:
        """全局搜索"""
        try:
            if filters is None:
                filters = {}
                
            # 构建搜索查询
            search_body = {
                "from": (page - 1) * size,
                "size": size,
                "query": {
                    "bool": {
                        "must": [],
                        "filter": []
                    }
                },
                "sort": [],
                "highlight": {
                    "fields": {
                        "title": {},
                        "content": {},
                        "description": {}
                    }
                }
            }
            
            # 基本查询
            if query and query.strip():
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": [
                            "title^3",
                            "content^2", 
                            "description^2",
                            "tags^1.5"
                        ],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                })
            else:
                search_body["query"]["bool"]["must"].append({
                    "match_all": {}
                })
                
            # 权限过滤
            if user_id:
                search_body["query"]["bool"]["filter"].append({
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
                })
                
            # 应用过滤器
            if filters.get("resource_type"):
                search_body["query"]["bool"]["filter"].append({
                    "terms": {"resource_type": filters["resource_type"]}
                })
                
            if filters.get("project_id"):
                search_body["query"]["bool"]["filter"].append({
                    "terms": {"project_id": filters["project_id"]}
                })
                
            if filters.get("team_id"):
                search_body["query"]["bool"]["filter"].append({
                    "terms": {"team_id": filters["team_id"]}
                })
                
            if filters.get("tags"):
                search_body["query"]["bool"]["filter"].append({
                    "terms": {"tags": filters["tags"]}
                })
                
            if filters.get("date_range"):
                date_range = filters["date_range"]
                range_query = {}
                if date_range.get("gte"):
                    range_query["gte"] = date_range["gte"]
                if date_range.get("lte"):
                    range_query["lte"] = date_range["lte"]
                    
                if range_query:
                    search_body["query"]["bool"]["filter"].append({
                        "range": {"created_at": range_query}
                    })
                    
            # 排序
            if sort_by == "_score":
                search_body["sort"].append({"_score": {"order": "desc"}})
            elif sort_by == "created_at":
                search_body["sort"].append({"created_at": {"order": "desc"}})
            elif sort_by == "updated_at":
                search_body["sort"].append({"updated_at": {"order": "desc"}})
            elif sort_by == "popularity":
                search_body["sort"].append({"popularity_score": {"order": "desc"}})
                
            # 执行搜索
            result, success = self.client.search(
                index=self.platform_index,
                body=search_body
            )
            
            if success:
                # 记录搜索分析
                self._record_search_analytics(query, "basic", filters, 
                                            result.get("hits", {}).get("total", {}).get("value", 0),
                                            user_id)
                return result, True
            else:
                return result, False
                
        except Exception as e:
            logger.error(f"全局搜索异常: {str(e)}")
            return str(e), False
            
    @TryExcept("搜索建议失败")
    def get_search_suggestions(self, query: str, size: int = 5) -> Tuple[Any, bool]:
        """获取搜索建议"""
        try:
            search_body = {
                "suggest": {
                    "title_suggest": {
                        "prefix": query,
                        "completion": {
                            "field": "suggest",
                            "size": size,
                            "skip_duplicates": True
                        }
                    }
                }
            }
            
            result, success = self.client.search(
                index=self.platform_index,
                body=search_body
            )
            
            if success:
                suggestions = []
                suggest_results = result.get("suggest", {}).get("title_suggest", [])
                for suggest in suggest_results:
                    for option in suggest.get("options", []):
                        suggestions.append({
                            "text": option.get("text", ""),
                            "score": option.get("_score", 0)
                        })
                        
                return {"suggestions": suggestions}, True
            else:
                return result, False
                
        except Exception as e:
            logger.error(f"搜索建议异常: {str(e)}")
            return str(e), False
            
    @TryExcept("获取相关内容失败")
    def get_related_content(self, resource_id: str, size: int = 5,
                           user_id: str = None) -> Tuple[Any, bool]:
        """获取相关内容推荐"""
        try:
            # 首先获取当前资源
            get_body = {"query": {"term": {"_id": resource_id}}}
            current_result, success = self.client.search(
                index=self.platform_index,
                body=get_body
            )
            
            if not success or not current_result.get("hits", {}).get("hits"):
                return "资源不存在", False
                
            current_doc = current_result["hits"]["hits"][0]["_source"]
            
            # 构建相关内容查询
            search_body = {
                "size": size,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "more_like_this": {
                                    "fields": ["title", "content", "description", "tags"],
                                    "like": [{"_index": self.platform_index, "_id": resource_id}],
                                    "min_term_freq": 1,
                                    "max_query_terms": 25
                                }
                            }
                        ],
                        "must_not": [
                            {"term": {"_id": resource_id}}
                        ],
                        "filter": []
                    }
                }
            }
            
            # 添加权限过滤
            if user_id:
                search_body["query"]["bool"]["filter"].append({
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
                })
                
            result, success = self.client.search(
                index=self.platform_index,
                body=search_body
            )
            
            return result, success
            
        except Exception as e:
            logger.error(f"获取相关内容异常: {str(e)}")
            return str(e), False
            
    @TryExcept("记录搜索分析失败")
    def _record_search_analytics(self, query: str, query_type: str, filters: Dict,
                               results_count: int, user_id: str = None) -> None:
        """记录搜索分析数据"""
        try:
            analytics = SearchAnalytics(
                id=str(uuid.uuid4()),
                user_id=user_id or "anonymous",
                query=query,
                query_type=query_type,
                filters=filters,
                results_count=results_count,
                session_id="",  # 可以从请求中获取
                ip_address="",  # 可以从请求中获取
                user_agent=""   # 可以从请求中获取
            )
            
            self.client.index_document(
                index=self.analytics_index,
                doc_id=analytics.id,
                body=analytics.to_dict()
            )
            
        except Exception as e:
            logger.error(f"记录搜索分析异常: {str(e)}")
            
    @TryExcept("获取搜索分析失败")
    def get_search_analytics(self, start_date: str = None, end_date: str = None,
                           user_id: str = None) -> Tuple[Any, bool]:
        """获取搜索分析报告"""
        try:
            search_body = {
                "size": 0,
                "query": {"bool": {"filter": []}},
                "aggs": {
                    "popular_queries": {
                        "terms": {"field": "query.keyword", "size": 10}
                    },
                    "query_types": {
                        "terms": {"field": "query_type", "size": 5}
                    },
                    "daily_searches": {
                        "date_histogram": {
                            "field": "timestamp",
                            "calendar_interval": "day"
                        }
                    },
                    "avg_results_count": {
                        "avg": {"field": "results_count"}
                    }
                }
            }
            
            # 添加日期范围过滤
            if start_date or end_date:
                date_range = {}
                if start_date:
                    date_range["gte"] = start_date
                if end_date:
                    date_range["lte"] = end_date
                    
                search_body["query"]["bool"]["filter"].append({
                    "range": {"timestamp": date_range}
                })
                
            # 添加用户过滤
            if user_id:
                search_body["query"]["bool"]["filter"].append({
                    "term": {"user_id": user_id}
                })
                
            result, success = self.client.search(
                index=self.analytics_index,
                body=search_body
            )
            
            return result, success
            
        except Exception as e:
            logger.error(f"获取搜索分析异常: {str(e)}")
            return str(e), False


# 全局搜索模型实例
search_model = OperSearchModel()