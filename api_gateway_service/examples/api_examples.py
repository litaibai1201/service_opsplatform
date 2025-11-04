#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@文件: api_examples.py
@說明: API Gateway 使用示例
@時間: 2025-01-09
@作者: LiDong
"""

import requests
import json
import time

class APIGatewayClient:
    """API Gateway 客户端示例"""
    
    def __init__(self, base_url="http://localhost:8080", admin_token=None):
        self.base_url = base_url
        self.admin_token = admin_token
        self.session = requests.Session()
        
        if admin_token:
            self.session.headers.update({
                'Authorization': f'Bearer {admin_token}',
                'Content-Type': 'application/json'
            })
    
    def health_check(self):
        """健康检查"""
        print("=== 健康检查 ===")
        try:
            response = self.session.get(f"{self.base_url}/health")
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"健康检查失败: {e}")
    
    def get_metrics(self):
        """获取监控指标"""
        print("\n=== 监控指标 ===")
        try:
            response = self.session.get(f"{self.base_url}/metrics")
            print(f"状态码: {response.status_code}")
            data = response.json()
            if 'content' in data and 'metrics' in data['content']:
                print("Prometheus 格式指标:")
                print(data['content']['metrics'])
            else:
                print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"获取监控指标失败: {e}")
    
    def create_route(self):
        """创建路由配置示例"""
        print("\n=== 创建路由配置 ===")
        
        route_config = {
            "service_name": "user-service",
            "path_pattern": "/api/v1/users",
            "target_url": "/users",
            "method": "GET",
            "version": "v1",
            "is_active": True,
            "requires_auth": True,
            "required_permissions": ["user.read"],
            "permission_check_strategy": "any",
            "rate_limit_rpm": 500,
            "timeout_seconds": 30,
            "retry_count": 3,
            "circuit_breaker_enabled": True,
            "cache_enabled": False,
            "load_balance_strategy": "round_robin",
            "priority": 10
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/admin/routes",
                json=route_config
            )
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.json()
        except Exception as e:
            print(f"创建路由失败: {e}")
            return None
    
    def get_routes(self):
        """获取路由配置列表"""
        print("\n=== 获取路由配置 ===")
        try:
            response = self.session.get(f"{self.base_url}/admin/routes")
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"获取路由配置失败: {e}")
    
    def register_service(self):
        """注册服务实例示例"""
        print("\n=== 注册服务实例 ===")
        
        service_config = {
            "service_name": "user-service",
            "instance_id": "user-service-001",
            "host": "localhost",
            "port": 3001,
            "protocol": "http",
            "weight": 100,
            "health_check_url": "/health",
            "health_check_interval_seconds": 30,
            "metadata": {
                "version": "1.0.0",
                "environment": "development"
            }
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/admin/services",
                json=service_config
            )
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"注册服务实例失败: {e}")
    
    def get_services(self):
        """获取服务实例列表"""
        print("\n=== 获取服务实例 ===")
        try:
            response = self.session.get(
                f"{self.base_url}/admin/services",
                params={"service_name": "user-service"}
            )
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"获取服务实例失败: {e}")
    
    def batch_create_routes(self):
        """批量创建路由配置示例"""
        print("\n=== 批量创建路由配置 ===")
        
        batch_routes = {
            "routes": [
                {
                    "service_name": "user-service",
                    "path_pattern": "/api/v1/users/profile",
                    "target_url": "/users/profile",
                    "method": "GET",
                    "requires_auth": True,
                    "rate_limit_rpm": 200
                },
                {
                    "service_name": "user-service", 
                    "path_pattern": "/api/v1/users",
                    "target_url": "/users",
                    "method": "POST",
                    "requires_auth": True,
                    "required_permissions": ["user.create"],
                    "rate_limit_rpm": 100
                },
                {
                    "service_name": "order-service",
                    "path_pattern": "/api/v1/orders",
                    "target_url": "/orders",
                    "method": "ANY",
                    "requires_auth": True,
                    "rate_limit_rpm": 300
                }
            ]
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/admin/batch/routes",
                json=batch_routes
            )
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"批量创建路由失败: {e}")
    
    def simulate_proxy_request(self):
        """模拟通过网关转发的请求"""
        print("\n=== 模拟网关转发请求 ===")
        print("注意: 这个请求会失败，因为目标服务不存在，但可以看到网关的处理逻辑")
        
        try:
            # 不带认证头的请求
            response = requests.get(f"{self.base_url}/api/v1/users/profile")
            print(f"无认证请求 - 状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            
            # 带认证头的请求（模拟）
            headers = {
                'Authorization': 'Bearer fake-token-for-demo',
                'Content-Type': 'application/json'
            }
            response = requests.get(f"{self.base_url}/api/v1/users/profile", headers=headers)
            print(f"\n带认证请求 - 状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            
        except Exception as e:
            print(f"模拟请求失败: {e}")


def main():
    """主函数"""
    print("API Gateway 使用示例")
    print("=" * 50)
    
    # 初始化客户端（这里没有真实的admin token，所以会有权限错误）
    client = APIGatewayClient()
    
    # 基础功能测试
    client.health_check()
    client.get_metrics()
    
    # 管理功能测试（需要管理员权限）
    print("\n" + "=" * 50)
    print("以下操作需要管理员权限，会返回权限错误：")
    
    client.create_route()
    client.get_routes()
    client.register_service()
    client.get_services()
    client.batch_create_routes()
    
    # 代理功能测试
    print("\n" + "=" * 50)
    print("网关代理功能测试：")
    client.simulate_proxy_request()
    
    print("\n" + "=" * 50)
    print("示例完成!")
    print("\n使用说明:")
    print("1. 确保API Gateway服务已启动 (python app.py)")
    print("2. 确保数据库和Redis服务可用")
    print("3. 获取有效的管理员Token后替换 admin_token 参数")
    print("4. 注册实际的服务实例后测试代理功能")


if __name__ == "__main__":
    main()