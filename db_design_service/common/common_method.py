# -*- coding: utf-8 -*-
"""
@文件: common_method.py
@說明: API響應方法 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""


def response_result(content=None, msg="OK", code="S10000"):
    """
    成功响应构建函数 (优化版本)
    
    Args:
        content: 响应内容，默认为空列表
        msg: 响应消息
        code: 响应代码
    """
    if content is None:
        content = []
        
    return {
        "code": code,
        "msg": msg,
        "content": content
    }


def fail_response_result(content=None, msg="Error", code="F10001"):
    """
    失败响应构建函数 (优化版本)
    
    Args:
        content: 错误内容，默认为空字典
        msg: 错误消息
        code: 错误代码
    """
    if content is None:
        content = {}
        
    return {
        "code": code,
        "msg": msg,
        "content": content
    }


def paginated_response_result(items, total, page, size, msg="OK", code="S10000"):
    """
    分页响应构建函数
    
    Args:
        items: 数据项列表
        total: 总记录数
        page: 当前页码
        size: 每页大小
        msg: 响应消息
        code: 响应代码
    """
    import math
    
    total_pages = math.ceil(total / size) if size > 0 else 0
    
    return {
        "code": code,
        "msg": msg,
        "content": {
            "items": items,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
    }


def error_response_with_code(error_type, details=None):
    """
    根据错误类型返回标准化错误响应
    
    Args:
        error_type: 错误类型
        details: 错误详情
    """
    from configs.constant import ERROR_CODES
    
    error_messages = {
        "INVALID_CREDENTIALS": "用戶名或密碼錯誤",
        "ACCOUNT_LOCKED": "賬戶被鎖定",
        "TOKEN_EXPIRED": "令牌已過期",
        "TOKEN_INVALID": "令牌無效",
        "USER_ALREADY_EXISTS": "用戶已存在",
        "USER_NOT_FOUND": "用戶不存在",
        "WEAK_PASSWORD": "密碼強度不夠",
        "INVALID_EMAIL_FORMAT": "郵箱格式不正確",
        "VALIDATION_ERROR": "參數驗證失敗",
        "RATE_LIMITED": "請求過於頻繁",
        "INTERNAL_ERROR": "系統內部錯誤",
        "DATABASE_ERROR": "數據庫錯誤",
        "CACHE_ERROR": "緩存錯誤"
    }
    
    code = ERROR_CODES.get(error_type, ERROR_CODES["INTERNAL_ERROR"])
    msg = error_messages.get(error_type, "未知錯誤")
    
    if details:
        msg = f"{msg}: {details}"
    
    return fail_response_result(code=code, msg=msg)