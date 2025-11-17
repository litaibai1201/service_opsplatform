# Service Ops Platform - 前端项目

企业级软件服务管理与协作设计平台的前端实现，基于 React + TypeScript + Vite 构建。

## 🚀 快速开始

### 环境要求
- Node.js 18.0+
- pnpm 8.0+ (推荐) 或 npm/yarn

### 环境配置

**重要**: 本项目采用微服务架构，前端通过 **API Gateway** 访问后端服务。

1. **复制环境配置文件**：
```bash
cp .env.example .env.development
```

2. **配置 API Gateway 地址**：
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080  # API 网关地址
VITE_WS_BASE_URL=ws://localhost:8080     # WebSocket 地址
```

**服务端口说明**：
- **8080**: API Gateway（统一入口，所有请求通过此端口）
- **8000**: auth_service（认证服务，内部端口）
- **其他端口**: 各微服务独立端口（不直接暴露给前端）

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```

**注意**: 启动前端前，请确保 API Gateway 服务已启动：
```bash
# 在项目根目录运行 API Gateway
cd ../api_gateway_service
python app.py
```

### 构建生产版本
```bash
pnpm build
```

### 类型检查
```bash
pnpm type-check
```

### 代码检查
```bash
pnpm lint
```

## 📁 项目结构

```
src/
├── assets/                 # 静态资源
│   ├── icons/              # 图标文件
│   └── images/             # 图片文件
├── components/             # 组件库
│   ├── ui/                 # 基础 UI 组件
│   ├── layout/             # 布局组件
│   ├── forms/              # 表单组件
│   ├── charts/             # 图表组件
│   ├── editors/            # 编辑器组件
│   ├── collaboration/      # 协作相关组件
│   └── design-tools/       # 设计工具组件
├── pages/                  # 页面组件
│   ├── auth/               # 认证页面
│   ├── dashboard/          # 仪表板
│   ├── teams/              # 团队管理
│   ├── projects/           # 项目管理
│   ├── design-tools/       # 设计工具
│   │   ├── architecture/   # 架构设计
│   │   ├── flow-diagram/   # 流程图设计
│   │   ├── api-design/     # API 设计
│   │   ├── database-design/# 数据库设计
│   │   └── feature-map/    # 功能导图
│   ├── collaboration/      # 协作功能
│   └── admin/              # 管理员功能
├── hooks/                  # 自定义 Hooks
│   ├── auth/               # 认证相关
│   ├── data/               # 数据处理
│   └── collaboration/      # 协作相关
├── store/                  # Redux 状态管理
│   └── slices/             # Redux Slices
├── services/               # API 服务
│   └── api/                # API 接口
├── types/                  # TypeScript 类型定义
│   ├── entities/           # 实体类型
│   └── api/                # API 类型
├── utils/                  # 工具函数
│   ├── constants/          # 常量定义
│   └── helpers/            # 辅助函数
└── styles/                 # 样式文件
```

## 🏗 微服务架构

本项目采用微服务架构，前后端通过 API Gateway 进行通信。

### 架构图

```
┌─────────────┐
│   Client    │  前端应用 (React)
│  (Port: --)  │
└──────┬──────┘
       │
       │ HTTP/WebSocket
       ▼
┌─────────────────────┐
│   API Gateway       │  统一入口 (负载均衡、路由、限流)
│   (Port: 8080)      │
└──────┬──────────────┘
       │
       ├──────────────────┬──────────────┬─────────────┐
       ▼                  ▼              ▼             ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│Auth Service│  │Team Service│  │Project Svc │  │其他服务... │
│(Port: 8000)│  │(独立端口) │  │(独立端口)  │  │(独立端口)  │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

### 请求流程

1. **前端发起请求** → `http://localhost:8080/auth/login`
2. **API Gateway 接收** → 验证、限流、路由
3. **转发到后端服务** → `auth_service:8000/auth/login`
4. **服务处理并返回** → Gateway → Client

### API Gateway 功能

- ✅ **统一入口**: 所有后端请求统一通过 Gateway
- ✅ **路由转发**: 根据 URL 路径转发到对应的微服务
- ✅ **负载均衡**: 支持轮询、权重等策略
- ✅ **限流熔断**: 防止服务过载
- ✅ **认证鉴权**: 统一的 JWT 验证
- ✅ **日志监控**: 请求日志和性能监控

### 为什么使用 API Gateway？

**传统方式的问题**:
- ❌ 前端需要知道所有微服务的地址和端口
- ❌ 跨域配置复杂，每个服务都需要配置 CORS
- ❌ 认证逻辑分散在各个服务中
- ❌ 难以实现统一的日志和监控

**使用 Gateway 的优势**:
- ✅ 前端只需要知道一个地址（Gateway）
- ✅ 统一的 CORS 配置
- ✅ 集中式的认证和权限控制
- ✅ 统一的日志、监控、限流、熔断
- ✅ 易于扩展和维护

## 🛠 技术栈

### 核心框架
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速构建工具

### 状态管理
- **Redux Toolkit** - 状态管理
- **React Redux** - React Redux 绑定

### 路由
- **React Router Dom** - 客户端路由

### UI 组件
- **Tailwind CSS** - 原子化 CSS 框架
- **Headless UI** - 无样式组件库
- **Heroicons** - 图标库
- **Framer Motion** - 动画库

### 数据获取
- **Axios** - HTTP 客户端
- **React Query** - 数据获取和缓存

### 表单处理
- **React Hook Form** - 表单管理
- **Zod** - 数据验证

### 实时通信
- **Socket.IO Client** - WebSocket 客户端

### 编辑器
- **Monaco Editor** - 代码编辑器
- **React Flow** - 流程图编辑器

### 工具库
- **Day.js** - 日期处理
- **clsx** - 条件样式组合
- **uuid** - UUID 生成
- **immer** - 不可变数据

## 📋 功能模块

### 认证授权
- 用户登录/注册
- 忘记密码/重置密码
- 多因子认证 (2FA)
- OAuth 第三方登录
- 权限管理

### 团队管理
- 团队创建和设置
- 成员邀请和管理
- 角色权限分配
- 团队统计和活动

### 项目管理
- 项目创建和配置
- 项目维护员管理
- 访问权限控制
- 项目模板管理

### 设计工具
- **架构设计**: 系统架构图、部署图、网络图
- **流程图设计**: 业务流程、系统流程、用户旅程
- **API 设计**: OpenAPI 规范、Mock 服务、测试管理
- **数据库设计**: ERD 图、表结构、迁移脚本
- **功能导图**: 需求梳理、思维导图、项目规划

### 实时协作
- 多人同时编辑
- 实时光标和选择
- 冲突检测和解决
- 操作历史记录

### 版本控制
- 分支管理
- 提交历史
- 合并请求
- 代码审查

## 🎨 设计规范

### 主题配置
- 支持亮色/暗色/系统主题
- 自定义主色调
- 字体大小调节
- 紧凑模式

### 响应式设计
- 移动端适配
- 平板端优化
- 桌面端体验

### 国际化
- 多语言支持
- 时区处理
- 本地化格式

## 🔧 开发指南

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 TypeScript 严格模式
- 组件使用 React 函数式组件
- 状态管理使用 Redux Toolkit

### 命名规范
- 组件使用 PascalCase
- 文件名使用 camelCase
- 常量使用 UPPER_SNAKE_CASE
- 接口使用 PascalCase 并以 I 开头

### 目录规范
- 每个功能模块独立目录
- 组件按功能分类存放
- 共享代码放在对应的公共目录

### Git 提交规范
- feat: 新功能
- fix: 修复问题
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建/工具相关

## 🚀 部署

### 构建命令
```bash
pnpm build
```

### 环境变量

**开发环境** (`.env.development`):
```bash
# API Gateway 地址 (本地开发)
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080

# 应用配置
VITE_APP_NAME=Service Ops Platform (Dev)
VITE_APP_VERSION=1.0.0-dev
VITE_ENV=development

# 功能开关
VITE_DEBUG=true
VITE_ENABLE_API_LOG=true
```

**生产环境** (`.env.production`):
```bash
# API Gateway 地址 (生产环境)
VITE_API_BASE_URL=https://api.yourcompany.com
VITE_WS_BASE_URL=wss://api.yourcompany.com

# 应用配置
VITE_APP_NAME=Service Ops Platform
VITE_APP_VERSION=1.0.0
VITE_ENV=production

# 功能开关
VITE_DEBUG=false
VITE_ENABLE_API_LOG=false
```

### Docker 部署
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

## 📝 开发注意事项

1. **性能优化**
   - 使用 React.memo 优化组件渲染
   - 合理使用 useMemo 和 useCallback
   - 避免不必要的重新渲染

2. **错误处理**
   - 使用 Error Boundary 捕获组件错误
   - API 错误统一处理
   - 用户友好的错误提示

3. **安全考虑**
   - XSS 防护
   - CSRF 防护
   - 敏感信息不暴露在前端

4. **可访问性**
   - 支持键盘导航
   - 屏幕阅读器友好
   - 色彩对比度符合标准

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。