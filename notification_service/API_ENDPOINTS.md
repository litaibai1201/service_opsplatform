# Notification Service API Documentation

本文檔描述了通知服務的所有API端點，完全按照設計方案實現。

## API 基礎信息

- **服務名稱**: Notification Service
- **API 版本**: v1
- **基礎路徑**: /api/v1
- **認證方式**: JWT Token (部分接口)
- **服務端口**: 8094

## 用户通知 API

### 1. 获取用户通知列表
```
GET /api/v1/notifications
```
需要JWT認證
查詢參數：
- `is_read`: 是否已读（可选，true/false）
- `priority`: 优先级（可选，low/normal/high/urgent）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20，最大：100）

### 2. 标记通知为已读
```
PUT /api/v1/notifications/{notification_id}/read
```
需要JWT認證

### 3. 标记所有通知为已读
```
POST /api/v1/notifications/mark-all-read
```
需要JWT認證

### 4. 删除通知
```
DELETE /api/v1/notifications/{notification_id}
```
需要JWT認證

### 5. 获取未读通知数量
```
GET /api/v1/notifications/unread-count
```
需要JWT認證

## 通知偏好 API

### 1. 获取通知偏好
```
GET /api/v1/notifications/preferences
```
需要JWT認證

### 2. 更新通知偏好
```
PUT /api/v1/notifications/preferences
```
需要JWT認證
請求體：
- `preferences`: 偏好设置列表（必填）
  - `event_type`: 事件类型（必填）
  - `email_enabled`: 邮件通知启用（默认：true）
  - `in_app_enabled`: 应用内通知启用（默认：true）
  - `push_enabled`: 推送通知启用（默认：false）
  - `sms_enabled`: 短信通知启用（默认：false）
  - `frequency`: 通知频率（immediate/hourly/daily/weekly）
  - `quiet_hours_start`: 免打扰开始时间（可选）
  - `quiet_hours_end`: 免打扰结束时间（可选）
  - `timezone`: 时区（可选）

### 3. 重置为默认设置
```
POST /api/v1/notifications/preferences/reset
```
需要JWT認證

## 设备管理 API

### 1. 获取设备列表
```
GET /api/v1/notifications/devices
```
需要JWT認證
查詢參數：
- `is_active`: 是否活跃（可选，true/false）

### 2. 注册设备
```
POST /api/v1/notifications/devices
```
需要JWT認證
請求體：
- `device_token`: 设备令牌（必填）
- `device_type`: 设备类型（必填，ios/android/web）
- `device_name`: 设备名称（可选）

### 3. 取消设备注册
```
DELETE /api/v1/notifications/devices/{device_id}
```
需要JWT認證

## 通知模板管理 API（管理员）

### 1. 获取模板列表
```
GET /api/v1/admin/notification-templates
```
需要JWT認證（管理员权限）
查詢參數：
- `event_type`: 事件类型（可选）
- `type`: 模板类型（可选）
- `is_active`: 是否启用（可选）
- `locale`: 语言（可选）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）

### 2. 创建模板
```
POST /api/v1/admin/notification-templates
```
需要JWT認證（管理员权限）
請求體：
- `name`: 模板名称（必填）
- `type`: 通知类型（必填）
- `event_type`: 事件类型（必填）
- `subject_template`: 主题模板（可选）
- `content_template`: 内容模板（必填）
- `html_template`: HTML模板（可选）
- `variables`: 模板变量（可选）
- `is_active`: 是否启用（默认：true）
- `locale`: 语言（默认：en）

### 3. 获取模板详情
```
GET /api/v1/admin/notification-templates/{template_id}
```
需要JWT認證（管理员权限）

### 4. 更新模板
```
PUT /api/v1/admin/notification-templates/{template_id}
```
需要JWT認證（管理员权限）
請求體：同创建模板（所有字段可选）

### 5. 删除模板
```
DELETE /api/v1/admin/notification-templates/{template_id}
```
需要JWT認證（管理员权限）

## 内部发送接口

### 1. 发送通知
```
POST /api/v1/internal/notifications/send
```
請求體：
- `user_id`: 用户ID（必填）
- `event_type`: 事件类型（必填）
- `variables`: 模板变量（必填）
- `notification_types`: 通知类型列表（可选，默认：["in_app", "email"]）
- `priority`: 优先级（可选，默认：normal）
- `locale`: 语言（可选，默认：en）

### 2. 发送邮件
```
POST /api/v1/internal/notifications/email
```
請求體：
- `to_email`: 收件人邮箱（必填）
- `to_name`: 收件人姓名（可选）
- `subject`: 邮件主题（必填）
- `content`: 邮件内容（必填）
- `html_content`: HTML内容（可选）
- `template_id`: 模板ID（可选）
- `template_data`: 模板数据（可选）
- `attachments`: 附件列表（可选）
- `priority`: 优先级（可选，默认：normal）
- `scheduled_at`: 计划发送时间（可选）

### 3. 发送推送
```
POST /api/v1/internal/notifications/push
```
請求體：
- `user_id`: 用户ID（必填）
- `title`: 推送标题（必填）
- `body`: 推送内容（必填）
- `data`: 附加数据（可选）
- `device_tokens`: 设备令牌列表（可选）

### 4. 批量发送通知
```
POST /api/v1/internal/notifications/bulk
```
請求體：
- `notifications`: 通知列表（必填，最大100个）
  - 每个通知包含：user_id, event_type, variables, notification_types, priority, locale

## 支持的通知類型

- `in_app`: 站內通知
- `email`: 郵件通知
- `push`: 推送通知

## 支持的事件類型

- `project_created`: 項目創建
- `project_updated`: 項目更新
- `task_assigned`: 任務分配
- `task_completed`: 任務完成
- `comment_added`: 評論添加
- `file_uploaded`: 文件上傳
- `meeting_scheduled`: 會議安排
- `system_alert`: 系統警告
- `security_alert`: 安全警告

## 通知功能特性

### 多渠道通知
- 站內通知實時推送
- 郵件通知SMTP集成
- 推送通知FCM支持
- 多設備推送同步

### 通知模板系統
- Jinja2模板引擎
- 動態變量替換
- 多語言支持
- HTML/純文本雙格式

### 用戶偏好管理
- 按事件類型設置
- 按通知渠道控制
- 靜音時間設置
- 重要度過濾

### 批量通知處理
- 高效批量發送
- 發送狀態追蹤
- 失敗重試機制
- 性能監控

### 設備管理
- 推送令牌管理
- 多設備支持
- 設備狀態同步
- 自動清理無效設備

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

### 通知列表格式
```json
{
  "code": "S10000",
  "msg": "獲取通知成功",
  "content": {
    "total": 25,
    "page": 1,
    "per_page": 10,
    "notifications": [
      {
        "id": "notification_id",
        "event_type": "task_assigned",
        "type": "in_app",
        "title": "任務分配通知",
        "content": "您被分配了新任務：項目開發任務",
        "priority": "high",
        "status": "unread",
        "variables": {
          "task_name": "項目開發任務",
          "assigner": "張三"
        },
        "created_at": "2025-01-09T10:30:00Z",
        "read_at": null
      }
    ]
  }
}
```

### 通知模板格式
```json
{
  "code": "S10000",
  "msg": "獲取模板成功",
  "content": {
    "id": "template_id",
    "name": "任務分配模板",
    "type": "email",
    "event_type": "task_assigned",
    "subject_template": "您有新的任務分配：{{task_name}}",
    "content_template": "親愛的 {{user_name}}，您被 {{assigner}} 分配了新任務：{{task_name}}",
    "html_template": "<p>親愛的 <strong>{{user_name}}</strong>，您被 {{assigner}} 分配了新任務：<a href='{{task_url}}'>{{task_name}}</a></p>",
    "variables": {
      "user_name": "用戶姓名",
      "task_name": "任務名稱",
      "assigner": "分配者",
      "task_url": "任務鏈接"
    },
    "is_active": true,
    "created_at": "2025-01-09T10:30:00Z"
  }
}
```

### 用戶偏好格式
```json
{
  "code": "S10000",
  "msg": "獲取偏好成功",
  "content": {
    "user_id": "user123",
    "email_enabled": true,
    "push_enabled": true,
    "in_app_enabled": true,
    "quiet_hours": {
      "start": "22:00",
      "end": "08:00",
      "timezone": "Asia/Taipei"
    },
    "event_preferences": {
      "task_assigned": {
        "email": true,
        "push": true,
        "in_app": true
      },
      "project_created": {
        "email": false,
        "push": true,
        "in_app": true
      }
    }
  }
}
```

### 設備列表格式
```json
{
  "code": "S10000",
  "msg": "獲取設備成功",
  "content": {
    "devices": [
      {
        "id": "device_id",
        "user_id": "user123",
        "device_type": "mobile",
        "platform": "ios",
        "push_token": "fcm_token_here",
        "device_name": "iPhone 15",
        "is_active": true,
        "last_active_at": "2025-01-09T10:30:00Z",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 發送結果格式
```json
{
  "code": "S10000",
  "msg": "通知發送成功",
  "content": {
    "notification_id": "notification_id",
    "sent_types": ["in_app", "email"],
    "failed_types": ["push"],
    "details": {
      "in_app": {
        "status": "success",
        "message": "站內通知發送成功"
      },
      "email": {
        "status": "success",
        "message": "郵件已加入發送隊列"
      },
      "push": {
        "status": "failed",
        "message": "用戶未註冊推送設備"
      }
    }
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
- **F42201**: 通知模板不存在
- **F42202**: 用戶偏好不存在
- **F42203**: 設備不存在
- **F42204**: 通知發送失敗
- **F42205**: 模板渲染失敗
- **F42206**: 郵件發送失敗
- **F42207**: 推送通知失敗
- **F42208**: 批量通知數量超限
- **F50000**: 內部服務器錯誤
- **F50301**: 數據庫連接錯誤
- **F50302**: Redis連接錯誤
- **F50303**: 通知服務不可用
- **F50304**: SMTP服務錯誤
- **F50305**: FCM服務錯誤

## 健康檢查

### 服務健康檢查
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
    "service": "notification-service",
    "timestamp": "2025-01-09T10:30:00Z",
    "version": "1.0.0",
    "database": "connected",
    "redis": "connected",
    "smtp": "connected",
    "fcm": "connected",
    "components": {
      "email_queue": "running",
      "push_service": "running",
      "template_engine": "running"
    }
  }
}
```

### 通知統計
```
GET /api/v1/notifications/stats
```

響應示例：
```json
{
  "code": "S10000",
  "msg": "獲取統計信息成功",
  "content": {
    "total_notifications": 25678,
    "notifications_today": 456,
    "email_queue_size": 12,
    "template_count": 25,
    "active_devices": 1234,
    "notification_types": {
      "in_app": 15678,
      "email": 8900,
      "push": 6789
    },
    "success_rate": 98.5,
    "last_updated": "2025-01-09T10:30:00Z"
  }
}
```

## 使用示例

### JavaScript/Fetch 通知示例
```javascript
// 獲取通知列表
fetch('/api/v1/notifications?page=1&per_page=10', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  }
})
.then(response => response.json())
.then(data => {
  console.log('通知列表:', data.content.notifications);
  console.log('總數:', data.content.total);
});

// 更新通知偏好
const preferences = {
  email_enabled: true,
  push_enabled: true,
  quiet_hours: {
    start: "22:00",
    end: "08:00",
    timezone: "Asia/Taipei"
  },
  event_preferences: {
    task_assigned: {
      email: true,
      push: true,
      in_app: true
    }
  }
};

fetch('/api/v1/notifications/preferences', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(preferences)
})
.then(response => response.json())
.then(data => console.log(data));

// 註冊推送設備
const deviceData = {
  device_type: "mobile",
  platform: "ios",
  push_token: "fcm_token_here",
  device_name: "iPhone 15"
};

fetch('/api/v1/notifications/devices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(deviceData)
})
.then(response => response.json())
.then(data => console.log(data));

// 發送通知 (內部API)
const notificationData = {
  user_id: "user123",
  event_type: "task_assigned",
  variables: {
    task_name: "新任務",
    assigner: "張三"
  },
  notification_types: ["in_app", "email", "push"],
  priority: "high"
};

fetch('/api/v1/internal/notifications/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(notificationData)
})
.then(response => response.json())
.then(data => console.log(data));
```

### cURL 使用示例
```bash
# 獲取通知列表
curl -X GET \
  "http://localhost:8094/api/v1/notifications?page=1&per_page=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 更新通知偏好
curl -X PUT \
  http://localhost:8094/api/v1/notifications/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email_enabled": true,
    "push_enabled": true,
    "quiet_hours": {
      "start": "22:00",
      "end": "08:00",
      "timezone": "Asia/Taipei"
    },
    "event_preferences": {
      "task_assigned": {
        "email": true,
        "push": true,
        "in_app": true
      }
    }
  }'

# 註冊推送設備
curl -X POST \
  http://localhost:8094/api/v1/notifications/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "device_type": "mobile",
    "platform": "ios",
    "push_token": "fcm_token_here",
    "device_name": "iPhone 15"
  }'

# 發送通知 (內部API)
curl -X POST \
  http://localhost:8094/api/v1/internal/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "event_type": "task_assigned",
    "variables": {
      "task_name": "新任務",
      "assigner": "張三"
    },
    "notification_types": ["in_app", "email", "push"],
    "priority": "high"
  }'

# 標記通知為已讀
curl -X PUT \
  http://localhost:8094/api/v1/notifications/notification_id/read \
  -H "Authorization: Bearer YOUR_TOKEN"

# 創建通知模板
curl -X POST \
  http://localhost:8094/api/v1/admin/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "任務分配模板",
    "type": "email",
    "event_type": "task_assigned",
    "subject_template": "您有新的任務分配：{{task_name}}",
    "content_template": "親愛的 {{user_name}}，您被分配了新任務：{{task_name}}",
    "variables": {
      "user_name": "用戶姓名",
      "task_name": "任務名稱"
    }
  }'
```

## 性能優化

### 通知發送性能
- 異步通知處理
- 批量通知發送
- 郵件隊列優化
- 推送通知批處理

### 緩存策略
- Redis緩存用戶偏好
- 通知模板緩存
- 設備令牌緩存
- 發送狀態緩存

### 數據庫優化
- 索引優化
- 分表分庫策略
- 讀寫分離
- 連接池配置

### 隊列管理
- 郵件隊列優先級
- 失敗重試策略
- 死信隊列處理
- 隊列監控

## 監控和日志

### 通知指標
- 通知發送QPS和響應時間
- 通知成功率和失敗率
- 各渠道發送統計
- 用戶參與度分析

### 系統監控
- 數據庫連接狀態
- Redis緩存狀態
- SMTP服務狀態
- FCM服務狀態
- 隊列積壓監控

### 日志記錄
- 通知發送日志
- 模板渲染日志
- 郵件發送日志
- 推送通知日志
- 錯誤和異常日志
- 性能監控日志

### 報警機制
- 發送失敗率過高報警
- 隊列積壓報警
- 服務異常報警
- 性能指標異常報警