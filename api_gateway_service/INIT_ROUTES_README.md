# API Gateway 路由初始化指南

## 📋 概述

`init_gateway_routes.py` 是一个批量初始化 API Gateway 路由和服务实例的脚本，根据设计文档自动配置所有微服务的路由规则。

## 🎯 功能特点

- ✅ **自动注册服务实例**: 一键注册所有微服务到 Gateway
- ✅ **批量配置路由**: 根据设计文档批量创建路由规则
- ✅ **智能优先级**: 精确路由优先于通配符路由
- ✅ **限流配置**: 为每个接口设置合理的限流策略
- ✅ **认证控制**: 区分公开接口和需认证接口
- ✅ **数据验证**: 自动验证插入的数据完整性

## 📦 已配置的服务

脚本会自动注册以下 15 个微服务：

| 服务名称 | 端口 | 说明 |
|---------|------|------|
| auth-service | 8000 | 认证授权服务 |
| team-service | 8001 | 团队管理服务 |
| project-service | 8002 | 项目管理服务 |
| permission-service | 8003 | 权限管理服务 |
| architecture-service | 8004 | 架构设计服务 |
| flow-diagram-service | 8005 | 流程图设计服务 |
| api-design-service | 8006 | API设计服务 |
| db-design-service | 8007 | 数据库设计服务 |
| feature-map-service | 8008 | 功能导图服务 |
| collaboration-service | 8009 | 实时协作服务 |
| version-control-service | 8010 | 版本控制服务 |
| file-service | 8011 | 文件管理服务 |
| notification-service | 8012 | 通知服务 |
| search-service | 8013 | 搜索服务 |
| audit-service | 8014 | 审计服务 |

## 🛣️ 路由配置说明

### 认证服务路由 (auth-service)

**公开接口（不需要认证）**:
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /auth/check-username/*` - 检查用户名可用性
- `GET /auth/check-email/*` - 检查邮箱可用性
- `POST /auth/forgot-password` - 忘记密码
- `POST /auth/reset-password` - 重置密码

**需要认证的接口**:
- `GET /auth/profile` - 获取用户信息
- `PUT /auth/profile` - 更新用户信息
- `POST /auth/logout` - 用户登出
- `POST /auth/refresh` - 刷新令牌
- `PUT /auth/change-password` - 修改密码

**通配符路由**:
- `ANY /auth/*` - 其他所有认证接口

### 其他服务路由

所有其他服务使用通配符路由，例如：
- `ANY /teams/*` - 团队服务所有接口
- `ANY /projects/*` - 项目服务所有接口
- `ANY /diagrams/*` - 架构设计服务所有接口
- 等等...

## 🚀 使用方法

### 前置条件

1. **MySQL 数据库已启动**
   ```bash
   # 确保数据库配置正确
   vim configs/db_config.py
   ```

2. **API Gateway 已正确配置**
   ```bash
   # 检查配置文件
   vim configs/app_config.py
   ```

### 执行步骤

1. **进入 Gateway 目录**
   ```bash
   cd /Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service
   ```

2. **运行初始化脚本**
   ```bash
   python init_gateway_routes.py
   ```

3. **查看输出信息**
   ```
   ================================================================================
   🚀 API Gateway 路由初始化脚本
   ================================================================================

   ⚠️  是否清空现有数据？(y/N): n

   📦 开始插入服务实例...
   ✅ 成功插入服务实例: auth-service (localhost:8000)
   ✅ 成功插入服务实例: team-service (localhost:8001)
   ...

   📊 服务实例插入完成: 成功 15/15

   🛣️  开始插入路由配置...
   ✅ 🔓 公开 [10] POST   /auth/register                            -> auth-service
   ✅ 🔓 公开 [10] POST   /auth/login                               -> auth-service
   ...

   📊 路由配置插入完成: 成功 XX/XX

   🔍 验证插入的数据...
   📦 服务实例总数: 15
   🛣️  路由配置总数: XX

   📊 各服务路由统计:
      - auth-service: 12 条路由
      - team-service: 3 条路由
      ...

   ================================================================================
   ✅ 初始化完成!
   📦 服务实例: 15 个
   🛣️  路由配置: XX 条
   ================================================================================
   ```

## ⚙️ 自定义配置

### 修改服务端口

编辑 `init_gateway_routes.py` 中的 `SERVICES` 配置：

```python
SERVICES = [
    {
        "service_name": "auth-service",
        "instance_id": "auth-service-001",
        "host": "localhost",
        "port": 8000,  # 修改端口
        "protocol": "http",
        "weight": 100,
        "health_check_url": "/health",
        "description": "认证授权服务"
    },
    # ...
]
```

### 添加新路由

在 `ROUTES` 列表中添加新的路由配置：

```python
ROUTES = [
    # ...
    {
        "service_name": "your-service",
        "path_pattern": "/your-path",
        "target_url": "/your-path",
        "method": "GET",  # GET/POST/PUT/DELETE/ANY
        "requires_auth": True,  # 是否需要认证
        "rate_limit_rpm": 100,  # 每分钟请求限制
        "priority": 8,  # 优先级（数字越大优先级越高）
        "description": "接口描述"
    },
    # ...
]
```

### 修改限流策略

修改 `rate_limit_rpm` 参数：

```python
{
    "service_name": "auth-service",
    "path_pattern": "/auth/login",
    "target_url": "/auth/login",
    "method": "POST",
    "requires_auth": False,
    "rate_limit_rpm": 100,  # 修改这里
    "priority": 10,
}
```

## 🔍 验证配置

### 1. 查看所有服务实例

```bash
curl -X GET http://localhost:8080/admin/services
```

### 2. 查看所有路由配置

```bash
curl -X GET http://localhost:8080/admin/routes
```

### 3. 测试路由转发

```bash
# 测试登录接口（通过 Gateway）
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 4. 检查数据库

```sql
-- 查看服务实例
SELECT service_name, host, port, instance_status
FROM service_instances
WHERE status = 1;

-- 查看路由配置
SELECT service_name, method, path_pattern, requires_auth, priority
FROM api_routes
WHERE status = 1
ORDER BY priority DESC, service_name;

-- 按服务统计路由数量
SELECT service_name, COUNT(*) as route_count
FROM api_routes
WHERE status = 1
GROUP BY service_name;
```

## 🔧 故障排查

### 问题 1: 数据库连接失败

**错误信息**:
```
❌ 发生错误: (2003, "Can't connect to MySQL server...")
```

**解决方法**:
1. 检查 MySQL 是否运行: `mysql -u root -p`
2. 检查数据库配置: `configs/db_config.py`
3. 确认数据库已创建: `CREATE DATABASE api_gateway;`

### 问题 2: 导入模块失败

**错误信息**:
```
ModuleNotFoundError: No module named 'xxx'
```

**解决方法**:
```bash
pip install -r requirements.txt
```

### 问题 3: 重复插入数据

**错误信息**:
```
⚠️  服务实例已存在: auth-service - auth-service-001
```

**解决方法**:
- 这是正常提示，脚本会跳过已存在的数据
- 如需重新插入，运行时选择清空现有数据 (y)

### 问题 4: 权限不足

**错误信息**:
```
❌ 插入服务实例失败: Access denied for user...
```

**解决方法**:
```sql
-- 授予权限
GRANT ALL PRIVILEGES ON api_gateway.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

## 📊 配置效果

初始化完成后，API Gateway 会自动：

1. ✅ **统一入口**: 前端只需访问 `http://localhost:8080`
2. ✅ **智能路由**: 根据 URL 自动转发到对应的微服务
3. ✅ **负载均衡**: 支持多实例自动负载均衡
4. ✅ **限流保护**: 自动限制请求频率
5. ✅ **认证验证**: 统一的 JWT 验证
6. ✅ **熔断保护**: 服务故障自动熔断

## 🔄 更新配置

如需更新配置：

1. 修改 `init_gateway_routes.py` 中的配置
2. 重新运行脚本（选择清空现有数据）
3. 或者通过 API 接口更新：

```bash
# 更新路由
curl -X PUT http://localhost:8080/admin/routes/{route_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rate_limit_rpm": 200
  }'

# 更新服务实例
curl -X PUT http://localhost:8080/admin/services/{instance_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "weight": 150
  }'
```

## 💡 最佳实践

1. **开发环境**: 使用脚本快速初始化
2. **生产环境**:
   - 先在测试环境验证
   - 备份现有配置
   - 分批更新路由
   - 监控服务健康状态

3. **定期维护**:
   - 清理过期的路由配置
   - 更新服务实例状态
   - 优化限流策略
   - 分析请求日志

## 📚 相关文档

- [API Gateway README](README.md)
- [API 接口文档](API_DOCUMENTATION.md)
- [设计方案](../design_files/软件服务管理平台设计方案--终版.md)

## 🆘 获取帮助

如有问题，请：
1. 查看脚本输出的错误信息
2. 检查数据库日志
3. 查看 Gateway 日志文件: `logs/`
4. 联系开发团队

---

**最后更新**: 2025-01-15
**维护者**: AI Assistant
