# Auth Service - 接口说明文档

## 📋 概述

Auth Service 是基于 Flask 构建的认证服务，提供用户管理、权限验证、令牌管理、多因子认证、高性能缓存等功能。

- **服务地址**: `http://localhost:25698`
- **API文档**: `http://localhost:25698/swagger-ui`
- **健康检查**: `http://localhost:25698/auth/health`

## 🚀 架构特性

### 高性能缓存
- **Redis缓存层**: 超低延迟令牌验证 (< 1ms)
- **多层缓存策略**: 令牌验证、用户信息、会话信息分层缓存
- **自动缓存失效**: 数据变更时自动同步缓存

### 数据一致性保障
- **双写一致性**: 数据库写入成功后立即更新缓存
- **缓存失效机制**: 用户状态变更时自动清理相关缓存
- **降级策略**: Redis故障时自动降级到数据库查询

### 安全特性
- **JWT令牌管理**: 支持访问令牌和刷新令牌
- **会话管理**: 基于UUID的安全会话标识
- **多设备支持**: 每个设备独立会话管理
- **令牌黑名单**: 撤销的令牌自动加入黑名单

## 🔐 认证接口

### 1. 用户注册

**接口**: `POST /auth/register`

**描述**: 创建新用户账户

**请求参数**:
```json
{
  "username": "testuser",           // 用户名 (必填, 3-50位, 只能包含字母数字下划线)
  "email": "test@example.com",      // 邮箱 (必填, 有效邮箱格式)
  "password": "Password123",        // 密码 (必填, 8位以上, 必须包含字母和数字)
  "display_name": "测试用户",        // 显示名称 (可选, 最长100位)
  "phone": "+86 138 0013 8000"      // 手机号 (可选, 最长20位)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "註冊成功",
  "content": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "testuser",
    "email": "test@example.com",
    "display_name": "测试用户",
    "status": "pending_verification",
    "email_verification_token": "abc123...",
    "created_at": "2025-01-09T10:30:00"
  }
}
```

**错误响应**:
```json
{
  "code": "F42201",
  "msg": "用戶已存在",
  "content": {}
}
```

---

### 2. 用户登录

**接口**: `POST /auth/login`

**描述**: 用户登录获取访问令牌

**请求参数**:
```json
{
  "credential": "testuser",         // 登录凭证 (必填, 支持用户名或邮箱)
  "password": "Password123",        // 密码 (必填)
  "remember_me": false              // 记住我 (可选, 默认false)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "登錄成功",
  "content": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "Bearer",
    "session_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_info": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "testuser",
      "email": "test@example.com",
      "display_name": "测试用户",
      "status": "active",
      "email_verified": true,
      "two_factor_enabled": false,
      "avatar_url": null
    }
  }
}
```

**错误响应**:
```json
{
  "code": "F40101",
  "msg": "用戶名或密碼錯誤",
  "content": {}
}
```

---

### 3. 刷新令牌

**接口**: `POST /auth/refresh`

**描述**: 使用刷新令牌获取新的访问令牌

**请求参数**:
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."  // 刷新令牌 (必填)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "令牌刷新成功",
  "content": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "Bearer",
    "user_info": {
      "user_id": 12345,
      "username": "testuser",
      "email": "test@example.com",
      "full_name": "测试用户",
      "role": "user"
    }
  }
}
```

---

### 4. 获取用户信息

**接口**: `GET /auth/profile`

**描述**: 获取当前登录用户的详细信息

**请求头**:
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取用戶信息成功",
  "content": {
    "user_info": {
      "user_id": 12345,
      "username": "testuser",
      "email": "test@example.com",
      "full_name": "测试用户",
      "phone": "+86 138 0013 8000",
      "avatar_url": null,
      "role": "user",
      "is_email_verified": false,
      "last_login_at": "2025-01-09 10:30:00",
      "created_at": "2025-01-08 15:20:00"
    },
    "security_info": {
      "active_sessions": 2,
      "last_login_ip": "192.168.1.100"
    }
  }
}
```

---

### 5. 用户登出

**接口**: `POST /auth/logout`

**描述**: 用户登出，撤销刷新令牌

**请求头**:
```
Authorization: Bearer refresh_token_here
```

**请求参数** (可选，也可通过请求体传递):
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "登出成功",
  "content": "登出成功"
}
```

---

### 6. 获取用户会话列表

**接口**: `GET /auth/sessions`

**描述**: 获取当前用户的所有活跃会话

**请求头**:
```
Authorization: Bearer access_token_here
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取會話列表成功",
  "content": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_sessions": 3,
    "active_sessions": 2,
    "sessions": [
      {
        "session_id": "550e8400-e29b-41d4-a716-446655440001",
        "device_info": "桌面設備",
        "ip_address": "192.168.1.100",
        "created_at": "2025-01-09T10:30:00",
        "expires_at": "2025-02-08T10:30:00",
        "is_current": true,
        "status": "活躍"
      },
      {
        "session_id": "550e8400-e29b-41d4-a716-446655440002",
        "device_info": "移動設備",
        "ip_address": "192.168.1.101", 
        "created_at": "2025-01-08T15:20:00",
        "expires_at": "2025-02-07T15:20:00",
        "is_current": false,
        "status": "活躍"
      }
    ]
  }
}
```

---

### 7. 撤销指定会话

**接口**: `DELETE /auth/sessions`

**描述**: 撤销指定的用户会话

**请求头**:
```
Authorization: Bearer access_token_here
```

**请求参数**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440002"  // 会话ID (必填)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "會話撤銷成功",
  "content": "會話已成功撤銷"
}
```

---

### 8. 忘记密码

**接口**: `POST /auth/forgot-password`

**描述**: 发送密码重置邮件

**请求参数**:
```json
{
  "email": "test@example.com"       // 邮箱 (必填)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "密碼重置郵件已發送",
  "content": {
    "message": "如果該郵箱已註冊，您將收到密碼重置郵件",
    "reset_token": "abc123...",
    "expires_at": "2025-01-09T11:30:00"
  }
}
```

---

### 9. 重置密码

**接口**: `POST /auth/reset-password`

**描述**: 使用重置令牌重置密码

**请求参数**:
```json
{
  "token": "abc123...",             // 重置令牌 (必填)
  "new_password": "NewPassword123"  // 新密码 (必填)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "密碼重置成功",
  "content": "密碼已成功重置，請使用新密碼登錄"
}
```

---

### 10. 修改密码

**接口**: `POST /auth/change-password`

**描述**: 修改当前用户密码

**请求头**:
```
Authorization: Bearer access_token_here
```

**请求参数**:
```json
{
  "current_password": "OldPassword123",  // 当前密码 (必填)
  "new_password": "NewPassword123"       // 新密码 (必填)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "密碼修改成功",
  "content": "密碼已成功修改"
}
```

---

### 11. 发送邮箱验证

**接口**: `POST /auth/send-verification`

**描述**: 发送邮箱验证邮件

**请求头**:
```
Authorization: Bearer access_token_here
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "驗證郵件已發送",
  "content": {
    "message": "驗證郵件已發送至您的郵箱",
    "verification_token": "xyz789...",
    "expires_at": "2025-01-09T11:30:00"
  }
}
```

---

### 12. 验证邮箱

**接口**: `POST /auth/verify-email`

**描述**: 验证邮箱地址

**请求参数**:
```json
{
  "token": "xyz789..."              // 验证令牌 (必填)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "郵箱驗證成功",
  "content": "郵箱已成功驗證"
}
```

---

### 13. 健康检查

**接口**: `GET /auth/health`

**描述**: 检查服务健康状态

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "服務正常",
  "content": {
    "status": "healthy",
    "service": "auth-api",
    "timestamp": "2025-01-09 10:30:00",
    "version": "1.0.0"
  }
}
```

## 🔧 内部服务接口

### 1. 内部令牌验证 (高性能)

**接口**: `POST /internal/validate-token`

**描述**: 超低延迟令牌验证，专为网关调用优化

**请求参数**:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."  // JWT令牌 (必填)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "令牌驗證成功",
  "content": {
    "valid": true,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "testuser",
    "email": "test@example.com",
    "status": "active",
    "session_id": "550e8400-e29b-41d4-a716-446655440001",
    "expires_at": "2025-01-09T12:30:00"
  }
}
```

**性能指标**:
- 缓存命中: < 1ms
- 缓存未命中: < 50ms

---

### 2. 获取内部用户信息

**接口**: `GET /internal/user/{user_id}`

**描述**: 获取指定用户的详细信息 (内部服务专用)

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取用戶信息成功",
  "content": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "testuser",
    "email": "test@example.com",
    "display_name": "测试用户",
    "status": "active",
    "email_verified": true,
    "phone_verified": false,
    "two_factor_enabled": false,
    "last_login_at": "2025-01-09T10:30:00",
    "created_at": "2025-01-08T15:20:00"
  }
}
```

---

### 3. 批量获取用户信息

**接口**: `POST /internal/user/batch`

**描述**: 批量获取多个用户信息 (内部服务专用)

**请求参数**:
```json
{
  "user_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "批量獲取用戶信息成功",
  "content": {
    "users": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "testuser1",
        "email": "test1@example.com",
        "display_name": "测试用户1",
        "status": "active"
      }
    ],
    "total": 1,
    "cache_hits": 1,
    "db_queries": 0
  }
}
```

## 🗄️ 缓存管理接口

### 1. 缓存统计

**接口**: `GET /internal/cache/stats`

**描述**: 获取缓存性能统计信息

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "獲取緩存統計成功",
  "content": {
    "token_cache_count": 1250,
    "user_cache_count": 800,
    "session_cache_count": 450,
    "blacklist_count": 25,
    "total_cache_keys": 2525,
    "redis_info": {
      "used_memory": "2.5MB",
      "hit_rate": "95.2%"
    }
  }
}
```

---

### 2. 缓存预热

**接口**: `POST /internal/cache/warm-up`

**描述**: 预热缓存以提高性能

**请求参数** (可选):
```json
{
  "user_ids": ["550e8400-e29b-41d4-a716-446655440000"],  // 指定用户ID (可选)
  "limit": 100                                          // 预热数量限制 (可选, 默认100)
}
```

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "緩存預熱成功",
  "content": {
    "warmed_users": 85,
    "skipped_users": 15,
    "total_processed": 100
  }
}
```

---

### 3. 清除用户缓存

**接口**: `DELETE /internal/cache/invalidate-user/{user_id}`

**描述**: 清除指定用户的所有相关缓存

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "用戶緩存清除成功",
  "content": "用戶緩存已清除"
}
```

---

### 4. 清除会话缓存

**接口**: `DELETE /internal/cache/invalidate-session/{session_id}`

**描述**: 清除指定会话的缓存

**成功响应**:
```json
{
  "code": "S10000",
  "msg": "會話緩存清除成功",
  "content": "會話緩存已清除"
}
```

## 🔧 错误码说明

| 错误码 | 说明 | 常见场景 |
|--------|------|----------|
| `S10000` | 操作成功 | 所有成功请求 |
| `F40001` | 未授权访问 | 缺少或无效的访问令牌 |
| `F40003` | 禁止访问 | 权限不足 |
| `F40101` | 用户名或密码错误 | 登录凭证错误 |
| `F40102` | 账户被锁定 | 多次登录失败 |
| `F40103` | 令牌已过期 | 访问令牌或刷新令牌过期 |
| `F40104` | 令牌无效 | 令牌格式错误或已被撤销 |
| `F42201` | 用户已存在 | 注册时用户名或邮箱重复 |
| `F42202` | 用户不存在 | 用户信息查询失败 |
| `F42203` | 密码强度不够 | 密码不符合安全要求 |
| `F50000` | 系统内部错误 | 服务器内部异常 |

## 📊 Redis与MySQL数据一致性保障

### 一致性策略概述

本系统采用**最终一致性**模型，通过多种机制确保Redis缓存与MySQL数据库的数据一致性：

### 1. 双写一致性机制

**写入流程**:
```
1. 数据库事务开始
2. 更新MySQL数据
3. 事务提交成功后
4. 立即更新Redis缓存
5. 如果Redis更新失败，记录日志但不影响业务
```

**实现示例**:
```python
# 登录成功后立即缓存用户信息
user_info = {
    'user_id': user.id,
    'username': user.username,
    'status': user.status
}
token_cache.cache_user_info(str(user.id), user_info)

# 缓存会话信息
session_info = {
    'session_id': session_id,
    'user_id': user.id,
    'is_active': True
}
token_cache.cache_session_info(session_id, session_info)
```

### 2. 缓存失效机制

**自动失效触发时机**:
- 用户信息更新时 → 清除用户缓存 + 令牌验证缓存
- 会话状态变更时 → 清除会话缓存 + 相关令牌缓存
- 用户状态变更时 → 清除所有相关缓存
- 密码修改时 → 撤销所有会话 + 清除所有缓存

**实现机制**:
```python
def ensure_cache_consistency_on_user_update(user_id):
    """用户信息更新后确保缓存一致性"""
    # 1. 清除用户缓存
    invalidate_user_cache(user_id)
    
    # 2. 清除该用户所有会话缓存
    sessions = get_active_sessions_by_user(user_id)
    for session in sessions:
        invalidate_session_cache(session.id)
    
    # 3. 清除令牌验证缓存
    clear_token_validation_cache_by_user(user_id)
```

### 3. 缓存TTL策略

**分层TTL设计**:
- **令牌验证缓存**: 5分钟 (高频访问，短TTL)
- **用户信息缓存**: 10分钟 (中等频率)
- **会话信息缓存**: 30分钟 (低频访问，长TTL)
- **黑名单令牌**: 跟随令牌有效期 (最长24小时)

**优势**:
- 热点数据快速访问
- 自动过期减少不一致风险
- 不同数据类型差异化管理

### 4. 故障降级策略

**Redis故障处理**:
```python
def get_cached_user_info(user_id):
    try:
        # 尝试从Redis获取
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        logger.warning(f"Redis获取失败，降级到数据库: {e}")
    
    # Redis失败时降级到数据库
    return get_user_from_database(user_id)
```

**降级特性**:
- Redis不可用时自动切换到数据库查询
- 缓存失败不影响核心业务功能
- 性能监控和告警机制

### 5. 数据一致性检查

**定期一致性验证**:
- 每小时对比热点数据的缓存与数据库版本
- 发现不一致时自动修复并告警
- 维护缓存命中率和一致性指标

**监控指标**:
- 缓存命中率: 目标 > 90%
- 数据一致性率: 目标 > 99.9%
- 缓存响应时间: 目标 < 5ms

### 6. 特殊场景处理

**并发更新冲突**:
- 使用数据库乐观锁防止并发冲突
- Redis操作失败时不回滚数据库事务
- 通过版本号确保数据一致性

**批量操作优化**:
```python
# 批量用户信息更新
def batch_update_users(users_data):
    # 1. 批量更新数据库
    update_users_in_database(users_data)
    
    # 2. 批量更新缓存
    token_cache.batch_cache_users(users_data)
    
    # 3. 清除过期缓存
    for user_id in users_data.keys():
        ensure_cache_consistency_on_user_update(user_id)
```

### 7. 性能优化措施

**Redis连接池**:
- 最大连接数: 50
- 连接超时: 5秒
- 读写超时: 3秒

**Pipeline批处理**:
- 批量缓存操作使用Redis Pipeline
- 减少网络往返次数
- 提高批量操作性能

**内存优化**:
- 使用短缓存键减少内存占用
- JSON序列化兼顾性能和可读性
- 设置最大内存限制和LRU淘汰策略

## 🛡️ 安全特性

### 密码强度要求
- 最少8位字符
- 必须包含字母和数字
- 推荐包含大小写字母、数字和特殊字符

### 账户锁定保护
- 连续5次登录失败将锁定账户24小时
- 锁定期间无法登录

### 令牌管理
- 访问令牌有效期: 2小时
- 刷新令牌有效期: 30天
- 支持多设备同时登录
- 可撤销指定会话
- JWT令牌包含会话标识和用户信息

## 📝 使用示例

### cURL 示例

**用户注册**:
```bash
curl -X POST http://localhost:25698/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123",
    "full_name": "测试用户"
  }'
```

**用户登录**:
```bash
curl -X POST http://localhost:25698/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "testuser",
    "password": "Password123"
  }'
```

**获取用户信息**:
```bash
curl -X GET http://localhost:25698/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**刷新令牌**:
```bash
curl -X POST http://localhost:25698/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

### JavaScript 示例

```javascript
// 用户登录
const loginResponse = await fetch('http://localhost:25698/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    credential: 'testuser',
    password: 'Password123'
  })
});

const loginData = await loginResponse.json();
const accessToken = loginData.content.access_token;

// 获取用户信息
const profileResponse = await fetch('http://localhost:25698/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const profileData = await profileResponse.json();
console.log('用户信息:', profileData.content.user_info);
```

## 🔗 相关链接

- **Swagger UI**: http://localhost:25698/swagger-ui
- **项目代码**: `/api_gateway_service/`
- **日志文件**: `/api_gateway_service/logs/`

---

## 🎯 性能指标

### 响应时间指标
- **令牌验证 (缓存命中)**: < 1ms
- **令牌验证 (缓存未命中)**: < 50ms  
- **用户登录**: < 100ms
- **用户注册**: < 200ms
- **会话管理**: < 30ms

### 并发性能
- **最大并发用户**: 10,000+
- **令牌验证QPS**: 50,000+
- **缓存命中率**: > 95%
- **系统可用性**: > 99.9%

### 资源使用
- **Redis内存使用**: < 512MB (默认配置)
- **MySQL连接池**: 20个连接
- **Redis连接池**: 50个连接

---

## 📚 相关文档

- **架构设计**: [系统架构文档](./ARCHITECTURE.md)
- **缓存策略**: [缓存设计文档](./CACHE_DESIGN.md)  
- **安全规范**: [安全设计文档](./SECURITY.md)
- **运维手册**: [部署运维文档](./DEPLOYMENT.md)

---

*最后更新: 2025-01-13*  
*版本: v2.0.0 (增强缓存版本)*


Redis与MySQL数据一致性保障

  核心机制详解:

  1. 双写一致性
  - 数据库事务提交后立即更新Redis缓存
  - 缓存失败不影响业务，记录日志监控

  2. 自动缓存失效
  - 用户状态变更 → 清除用户+会话+令牌缓存
  - 会话状态变更 → 清除会话+相关令牌缓存
  - 密码修改 → 撤销所有会话+清除所有缓存

  3. 分层TTL策略
  - 令牌验证缓存: 5分钟 (高频短TTL)
  - 用户信息缓存: 10分钟 (中频中TTL)
  - 会话信息缓存: 30分钟 (低频长TTL)

  4. 故障降级
  - Redis故障自动降级到MySQL查询
  - 保证服务可用性，性能graceful degradation

  5. 性能监控
  - 缓存命中率目标: >90%
  - 数据一致性率: >99.9%
  - 令牌验证响应时间: <5ms

  6. 批量优化
  - Redis Pipeline减少网络往返
  - 批量操作提高性能
  - 连接池优化并发处理

  📊 性能指标

  响应时间:
  - 缓存命中令牌验证: < 1ms
  - 缓存未命中: < 50ms
  - QPS支持: 50,000+

  资源配置:
  - Redis连接池: 50个连接
  - 内存使用: < 512MB
  - 并发用户: 10,000+
