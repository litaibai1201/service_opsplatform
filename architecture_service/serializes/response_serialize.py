# -*- coding: utf-8 -*-
"""
@文件: response_serialize.py
@說明: 響應序列化器 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields


class RspBaseSchema(Schema):
    """基础响应Schema"""
    code = fields.Str(metadata={"description": "響應代碼"})
    msg = fields.Str(metadata={"description": "響應消息"})


class RspMsgSchema(RspBaseSchema):
    """消息响应Schema"""
    content = fields.Str(metadata={"description": "響應內容"})


class RspMsgDictSchema(RspBaseSchema):
    """字典消息响应Schema"""
    content = fields.Dict(metadata={"description": "響應內容字典"})


class RspMsgListSchema(RspBaseSchema):
    """列表消息响应Schema"""
    content = fields.List(fields.Dict(), metadata={"description": "響應內容列表"})


class PaginationSchema(Schema):
    """分页信息Schema"""
    page = fields.Int(metadata={"description": "當前頁碼"})
    size = fields.Int(metadata={"description": "每頁數量"})
    total = fields.Int(metadata={"description": "總記錄數"})
    total_pages = fields.Int(metadata={"description": "總頁數"})


class RspPaginatedSchema(RspBaseSchema):
    """分页响应Schema"""
    content = fields.Dict(metadata={"description": "分頁響應內容"})
    pagination = fields.Nested(PaginationSchema, metadata={"description": "分頁信息"})