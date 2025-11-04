# Search Service API Documentation

本文檔描述了搜索服務的所有API端點，完全按照設計方案實現。

## API 基礎信息

- **服務名稱**: Search Service
- **API 版本**: v1
- **基礎路徑**: /
- **認證方式**: JWT Token (部分接口)
- **服務端口**: 8091

## 全局搜索 API

### 1. 全局搜索
```
GET /search
```
查詢參數：
- `query`: 搜索關鍵字（必填）
- `filters`: 過濾條件（可選，JSON格式）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20，最大：100）
- `sort_by`: 排序字段（_score/created_at/updated_at/popularity）

### 2. 搜索建議
```
GET /search/suggest
```
查詢參數：
- `query`: 搜索關鍵字（必填）
- `size`: 建議數量（默認：5，最大：20）

### 3. 最近搜索
```
GET /search/recent
```
需要JWT認證
查詢參數：
- `limit`: 返回數量（默認：10，最大：50）

### 4. 熱門搜索
```
GET /search/trending
```
查詢參數：
- `limit`: 返回數量（默認：10，最大：50）
- `time_range`: 時間範圍（7d/30d/90d，默認：7d）

### 5. 搜索反饋
```
POST /search/feedback
```
需要JWT認證
請求體：
- `query`: 搜索關鍵字（必填）
- `result_id`: 結果ID（必填）
- `feedback_type`: 反饋類型（clicked/relevant/not_relevant/helpful/not_helpful）
- `rating`: 評分（1-5，可選）
- `comment`: 評論（可選）

## 高級搜索 API

### 1. 高級搜索
```
POST /search/advanced
```
請求體：
- `query`: 搜索關鍵字（可選）
- `resource_types`: 資源類型列表（可選）
- `project_ids`: 項目ID列表（可選）
- `team_ids`: 團隊ID列表（可選）
- `tags`: 標籤列表（可選）
- `creator_ids`: 創建者ID列表（可選）
- `date_from`: 開始日期（可選）
- `date_to`: 結束日期（可選）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）
- `sort_by`: 排序字段（可選）

### 2. 獲取可用過濾器
```
GET /search/filters
```
返回當前用戶可用的所有過濾器選項

### 3. 分面搜索
```
POST /search/faceted
```
請求體：包含高級搜索的所有參數，另外：
- `include_facets`: 是否包含分面信息（默認：true）
- `facet_size`: 分面選項數量（默認：10）

## 個性化搜索 API

### 1. 個性化推薦
```
GET /search/recommendations
```
需要JWT認證
查詢參數：
- `size`: 推薦數量（默認：10，最大：50）
- `recommendation_type`: 推薦類型（general/recent/popular/similar）

### 2. 相關內容推薦
```
GET /search/related/{resource_id}
```
查詢參數：
- `size`: 推薦數量（默認：5，最大：20）

### 3. 收藏搜索結果
```
POST /search/bookmark
```
需要JWT認證
請求體：
- `query`: 搜索關鍵字（必填）
- `filters`: 過濾條件（可選）
- `bookmark_name`: 收藏名稱（必填）

## 搜索分析 API

### 1. 搜索分析報告
```
GET /search/analytics
```
需要JWT認證
查詢參數：
- `start_date`: 開始日期（可選）
- `end_date`: 結束日期（可選）
- `user_id`: 用戶ID（可選，管理員權限）
- `report_type`: 報告類型（summary/detailed/trends/user_behavior）

### 2. 熱門搜索詞
```
GET /search/popular-terms
```
查詢參數：
- `limit`: 返回數量（默認：10）
- `time_range`: 時間範圍（7d/30d/90d）

### 3. 用戶搜索行為分析
```
GET /search/user-behavior
```
需要JWT認證
查詢參數：
- `start_date`: 開始日期（可選）
- `end_date`: 結束日期（可選）

## 內部索引 API

### 1. 索引資源
```
POST /internal/search/index
```
請求體：
- `id`: 資源ID（可選，自動生成）
- `resource_type`: 資源類型（必填）
- `project_id`: 項目ID（可選）
- `team_id`: 團隊ID（可選）
- `title`: 標題（必填）
- `content`: 內容（可選）
- `description`: 描述（可選）
- `tags`: 標籤列表（可選）
- `creator_id`: 創建者ID（必填）
- `permissions`: 權限列表（可選）
- `metadata`: 元數據（可選）
- `popularity_score`: 熱門度評分（0-10，默認：0）
- `search_boost`: 搜索權重（0.1-10，默認：1）

### 2. 更新資源索引
```
PUT /internal/search/index/{resource_id}
```
請求體：
- `update_data`: 更新數據（必填）

### 3. 刪除資源索引
```
DELETE /internal/search/index/{resource_id}
```

### 4. 批量索引資源
```
POST /internal/search/bulk-index
```
請求體：
- `resources`: 資源列表（必填，最大1000個）

### 5. 重建索引
```
POST /internal/search/reindex
```
請求體：
- `index_name`: 索引名稱（默認：all）
- `force`: 強制重建（默認：false）
- `chunk_size`: 批次大小（默認：100）

## 支持的資源類型

- `file`: 文件
- `project`: 項目
- `task`: 任務
- `issue`: 問題
- `wiki`: 維基
- `code`: 代碼
- `document`: 文檔
- `comment`: 評論
- `meeting`: 會議
- `calendar`: 日程
- `contact`: 聯繫人
- `other`: 其他

## 搜索功能特性

### 全文搜索
- 支持中英文搜索
- 模糊匹配和同義詞
- 字段權重設置（標題 > 內容 > 描述 > 標籤）
- 語法高亮

### 高級過濾
- 資源類型過濾
- 項目和團隊範圍過濾
- 標籤過濾
- 日期範圍過濾
- 創建者過濾

### 排序選項
- 相關性排序（_score）
- 創建時間排序（created_at）
- 更新時間排序（updated_at）
- 熱門度排序（popularity）

### 權限控制
- 基於用戶權限的搜索結果過濾
- 創建者權限
- 項目成員權限
- 自定義權限級別

### 搜索建議
- 實時搜索建議
- 基於歷史搜索的智能提示
- 熱門搜索詞推薦

### 個性化推薦
- 基於用戶行為的個性化推薦
- 相關內容推薦
- 協同過濾推薦

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

### 搜索結果格式
```json
{
  "code": "S10000",
  "msg": "搜索成功",
  "content": {
    "total": 150,
    "results": [
      {
        "id": "resource_id",
        "resource_type": "file",
        "title": "文件標題",
        "content": "文件內容摘要...",
        "description": "文件描述",
        "tags": ["標籤1", "標籤2"],
        "creator_id": "user_id",
        "created_at": "2025-01-09T10:30:00Z",
        "updated_at": "2025-01-09T11:00:00Z",
        "score": 8.5,
        "highlight": {
          "title": ["<em>關鍵字</em>"],
          "content": ["包含<em>關鍵字</em>的內容..."]
        }
      }
    ],
    "took": 15,
    "facets": {
      "resource_types": [
        {"value": "file", "count": 89},
        {"value": "wiki", "count": 34}
      ],
      "tags": [
        {"value": "重要", "count": 12},
        {"value": "項目", "count": 8}
      ]
    }
  }
}
```

### 搜索建議格式
```json
{
  "code": "S10000",
  "msg": "獲取搜索建議成功",
  "content": {
    "suggestions": [
      {
        "text": "搜索建議文本",
        "score": 8.5
      }
    ]
  }
}
```

### 推薦結果格式
```json
{
  "code": "S10000",
  "msg": "獲取推薦成功",
  "content": {
    "recommendations": [
      {
        "id": "resource_id",
        "resource_type": "project",
        "title": "推薦項目",
        "description": "項目描述",
        "popularity_score": 7.8,
        "updated_at": "2025-01-09T10:30:00Z"
      }
    ]
  }
}
```

### 分析報告格式
```json
{
  "code": "S10000",
  "msg": "獲取搜索分析成功",
  "content": {
    "total_searches": 1250,
    "popular_queries": [
      {"query": "API文檔", "count": 45},
      {"query": "用戶管理", "count": 32}
    ],
    "query_types": [
      {"type": "basic", "count": 890},
      {"type": "advanced", "count": 240}
    ],
    "daily_searches": [
      {"date": "2025-01-08", "count": 125},
      {"date": "2025-01-09", "count": 143}
    ],
    "avg_results_count": 24.5
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
- **F42201**: 搜索查詢無效
- **F42202**: 資源不存在
- **F42203**: 索引不存在
- **F42204**: 過濾器無效
- **F42205**: 搜索超時
- **F50000**: 內部服務器錯誤
- **F50301**: Elasticsearch錯誤
- **F50302**: 索引錯誤
- **F50303**: 搜索服務不可用

## 健康檢查

### 服務健康檢查
```
GET /health
```

響應示例：
```json
{
  "code": "S10000",
  "msg": "服務正常",
  "content": {
    "status": "healthy",
    "service": "search-service",
    "timestamp": "2025-01-09T10:30:00Z",
    "version": "1.0.0",
    "elasticsearch": "connected",
    "cache": "connected",
    "cluster_health": {
      "status": "green",
      "cluster_name": "elasticsearch",
      "number_of_nodes": 3,
      "number_of_data_nodes": 3
    }
  }
}
```

### 搜索統計
```
GET /search/stats
```

響應示例：
```json
{
  "code": "S10000",
  "msg": "獲取統計信息成功",
  "content": {
    "total_documents": 15678,
    "index_size": 2048576,
    "service_status": "running",
    "last_updated": "2025-01-09T10:30:00Z"
  }
}
```

## 使用示例

### JavaScript/Fetch 搜索示例
```javascript
// 全局搜索
const searchQuery = "API文檔";
fetch(`/search?query=${encodeURIComponent(searchQuery)}&page=1&size=20`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('搜索結果:', data.content.results);
  console.log('總數:', data.content.total);
});

// 高級搜索
const advancedSearch = {
  query: "用戶管理",
  resource_types: ["file", "wiki"],
  tags: ["重要"],
  date_from: "2025-01-01T00:00:00Z",
  page: 1,
  size: 20
};

fetch('/search/advanced', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(advancedSearch)
})
.then(response => response.json())
.then(data => console.log(data));

// 索引資源
const resourceData = {
  resource_type: "file",
  title: "新文檔",
  content: "文檔內容...",
  tags: ["重要", "文檔"],
  creator_id: "user123",
  project_id: "project456"
};

fetch('/internal/search/index', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(resourceData)
})
.then(response => response.json())
.then(data => console.log(data));
```

### cURL 使用示例
```bash
# 全局搜索
curl -X GET \
  "http://localhost:8091/search?query=API%E6%96%87%E6%AA%94&page=1&size=20" \
  -H "Content-Type: application/json"

# 高級搜索
curl -X POST \
  http://localhost:8091/search/advanced \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "用戶管理",
    "resource_types": ["file", "wiki"],
    "tags": ["重要"],
    "page": 1,
    "size": 20
  }'

# 索引資源
curl -X POST \
  http://localhost:8091/internal/search/index \
  -H "Content-Type: application/json" \
  -d '{
    "resource_type": "file",
    "title": "新文檔",
    "content": "文檔內容...",
    "tags": ["重要", "文檔"],
    "creator_id": "user123",
    "project_id": "project456"
  }'

# 獲取搜索建議
curl -X GET \
  "http://localhost:8091/search/suggest?query=API&size=5" \
  -H "Content-Type: application/json"

# 獲取個性化推薦
curl -X GET \
  "http://localhost:8091/search/recommendations?size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 性能優化

### 搜索性能
- Elasticsearch集群優化
- 索引分片和副本配置
- 查詢緩存和結果緩存
- 異步索引更新

### 緩存策略
- Redis緩存熱門搜索結果
- 搜索建議緩存
- 用戶個性化推薦緩存
- 過濾器選項緩存

### 分頁優化
- 深分頁優化
- 游標分頁支持
- 搜索結果預取

## 監控和日志

### 搜索指標
- 搜索QPS和響應時間
- 搜索成功率和錯誤率
- 熱門搜索詞統計
- 用戶搜索行為分析

### 系統監控
- Elasticsearch集群狀態
- 索引大小和文檔數量
- 內存和CPU使用率
- 緩存命中率

### 日志記錄
- 搜索查詢日志
- 索引操作日志
- 錯誤和異常日志
- 性能監控日志