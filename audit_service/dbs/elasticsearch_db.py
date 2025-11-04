# -*- coding: utf-8 -*-
"""
@文件: elasticsearch_db.py
@說明: Elasticsearch数据库模块 (Audit Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch
from elasticsearch.exceptions import ConnectionError, NotFoundError

from common.common_tools import CommonTools
from loggers import logger


class ElasticsearchClient:
    """Elasticsearch客户端类"""
    
    def __init__(self):
        self.es_client = None
        self.app = None
        self._initialized = False
    
    def init_app(self, app):
        """初始化Elasticsearch客户端"""
        self.app = app
        
        # 从配置获取Elasticsearch连接信息
        es_host = app.config.get('ELASTICSEARCH_HOST', 'localhost')
        es_port = app.config.get('ELASTICSEARCH_PORT', 9200)
        es_user = app.config.get('ELASTICSEARCH_USER', '')
        es_password = app.config.get('ELASTICSEARCH_PASSWORD', '')
        es_ssl = app.config.get('ELASTICSEARCH_SSL', False)
        
        try:
            # 构建连接配置
            es_config = {
                'hosts': [{'host': es_host, 'port': es_port}],
                'timeout': 30,
                'max_retries': 3,
                'retry_on_timeout': True
            }
            
            # 如果有认证信息
            if es_user and es_password:
                es_config['basic_auth'] = (es_user, es_password)
            
            # SSL配置
            if es_ssl:
                es_config['use_ssl'] = True
                es_config['verify_certs'] = False
            
            self.es_client = Elasticsearch(**es_config)
            
            # 测试连接
            if self.es_client.ping():
                logger.info("Elasticsearch連接成功")
                self._initialized = True
                self._create_audit_indices()
            else:
                logger.warning("Elasticsearch連接失敗，功能受限")
                
        except Exception as e:
            logger.error(f"初始化Elasticsearch失敗: {str(e)}")
            self.es_client = None
    
    def _create_audit_indices(self):
        """创建审计相关的索引"""
        try:
            # 审计日志索引
            audit_log_mapping = {
                "mappings": {
                    "properties": {
                        "user_id": {"type": "keyword"},
                        "session_id": {"type": "keyword"},
                        "action": {"type": "keyword"},
                        "resource_type": {"type": "keyword"},
                        "resource_id": {"type": "keyword"},
                        "old_values": {"type": "object", "enabled": False},
                        "new_values": {"type": "object", "enabled": False},
                        "ip_address": {"type": "ip"},
                        "user_agent": {"type": "text"},
                        "request_id": {"type": "keyword"},
                        "result": {"type": "keyword"},
                        "error_message": {"type": "text"},
                        "execution_time_ms": {"type": "integer"},
                        "risk_level": {"type": "keyword"},
                        "tags": {"type": "object"},
                        "timestamp": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        },
                        "created_at": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        }
                    }
                },
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "refresh_interval": "5s"
                }
            }
            
            # 安全事件索引
            security_event_mapping = {
                "mappings": {
                    "properties": {
                        "event_type": {"type": "keyword"},
                        "severity": {"type": "keyword"},
                        "user_id": {"type": "keyword"},
                        "ip_address": {"type": "ip"},
                        "details": {"type": "object"},
                        "status": {"type": "keyword"},
                        "assigned_to": {"type": "keyword"},
                        "resolution_notes": {"type": "text"},
                        "resolved_at": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        },
                        "created_at": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        },
                        "updated_at": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        }
                    }
                },
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "refresh_interval": "5s"
                }
            }
            
            # 创建索引（如果不存在）
            indices = {
                "audit_logs": audit_log_mapping,
                "security_events": security_event_mapping
            }
            
            for index_name, mapping in indices.items():
                if not self.es_client.indices.exists(index=index_name):
                    self.es_client.indices.create(index=index_name, body=mapping)
                    logger.info(f"創建Elasticsearch索引: {index_name}")
                    
        except Exception as e:
            logger.error(f"創建Elasticsearch索引失敗: {str(e)}")
    
    def is_available(self) -> bool:
        """检查Elasticsearch是否可用"""
        try:
            return self._initialized and self.es_client and self.es_client.ping()
        except Exception:
            return False
    
    def index_audit_log(self, log_data: Dict[str, Any]) -> bool:
        """索引审计日志到Elasticsearch"""
        try:
            if not self.is_available():
                return False
            
            # 添加索引时间戳
            log_data['indexed_at'] = CommonTools.get_now()
            
            # 确保时间字段格式正确
            if log_data.get('timestamp'):
                try:
                    # 如果时间戳是字符串格式，保持原样
                    if isinstance(log_data['timestamp'], str):
                        pass
                    else:
                        log_data['timestamp'] = CommonTools.get_now()
                except:
                    log_data['timestamp'] = CommonTools.get_now()
            
            # 生成文档ID（使用MySQL的ID或生成UUID）
            doc_id = log_data.get('id') or CommonTools.get_uuid()
            
            result = self.es_client.index(
                index="audit_logs",
                id=doc_id,
                body=log_data
            )
            
            return result.get('result') in ['created', 'updated']
            
        except Exception as e:
            logger.error(f"索引審計日誌到Elasticsearch失敗: {str(e)}")
            return False
    
    def index_security_event(self, event_data: Dict[str, Any]) -> bool:
        """索引安全事件到Elasticsearch"""
        try:
            if not self.is_available():
                return False
            
            # 添加索引时间戳
            event_data['indexed_at'] = CommonTools.get_now()
            
            # 确保时间字段格式正确
            for time_field in ['created_at', 'updated_at', 'resolved_at']:
                if event_data.get(time_field):
                    try:
                        if isinstance(event_data[time_field], str):
                            pass
                        else:
                            event_data[time_field] = CommonTools.get_now()
                    except:
                        if time_field == 'created_at':
                            event_data[time_field] = CommonTools.get_now()
            
            # 生成文档ID
            doc_id = event_data.get('id') or CommonTools.get_uuid()
            
            result = self.es_client.index(
                index="security_events",
                id=doc_id,
                body=event_data
            )
            
            return result.get('result') in ['created', 'updated']
            
        except Exception as e:
            logger.error(f"索引安全事件到Elasticsearch失敗: {str(e)}")
            return False
    
    def search_audit_logs(self, query: str, filters: Dict = None, 
                         page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """搜索审计日志"""
        try:
            if not self.is_available():
                return {'total': 0, 'hits': []}
            
            # 构建搜索查询
            search_body = {
                "query": {
                    "bool": {
                        "must": [],
                        "filter": []
                    }
                },
                "sort": [{"timestamp": {"order": "desc"}}],
                "from": (page - 1) * per_page,
                "size": per_page
            }
            
            # 添加文本搜索
            if query:
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": [
                            "action^3",
                            "resource_type^2", 
                            "user_agent",
                            "error_message"
                        ],
                        "fuzziness": "AUTO"
                    }
                })
            else:
                search_body["query"]["bool"]["must"].append({"match_all": {}})
            
            # 添加过滤条件
            if filters:
                if filters.get('user_id'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"user_id": filters['user_id']}
                    })
                if filters.get('action'):
                    search_body["query"]["bool"]["filter"].append({
                        "wildcard": {"action": f"*{filters['action']}*"}
                    })
                if filters.get('resource_type'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"resource_type": filters['resource_type']}
                    })
                if filters.get('result'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"result": filters['result']}
                    })
                if filters.get('risk_level'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"risk_level": filters['risk_level']}
                    })
                if filters.get('start_time') and filters.get('end_time'):
                    search_body["query"]["bool"]["filter"].append({
                        "range": {
                            "timestamp": {
                                "gte": filters['start_time'],
                                "lte": filters['end_time']
                            }
                        }
                    })
            
            result = self.es_client.search(index="audit_logs", body=search_body)
            
            return {
                'total': result['hits']['total']['value'],
                'hits': [hit['_source'] for hit in result['hits']['hits']]
            }
            
        except Exception as e:
            logger.error(f"搜索審計日誌失敗: {str(e)}")
            return {'total': 0, 'hits': []}
    
    def search_security_events(self, query: str, filters: Dict = None,
                              page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """搜索安全事件"""
        try:
            if not self.is_available():
                return {'total': 0, 'hits': []}
            
            # 构建搜索查询
            search_body = {
                "query": {
                    "bool": {
                        "must": [],
                        "filter": []
                    }
                },
                "sort": [{"created_at": {"order": "desc"}}],
                "from": (page - 1) * per_page,
                "size": per_page
            }
            
            # 添加文本搜索
            if query:
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": [
                            "event_type^3",
                            "details.*^2",
                            "resolution_notes"
                        ],
                        "fuzziness": "AUTO"
                    }
                })
            else:
                search_body["query"]["bool"]["must"].append({"match_all": {}})
            
            # 添加过滤条件
            if filters:
                if filters.get('event_type'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"event_type": filters['event_type']}
                    })
                if filters.get('severity'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"severity": filters['severity']}
                    })
                if filters.get('status'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"status": filters['status']}
                    })
                if filters.get('user_id'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"user_id": filters['user_id']}
                    })
                if filters.get('assigned_to'):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"assigned_to": filters['assigned_to']}
                    })
            
            result = self.es_client.search(index="security_events", body=search_body)
            
            return {
                'total': result['hits']['total']['value'],
                'hits': [hit['_source'] for hit in result['hits']['hits']]
            }
            
        except Exception as e:
            logger.error(f"搜索安全事件失敗: {str(e)}")
            return {'total': 0, 'hits': []}
    
    def get_audit_aggregations(self, filters: Dict = None) -> Dict[str, Any]:
        """获取审计日志聚合统计"""
        try:
            if not self.is_available():
                return {}
            
            # 构建聚合查询
            agg_body = {
                "size": 0,
                "query": {"bool": {"filter": []}},
                "aggs": {
                    "actions": {
                        "terms": {"field": "action", "size": 10}
                    },
                    "results": {
                        "terms": {"field": "result", "size": 10}
                    },
                    "risk_levels": {
                        "terms": {"field": "risk_level", "size": 10}
                    },
                    "resource_types": {
                        "terms": {"field": "resource_type", "size": 10}
                    },
                    "hourly_stats": {
                        "date_histogram": {
                            "field": "timestamp",
                            "calendar_interval": "hour",
                            "format": "yyyy-MM-dd HH:00:00"
                        }
                    }
                }
            }
            
            # 添加过滤条件
            if filters:
                if filters.get('start_time') and filters.get('end_time'):
                    agg_body["query"]["bool"]["filter"].append({
                        "range": {
                            "timestamp": {
                                "gte": filters['start_time'],
                                "lte": filters['end_time']
                            }
                        }
                    })
            
            result = self.es_client.search(index="audit_logs", body=agg_body)
            
            # 处理聚合结果
            aggregations = {}
            for agg_name, agg_data in result.get('aggregations', {}).items():
                if 'buckets' in agg_data:
                    aggregations[agg_name] = {
                        bucket['key']: bucket['doc_count'] 
                        for bucket in agg_data['buckets']
                    }
            
            return aggregations
            
        except Exception as e:
            logger.error(f"獲取審計聚合統計失敗: {str(e)}")
            return {}
    
    def cleanup_old_data(self, days: int = 90):
        """清理旧数据"""
        try:
            if not self.is_available():
                return False
            
            # 计算清理日期
            cleanup_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            # 删除旧的审计日志
            delete_query = {
                "query": {
                    "range": {
                        "timestamp": {
                            "lt": cleanup_date
                        }
                    }
                }
            }
            
            # 删除审计日志
            result1 = self.es_client.delete_by_query(
                index="audit_logs",
                body=delete_query
            )
            
            # 删除安全事件（已解决的）
            security_delete_query = {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"status": "resolved"}},
                            {"range": {"resolved_at": {"lt": cleanup_date}}}
                        ]
                    }
                }
            }
            
            result2 = self.es_client.delete_by_query(
                index="security_events",
                body=security_delete_query
            )
            
            logger.info(f"清理了 {result1.get('deleted', 0)} 條審計日誌和 {result2.get('deleted', 0)} 個安全事件")
            return True
            
        except Exception as e:
            logger.error(f"清理舊數據失敗: {str(e)}")
            return False


# 全局Elasticsearch客户端实例
es_client = ElasticsearchClient()