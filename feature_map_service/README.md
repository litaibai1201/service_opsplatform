# Auth Service

基于 Flask 构建的 API 网关服务，提供用户认证和授权功能。

## 功能特性

### 🔐 认证功能
- **POST /auth/login** - 用户登录
- **POST /auth/register** - 用户注册  
- **POST /auth/refresh** - 刷新令牌
- **GET /auth/profile** - 获取当前用户信息
- **POST /auth/logout** - 用户登出
- **GET /auth/sessions** - 获取用户会话列表
- **GET /auth/health** - 健康检查

### 🛡️ 安全特性
- JWT 访问令牌和刷新令牌机制
- 密码强度验证
- 账户锁定保护（防暴力破解）
- 登录日志记录
- 会话管理
- 敏感数据遮罩

### 🏗️ 架构设计
- **MVC 架构模式**：清晰的代码分层
- **单例模式控制器**：优化资源使用
- **统一错误处理**：标准化的错误响应
- **事务管理**：保证数据一致性
- **缓存支持**：Redis 缓存集成

## 项目结构

```
api_gateway_service/
├── app.py                    # 应用程序入口
├── requirements.txt          # 依赖包列表
├── README.md                # 项目说明
├── common/                   # 通用工具
│   ├── __init__.py
│   ├── common_method.py     # 响应构建方法
│   └── common_tools.py      # 通用工具类
├── configs/                  # 配置文件
│   ├── __init__.py
│   ├── app_config.py        # 应用配置
│   └── constant.py          # 常量配置
├── controllers/              # 控制器层
│   ├── __init__.py
│   └── auth_controller.py   # 认证控制器
├── dbs/                     # 数据库层
│   └── mysql_db/
│       ├── __init__.py      # 数据库初始化
│       └── model_tables.py  # 数据模型
├── models/                  # 模型操作层
│   ├── __init__.py
│   └── auth_model.py        # 认证模型操作
├── serializes/              # 序列化层
│   ├── __init__.py
│   ├── auth_serialize.py    # 认证序列化器
│   └── response_serialize.py # 响应序列化器
├── views/                   # 视图层
│   ├── __init__.py
│   └── auth_api.py          # 认证API
├── loggers/                 # 日志模块
│   ├── __init__.py
│   └── write_log.py         # 日志配置
├── logs/                    # 日志文件
│   ├── critical/
│   ├── error/
│   ├── info/
│   └── warn/
└── cache/                   # 缓存模块
    └── __init__.py          # Redis 客户端
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

# 应用配置
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=APIGateway2025!
DEBUG=true

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
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

服务将在 http://localhost:8000 启动

### 6. API 文档
访问 Swagger UI 文档：http://localhost:8000/swagger-ui

## API 使用示例

### 用户注册
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123",
    "full_name": "Test User"
  }'
```

### 用户登录
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "testuser",
    "password": "Password123"
  }'
```

### 获取用户信息
```bash
curl -X GET http://localhost:8000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 刷新令牌
```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

## 配置说明

### 认证配置
- `PASSWORD_MIN_LENGTH`: 最小密码长度（默认：6）
- `MAX_LOGIN_ATTEMPTS`: 最大登录尝试次数（默认：5）
- `ACCOUNT_LOCKOUT_DURATION`: 账户锁定时长（默认：24小时）
- `JWT_ACCESS_TOKEN_EXPIRE_HOURS`: 访问令牌过期时间（默认：2小时）
- `REFRESH_TOKEN_EXPIRE_DAYS`: 刷新令牌过期时间（默认：30天）

### 安全配置
- `ENABLE_RATE_LIMITING`: 是否启用限流（默认：true）
- `LOGIN_RATE_LIMIT`: 登录接口限流规则（默认：5次/分钟）
- `REGISTER_RATE_LIMIT`: 注册接口限流规则（默认：3次/分钟）

## 数据库模型

### 用户表 (user_form)
- id: 用户ID（主键）
- username: 用户名（唯一）
- email: 邮箱（唯一）
- password_hash: 密码哈希
- full_name: 全名
- phone: 手机号
- avatar_url: 头像URL
- role: 角色（admin/user）
- is_email_verified: 邮箱是否验证
- status: 状态
- created_at: 创建时间
- updated_at: 更新时间

### 刷新令牌表 (refresh_token_form)
- id: 令牌ID（主键）
- user_id: 用户ID（外键）
- token_hash: 令牌哈希
- expires_at: 过期时间
- device_info: 设备信息
- ip_address: IP地址
- is_revoked: 是否撤销

### 登录日志表 (login_log_form)
- id: 日志ID（主键）
- user_id: 用户ID（外键）
- login_type: 登录类型
- ip_address: IP地址
- user_agent: 用户代理
- login_result: 登录结果
- created_at: 创建时间

## 错误代码

| 代码 | 说明 |
|------|------|
| S10000 | 成功 |
| F40001 | 未授权 |
| F40003 | 禁止访问 |
| F40101 | 用户名或密码错误 |
| F40102 | 账户被锁定 |
| F40103 | 令牌已过期 |
| F40104 | 令牌无效 |
| F42201 | 用户已存在 |
| F42202 | 用户不存在 |
| F50000 | 系统内部错误 |

## 开发指南

### 代码风格
项目遵循 dataset_service 的代码风格：
- 使用繁体中文注释
- MVC 架构分层
- 统一的错误处理机制
- 单例模式控制器
- 事务管理装饰器

### 扩展开发
1. 添加新的API端点到 `views/` 目录
2. 实现业务逻辑到 `controllers/` 目录
3. 定义数据模型到 `models/` 目录
4. 创建序列化器到 `serializes/` 目录

## 许可证

MIT License

## 维护团队

LiDong - 2025-01-09