# API Gateway Service - 接口说明文档

## 📋 概述

API Gateway Service 是基于 Flask 构建的 API 网关服务，提供统一入口、路由转发、令牌验证、限流熔断、请求聚合、权限预检等功能。

- **服务地址**: `http://localhost:8080`
- **API文档**: `http://localhost:8080/swagger-ui`
- **健康检查**: `http://localhost:8080/health`
- **监控指标**: `http://localhost:8080/metrics`

## 🌐 路由管理接口

### 1. 创建路由配置

**接口**: `POST /admin/routes`

**描述**: 创建新的路由配置规则

**请求头**:
```
Authorization: Bearer admin_access_token
Content-Type: application/json
```

**请求参数**:
```json
{
  "service_name": "user-service",           // 服务名称 (必填, 1-100位)
  "path_pattern": "/api/v1/users/*",        // 路径模式 (必填, 1-500位)
  "target_url": "/users/*",                 // 目标URL (必填, 1-500位)
  "method": "GET",                          // HTTP方法 (必填, GET/POST/PUT/DELETE/PATCH/ANY)
  "version": "v1",                          // API版本 (可选, 默认v1)
  "is_active": true,                        // 是否激活 (可选, 默认true)
  "requires_auth": true,                    // 是否需要认证 (可选, 默认true)
  "required_permissions": ["user.read"],    // 需要的权限列表 (可选)
  "permission_check_strategy": "any",       // 权限检查策略 (可选, any/all, 默认any)
  "rate_limit_rpm": 1000,                   // 每分钟请求限制 (可选, 默认1000)
  "timeout_seconds": 30,                    // 超时时间(秒) (可选, 默认30)
  "retry_count": 3,                         // 重试次数 (可选, 默认3)
  "circuit_breaker_enabled": true,          // 是否启用熔断器 (可选, 默认true)
  "cache_enabled": false,                   // 是否启用缓存 (可选, 默认false)
  "cache_ttl_seconds": 300,                 // 缓存TTL(秒) (可选, 默认300)
  "load_balance_strategy": "round_robin",   // 负载均衡策略 (可选, 默认round_robin)
  "priority": 10                            // 优先级 (可选, 默认0)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "創建路由配置成功",
  "content": {
    "route_id": "550e8400-e29b-41d4-a716-446655440000",
    "service_name": "user-service",
    "path_pattern": "/api/v1/users/*",
    "created_at": "2025-01-09 10:30:00"
  }
}
```

**错误响应**:
```json
{
  "code": "F40003",
  "msg": "權限不足，僅管理員可操作",
  "content": {}
}
```

---

### 2. 获取路由配置列表

**接口**: `GET /admin/routes`

**描述**: 获取路由配置列表

**请求头**:
```
Authorization: Bearer access_token
```

**请求参数** (Query):
- `service_name`: 服务名称 (可选)
- `is_active`: 是否激活 (可选)
- `page`: 页码 (可选, 默认1)
- `size`: 每页大小 (可选, 默认20)

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取路由配置成功",
  "content": {
    "total": 15,
    "routes": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "service_name": "user-service",
        "path_pattern": "/api/v1/users/*",
        "target_url": "/users/*",
        "method": "GET",
        "version": "v1",
        "is_active": true,
        "requires_auth": true,
        "required_permissions": ["user.read"],
        "rate_limit_rpm": 1000,
        "timeout_seconds": 30,
        "priority": 10,
        "created_at": "2025-01-09 10:30:00"
      }
    ]
  }
}
```

---

### 3. 更新路由配置

**接口**: `PUT /admin/routes/{route_id}`

**描述**: 更新指定的路由配置

**请求头**:
```
Authorization: Bearer admin_access_token
Content-Type: application/json
```

**请求参数**: 与创建路由相同，所有字段均为可选

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "更新路由配置成功",
  "content": {
    "route_id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_fields": ["rate_limit_rpm", "timeout_seconds"],
    "updated_at": "2025-01-09 11:00:00"
  }
}
```

---

### 4. 删除路由配置

**接口**: `DELETE /admin/routes/{route_id}`

**描述**: 删除指定的路由配置（软删除）

**请求头**:
```
Authorization: Bearer admin_access_token
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "刪除路由配置成功",
  "content": {
    "route_id": "550e8400-e29b-41d4-a716-446655440000",
    "deleted_at": "2025-01-09 11:30:00"
  }
}
```

---

## 🖥️ 服务管理接口

### 5. 注册服务实例

**接口**: `POST /admin/services`

**描述**: 注册新的服务实例

**请求头**:
```
Authorization: Bearer access_token
Content-Type: application/json
```

**请求参数**:
```json
{
  "service_name": "user-service",           // 服务名称 (必填, 1-100位)
  "instance_id": "user-service-001",        // 实例ID (必填, 1-100位)
  "host": "192.168.1.100",                  // 主机地址 (必填, 1-255位)
  "port": 3001,                             // 端口号 (必填, 1-65535)
  "protocol": "http",                       // 协议 (可选, http/https, 默认http)
  "weight": 100,                            // 权重 (可选, 1-1000, 默认100)
  "health_check_url": "/health",            // 健康检查URL (可选)
  "health_check_interval_seconds": 30,      // 健康检查间隔(秒) (可选, 默认30)
  "metadata": {                             // 元数据 (可选)
    "version": "1.0.0",
    "environment": "production"
  }
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "註冊服務實例成功",
  "content": {
    "instance_id": "660e8400-e29b-41d4-a716-446655440000",
    "service_name": "user-service",
    "endpoint": "http://192.168.1.100:3001",
    "registered_at": "2025-01-09 10:30:00"
  }
}
```

---

### 6. 获取服务实例列表

**接口**: `GET /admin/services`

**描述**: 获取指定服务的实例列表

**请求头**:
```
Authorization: Bearer access_token
```

**请求参数** (Query):
- `service_name`: 服务名称 (必填)
- `status`: 实例状态 (可选, healthy/unhealthy/draining)
- `page`: 页码 (可选, 默认1)
- `size`: 每页大小 (可选, 默认20)

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取服務實例成功",
  "content": {
    "service_name": "user-service",
    "total_instances": 3,
    "healthy_instances": 2,
    "instances": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "instance_id": "user-service-001",
        "endpoint": "http://192.168.1.100:3001",
        "weight": 100,
        "status": "healthy",
        "last_health_check": "2025-01-09 10:29:30",
        "registered_at": "2025-01-09 08:00:00"
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "instance_id": "user-service-002",
        "endpoint": "http://192.168.1.101:3001",
        "weight": 100,
        "status": "healthy",
        "last_health_check": "2025-01-09 10:29:35",
        "registered_at": "2025-01-09 08:05:00"
      }
    ]
  }
}
```

---

### 7. 更新服务实例

**接口**: `PUT /admin/services/{instance_id}`

**描述**: 更新服务实例配置

**请求参数**:
```json
{
  "weight": 150,                            // 权重 (可选)
  "status": "draining",                     // 状态 (可选, healthy/unhealthy/draining)
  "health_check_url": "/health/check",      // 健康检查URL (可选)
  "metadata": {                             // 元数据 (可选)
    "version": "1.0.1"
  }
}
```

---

### 8. 注销服务实例

**接口**: `DELETE /admin/services/{instance_id}`

**描述**: 注销服务实例

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "註銷服務實例成功",
  "content": {
    "instance_id": "660e8400-e29b-41d4-a716-446655440000",
    "deregistered_at": "2025-01-09 12:00:00"
  }
}
```

---

## 🔐 权限管理接口

### 9. 获取权限配置

**接口**: `GET /admin/permissions`

**描述**: 获取系统权限配置列表

**请求头**:
```
Authorization: Bearer admin_access_token
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取權限配置成功",
  "content": {
    "total": 10,
    "permissions": [
      {
        "id": "1",
        "permission_code": "gateway.admin",
        "permission_name": "網關管理員",
        "description": "網關系統管理員權限",
        "resource_type": "system",
        "actions": ["read", "write", "delete"],
        "is_system": true,
        "created_at": "2025-01-09 00:00:00"
      },
      {
        "id": "2",
        "permission_code": "service.read",
        "permission_name": "服務查看",
        "description": "查看服務信息權限",
        "resource_type": "service",
        "actions": ["read"],
        "is_system": false,
        "created_at": "2025-01-09 00:00:00"
      }
    ]
  }
}
```

---

### 10. 创建权限

**接口**: `POST /admin/permissions`

**描述**: 创建新的权限配置

**请求参数**:
```json
{
  "permission_code": "custom.permission",   // 权限代码 (必填, 1-100位)
  "permission_name": "自定義權限",          // 权限名称 (必填, 1-100位)
  "description": "自定義權限描述",          // 权限描述 (可选, 最长500位)
  "resource_type": "custom",               // 资源类型 (可选, 最长50位)
  "actions": ["read", "write"],            // 允许的操作 (可选)
  "is_system": false                       // 是否系统权限 (可选, 默认false)
}
```

---

## 📊 监控与健康检查

### 11. 健康检查

**接口**: `GET /health`

**描述**: 检查网关服务及其依赖的健康状态

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "服務正常",
  "content": {
    "status": "healthy",
    "service": "api-gateway",
    "timestamp": "2025-01-09 10:30:00",
    "version": "1.0.0",
    "database": "connected",
    "cache": "connected",
    "active_routes": 15
  }
}
```

**异常响应**:
```json
{
  "code": "F50000",
  "msg": "服務異常",
  "content": {
    "status": "unhealthy",
    "service": "api-gateway",
    "timestamp": "2025-01-09 10:30:00",
    "version": "1.0.0",
    "database": "error: connection timeout",
    "cache": "connected",
    "issues": [
      "数据库: connection timeout"
    ]
  }
}
```

---

### 12. 监控指标

**接口**: `GET /metrics`

**描述**: 获取 Prometheus 格式的监控指标

**请求参数** (Query):
- `hours`: 时间范围(小时) (可选, 1-168, 默认24)
- `service_name`: 服务名称 (可选)
- `group_by`: 分组方式 (可选, hour/day)

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取監控指標成功",
  "content": {
    "metrics": "# HELP gateway_requests_total Total number of requests\n# TYPE gateway_requests_total counter\ngateway_requests_total 15234\n# HELP gateway_errors_total Total number of error requests\n# TYPE gateway_errors_total counter\ngateway_errors_total 142\n# HELP gateway_response_time_ms Average response time in milliseconds\n# TYPE gateway_response_time_ms gauge\ngateway_response_time_ms 125.5\n# HELP gateway_active_routes Number of active routes\n# TYPE gateway_active_routes gauge\ngateway_active_routes 15\n# HELP gateway_healthy_instances Number of healthy service instances\n# TYPE gateway_healthy_instances gauge\ngateway_healthy_instances 8"
  }
}
```

---

## 🔄 批量操作接口

### 13. 批量创建路由

**接口**: `POST /admin/batch/routes`

**描述**: 批量创建多个路由配置

**请求参数**:
```json
{
  "routes": [
    {
      "service_name": "user-service",
      "path_pattern": "/api/v1/users/profile",
      "target_url": "/users/profile",
      "method": "GET",
      "requires_auth": true,
      "rate_limit_rpm": 200
    },
    {
      "service_name": "order-service",
      "path_pattern": "/api/v1/orders",
      "target_url": "/orders",
      "method": "POST",
      "requires_auth": true,
      "rate_limit_rpm": 100
    }
  ]
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "批量創建路由完成",
  "content": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "index": 0,
        "status": "success",
        "data": {
          "route_id": "880e8400-e29b-41d4-a716-446655440000",
          "service_name": "user-service",
          "path_pattern": "/api/v1/users/profile"
        }
      },
      {
        "index": 1,
        "status": "success",
        "data": {
          "route_id": "990e8400-e29b-41d4-a716-446655440000",
          "service_name": "order-service",
          "path_pattern": "/api/v1/orders"
        }
      }
    ],
    "errors": []
  }
}
```

---

## 🚀 动态路由转发

### 14. 动态路由转发

**接口**: `/* (所有路径)`

**描述**: 智能路由转发到对应的微服务

**工作流程**:
1. 路由匹配 - 根据请求路径和方法匹配路由规则
2. 权限验证 - 检查用户权限是否满足路由要求
3. 限流检查 - 检查请求是否超过限流阈值
4. 熔断检查 - 检查目标服务熔断器状态
5. 负载均衡 - 选择健康的服务实例
6. 请求转发 - 转发请求到目标服务
7. 响应返回 - 返回目标服务的响应

**请求示例**:
```bash
# 假设已配置路由: /api/v1/users/* -> user-service
curl -X GET http://localhost:8080/api/v1/users/123 \
  -H "Authorization: Bearer access_token"
```

**转发逻辑**:
- 网关会将请求转发到 user-service 的 /users/123
- 自动添加必要的请求头和追踪信息
- 记录请求日志和性能指标

---

## 🔧 错误码说明

| 错误码 | 说明 | 常见场景 |
|--------|------|----------|
| `S10000` | 操作成功 | 所有成功请求 |
| `F40001` | 未授权访问 | 缺少或无效的访问令牌 |
| `F40003` | 禁止访问 | 权限不足 |
| `F40400` | 路由未找到 | 请求路径没有匹配的路由规则 |
| `F42900` | 限流超出 | 请求频率超过限制 |
| `F50000` | 系统内部错误 | 服务器内部异常 |
| `F50200` | 上游服务错误 | 目标服务返回错误 |
| `F50300` | 服务不可用 | 目标服务无健康实例 |
| `F50301` | 熔断器开启 | 目标服务熔断保护中 |
| `F50400` | 网关超时 | 请求处理超时 |

## 🛡️ 安全特性

### JWT 认证集成
- 自动验证 JWT 令牌
- 支持令牌黑名单机制
- 与认证服务无缝集成

### 权限控制
- 细粒度的权限验证
- 支持多种权限检查策略（any/all）
- 基于角色的访问控制

### 限流保护
- 多维度限流（用户、IP、API）
- 滑动窗口算法
- 自定义限流规则

### 熔断保护
- 自动故障检测
- 三态熔断器（关闭、开启、半开）
- 可配置的失败阈值和超时时间

## 📝 使用示例

### cURL 示例

**创建路由配置**:
```bash
curl -X POST http://localhost:8080/admin/routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "service_name": "user-service",
    "path_pattern": "/api/v1/users/*",
    "target_url": "/users/*",
    "method": "GET",
    "requires_auth": true,
    "rate_limit_rpm": 500
  }'
```

**注册服务实例**:
```bash
curl -X POST http://localhost:8080/admin/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "service_name": "user-service",
    "instance_id": "user-service-001",
    "host": "192.168.1.100",
    "port": 3001,
    "protocol": "http",
    "weight": 100
  }'
```

**健康检查**:
```bash
curl -X GET http://localhost:8080/health
```

**获取监控指标**:
```bash
curl -X GET http://localhost:8080/metrics
```

### Python 示例

```python
import requests
import json

class APIGatewayClient:
    def __init__(self, base_url="http://localhost:8080", token=None):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json'
        }
        if token:
            self.headers['Authorization'] = f'Bearer {token}'
    
    def create_route(self, route_config):
        """创建路由配置"""
        response = requests.post(
            f"{self.base_url}/admin/routes",
            headers=self.headers,
            json=route_config
        )
        return response.json()
    
    def register_service(self, service_config):
        """注册服务实例"""
        response = requests.post(
            f"{self.base_url}/admin/services",
            headers=self.headers,
            json=service_config
        )
        return response.json()
    
    def health_check(self):
        """健康检查"""
        response = requests.get(f"{self.base_url}/health")
        return response.json()

# 使用示例
client = APIGatewayClient(token="your_admin_token")

# 创建路由
route = client.create_route({
    "service_name": "user-service",
    "path_pattern": "/api/v1/users/*",
    "target_url": "/users/*",
    "method": "GET",
    "requires_auth": True
})
print("路由创建结果:", route)

# 注册服务
service = client.register_service({
    "service_name": "user-service",
    "instance_id": "user-001",
    "host": "localhost",
    "port": 3001
})
print("服务注册结果:", service)
```

### JavaScript 示例

```javascript
// API Gateway 客户端
class APIGatewayClient {
  constructor(baseUrl = 'http://localhost:8080', token = null) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  async createRoute(routeConfig) {
    const response = await fetch(`${this.baseUrl}/admin/routes`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(routeConfig)
    });
    return await response.json();
  }

  async registerService(serviceConfig) {
    const response = await fetch(`${this.baseUrl}/admin/services`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(serviceConfig)
    });
    return await response.json();
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }

  async getMetrics() {
    const response = await fetch(`${this.baseUrl}/metrics`);
    return await response.json();
  }
}

// 使用示例
const client = new APIGatewayClient('http://localhost:8080', 'admin_token');

// 创建路由
client.createRoute({
  service_name: 'user-service',
  path_pattern: '/api/v1/users/*',
  target_url: '/users/*',
  method: 'GET',
  requires_auth: true,
  rate_limit_rpm: 500
}).then(result => {
  console.log('路由创建成功:', result);
});

// 健康检查
client.healthCheck().then(health => {
  console.log('服务状态:', health.content.status);
});
```

## 🔄 负载均衡策略

### round_robin (轮询)
按顺序将请求分发到各个实例

### weighted (权重)
根据实例权重分配请求

### least_connections (最少连接)
将请求发送到连接数最少的实例

## 📊 监控与告警

### 关键指标
- **请求总数**: 网关处理的总请求数
- **错误率**: 错误请求占比
- **平均响应时间**: 请求处理平均耗时
- **活跃路由数**: 当前激活的路由规则数
- **健康实例数**: 各服务的健康实例数

### Prometheus 集成
网关提供 `/metrics` 端点，可直接被 Prometheus 采集

### 建议告警规则
- 错误率 > 5%
- 平均响应时间 > 1000ms
- 健康实例数 < 2
- 熔断器开启

## 🚦 限流规则

### 限流维度
- **用户级别**: 基于用户ID限流
- **IP级别**: 基于客户端IP限流
- **API级别**: 基于API端点限流

### 限流算法
使用滑动窗口算法，精确控制时间窗口内的请求数

### 限流响应
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1641715200
Retry-After: 60

{
  "code": "F42900",
  "msg": "請求過於頻繁，請60秒後重試",
  "content": {}
}
```

## 🔗 相关链接

- **Swagger UI**: http://localhost:8080/swagger-ui
- **项目代码**: `/api_gateway_service/`
- **日志文件**: `/api_gateway_service/logs/`
- **Docker部署**: `docker-compose up -d`

---

*最后更新: 2025-01-09*  
*版本: v1.0.0*