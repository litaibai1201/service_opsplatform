# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 序列化包初始化 (Search Service)
@時間: 2025-01-09
@作者: LiDong
"""

from .response_serialize import RspMsgSchema, RspMsgDictSchema, RspMsgListSchema


__all__ = [
    'RspMsgSchema', 'RspMsgDictSchema', 'RspMsgListSchema'
]