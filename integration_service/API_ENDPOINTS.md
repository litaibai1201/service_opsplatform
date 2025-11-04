# Integration Service API Documentation

本文檔描述了集成服務的所有API端點，完全按照設計方案實現。

## API 基礎信息

- **服務名稱**: Integration Service
- **API 版本**: v1
- **基礎路徑**: /api/v1
- **認證方式**: JWT Token (部分接口)
- **服務端口**: 8093

## Webhook管理 API

### 1. 獲取Webhook列表
```
GET /api/v1/webhooks
```
需要JWT認證
查詢參數：
- `project_id`: 項目ID（可選）
- `is_active`: 是否啟用（可選）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20，最大：100）

### 2. 創建Webhook
```
POST /api/v1/webhooks
```
需要JWT認證
請求體：
- `project_id`: 項目ID（必填）
- `name`: Webhook名稱（必填）
- `url`: 回調URL（必填）
- `events`: 監聽事件列表（必填）
- `headers`: 請求頭（可選）
- `secret`: 簽名密鑰（可選）
- `is_active`: 是否啟用（默認：true）
- `retry_config`: 重試配置（可選）
- `timeout_seconds`: 超時時間（默認：30秒）

### 3. 獲取Webhook詳情
```
GET /api/v1/webhooks/{webhook_id}
```
需要JWT認證

### 4. 更新Webhook
```
PUT /api/v1/webhooks/{webhook_id}
```
需要JWT認證
請求體：同創建Webhook（所有字段可選）

### 5. 刪除Webhook
```
DELETE /api/v1/webhooks/{webhook_id}
```
需要JWT認證

### 6. 測試Webhook
```
POST /api/v1/webhooks/{webhook_id}/test
```
需要JWT認證
請求體：
- `test_payload`: 測試負載（可選）

### 7. 重試Webhook
```
POST /api/v1/webhooks/{webhook_id}/retry
```
需要JWT認證
請求體：
- `log_id`: 日志ID（可選，重試特定執行）

### 8. 獲取Webhook執行日志
```
GET /api/v1/webhooks/{webhook_id}/logs
```
需要JWT認證
查詢參數：
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）

## 插件管理 API

### 1. 獲取插件列表
```
GET /api/v1/plugins
```
需要JWT認證
查詢參數：
- `is_enabled`: 是否啟用（可選）
- `is_verified`: 是否已驗證（可選）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）
- `sort_by`: 排序字段（rating/downloads/installed_at/name）

### 2. 安裝插件
```
POST /api/v1/plugins
```
需要JWT認證
請求體：
- `name`: 插件名稱（必填）
- `version`: 版本號（必填）
- `description`: 描述（可選）
- `author`: 作者（可選）
- `repository_url`: 倉庫地址（可選）
- `documentation_url`: 文檔地址（可選）
- `manifest`: 插件清單（必填）
- `permissions`: 權限列表（可選）
- `configuration_schema`: 配置架構（可選）
- `is_enabled`: 是否啟用（默認：true）
- `is_verified`: 是否已驗證（默認：false）

### 3. 獲取插件詳情
```
GET /api/v1/plugins/{plugin_id}
```
需要JWT認證

### 4. 卸載插件
```
DELETE /api/v1/plugins/{plugin_id}
```
需要JWT認證

### 5. 獲取插件市場
```
GET /api/v1/plugins/marketplace
```
查詢參數：
- `category`: 分類（可選）
- `search`: 搜索關鍵字（可選）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）
- `sort_by`: 排序字段（rating/downloads/name/updated_at）

### 6. 獲取插件配置
```
GET /api/v1/plugins/{plugin_id}/configuration
```
需要JWT認證

### 7. 創建插件配置
```
POST /api/v1/plugins/{plugin_id}/configuration
```
需要JWT認證
請求體：
- `project_id`: 項目ID（可選）
- `configuration`: 配置數據（必填）
- `is_active`: 是否啟用（默認：true）

### 8. 更新插件配置
```
PUT /api/v1/plugins/{plugin_id}/configuration
```
需要JWT認證
請求體：同創建插件配置

## 外部集成管理 API

### 1. 獲取外部集成列表
```
GET /api/v1/integrations
```
需要JWT認證
查詢參數：
- `project_id`: 項目ID（可選）
- `integration_type`: 集成類型（可選）
- `status`: 狀態（active/inactive/error，可選）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）

### 2. 創建外部集成
```
POST /api/v1/integrations
```
需要JWT認證
請求體：
- `project_id`: 項目ID（必填）
- `integration_type`: 集成類型（必填）
- `name`: 集成名稱（必填）
- `configuration`: 配置數據（必填）
- `auth_config`: 認證配置（可選）
- `sync_settings`: 同步設置（可選）

### 3. 獲取外部集成詳情
```
GET /api/v1/integrations/{integration_id}
```
需要JWT認證

### 4. 更新外部集成
```
PUT /api/v1/integrations/{integration_id}
```
需要JWT認證
請求體：
- `name`: 集成名稱（可選）
- `configuration`: 配置數據（可選）
- `auth_config`: 認證配置（可選）
- `sync_settings`: 同步設置（可選）
- `status`: 狀態（active/inactive/error，可選）

### 5. 刪除外部集成
```
DELETE /api/v1/integrations/{integration_id}
```
需要JWT認證

### 6. 啟動集成同步
```
POST /api/v1/integrations/{integration_id}/sync
```
需要JWT認證
請求體：
- `sync_type`: 同步類型（full/incremental/delta，默認：full）
- `force`: 強制同步（默認：false）

### 7. 獲取同步日志
```
GET /api/v1/integrations/{integration_id}/sync/logs
```
需要JWT認證
查詢參數：
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）

### 8. 獲取集成類型
```
GET /api/v1/integrations/types
```
查詢參數：
- `category`: 分類（code_repository/project_management/communication/ci_cd/container/monitoring，可選）

### 9. 獲取集成配置架構
```
GET /api/v1/integrations/types/{integration_type}/schema
```

## 事件處理 API

### 1. 處理Webhook事件
```
POST /api/v1/webhooks/events/{event_type}
```
請求體：事件數據（JSON格式）

支持的事件類型：
- `project.created`
- `project.updated`
- `project.deleted`
- `task.created`
- `task.updated`
- `task.completed`
- `user.registered`
- `user.updated`
- `deployment.started`
- `deployment.completed`
- `deployment.failed`

## 健康檢查 API

### 1. 服務健康檢查
```
GET /api/v1/health
```

響應示例：
```json
{
  "code": "S10000",
  "msg": "服務正常",
  "content": {
    "status": "healthy",
    "service": "integration-service",
    "timestamp": "2025-01-09T10:30:00Z",
    "version": "1.0.0",
    "database": "connected",
    "cache": "connected",
    "webhooks_active": 15,
    "integrations_active": 8,
    "plugins_installed": 12
  }
}
```

## 支持的集成類型

### 代碼倉庫
- `github`: GitHub
- `gitlab`: GitLab
- `bitbucket`: Bitbucket

### 項目管理
- `jira`: Jira
- `trello`: Trello
- `azure_devops`: Azure DevOps

### 通信工具
- `slack`: Slack

### CI/CD工具
- `jenkins`: Jenkins

### 容器化
- `docker`: Docker
- `kubernetes`: Kubernetes

## 集成功能特性

### Webhook管理
- 多事件類型支持
- 靈活的過濾和路由
- 自動重試機制
- 簽名驗證
- 執行日志記錄

### 插件系統
- 插件市場
- 動態安裝/卸載
- 權限管理
- 配置管理
- 版本控制

### 外部集成
- 多種服務類型支持
- 統一認證管理
- 數據同步引擎
- 錯誤處理和重試
- 同步日志記錄

### 安全特性
- JWT認證
- 權限控制
- 數據加密
- 審計日志
- 安全配置

## 響應格式

所有API響應遵循統一格式：

```json
{
  "code": "S10000",
  "msg": "操作成功",
  "content": {
    // 響應數據
  }
}
```

### Webhook響應格式
```json
{
  "code": "S10000",
  "msg": "獲取Webhook列表成功",
  "content": {
    "webhooks": [
      {
        "id": "webhook_id",
        "project_id": "project_id",
        "name": "項目部署通知",
        "url": "https://api.example.com/webhook",
        "events": ["deployment.completed", "deployment.failed"],
        "headers": {"Authorization": "Bearer token"},
        "secret": "webhook_secret",
        "is_active": true,
        "retry_config": {"max_retries": 3, "retry_delay": 5},
        "timeout_seconds": 30,
        "last_triggered_at": "2025-01-09T10:30:00Z",
        "success_count": 45,
        "failure_count": 2,
        "created_by": "user_id",
        "created_at": "2025-01-08T10:30:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "size": 20
  }
}
```

### 插件響應格式
```json
{
  "code": "S10000",
  "msg": "獲取插件列表成功",
  "content": {
    "plugins": [
      {
        "id": "plugin_id",
        "name": "代碼質量檢查",
        "version": "1.2.0",
        "description": "自動化代碼質量檢查工具",
        "author": "開發團隊",
        "repository_url": "https://github.com/example/plugin",
        "documentation_url": "https://docs.example.com",
        "manifest": {"entry": "main.py", "dependencies": []},
        "permissions": ["read:project", "write:reports"],
        "configuration_schema": {"type": "object", "properties": {}},
        "is_enabled": true,
        "is_verified": true,
        "verification_date": "2025-01-05",
        "download_count": 1250,
        "rating": 4.5,
        "review_count": 89,
        "installed_by": "user_id",
        "installed_at": "2025-01-08T10:30:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "size": 20
  }
}
```

### 外部集成響應格式
```json
{
  "code": "S10000",
  "msg": "獲取外部集成列表成功",
  "content": {
    "integrations": [
      {
        "id": "integration_id",
        "project_id": "project_id",
        "integration_type": "github",
        "name": "主項目GitHub集成",
        "configuration": {
          "repository": "example/project",
          "branch": "main",
          "webhook_events": ["push", "pull_request"]
        },
        "auth_config": {
          "auth_type": "oauth",
          "token_encrypted": true
        },
        "sync_settings": {
          "sync_interval": "hourly",
          "auto_sync": true
        },
        "status": "active",
        "last_sync_at": "2025-01-09T09:30:00Z",
        "sync_error_message": null,
        "created_by": "user_id",
        "created_at": "2025-01-08T10:30:00Z",
        "updated_at": "2025-01-09T08:30:00Z"
      }
    ],
    "total": 8,
    "page": 1,
    "size": 20
  }
}
```

## 錯誤代碼

- **S10000**: 操作成功
- **F40001**: 未授權訪問
- **F40003**: 權限不足
- **F40004**: 資源不存在
- **F40022**: 請求參數驗證失敗
- **F40029**: 請求頻率限制
- **F42301**: Webhook不存在
- **F42302**: 插件不存在
- **F42303**: 集成不存在
- **F42304**: 配置無效
- **F42305**: 同步失敗
- **F42306**: 插件安裝失敗
- **F42307**: Webhook執行失敗
- **F50000**: 內部服務器錯誤
- **F50401**: 數據庫錯誤
- **F50402**: 緩存錯誤
- **F50403**: 集成服務不可用

## 使用示例

### JavaScript/Fetch 示例
```javascript
// 獲取Webhook列表
const token = 'your_jwt_token';
fetch('/api/v1/webhooks?project_id=project123', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  }
})
.then(response => response.json())
.then(data => {
  console.log('Webhook列表:', data.content.webhooks);
});

// 創建Webhook
const webhookData = {
  project_id: "project123",
  name: "部署通知",
  url: "https://api.example.com/webhook",
  events: ["deployment.completed", "deployment.failed"],
  headers: {"Authorization": "Bearer token"},
  secret: "webhook_secret",
  is_active: true,
  timeout_seconds: 30
};

fetch('/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(webhookData)
})
.then(response => response.json())
.then(data => console.log(data));

// 安裝插件
const pluginData = {
  name: "代碼質量檢查",
  version: "1.2.0",
  description: "自動化代碼質量檢查工具",
  manifest: {"entry": "main.py", "dependencies": []},
  permissions: ["read:project", "write:reports"],
  is_enabled: true
};

fetch('/api/v1/plugins', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(pluginData)
})
.then(response => response.json())
.then(data => console.log(data));

// 創建外部集成
const integrationData = {
  project_id: "project123",
  integration_type: "github",
  name: "主項目GitHub集成",
  configuration: {
    repository: "example/project",
    branch: "main",
    webhook_events: ["push", "pull_request"]
  },
  auth_config: {
    auth_type: "oauth",
    access_token: "github_token"
  },
  sync_settings: {
    sync_interval: "hourly",
    auto_sync: true
  }
};

fetch('/api/v1/integrations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(integrationData)
})
.then(response => response.json())
.then(data => console.log(data));
```

### cURL 使用示例
```bash
# 獲取Webhook列表
curl -X GET \
  "http://localhost:8093/api/v1/webhooks?project_id=project123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 創建Webhook
curl -X POST \
  http://localhost:8093/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "project123",
    "name": "部署通知",
    "url": "https://api.example.com/webhook",
    "events": ["deployment.completed", "deployment.failed"],
    "headers": {"Authorization": "Bearer token"},
    "secret": "webhook_secret",
    "is_active": true,
    "timeout_seconds": 30
  }'

# 安裝插件
curl -X POST \
  http://localhost:8093/api/v1/plugins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "代碼質量檢查",
    "version": "1.2.0",
    "description": "自動化代碼質量檢查工具",
    "manifest": {"entry": "main.py", "dependencies": []},
    "permissions": ["read:project", "write:reports"],
    "is_enabled": true
  }'

# 創建外部集成
curl -X POST \
  http://localhost:8093/api/v1/integrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "project123",
    "integration_type": "github",
    "name": "主項目GitHub集成",
    "configuration": {
      "repository": "example/project",
      "branch": "main",
      "webhook_events": ["push", "pull_request"]
    },
    "auth_config": {
      "auth_type": "oauth",
      "access_token": "github_token"
    },
    "sync_settings": {
      "sync_interval": "hourly",
      "auto_sync": true
    }
  }'

# 測試Webhook
curl -X POST \
  http://localhost:8093/api/v1/webhooks/webhook_id/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "test_payload": {"message": "測試消息"}
  }'

# 獲取插件市場
curl -X GET \
  "http://localhost:8093/api/v1/plugins/marketplace?category=code_analysis&page=1&size=20" \
  -H "Content-Type: application/json"

# 啟動集成同步
curl -X POST \
  http://localhost:8093/api/v1/integrations/integration_id/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sync_type": "incremental",
    "force": false
  }'

# 健康檢查
curl -X GET \
  "http://localhost:8093/api/v1/health" \
  -H "Content-Type: application/json"
```

## 性能優化

### Webhook性能
- 異步執行機制
- 連接池管理
- 批量處理優化
- 重試策略優化

### 數據同步性能
- 增量同步機制
- 並發同步控制
- 數據壓縮傳輸
- 斷點續傳支持

### 緩存策略
- Redis緩存配置信息
- 集成狀態緩存
- 插件信息緩存
- 認證令牌緩存

### 數據庫優化
- 索引優化設計
- 查詢性能調優
- 連接池配置
- 讀寫分離

## 監控和日志

### 集成指標
- Webhook執行成功率
- 同步任務執行時間
- 插件使用統計
- 錯誤率監控

### 系統監控
- 數據庫連接狀態
- Redis緩存狀態
- 內存和CPU使用率
- 網絡IO監控

### 日志記錄
- Webhook執行日志
- 同步操作日志
- 插件安裝日志
- 系統錯誤日志
- 安全審計日志

## 安全考慮

### 認證和授權
- JWT令牌驗證
- 角色權限控制
- API訪問限制
- 操作審計

### 數據安全
- 敏感信息加密
- 傳輸加密(HTTPS)
- 數據庫加密
- 密鑰輪換

### 網絡安全
- IP白名單
- 請求頻率限制
- DDoS防護
- 安全頭設置