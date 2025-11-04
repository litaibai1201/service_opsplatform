# API Gateway Service

基于 Flask 构建的 API 网关服务，提供统一入口、路由转发、令牌验证、限流熔断、请求聚合、权限预检等功能。

## 功能特性

### 🌐 核心网关功能
- **智能路由转发** - 基于配置的动态路由匹配和转发
- **负载均衡** - 支持轮询、权重、最少连接等多种策略
- **服务发现** - 自动化服务注册和健康检查
- **API版本管理** - 支持多版本API并存

### 🛡️ 安全特性
- **JWT认证集成** - 与认证服务无缝集成
- **权限验证** - 细粒度的权限控制系统
- **限流保护** - 多维度限流策略（IP、用户、API）
- **熔断保护** - 自动故障检测和服务保护

### 📊 监控与观测
- **请求日志** - 详细的API调用追踪
- **监控指标** - Prometheus格式的监控数据
- **健康检查** - 服务和依赖健康状态监控
- **错误追踪** - 统一的错误处理和报告

### 🔧 运维特性
- **动态配置** - 运行时路由配置更新
- **批量操作** - 支持批量服务注册和配置
- **管理界面** - 基于Swagger的管理API
- **缓存支持** - Redis缓存集成

## 项目结构

```
api_gateway_service/
├── app.py                      # 应用程序入口
├── requirements.txt            # 依赖包列表
├── README.md                   # 项目说明
├── common/                     # 通用工具
│   ├── __init__.py
│   ├── common_method.py        # 响应构建方法
│   └── common_tools.py         # 通用工具类
├── configs/                    # 配置文件
│   ├── __init__.py
│   ├── app_config.py           # 应用配置
│   ├── constant.py             # 常量配置
│   ├── db_config.py            # 数据库配置
│   ├── log_conf.py             # 日志配置
│   └── secrets.py              # 密钥配置
├── controllers/                # 控制器层
│   ├── __init__.py
│   └── gateway_controller.py   # 网关控制器
├── dbs/                        # 数据库层
│   └── mysql_db/
│       ├── __init__.py         # 数据库初始化
│       └── model_tables.py     # 数据模型
├── models/                     # 模型操作层
│   ├── __init__.py
│   └── gateway_model.py        # 网关模型操作
├── serializes/                 # 序列化层
│   ├── __init__.py
│   ├── gateway_serialize.py    # 网关序列化器
│   └── response_serialize.py   # 响应序列化器
├── views/                      # 视图层
│   ├── __init__.py
│   └── gateway_api.py          # 网关API
├── middleware/                 # 中间件
│   ├── __init__.py
│   └── gateway_middleware.py   # 网关中间件
├── loggers/                    # 日志模块
│   ├── __init__.py
│   └── write_log.py            # 日志配置
├── logs/                       # 日志文件
│   ├── critical/
│   ├── error/
│   ├── info/
│   └── warn/
└── cache/                      # 缓存模块
    └── __init__.py             # Redis 客户端
```

## 快速开始

### 1. 环境要求
- Python 3.8+
- MySQL 5.7+
- Redis 6.0+

### 2. 安装依赖
```bash
pip install -r requirements.txt
```

### 3. 环境变量配置
创建 `.env` 文件或设置系统环境变量：

```bash
# 数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=api_gateway

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 网关配置
GATEWAY_DEFAULT_TIMEOUT=30
GATEWAY_MAX_RETRY_COUNT=3
CIRCUIT_BREAKER_THRESHOLD=5
DEFAULT_RATE_LIMIT_RPM=1000

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
```

### 4. 数据库初始化
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE api_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行应用（会自动创建表）
python app.py
```

### 5. 启动服务
```bash
python app.py
```

服务将在 http://localhost:8080 启动

### 6. API 文档
访问 Swagger UI 文档：http://localhost:8080/swagger-ui

## API 接口

### 基础设施接口
- `GET /health` - 健康检查
- `GET /metrics` - 监控指标（Prometheus格式）

### 管理接口（需要管理员权限）
- `GET /admin/routes` - 获取路由配置
- `POST /admin/routes` - 创建路由配置
- `PUT /admin/routes/{id}` - 更新路由配置
- `DELETE /admin/routes/{id}` - 删除路由配置
- `GET /admin/services` - 获取服务实例列表
- `POST /admin/services` - 注册服务实例
- `GET /admin/permissions` - 获取权限配置

### 动态路由
- `/*` - 智能路由转发到对应微服务

## 使用示例

### 创建路由配置
```bash
curl -X POST http://localhost:8080/admin/routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "service_name": "user-service",
    "path_pattern": "/api/v1/users/*",
    "target_url": "/users/*",
    "method": "ANY",
    "requires_auth": true,
    "rate_limit_rpm": 500
  }'
```

### 注册服务实例
```bash
curl -X POST http://localhost:8080/admin/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "service_name": "user-service",
    "instance_id": "user-service-1",
    "host": "localhost",
    "port": 3001,
    "protocol": "http",
    "weight": 100
  }'
```

### 通过网关访问服务
```bash
curl -X GET http://localhost:8080/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 数据库模型

### API路由配置表 (api_routes)
- 路由规则定义
- 目标服务配置
- 权限和限流设置

### 服务实例表 (service_instances)
- 服务注册信息
- 健康检查配置
- 负载均衡权重

### API调用日志表 (api_call_logs)
- 请求响应记录
- 性能监控数据
- 错误追踪信息

### 限流记录表 (rate_limit_records)
- 限流计数器
- 时间窗口管理

## 配置说明

### 路由配置
- `path_pattern`: 路由匹配模式
- `target_url`: 目标服务URL
- `requires_auth`: 是否需要认证
- `rate_limit_rpm`: 每分钟请求限制
- `circuit_breaker_enabled`: 是否启用熔断器

### 负载均衡策略
- `round_robin`: 轮询
- `weighted`: 权重分配
- `least_connections`: 最少连接数

### 熔断器配置
- `failure_threshold`: 失败阈值
- `timeout_seconds`: 熔断超时时间
- `recovery_timeout`: 恢复超时时间

## 监控指标

### Prometheus 指标
- `gateway_requests_total`: 总请求数
- `gateway_errors_total`: 错误请求数
- `gateway_response_time_ms`: 平均响应时间
- `gateway_active_routes`: 活跃路由数
- `gateway_healthy_instances`: 健康实例数

## 错误代码

| 代码 | 说明 |
|------|------|
| S10000 | 成功 |
| F40400 | 路由未找到 |
| F42900 | 限流超出 |
| F50300 | 服务不可用 |
| F50301 | 熔断器开启 |
| F50400 | 网关超时 |

## 开发指南

### 扩展开发
1. 添加新的中间件到 `middleware/` 目录
2. 实现自定义负载均衡策略
3. 扩展监控指标收集
4. 添加新的认证方式

### 代码风格
项目遵循与 auth_service 一致的代码风格：
- 使用繁体中文注释
- MVC 架构分层
- 统一的错误处理机制
- 单例模式控制器
- 事务管理装饰器

## 部署建议

### 生产环境配置
- 使用 Gunicorn 或 uWSGI 作为 WSGI 服务器
- 配置 Nginx 反向代理
- 启用 SSL/TLS 加密
- 设置适当的日志轮转

### 高可用部署
- 多实例部署
- 使用外部 Redis 集群
- 数据库读写分离
- 监控告警配置

## 许可证

MIT License

## 维护团队

LiDong - 2025-01-09