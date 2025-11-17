# API Gateway 使用说明

> 本文档详细说明前端 (clients) 如何通过 API Gateway 访问各个微服务

---

## 📋 目录

- [当前配置状态](#当前配置状态)
- [完整的请求流程](#完整的请求流程)
- [各服务的路由映射](#各服务的路由映射)
- [认证流程详解](#认证流程详解)
- [实际请求示例](#实际请求示例)
- [关键要点总结](#关键要点总结)

---

## 当前配置状态

### ✅ 已完成的配置

#### 1. 环境变量配置 (`.env.development`)

```bash
# API 网关地址 - 本地开发环境
VITE_API_BASE_URL=http://localhost:8080

# WebSocket 地址 - 本地开发环境
VITE_WS_BASE_URL=ws://localhost:8080

# 应用配置
VITE_APP_NAME=Service Ops Platform (Dev)
VITE_APP_VERSION=1.0.0-dev
VITE_ENV=development

# 功能开关
VITE_DEBUG=true
VITE_ENABLE_MOCK=false
VITE_ENABLE_API_LOG=true

# 其他配置
VITE_API_TIMEOUT=10000
VITE_MAX_FILE_SIZE=10
```

#### 2. API 配置文件 (`clients/src/services/api/apiConfig.ts`)

```typescript
export const API_CONFIG = {
  // 基础 URL - 指向 API Gateway
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',

  // WebSocket URL
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080',

  // 超时配置
  TIMEOUT: 10000, // 10秒

  // 认证相关
  AUTH: {
    TOKEN_KEY: 'auth_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    TOKEN_HEADER: 'Authorization',
    TOKEN_PREFIX: 'Bearer ',
  },
};
```

#### 3. HTTP 客户端 (`clients/src/services/api/httpClient.ts`)

核心功能：
- ✅ 自动添加 `Authorization: Bearer <token>` 头部
- ✅ 自动处理 token 过期和刷新
- ✅ 自动处理错误和重试
- ✅ 统一的请求/响应拦截
- ✅ 请求追踪 (X-Request-ID)

---

## 完整的请求流程

### 流程图

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│   前端页面   │ ───> │ API 服务类    │ ───> │  HTTP Client    │ ───> │ API Gateway  │
│  (React)    │      │ (authApi等)  │      │  (axios封装)    │      │  (port 8080) │
└─────────────┘      └──────────────┘      └─────────────────┘      └──────────────┘
                                                                            │
                                                                            │ 路由匹配
                                                                            │ 认证验证
                                                                            │ 限流控制
                                                                            ▼
                                            ┌──────────────────────────────────────────┐
                                            │           根据路径转发到对应微服务          │
                                            └──────────────────────────────────────────┘
                                                            │
                    ┌───────────────────────────────────────┼───────────────────────────────────┐
                    │                                       │                                   │
                    ▼                                       ▼                                   ▼
            ┌──────────────┐                        ┌──────────────┐                  ┌──────────────┐
            │ auth-service │                        │ team-service │                  │ project-...  │
            │ (port 25698) │                        │ (port 25708) │                  │ (port 25707) │
            └──────────────┘                        └──────────────┘                  └──────────────┘
```

### 详细步骤说明

#### 第 1 步：前端发起请求

```typescript
// 例如：登录请求
const LoginPage = () => {
  const handleLogin = async (email: string, password: string) => {
    // 调用 API 服务类
    const result = await authApi.login({ email, password });
    // ...处理结果
  };
};
```

#### 第 2 步：API 服务类构建请求

```typescript
// authApi.ts
async login(data: LoginRequest): Promise<LoginResponse> {
  const response = await httpClient.post<any>(
    '/auth/login',  // 只是路径，不包含域名端口
    data,
    { skipAuth: true }  // 登录接口不需要认证
  );
  return response.content;
}
```

#### 第 3 步：HTTP Client 添加配置

```typescript
// httpClient.ts 请求拦截器自动添加：
{
  baseURL: 'http://localhost:8080',  // 从 API_CONFIG 获取
  url: '/auth/login',                 // 完整URL: http://localhost:8080/auth/login
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>',  // 如果不是 skipAuth
    'X-Request-ID': '<uuid>'            // 请求追踪ID
  }
}
```

#### 第 4 步：API Gateway 处理请求

Gateway 收到请求：`POST http://localhost:8080/auth/login`

##### 4.1 路由匹配（按优先级从高到低）

```python
# 在数据库中查找匹配的路由规则
SELECT * FROM api_routes
WHERE path_pattern = '/auth/login'
  AND method = 'POST'
  AND is_active = TRUE
ORDER BY priority DESC;

# 找到匹配：
{
  "service_name": "auth-service",
  "path_pattern": "/auth/login",
  "target_url": "/auth/login",
  "method": "POST",
  "requires_auth": False,  # 不需要认证
  "rate_limit_rpm": 100,   # 每分钟100次
  "priority": 10
}
```

##### 4.2 认证验证（如果 requires_auth=True）

```python
# Gateway 检查 Authorization 头
if route.requires_auth:
    token = request.headers.get('Authorization')
    if not token or not validate_token(token):
        return 401 Unauthorized
```

##### 4.3 限流检查

```python
# 检查该客户端的请求频率
requests_count = redis.get(f"rate_limit:{client_ip}:{route_id}")
if requests_count > route.rate_limit_rpm:
    return 429 Too Many Requests
```

##### 4.4 负载均衡选择实例

```python
# 从数据库获取 auth-service 的健康实例
SELECT * FROM service_instances
WHERE service_name = 'auth-service'
  AND instance_status = 'healthy'
  AND status = 1;

# 找到：
{
  "host": "localhost",
  "port": 25698,
  "protocol": "http"
}
```

##### 4.5 转发请求

```python
# Gateway 转发到实际服务
target_url = f"{protocol}://{host}:{port}{target_url}"
# 完整URL: http://localhost:25698/auth/login

response = requests.post(
    "http://localhost:25698/auth/login",
    json=request_data,
    headers=request_headers
)
```

#### 第 5 步：微服务处理

```python
# auth_service/app.py
@app.route('/auth/login', methods=['POST'])
def login():
    # 处理登录逻辑
    # 验证用户名密码
    # 生成 JWT token
    return jsonify({
        "code": 200,
        "content": {
            "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "user_info": {...}
        },
        "msg": "登录成功"
    })
```

#### 第 6 步：Gateway 返回响应给前端

```json
{
  "code": 200,
  "content": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user_info": {
      "id": "123",
      "username": "user@example.com"
    }
  },
  "msg": "登录成功"
}
```

#### 第 7 步：前端处理响应

```typescript
// authApi.ts 将后端数据转换为前端格式
const loginResponse = {
  user: transformUser(result.user_info),
  accessToken: result.access_token,
  refreshToken: result.refresh_token,
  expiresIn: result.expires_in,
  permissions: result.permissions
};

// 存储 token
storage.setToken(loginResponse.accessToken);
storage.setRefreshToken(loginResponse.refreshToken);
```

---

## 各服务的路由映射

### 认证服务 (auth-service)

| 前端调用 | 路径 | 转发地址 | 认证 |
|---------|------|---------|------|
| `authApi.login(...)` | `POST /auth/login` | `http://localhost:25698/auth/login` | ❌ |
| `authApi.register(...)` | `POST /auth/register` | `http://localhost:25698/auth/register` | ❌ |
| `authApi.getProfile()` | `GET /auth/profile` | `http://localhost:25698/auth/profile` | ✅ |
| `authApi.logout()` | `POST /auth/logout` | `http://localhost:25698/auth/logout` | ✅ |
| `authApi.changePassword(...)` | `PUT /auth/change-password` | `http://localhost:25698/auth/change-password` | ✅ |

### 团队服务 (team-service)

| 前端调用 | 路径 | 转发地址 | 认证 |
|---------|------|---------|------|
| `teamApi.getTeams()` | `GET /teams` | `http://localhost:25708/teams` | ✅ |
| `teamApi.createTeam(...)` | `POST /teams` | `http://localhost:25708/teams` | ✅ |
| `teamApi.getTeamDetail(id)` | `GET /teams/:id` | `http://localhost:25708/teams/:id` | ✅ |
| `teamApi.updateTeam(id, ...)` | `PUT /teams/:id` | `http://localhost:25708/teams/:id` | ✅ |
| `teamApi.deleteTeam(id)` | `DELETE /teams/:id` | `http://localhost:25708/teams/:id` | ✅ |

### 项目服务 (project-service)

| 前端调用 | 路径 | 转发地址 | 认证 |
|---------|------|---------|------|
| `projectApi.getProjects()` | `GET /projects` | `http://localhost:25707/projects` | ✅ |
| `projectApi.getPublicProjects()` | `GET /projects/discover` | `http://localhost:25707/projects/discover` | ❌ |
| `projectApi.createProject(...)` | `POST /projects` | `http://localhost:25707/projects` | ✅ |
| `projectApi.getProject(id)` | `GET /projects/:id` | `http://localhost:25707/projects/:id` | ✅ |

### 集成服务 (integration-service)

| 前端调用 | 路径 | 转发地址 | 认证 |
|---------|------|---------|------|
| `integrationApi.getWebhooks()` | `GET /integrations/webhooks` | `http://localhost:8093/integrations/webhooks` | ✅ |
| `integrationApi.createWebhook(...)` | `POST /integrations/webhooks` | `http://localhost:8093/integrations/webhooks` | ✅ |
| `integrationApi.getPlugins()` | `GET /integrations/plugins` | `http://localhost:8093/integrations/plugins` | ✅ |
| `integrationApi.installPlugin(...)` | `POST /integrations/plugins/install` | `http://localhost:8093/integrations/plugins/install` | ✅ |

### 其他服务

| 服务名称 | 路径前缀 | 端口 | 说明 |
|---------|---------|------|------|
| permission-service | `/permissions/*` | 25706 | 权限管理服务 |
| architecture-service | `/diagrams/*` | 25701 | 架构设计服务 |
| flow-diagram-service | `/flow-diagrams/*` | 25705 | 流程图设计服务 |
| api-design-service | `/api-specs/*` | 25703 | API设计服务 |
| db-design-service | `/db-designs/*` | 25700 | 数据库设计服务 |
| feature-map-service | `/feature-maps/*` | 25702 | 功能导图服务 |
| collaboration-service | `/collaboration/*` | 25699 | 实时协作服务 |
| version-control-service | `/versions/*` | 25709 | 版本控制服务 |
| file-service | `/files/*` | 25704 | 文件管理服务 |
| notification-service | `/notifications/*` | 8094 | 通知服务 |
| search-service | `/search/*` | 8095 | 搜索服务 |
| audit-service | `/audit/*` | 8091 | 审计服务 |

---

## 认证流程详解

### 携带 Token 的请求

```typescript
// 1. 前端发起需要认证的请求
const profile = await authApi.getProfile();

// 2. httpClient 自动添加 token
headers: {
  'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGc...'
}

// 3. Gateway 验证 token
if route.requires_auth:
    token = extract_token(request)
    if not jwt.verify(token):
        return 401
    request.user_id = token.sub  # 提取用户ID

// 4. Gateway 转发（保留 Authorization 头）
forward_to_service(
    url="http://localhost:25698/auth/profile",
    headers=request.headers  # 包含 Authorization
)

// 5. 微服务再次验证（双重保护）
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    # ... 返回用户信息
```

### Token 过期自动刷新

```typescript
// httpClient.ts 的响应拦截器
if (error.response?.status === 401) {
  // 1. 使用 refresh token 获取新 token
  const newToken = await refreshToken(oldRefreshToken);

  // 2. 更新存储
  storage.setToken(newToken);

  // 3. 重试原始请求（带新 token）
  return httpClient(originalRequest);
}
```

### 认证流程图

```
┌──────────┐
│ 前端请求  │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│ httpClient      │
│ 添加 token      │
└────┬────────────┘
     │
     ▼
┌─────────────────┐       Token 有效      ┌──────────────┐
│ API Gateway     │ ─────────────────────>│  转发到微服务  │
│ 验证 token      │                       └──────────────┘
└────┬────────────┘
     │
     │ Token 无效/过期
     ▼
┌─────────────────┐
│ 返回 401        │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ httpClient      │
│ 自动刷新 token  │
│ 重试请求        │
└─────────────────┘
```

---

## 实际请求示例

### 示例 1：用户登录

```
前端 ───> Gateway ───> auth-service

请求：
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "123456"
}

Gateway 处理：
  ✓ 匹配路由: /auth/login (优先级 10)
  ✓ 不需要认证 (requires_auth=False)
  ✓ 检查限流: 100 rpm ✓
  ✓ 转发到: http://localhost:25698/auth/login

响应：
HTTP/1.1 200 OK
Content-Type: application/json

{
  "code": 200,
  "content": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user_info": {
      "id": "123",
      "username": "user@example.com",
      "email": "user@example.com"
    },
    "permissions": ["user.read", "user.write"],
    "expires_in": 7200
  },
  "msg": "登录成功"
}
```

### 示例 2：获取团队列表

```
前端 ───> Gateway ───> team-service

请求：
GET http://localhost:8080/teams?page=1&limit=10
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

Gateway 处理：
  ✓ 匹配路由: /teams (优先级 8)
  ✓ 验证 token ✓ (requires_auth=True)
  ✓ 提取用户ID: user_123
  ✓ 检查限流: 500 rpm ✓
  ✓ 转发到: http://localhost:25708/teams?page=1&limit=10

响应：
HTTP/1.1 200 OK
Content-Type: application/json

{
  "code": 200,
  "content": {
    "items": [
      {
        "id": "team_1",
        "name": "开发团队",
        "description": "核心开发团队",
        "member_count": 15
      },
      {
        "id": "team_2",
        "name": "产品团队",
        "description": "产品设计团队",
        "member_count": 8
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  },
  "msg": "成功"
}
```

### 示例 3：创建 Webhook

```
前端 ───> Gateway ───> integration-service

请求：
POST http://localhost:8080/integrations/webhooks
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{
  "project_id": "proj_123",
  "name": "GitHub Push Webhook",
  "url": "https://api.github.com/repos/owner/repo/hooks",
  "events": ["push", "pull_request"],
  "secret": "my_secret_key",
  "is_active": true
}

Gateway 处理：
  ✓ 匹配路由: /integrations/webhooks (优先级 8)
  ✓ 验证 token ✓
  ✓ 检查限流: 100 rpm ✓
  ✓ 转发到: http://localhost:8093/integrations/webhooks

响应：
HTTP/1.1 201 Created
Content-Type: application/json

{
  "code": 201,
  "content": {
    "id": "webhook_456",
    "project_id": "proj_123",
    "name": "GitHub Push Webhook",
    "url": "https://api.github.com/repos/owner/repo/hooks",
    "events": ["push", "pull_request"],
    "is_active": true,
    "created_at": "2025-01-17T10:30:00Z"
  },
  "msg": "Webhook 创建成功"
}
```

### 示例 4：Token 过期自动刷新

```
1. 前端请求（token 已过期）
GET http://localhost:8080/auth/profile
Authorization: Bearer <expired_token>

2. Gateway 验证失败
HTTP/1.1 401 Unauthorized
{
  "code": 401,
  "msg": "Token已过期"
}

3. httpClient 自动刷新
POST http://localhost:8080/auth/refresh
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

4. 获取新 token
HTTP/1.1 200 OK
{
  "code": 200,
  "content": {
    "access_token": "<new_token>",
    "refresh_token": "<new_refresh_token>",
    "expires_in": 7200
  }
}

5. httpClient 自动重试原始请求
GET http://localhost:8080/auth/profile
Authorization: Bearer <new_token>

6. 成功获取数据
HTTP/1.1 200 OK
{
  "code": 200,
  "content": {
    "user_info": {...}
  }
}
```

---

## 关键要点总结

### 1. 统一入口

- ✅ 前端只需要知道 Gateway 地址 (`localhost:8080`)
- ✅ 不需要知道各个微服务的具体端口
- ✅ 不需要管理多个服务的连接

### 2. 路径即服务

路径前缀自动映射到对应服务：

```
/auth/*          → auth-service (25698)
/teams/*         → team-service (25708)
/projects/*      → project-service (25707)
/permissions/*   → permission-service (25706)
/diagrams/*      → architecture-service (25701)
/flow-diagrams/* → flow-diagram-service (25705)
/api-specs/*     → api-design-service (25703)
/db-designs/*    → db-design-service (25700)
/feature-maps/*  → feature-map-service (25702)
/collaboration/* → collaboration-service (25699)
/versions/*      → version-control-service (25709)
/files/*         → file-service (25704)
/integrations/*  → integration-service (8093)
/notifications/* → notification-service (8094)
/search/*        → search-service (8095)
/audit/*         → audit-service (8091)
```

### 3. 自动认证

- ✅ httpClient 自动添加 token
- ✅ Gateway 自动验证 token
- ✅ Token 过期自动刷新
- ✅ 微服务二次验证（双重保护）

### 4. 透明转发

- ✅ 前端感知不到微服务的存在
- ✅ Gateway 自动路由到正确的服务
- ✅ 响应原样返回给前端
- ✅ 错误统一处理

### 5. 内置保护机制

- ✅ **限流控制**: 防止滥用（每个路由独立配置）
- ✅ **熔断机制**: 服务故障时自动熔断
- ✅ **负载均衡**: 多实例自动分发
- ✅ **健康检查**: 自动剔除不健康实例
- ✅ **请求追踪**: X-Request-ID 全链路追踪

### 6. 配置状态

当前配置完整度：**100% ✅**

- ✅ 前端已配置指向 Gateway (8080)
- ✅ Gateway 已配置 16 个微服务
- ✅ 42 条路由规则已配置
- ✅ 所有服务实例已注册
- ✅ 认证、限流、负载均衡已启用

---

## 启动步骤

### 1. 启动 API Gateway

```bash
cd /Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service
python app.py
```

服务将在 `http://localhost:8080` 启动

### 2. 初始化路由配置（首次运行）

```bash
cd /Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service
python init_gateway_routes.py
```

这将注册：
- 16 个微服务实例
- 42 条路由规则

### 3. 启动各个微服务

```bash
# 认证服务
cd auth_service && python app.py

# 团队服务
cd team_service && python app.py

# 项目服务
cd project_service && python app.py

# ... 其他服务
```

### 4. 启动前端

```bash
cd clients
npm install
npm run dev
```

前端将在 `http://localhost:5173` 启动

### 5. 验证系统

访问前端应用，所有请求会自动通过 Gateway 路由到正确的微服务！

---

## 监控和调试

### 查看路由配置

```bash
# 访问 Gateway 管理接口
curl http://localhost:8080/admin/routes
```

### 查看服务实例

```bash
# 访问 Gateway 管理接口
curl http://localhost:8080/admin/services
```

### 检查服务健康状态

```bash
cd /Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service
bash check_services.sh
```

### 查看请求日志

前端开发模式下，所有请求/响应会在浏览器控制台显示：

```
🚀 API Request: POST /auth/login
✅ API Response: 200 OK
```

Gateway 日志会显示：

```
[INFO] Incoming request: POST /auth/login
[INFO] Matched route: auth-service (priority: 10)
[INFO] Forwarding to: http://localhost:25698/auth/login
[INFO] Response: 200 OK (125ms)
```

---

## 常见问题

### Q: 前端需要配置多个服务地址吗？

**A:** 不需要！前端只配置一个 Gateway 地址 (`http://localhost:8080`)，所有请求都发送到这个地址。

### Q: 如何知道请求会转发到哪个服务？

**A:** Gateway 根据路径前缀自动匹配，例如 `/auth/*` → auth-service，`/teams/*` → team-service。

### Q: Token 过期怎么办？

**A:** httpClient 会自动检测 401 错误，使用 refresh token 获取新 token，然后重试原始请求，前端代码无需处理。

### Q: 如何添加新的微服务？

**A:**
1. 在 `init_gateway_routes.py` 的 `SERVICES` 中添加服务信息
2. 在 `ROUTES` 中添加路由规则
3. 运行 `python init_gateway_routes.py` 更新配置

### Q: 如何修改限流配置？

**A:** 在数据库中修改 `api_routes` 表的 `rate_limit_rpm` 字段，或者修改 `init_gateway_routes.py` 后重新运行。

---

## 附录：完整服务端口列表

| # | 服务名称 | 目录名 | 端口 | 状态 | 说明 |
|---|---------|--------|------|------|------|
| 0 | api-gateway | api_gateway_service | 8080 | ✅ 必需 | API 网关 |
| 1 | auth-service | auth_service | 25698 | ✅ 必需 | 认证授权服务 |
| 2 | team-service | team_service | 25708 | ✅ 必需 | 团队管理服务 |
| 3 | project-service | project_service | 25707 | ✅ 必需 | 项目管理服务 |
| 4 | permission-service | permission_service | 25706 | ✅ 必需 | 权限管理服务 |
| 5 | architecture-service | architecture_service | 25701 | ⚙️ 可选 | 架构设计服务 |
| 6 | flow-diagram-service | flow_diagram_service | 25705 | ⚙️ 可选 | 流程图设计服务 |
| 7 | api-design-service | api_design_service | 25703 | ⚙️ 可选 | API设计服务 |
| 8 | db-design-service | db_design_service | 25700 | ⚙️ 可选 | 数据库设计服务 |
| 9 | feature-map-service | feature_map_service | 25702 | ⚙️ 可选 | 功能导图服务 |
| 10 | collaboration-service | collaboration_service | 25699 | ⚙️ 可选 | 实时协作服务 |
| 11 | version-control-service | version_control_service | 25709 | ⚙️ 可选 | 版本控制服务 |
| 12 | file-service | file_service | 25704 | ⚙️ 可选 | 文件管理服务 |
| 13 | notification-service | notification_service | 8094 | ⚙️ 可选 | 通知服务 |
| 14 | search-service | search_service | 8095 | ⚙️ 可选 | 搜索服务 |
| 15 | audit-service | audit_service | 8091 | ⚙️ 可选 | 审计服务 |
| 16 | integration-service | integration_service | 8093 | ⚙️ 可选 | 集成服务 |

---

**文档版本**: v1.0
**更新时间**: 2025-01-17
**维护者**: Development Team
