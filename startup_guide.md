# 系统启动指南

## 🚀 完整启动流程

### 前置检查

#### 1. 检查 MySQL 是否运行
```bash
# 检查 MySQL 进程
ps aux | grep mysqld | grep -v grep

# 如果没有运行，启动 MySQL
brew services start mysql
# 或
mysql.server start

# 验证 MySQL 连接
mysql -u root -p -e "SELECT 1"
```

#### 2. 检查数据库是否存在
```bash
mysql -u root -p -e "SHOW DATABASES LIKE '%service_ops%'"
```

---

## 📋 服务启动顺序

### 步骤 1: 启动 API Gateway

**打开新终端窗口 1**

```bash
cd /Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service

# 方式 1: 使用重启脚本（推荐）
./restart_gateway.sh

# 方式 2: 手动启动
python app.py
```

**预期输出**:
```
🔍 检查并停止现有 Gateway 进程...
✅ 端口 8080 已释放

🚀 启动 API Gateway...
====================================
===================API Gateway starting============================
服務將在 http://0.0.0.0:8080 啟動
健康檢查: http://localhost:8080/api/v1/health
管理界面: http://localhost:8080/swagger-ui
================================================================
 * Serving Flask app 'app'
 * Debug mode: on
```

**验证**:
```bash
# 在另一个终端测试
curl http://localhost:8080/health
```

---

### 步骤 2: 启动 Auth Service

**打开新终端窗口 2**

```bash
cd /Users/lidong/Desktop/projects/service_opsplatform/auth_service

# 方式 1: 使用重启脚本（推荐）
./restart_auth.sh

# 方式 2: 手动启动
python app.py
```

**预期输出**:
```
🔍 检查并停止现有 Auth Service 进程...
✅ 端口 25698 已释放

🚀 启动 Auth Service...
====================================
===================Auth Service starting============================
服務將在 http://0.0.0.0:25698 啟動
健康檢查: http://localhost:25698/api/v1/health
管理界面: http://localhost:25698/swagger-ui
================================================================
 * Serving Flask app 'app'
 * Debug mode: on
```

**验证**:
```bash
# 在另一个终端测试
curl http://localhost:25698/health
```

---

### 步骤 3: 测试完整请求链路

**打开新终端窗口 3**

```bash
cd /Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service

# 运行诊断
./diagnose_gateway.sh
```

**预期结果**:
```
✅ API Gateway 正在运行
✅ Auth Service 正在运行
✅ Auth Service 健康检查通过
✅ Gateway 健康检查通过
✅ 已配置 42 条路由
✅ 已注册 16 个服务实例
✅ 系统状态良好，可以进行登录测试
```

---

## 🧪 手动测试登录接口

### 直接测试 Auth Service (绕过 Gateway)

```bash
curl -X POST http://localhost:25698/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' | python -m json.tool
```

**预期响应**:
```json
{
  "code": 200,
  "content": {
    "access_token": "eyJ0eXAiOiJKV1Qi...",
    "refresh_token": "eyJ0eXAiOiJKV1Qi...",
    "user_info": {
      "user_id": "1",
      "username": "admin",
      "email": "admin@example.com"
    },
    "expires_in": 7200
  },
  "msg": "登錄成功"
}
```

### 通过 Gateway 测试 (完整链路)

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-request-123" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' | python -m json.tool
```

**预期响应**: 与上面相同

---

## 🐛 常见问题排查

### 问题 1: Auth Service 无法启动

**错误**: `Address already in use`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :25698

# 杀死进程
kill -9 <PID>

# 重新启动
./restart_auth.sh
```

### 问题 2: 数据库连接失败

**错误**: `Lost connection to MySQL server`

**解决**:
```bash
# 检查 MySQL 状态
brew services list | grep mysql

# 重启 MySQL
brew services restart mysql

# 验证连接
mysql -u root -p -e "SELECT 1"
```

### 问题 3: 路由未配置

**错误**: `未配置路由`

**解决**:
```bash
cd /Users/lidong/Desktop/projects/service_opsplatform/api_gateway_service
python init_gateway_routes.py
```

### 问题 4: CORS 错误

**错误**: `blocked by CORS policy`

**解决**: 已经修复，确保 Gateway 和 Auth Service 都已重启

### 问题 5: 缺少访问令牌

**错误**: `❌ 缺少访问令牌: {}`

**可能原因**:
1. Auth Service 未启动
2. Gateway 无法转发请求
3. Auth Service 返回格式错误

**检查步骤**:
```bash
# 1. 确认 Auth Service 运行
lsof -i :25698

# 2. 直接测试 Auth Service
curl http://localhost:25698/health

# 3. 测试登录接口
curl -X POST http://localhost:25698/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'

# 4. 查看 Auth Service 日志
# 在 Auth Service 的终端窗口查看输出
```

---

## 📊 服务端口总览

| 服务名称 | 端口 | 健康检查 | 管理界面 |
|---------|------|---------|---------|
| API Gateway | 8080 | /health | /swagger-ui |
| Auth Service | 25698 | /health | /swagger-ui |
| Team Service | 25708 | /health | /swagger-ui |
| Project Service | 25707 | /health | /swagger-ui |
| ... | ... | ... | ... |

---

## ✅ 验证清单

启动完成后，依次验证：

- [ ] MySQL 服务运行中
- [ ] API Gateway 运行在 8080 端口
- [ ] Auth Service 运行在 25698 端口
- [ ] Gateway 健康检查通过 (`curl http://localhost:8080/health`)
- [ ] Auth 健康检查通过 (`curl http://localhost:25698/health`)
- [ ] 诊断脚本显示全部 ✅
- [ ] 前端可以访问 `http://localhost:3000`
- [ ] 登录功能正常

---

## 🎯 下一步

所有服务启动后：

1. 打开浏览器访问 `http://localhost:3000`
2. 尝试登录
3. 检查浏览器控制台是否有错误
4. 检查 Network 标签的请求/响应

**测试账号** (如果数据库中有测试数据):
- 邮箱: `admin@example.com`
- 密码: `admin123`

---

**文档版本**: v1.0
**更新时间**: 2025-01-17
