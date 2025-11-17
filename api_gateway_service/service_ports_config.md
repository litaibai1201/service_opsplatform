# 微服务端口配置说明

## 📋 服务端口分配表

根据设计文档和项目结构，以下是所有微服务的端口分配：

| 序号 | 服务名称 | 服务目录 | 端口 | 状态 | 说明 |
|-----|---------|---------|-----|------|------|
| 0 | **api-gateway** | api_gateway_service | **8080** | ✅ 必需 | **统一入口，前端访问此端口** |
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

## 🎯 快速启动指南

### 最小化启动（核心服务）

```bash
# 1. 启动 API Gateway (必需)
cd api_gateway_service
python app.py  # 端口 8080

# 2. 启动认证服务 (必需)
cd auth_service
python app.py  # 端口 25698

# 3. 启动团队服务 (必需)
cd team_service
python app.py  # 端口 25708

# 4. 启动项目服务 (必需)
cd project_service
python app.py  # 端口 25707

# 5. 启动权限服务 (必需)
cd permission_service
python app.py  # 端口 25706

# 6. 前端启动
cd clients
npm run dev  # 默认端口 5173
```

### 完整启动（所有服务）

使用以下脚本可以批量启动所有服务：

```bash
#!/bin/bash
# start_all_services.sh

BASE_DIR="/Users/lidong/Desktop/projects/service_opsplatform"

# 服务列表
services=(
    "api_gateway_service:8080"
    "auth_service:25698"
    "team_service:25708"
    "project_service:25707"
    "permission_service:25706"
    "architecture_service:25701"
    "flow_diagram_service:25705"
    "api_design_service:25703"
    "db_design_service:25700"
    "feature_map_service:25702"
    "collaboration_service:25699"
    "version_control_service:25709"
    "file_service:25704"
    "notification_service:8094"
    "search_service:8095"
    "audit_service:8091"
    "integration_service:8093"
)

# 启动所有服务
for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    echo "🚀 启动 $name (端口: $port)..."
    cd "$BASE_DIR/$name"
    python app.py &
    sleep 2
done

echo "✅ 所有服务已启动"
```

## 🔍 检查服务状态

### 方法 1: 使用 curl 检查健康状态

```bash
#!/bin/bash
# check_services.sh

services=(
    "API Gateway:8080"
    "Auth Service:25698"
    "Team Service:25708"
    "Project Service:25707"
    "Permission Service:25706"
    "Architecture Service:25701"
    "Flow Diagram Service:25705"
    "API Design Service:25703"
    "DB Design Service:25700"
    "Feature Map Service:25702"
    "Collaboration Service:25699"
    "Version Control Service:25709"
    "File Service:25704"
    "Notification Service:8094"
    "Search Service:8095"
    "Audit Service:8091"
    "Integration Service:8093"
)

echo "检查服务健康状态..."
echo "===================="

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $name (端口 $port) - 运行中"
    else
        echo "❌ $name (端口 $port) - 未运行"
    fi
done
```

### 方法 2: 使用 lsof 检查端口占用

```bash
# 检查特定端口
lsof -i :8080  # API Gateway
lsof -i :25698  # Auth Service

# 检查所有服务端口
for port in {25698..8091}; do
    echo "端口 $port:"
    lsof -i :$port
done
```

### 方法 3: 使用 netstat 检查

```bash
# macOS
netstat -an | grep LISTEN | grep -E ':(808[0-9]|800[0-9]|801[0-4])'

# Linux
netstat -tlnp | grep -E ':(808[0-9]|800[0-9]|801[0-4])'
```

## 🔧 端口冲突解决

如果端口被占用，可以：

### 方法 1: 修改服务端口

编辑服务的配置文件：

```python
# 例如修改 auth_service/app.py
if __name__ == "__main__":
    app = create_app(app)
    app.run(SERVER_HOST, 25698, debug=True)  # 修改这里的端口
```

### 方法 2: 释放被占用的端口

```bash
# 查找占用端口的进程
lsof -i :25698

# 杀死进程
kill -9 <PID>
```

### 方法 3: 更新 Gateway 配置

如果修改了服务端口，需要同步更新 Gateway 配置：

1. 修改 `init_gateway_routes.py` 中的端口
2. 重新运行初始化脚本
3. 或通过 API 更新：

```bash
curl -X PUT http://localhost:8080/admin/services/{instance_id} \
  -H "Content-Type: application/json" \
  -d '{"port": 新端口号}'
```

## 📊 请求流程示例

```
用户浏览器
    ↓
http://localhost:5173 (前端)
    ↓
http://localhost:8080 (API Gateway)
    ↓
    ├─→ http://localhost:25698 (Auth Service)
    ├─→ http://localhost:25708 (Team Service)
    ├─→ http://localhost:25707 (Project Service)
    ├─→ http://localhost:25706 (Permission Service)
    ├─→ http://localhost:25701 (Architecture Service)
    └─→ ... (其他服务)
```

## 🚨 注意事项

1. **API Gateway 必须先启动**
   - Gateway 是统一入口，其他服务可以随时启动

2. **核心服务优先启动**
   - auth-service (认证)
   - team-service (团队)
   - project-service (项目)
   - permission-service (权限)

3. **端口范围规划**
   - Gateway: 8080
   - 核心服务: 25698-25706
   - 设计工具: 25701-25702
   - 支撑服务: 25699-8091

4. **防火墙配置**
   - 开发环境: 仅需开放 8080 (Gateway) 给外网
   - 生产环境: 微服务端口仅内网访问

5. **负载均衡**
   - 单机开发: 每个服务一个实例
   - 生产环境: 每个服务可启动多个实例（不同端口）

## 🔄 Docker 部署端口映射

如使用 Docker 部署，端口映射示例：

```yaml
# docker-compose.yml 示例
services:
  api-gateway:
    ports:
      - "8080:8080"

  auth-service:
    ports:
      - "25698:25698"

  team-service:
    ports:
      - "25708:25708"

  # ... 其他服务
```

## 📚 相关配置文件

- **Gateway 配置**: `api_gateway_service/configs/app_config.py`
- **初始化脚本**: `api_gateway_service/init_gateway_routes.py`
- **各服务配置**: `{service_name}/configs/app_config.py`
- **前端配置**: `clients/.env.development`

---

**配置版本**: v1.0
**最后更新**: 2025-01-15
