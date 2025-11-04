# -*- coding: utf-8 -*-
"""
@文件: elasticsearch_db.py
@說明: Elasticsearch数据库连接管理
@時間: 2025-01-09
@作者: LiDong
"""
import os
from elasticsearch import Elasticsearch
from elasticsearch.exceptions import ConnectionError, RequestError, NotFoundError
from typing import Dict, List, Any, Optional, Tuple
import json
from datetime import datetime

from configs.app_config import (
    ELASTICSEARCH_URL, 
    ELASTICSEARCH_INDEX_PREFIX,
    ELASTICSEARCH_MAX_RETRIES,
    ELASTICSEARCH_TIMEOUT
)
from loggers import logger


class ElasticsearchClient:
    """Elasticsearch客户端管理类"""
    
    def __init__(self):
        self.client = None
        self.index_prefix = ELASTICSEARCH_INDEX_PREFIX
        self.platform_resources_index = f"{self.index_prefix}_platform_resources"
        self.search_analytics_index = f"{self.index_prefix}_search_analytics"
        
    def init_app(self, app=None):
        """初始化Elasticsearch连接"""
        try:
            self.client = Elasticsearch(
                [ELASTICSEARCH_URL],
                max_retries=ELASTICSEARCH_MAX_RETRIES,
                timeout=ELASTICSEARCH_TIMEOUT,
                retry_on_timeout=True,
                max_retries_on_timeout=3
            )
            
            # 测试连接
            if self.client.ping():
                logger.info("Elasticsearch连接成功")
                self._create_indexes()
            else:
                logger.error("Elasticsearch连接失败")
                
        except Exception as e:
            logger.error(f"初始化Elasticsearch客户端失败: {str(e)}")
            
    def _create_indexes(self):
        """创建必要的索引"""
        try:
            # 创建平台资源索引
            self._create_platform_resources_index()
            # 创建搜索分析索引
            self._create_search_analytics_index()
            
        except Exception as e:
            logger.error(f"创建索引失败: {str(e)}")
            
    def _create_platform_resources_index(self):
        """创建平台资源索引"""
        index_name = self.platform_resources_index
        
        if self.client.indices.exists(index=index_name):
            logger.info(f"索引 {index_name} 已存在")
            return
            
        mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "resource_type": {"type": "keyword"},
                    "project_id": {"type": "keyword"},
                    "team_id": {"type": "keyword"},
                    "title": {
                        "type": "text",
                        "analyzer": "standard",
                        "search_analyzer": "standard",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "content": {
                        "type": "text",
                        "analyzer": "standard"
                    },
                    "description": {
                        "type": "text",
                        "analyzer": "standard"
                    },
                    "tags": {"type": "keyword"},
                    "creator_id": {"type": "keyword"},
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"},
                    "permissions": {
                        "type": "nested",
                        "properties": {
                            "user_id": {"type": "keyword"},
                            "access_level": {"type": "keyword"}
                        }
                    },
                    "metadata": {"type": "object"},
                    "suggest": {
                        "type": "completion",
                        "analyzer": "simple",
                        "preserve_separators": True,
                        "preserve_position_increments": True,
                        "max_input_length": 50
                    },
                    "popularity_score": {"type": "float"},
                    "search_boost": {"type": "float"}
                }
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "standard": {
                            "tokenizer": "standard",
                            "filter": ["lowercase", "stop"]
                        }
                    }
                }
            }
        }
        
        try:
            self.client.indices.create(index=index_name, body=mapping)
            logger.info(f"成功创建索引: {index_name}")
        except RequestError as e:
            if e.error == "resource_already_exists_exception":
                logger.info(f"索引 {index_name} 已存在")
            else:
                logger.error(f"创建索引失败: {str(e)}")
                
    def _create_search_analytics_index(self):
        """创建搜索分析索引"""
        index_name = self.search_analytics_index
        
        if self.client.indices.exists(index=index_name):
            logger.info(f"索引 {index_name} 已存在")
            return
            
        mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "user_id": {"type": "keyword"},
                    "query": {"type": "text"},
                    "query_type": {"type": "keyword"},
                    "filters": {"type": "object"},
                    "results_count": {"type": "integer"},
                    "click_through_rate": {"type": "float"},
                    "search_time_ms": {"type": "integer"},
                    "timestamp": {"type": "date"},
                    "session_id": {"type": "keyword"},
                    "ip_address": {"type": "ip"},
                    "user_agent": {"type": "text"}
                }
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0
            }
        }
        
        try:
            self.client.indices.create(index=index_name, body=mapping)
            logger.info(f"成功创建索引: {index_name}")
        except RequestError as e:
            if e.error == "resource_already_exists_exception":
                logger.info(f"索引 {index_name} 已存在")
            else:
                logger.error(f"创建索引失败: {str(e)}")
                
    def is_connected(self) -> bool:
        """检查Elasticsearch连接状态"""
        try:
            return self.client.ping() if self.client else False
        except Exception:
            return False
            
    def get_cluster_health(self) -> Dict:
        """获取集群健康状况"""
        try:
            if not self.client:
                return {"status": "red", "message": "客户端未初始化"}
                
            health = self.client.cluster.health()
            return {
                "status": health.get("status", "unknown"),
                "cluster_name": health.get("cluster_name", ""),
                "number_of_nodes": health.get("number_of_nodes", 0),
                "number_of_data_nodes": health.get("number_of_data_nodes", 0)
            }
        except Exception as e:
            logger.error(f"获取集群健康状况失败: {str(e)}")
            return {"status": "red", "message": str(e)}
            
    def search(self, index: str, body: Dict) -> Tuple[Dict, bool]:
        """执行搜索"""
        try:
            if not self.client:
                return {"error": "客户端未初始化"}, False
                
            result = self.client.search(index=index, body=body)
            return result, True
            
        except NotFoundError:
            logger.warning(f"索引不存在: {index}")
            return {"error": "索引不存在"}, False
        except Exception as e:
            logger.error(f"搜索失败: {str(e)}")
            return {"error": str(e)}, False
            
    def index_document(self, index: str, doc_id: str, body: Dict) -> Tuple[Dict, bool]:
        """索引文档"""
        try:
            if not self.client:
                return {"error": "客户端未初始化"}, False
                
            result = self.client.index(index=index, id=doc_id, body=body)
            return result, True
            
        except Exception as e:
            logger.error(f"索引文档失败: {str(e)}")
            return {"error": str(e)}, False
            
    def update_document(self, index: str, doc_id: str, body: Dict) -> Tuple[Dict, bool]:
        """更新文档"""
        try:
            if not self.client:
                return {"error": "客户端未初始化"}, False
                
            result = self.client.update(index=index, id=doc_id, body={"doc": body})
            return result, True
            
        except NotFoundError:
            logger.warning(f"文档不存在: {index}/{doc_id}")
            return {"error": "文档不存在"}, False
        except Exception as e:
            logger.error(f"更新文档失败: {str(e)}")
            return {"error": str(e)}, False
            
    def delete_document(self, index: str, doc_id: str) -> Tuple[Dict, bool]:
        """删除文档"""
        try:
            if not self.client:
                return {"error": "客户端未初始化"}, False
                
            result = self.client.delete(index=index, id=doc_id)
            return result, True
            
        except NotFoundError:
            logger.warning(f"文档不存在: {index}/{doc_id}")
            return {"error": "文档不存在"}, False
        except Exception as e:
            logger.error(f"删除文档失败: {str(e)}")
            return {"error": str(e)}, False
            
    def bulk_index(self, actions: List[Dict]) -> Tuple[Dict, bool]:
        """批量索引操作"""
        try:
            if not self.client:
                return {"error": "客户端未初始化"}, False
                
            from elasticsearch.helpers import bulk
            result = bulk(self.client, actions)
            return {"indexed": result[0], "errors": result[1]}, True
            
        except Exception as e:
            logger.error(f"批量索引失败: {str(e)}")
            return {"error": str(e)}, False
            
    def get_index_stats(self, index: str) -> Tuple[Dict, bool]:
        """获取索引统计信息"""
        try:
            if not self.client:
                return {"error": "客户端未初始化"}, False
                
            stats = self.client.indices.stats(index=index)
            return stats, True
            
        except Exception as e:
            logger.error(f"获取索引统计失败: {str(e)}")
            return {"error": str(e)}, False


# 全局Elasticsearch客户端实例
es_client = ElasticsearchClient()