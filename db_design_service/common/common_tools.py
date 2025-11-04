# -*- coding: utf-8 -*-
"""
@文件: common_tools.py
@說明: 公共工具模塊 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""
import re
import time
import traceback
import hashlib
import secrets
import string
from datetime import datetime, timedelta

import requests
import yaml
from flask import current_app as app


def get_time(f):
    """计时装饰器"""
    def inner(*arg, **kwarg):
        s_time = time.time()
        res = f(*arg, **kwarg)
        e_time = time.time()
        print("耗时：{}秒，函式：{}".format(round(e_time - s_time, 3), f))
        return res

    return inner


class ReadConf:
    """配置文件读取工具"""
    def __init__(self, yaml_file):
        self.yaml_file = yaml_file

    def read_yaml(self):
        with open(self.yaml_file, encoding='utf-8') as f:
            value = yaml.load(f, Loader=yaml.FullLoader)
            return value


class TryExcept:
    """异常处理装饰器"""
    def __init__(self, default_error=""):
        self.default_error = default_error
        self.errors = (Exception,)

    def __call__(self, func):
        def inner(*args, **kwargs):
            try:
                return func(*args, **kwargs), True
            except self.errors as e:
                if self.default_error:
                    self.default_error = f"{self.default_error}, {e}"
                else:
                    self.default_error = e
                app.logger.error(f"{args}: {self.default_error}")
                app.logger.error(traceback.format_exc())
                return self.default_error, False

        return inner


class CommonTools:
    """通用工具类"""

    @TryExcept("請求失敗")
    @staticmethod
    def send_request(url, timeout=30, **kwargs):
        """发送HTTP GET请求"""
        res = requests.get(url, timeout=timeout, **kwargs).json()
        if res.get("code", 400) == 200:
            return res
        return False

    @TryExcept("請求失敗")
    @staticmethod
    def send_post_request(url, data, timeout=30, **kwargs):
        """发送HTTP POST请求"""
        res = requests.post(url, json=data, timeout=timeout, **kwargs)
        result = res.json()
        if result.get("code") == "S10000":
            return result
        return False

    @staticmethod
    def get_now(data=None, days=0, seconds=0):
        """
        获取时间字符串
        
        Args:
            data: 时间格式类型
            days: 天数偏移
            seconds: 秒数偏移
        """
        now_time = datetime.now() + timedelta(days=days, seconds=seconds)
        
        if data == "date":
            return now_time.strftime("%Y-%m-%d")
        elif data == "time":
            return now_time.strftime("%H:%M:%S")
        elif data == "datetime":
            return now_time
        elif data == "datetime_nums":
            return now_time.strftime("%Y%m%d%H%M%S")
        elif data == "date_nums":
            return now_time.strftime("%Y%m%d")
        else:
            return now_time.strftime("%Y-%m-%d %H:%M:%S")

    @staticmethod
    def get_timestmp():
        """获取时间戳(毫秒)"""
        return int(datetime.now().timestamp() * 1000)

    @staticmethod
    def get_total_page(count, total_count):
        """计算总页数"""
        if count <= 0:
            return 0
        total_page = int(total_count / count)
        if total_count % count > 0:
            total_page += 1
        return total_page

    @staticmethod
    def validate_email(email):
        """验证邮箱格式"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_pattern, email) is not None

    @staticmethod
    def validate_phone(phone):
        """验证手机号格式"""
        # 简化的手机号验证，支持国际格式
        phone_pattern = r'^[+]?[0-9\-\s()]{7,20}$'
        return re.match(phone_pattern, phone) is not None

    @staticmethod
    def validate_username(username):
        """验证用户名格式"""
        # 用户名只能包含字母、数字和下划线，3-50位
        username_pattern = r'^[a-zA-Z0-9_]{3,50}$'
        return re.match(username_pattern, username) is not None

    @staticmethod
    def normalize_string(input_str):
        """
        规范化字符串：
        1. 只保留中文、英文字母、数字和下划线
        2. 下划线不能开头
        3. 英文字母一律转为小写
        
        Args:
            input_str (str): 要处理的输入字符串
            
        Returns:
            str: 处理后的字符串
        """
        if not isinstance(input_str, str):
            raise ValueError("输入必须是字符串类型")
        
        # 过滤掉不允许的字符（只保留中文、英文、数字和下划线）
        filtered = re.sub(r'[^a-zA-Z0-9_\u4e00-\u9fa5]', '', input_str)
        
        # 将所有英文字母转为小写
        filtered = filtered.lower()

        # 移除开头的下划线
        filtered = re.sub(r'^_+', '', filtered)
        
        return filtered

    @staticmethod
    def generate_random_string(length=32, use_digits=True, use_letters=True, use_symbols=False):
        """
        生成随机字符串
        
        Args:
            length: 长度
            use_digits: 是否包含数字
            use_letters: 是否包含字母
            use_symbols: 是否包含符号
        """
        chars = ''
        if use_digits:
            chars += string.digits
        if use_letters:
            chars += string.ascii_letters
        if use_symbols:
            chars += '!@#$%&*'
        
        if not chars:
            chars = string.ascii_letters + string.digits
        
        return ''.join(secrets.choice(chars) for _ in range(length))

    @staticmethod
    def generate_verification_code(length=6):
        """生成验证码"""
        return ''.join(secrets.choice(string.digits) for _ in range(length))

    @staticmethod
    def hash_string(text, salt=""):
        """字符串哈希"""
        return hashlib.sha256((text + salt).encode()).hexdigest()

    @staticmethod
    def is_strong_password(password):
        """
        检查密码强度
        
        Args:
            password: 密码
            
        Returns:
            tuple: (是否强密码, 错误信息列表)
        """
        errors = []
        
        if len(password) < 8:
            errors.append("密碼長度至少8位")
        
        if not re.search(r'[a-z]', password):
            errors.append("必須包含小寫字母")
            
        if not re.search(r'[A-Z]', password):
            errors.append("必須包含大寫字母")
            
        if not re.search(r'\d', password):
            errors.append("必須包含數字")
            
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("建議包含特殊字符")
        
        return len(errors) == 0, errors

    @staticmethod
    def mask_sensitive_data(data, mask_char="*"):
        """
        遮罩敏感数据
        
        Args:
            data: 要遮罩的数据
            mask_char: 遮罩字符
        """
        if isinstance(data, str):
            if len(data) <= 4:
                return mask_char * len(data)
            return data[:2] + mask_char * (len(data) - 4) + data[-2:]
        return str(data)

    @staticmethod
    def safe_int(value, default=0):
        """安全的整数转换"""
        try:
            return int(value)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def safe_float(value, default=0.0):
        """安全的浮点数转换"""
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def time_trans(times):
        """时间转换 - UTC转北京时间"""
        if isinstance(times, str):
            times = datetime.fromisoformat(times.replace('Z', '+00:00'))
        
        # 将UTC时间转换为北京时间（UTC+8）
        beijing_time = times + timedelta(hours=8)
        return beijing_time.strftime("%Y-%m-%d %H:%M:%S")

    @staticmethod
    def clean_html(text):
        """清理HTML标签"""
        import re
        clean = re.compile('<.*?>')
        return re.sub(clean, '', text)

    @staticmethod
    def truncate_string(text, length, suffix="..."):
        """截断字符串"""
        if len(text) <= length:
            return text
        return text[:length] + suffix