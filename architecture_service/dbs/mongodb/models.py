# -*- coding: utf-8 -*-
"""
@文件: models.py
@說明: 架構圖相關數據模型 (Architecture Service - MongoDB)
@時間: 2025-01-09
@作者: LiDong
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
from bson import ObjectId
from pymongo.errors import PyMongoError

from common.common_tools import CommonTools
from loggers import logger


class BaseDocument:
    """基础文档类"""
    
    def __init__(self, collection_name: str, db_instance):
        self.collection_name = collection_name
        self.db = db_instance
        self.collection = self.db[collection_name]
    
    def to_dict(self, document) -> Dict:
        """转换文档为字典格式"""
        if document is None:
            return None
        
        if '_id' in document and isinstance(document['_id'], ObjectId):
            document['_id'] = str(document['_id'])
        
        # 递归处理嵌套的ObjectId
        for key, value in document.items():
            if isinstance(value, ObjectId):
                document[key] = str(value)
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        for sub_key, sub_value in item.items():
                            if isinstance(sub_value, ObjectId):
                                item[sub_key] = str(sub_value)
            elif isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, ObjectId):
                        value[sub_key] = str(sub_value)
        
        return document
    
    def to_dict_list(self, documents) -> List[Dict]:
        """转换文档列表为字典列表格式"""
        return [self.to_dict(doc) for doc in documents]


class DiagramModel(BaseDocument):
    """架构图模型"""
    
    def __init__(self, db_instance):
        super().__init__('diagrams', db_instance)
    
    def create_diagram(self, project_id: str, name: str, description: str = None, 
                      diagram_type: str = "system_architecture", data: Dict = None, 
                      created_by: str = None) -> Dict:
        """创建架构图"""
        try:
            current_time = datetime.utcnow()
            
            diagram = {
                "project_id": project_id,
                "name": name,
                "description": description or "",
                "type": diagram_type,
                "data": data or {
                    "nodes": [],
                    "edges": [],
                    "layout": {},
                    "styles": {}
                },
                "metadata": {
                    "version": 1,
                    "created_by": created_by,
                    "last_modified_by": created_by,
                    "created_at": current_time,
                    "updated_at": current_time,
                    "tags": [],
                    "complexity_score": 0,
                    "validation_status": "valid"
                },
                "collaboration": {
                    "locked_by": None,
                    "locked_at": None,
                    "active_editors": []
                },
                "sharing": {
                    "is_public": False,
                    "share_token": None,
                    "allowed_users": []
                },
                "validation_rules": {
                    "custom_rules": [],
                    "compliance_checks": [],
                    "architectural_patterns": []
                }
            }
            
            result = self.collection.insert_one(diagram)
            diagram['_id'] = str(result.inserted_id)
            
            return self.to_dict(diagram)
            
        except PyMongoError as e:
            logger.error(f"创建架构图失败: {str(e)}")
            raise Exception(f"创建架构图失败: {str(e)}")
    
    def get_diagram_by_id(self, diagram_id: str) -> Optional[Dict]:
        """根据ID获取架构图"""
        try:
            document = self.collection.find_one({"_id": ObjectId(diagram_id)})
            return self.to_dict(document) if document else None
        except Exception as e:
            logger.error(f"获取架构图失败: {str(e)}")
            return None
    
    def get_diagrams_by_project(self, project_id: str, page: int = 1, per_page: int = 20) -> Dict:
        """获取项目的架构图列表"""
        try:
            skip = (page - 1) * per_page
            
            # 获取总数
            total = self.collection.count_documents({"project_id": project_id})
            
            # 获取分页数据
            documents = self.collection.find({"project_id": project_id}) \
                                    .sort("metadata.updated_at", -1) \
                                    .skip(skip) \
                                    .limit(per_page)
            
            diagrams = self.to_dict_list(list(documents))
            
            return {
                "diagrams": diagrams,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            }
            
        except PyMongoError as e:
            logger.error(f"获取项目架构图列表失败: {str(e)}")
            raise Exception(f"获取项目架构图列表失败: {str(e)}")
    
    def update_diagram(self, diagram_id: str, update_data: Dict, user_id: str) -> Optional[Dict]:
        """更新架构图"""
        try:
            # 准备更新数据
            update_fields = {}
            
            # 直接更新的字段
            if 'name' in update_data:
                update_fields['name'] = update_data['name']
            if 'description' in update_data:
                update_fields['description'] = update_data['description']
            if 'type' in update_data:
                update_fields['type'] = update_data['type']
            if 'data' in update_data:
                update_fields['data'] = update_data['data']
            
            # 更新元数据
            update_fields['metadata.last_modified_by'] = user_id
            update_fields['metadata.updated_at'] = datetime.utcnow()
            
            # 如果有新的数据，增加版本号
            if 'data' in update_data:
                diagram = self.get_diagram_by_id(diagram_id)
                if diagram:
                    new_version = diagram['metadata']['version'] + 1
                    update_fields['metadata.version'] = new_version
            
            # 执行更新
            result = self.collection.update_one(
                {"_id": ObjectId(diagram_id)},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                return self.get_diagram_by_id(diagram_id)
            return None
            
        except PyMongoError as e:
            logger.error(f"更新架构图失败: {str(e)}")
            raise Exception(f"更新架构图失败: {str(e)}")
    
    def delete_diagram(self, diagram_id: str) -> bool:
        """删除架构图"""
        try:
            result = self.collection.delete_one({"_id": ObjectId(diagram_id)})
            return result.deleted_count > 0
        except PyMongoError as e:
            logger.error(f"删除架构图失败: {str(e)}")
            return False
    
    def duplicate_diagram(self, diagram_id: str, new_name: str, user_id: str) -> Optional[Dict]:
        """复制架构图"""
        try:
            original = self.get_diagram_by_id(diagram_id)
            if not original:
                return None
            
            # 创建副本
            duplicate_data = original.copy()
            duplicate_data.pop('_id', None)  # 移除原ID
            duplicate_data['name'] = new_name
            duplicate_data['metadata']['version'] = 1
            duplicate_data['metadata']['created_by'] = user_id
            duplicate_data['metadata']['last_modified_by'] = user_id
            duplicate_data['metadata']['created_at'] = datetime.utcnow()
            duplicate_data['metadata']['updated_at'] = datetime.utcnow()
            
            # 重置协作和分享信息
            duplicate_data['collaboration'] = {
                "locked_by": None,
                "locked_at": None,
                "active_editors": []
            }
            duplicate_data['sharing'] = {
                "is_public": False,
                "share_token": None,
                "allowed_users": []
            }
            
            result = self.collection.insert_one(duplicate_data)
            duplicate_data['_id'] = str(result.inserted_id)
            
            return self.to_dict(duplicate_data)
            
        except PyMongoError as e:
            logger.error(f"复制架构图失败: {str(e)}")
            raise Exception(f"复制架构图失败: {str(e)}")


class DiagramVersionModel(BaseDocument):
    """架构图版本模型"""
    
    def __init__(self, db_instance):
        super().__init__('diagram_versions', db_instance)
    
    def create_version(self, diagram_id: str, version: int, data: Dict, 
                      created_by: str, comment: str = None, 
                      parent_version: int = None, is_major: bool = False) -> Dict:
        """创建新版本"""
        try:
            version_doc = {
                "diagram_id": ObjectId(diagram_id),
                "version": version,
                "data": data,
                "changes": {},  # 这里可以存储变更差异
                "created_by": created_by,
                "created_at": datetime.utcnow(),
                "comment": comment or "",
                "parent_version": parent_version,
                "is_major": is_major
            }
            
            result = self.collection.insert_one(version_doc)
            version_doc['_id'] = str(result.inserted_id)
            version_doc['diagram_id'] = str(version_doc['diagram_id'])
            
            return self.to_dict(version_doc)
            
        except PyMongoError as e:
            logger.error(f"创建版本失败: {str(e)}")
            raise Exception(f"创建版本失败: {str(e)}")
    
    def get_versions_by_diagram(self, diagram_id: str) -> List[Dict]:
        """获取架构图的版本历史"""
        try:
            documents = self.collection.find({"diagram_id": ObjectId(diagram_id)}) \
                                     .sort("version", -1)
            return self.to_dict_list(list(documents))
        except PyMongoError as e:
            logger.error(f"获取版本历史失败: {str(e)}")
            return []
    
    def get_version(self, diagram_id: str, version: int) -> Optional[Dict]:
        """获取特定版本"""
        try:
            document = self.collection.find_one({
                "diagram_id": ObjectId(diagram_id),
                "version": version
            })
            return self.to_dict(document) if document else None
        except PyMongoError as e:
            logger.error(f"获取特定版本失败: {str(e)}")
            return None


class DiagramCommentModel(BaseDocument):
    """架构图评论模型"""
    
    def __init__(self, db_instance):
        super().__init__('diagram_comments', db_instance)
    
    def create_comment(self, diagram_id: str, user_id: str, content: str, 
                      position: Dict = None) -> Dict:
        """创建评论"""
        try:
            comment = {
                "diagram_id": ObjectId(diagram_id),
                "user_id": user_id,
                "content": content,
                "position": position or {},
                "status": "open",
                "replies": [],
                "created_at": datetime.utcnow(),
                "resolved_by": None,
                "resolved_at": None
            }
            
            result = self.collection.insert_one(comment)
            comment['_id'] = str(result.inserted_id)
            comment['diagram_id'] = str(comment['diagram_id'])
            
            return self.to_dict(comment)
            
        except PyMongoError as e:
            logger.error(f"创建评论失败: {str(e)}")
            raise Exception(f"创建评论失败: {str(e)}")
    
    def get_comments_by_diagram(self, diagram_id: str) -> List[Dict]:
        """获取架构图的评论列表"""
        try:
            documents = self.collection.find({"diagram_id": ObjectId(diagram_id)}) \
                                     .sort("created_at", -1)
            return self.to_dict_list(list(documents))
        except PyMongoError as e:
            logger.error(f"获取评论列表失败: {str(e)}")
            return []
    
    def get_comment_by_id(self, comment_id: str) -> Optional[Dict]:
        """根据ID获取评论"""
        try:
            document = self.collection.find_one({"_id": ObjectId(comment_id)})
            return self.to_dict(document) if document else None
        except PyMongoError as e:
            logger.error(f"获取评论失败: {str(e)}")
            return None
    
    def update_comment(self, comment_id: str, content: str) -> Optional[Dict]:
        """更新评论"""
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(comment_id)},
                {"$set": {"content": content}}
            )
            
            if result.modified_count > 0:
                return self.get_comment_by_id(comment_id)
            return None
            
        except PyMongoError as e:
            logger.error(f"更新评论失败: {str(e)}")
            return None
    
    def delete_comment(self, comment_id: str) -> bool:
        """删除评论"""
        try:
            result = self.collection.delete_one({"_id": ObjectId(comment_id)})
            return result.deleted_count > 0
        except PyMongoError as e:
            logger.error(f"删除评论失败: {str(e)}")
            return False
    
    def resolve_comment(self, comment_id: str, resolved_by: str) -> Optional[Dict]:
        """解决评论"""
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(comment_id)},
                {"$set": {
                    "status": "resolved",
                    "resolved_by": resolved_by,
                    "resolved_at": datetime.utcnow()
                }}
            )
            
            if result.modified_count > 0:
                return self.get_comment_by_id(comment_id)
            return None
            
        except PyMongoError as e:
            logger.error(f"解决评论失败: {str(e)}")
            return None
    
    def add_reply(self, comment_id: str, user_id: str, content: str) -> Optional[Dict]:
        """添加回复"""
        try:
            reply = {
                "user_id": user_id,
                "content": content,
                "created_at": datetime.utcnow()
            }
            
            result = self.collection.update_one(
                {"_id": ObjectId(comment_id)},
                {"$push": {"replies": reply}}
            )
            
            if result.modified_count > 0:
                return self.get_comment_by_id(comment_id)
            return None
            
        except PyMongoError as e:
            logger.error(f"添加回复失败: {str(e)}")
            return None