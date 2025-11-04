# File Service API Documentation

本文檔描述了文件服務的所有API端點，完全按照設計方案實現。

## API 基礎信息

- **服務名稱**: File Service
- **API 版本**: v1
- **基礎路徑**: /
- **認證方式**: JWT Token

## 文件上傳 API

### 1. 單文件上傳
```
POST /files/upload
```
請求類型：multipart/form-data
- `file`: 上傳的文件
- `project_id`: 項目ID（可選）
- `folder_id`: 文件夾ID（可選）

### 2. 批量文件上傳
```
POST /files/upload/multiple
```
請求類型：multipart/form-data
- `files[]`: 上傳的文件數組
- `project_id`: 項目ID（可選）
- `folder_id`: 文件夾ID（可選）

### 3. 開始分塊上傳
```
POST /files/upload/chunk
```
請求體：
- `filename`: 文件名
- `file_size`: 文件總大小
- `chunk_size`: 分塊大小

### 4. 上傳文件分塊
```
PUT /files/upload/chunk
```
請求類型：multipart/form-data
- `upload_id`: 上傳會話ID
- `chunk_number`: 分塊編號
- `chunk`: 分塊數據

### 5. 完成分塊上傳
```
POST /files/upload/complete
```
請求體：
- `upload_id`: 上傳會話ID

## 文件管理 API

### 1. 獲取文件信息
```
GET /files/{file_id}
```

### 2. 更新文件信息
```
PUT /files/{file_id}
```
請求體：
- `name`: 文件名稱（可選）
- `folder_id`: 文件夾ID（可選）
- `is_public`: 是否公開（可選）

### 3. 刪除文件
```
DELETE /files/{file_id}
```

### 4. 複製文件
```
POST /files/{file_id}/copy
```
請求體：
- `name`: 新文件名稱（可選）
- `project_id`: 目標項目ID（可選）
- `folder_id`: 目標文件夾ID（可選）

### 5. 移動文件
```
POST /files/{file_id}/move
```
請求體：
- `project_id`: 目標項目ID（可選）
- `folder_id`: 目標文件夾ID（可選）

## 文件訪問 API

### 1. 下載文件
```
GET /files/{file_id}/download
```

### 2. 預覽文件
```
GET /files/{file_id}/preview
```

### 3. 獲取縮略圖
```
GET /files/{file_id}/thumbnail
```

### 4. 流式訪問文件
```
GET /files/{file_id}/stream
```
支持HTTP Range請求，用於視頻等大文件的分段下載

## 文件版本 API

### 1. 獲取版本列表
```
GET /files/{file_id}/versions
```

### 2. 上傳新版本
```
POST /files/{file_id}/versions
```
請求類型：multipart/form-data
- `file`: 新版本文件
- `change_description`: 變更描述（可選）

### 3. 下載指定版本
```
GET /files/{file_id}/versions/{version}
```

### 4. 恢復到指定版本
```
POST /files/{file_id}/restore/{version}
```

## 文件分享 API

### 1. 創建分享鏈接
```
POST /files/{file_id}/share
```
請求體：
- `password`: 密碼（可選）
- `expires_at`: 過期時間（可選）
- `max_downloads`: 最大下載次數（可選）
- `allow_preview`: 允許預覽（默認：true）
- `allow_download`: 允許下載（默認：true）

### 2. 訪問分享文件
```
GET /files/shared/{share_token}
```
查詢參數：
- `password`: 分享密碼（如果設置了密碼）

### 3. 更新分享設置
```
PUT /shares/{share_id}
```
請求體：
- `password`: 密碼（可選）
- `expires_at`: 過期時間（可選）
- `max_downloads`: 最大下載次數（可選）
- `allow_preview`: 允許預覽（可選）
- `allow_download`: 允許下載（可選）

### 4. 刪除分享
```
DELETE /shares/{share_id}
```

## 文件夾管理 API

### 1. 創建文件夾
```
POST /folders
```
請求體：
- `name`: 文件夾名稱
- `parent_id`: 父文件夾ID（可選）
- `project_id`: 項目ID
- `description`: 描述（可選）

### 2. 獲取文件夾內容
```
GET /folders/{folder_id}
```
查詢參數：
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）

### 3. 更新文件夾
```
PUT /folders/{folder_id}
```
請求體：
- `name`: 文件夾名稱（可選）
- `parent_id`: 父文件夾ID（可選）
- `description`: 描述（可選）

### 4. 刪除文件夾
```
DELETE /folders/{folder_id}
```

## 項目文件 API

### 1. 獲取項目文件列表
```
GET /projects/{project_id}/files
```
查詢參數：
- `keyword`: 搜尋關鍵字（可選）
- `mime_type`: MIME類型過濾（可選）
- `page`: 頁碼（默認：1）
- `size`: 每頁數量（默認：20）
- `sort_by`: 排序字段（name/size/uploaded_at）
- `sort_order`: 排序方向（asc/desc）

### 2. 獲取存儲使用情況
```
GET /projects/{project_id}/storage-usage
```

## 文件轉換 API

### 1. 文件格式轉換
```
POST /files/{file_id}/convert
```
請求體：
- `target_format`: 目標格式（pdf/jpg/png/docx/xlsx）
- `conversion_params`: 轉換參數（可選）

### 2. 獲取轉換狀態
```
GET /files/{file_id}/convert-status
```

### 3. 獲取轉換結果
```
GET /files/{file_id}/convert-result
```

## 支持的文件類型

### 圖片文件
- .jpg, .jpeg, .png, .gif, .bmp, .svg, .webp

### 文檔文件
- .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .md

### 壓縮文件
- .zip, .rar, .7z, .tar, .gz

### 多媒體文件
- .mp4, .avi, .mov, .wmv (視頻)
- .mp3, .wav, .flac, .aac, .ogg (音頻)

## 文件大小限制

- 單文件最大: 100MB
- 分塊上傳塊大小: 1MB
- 批量上傳最大文件數: 50個

## 安全特性

### 病毒掃描
- 支持上傳文件病毒掃描
- 掃描狀態：pending/clean/infected/error

### 文件訪問日志
- 記錄所有文件訪問行為
- 包括查看、下載、預覽操作

### 權限控制
- 文件所有者權限管理
- 項目級別權限控制
- 分享鏈接權限控制

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

錯誤響應：

```json
{
  "code": "F10001",
  "msg": "錯誤信息",
  "content": []
}
```

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
    "service": "file-service",
    "timestamp": "2025-01-09 10:30:00",
    "version": "1.0.0",
    "database": "connected",
    "storage": "accessible"
  }
}
```

## 錯誤代碼

- **S10000**: 操作成功
- **F40001**: 未授權訪問
- **F40003**: 權限不足
- **F40004**: 文件不存在
- **F40022**: 請求參數驗證失敗
- **F41301**: 文件大小超出限制
- **F42201**: 文件已存在
- **F42202**: 不支持的文件類型
- **F50000**: 內部服務器錯誤
- **F50001**: 數據庫錯誤
- **F50003**: 文件系統錯誤

## 使用示例

### JavaScript/Fetch 上傳示例
```javascript
// 單文件上傳
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('project_id', 'project-123');

fetch('/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### cURL 上傳示例
```bash
# 單文件上傳
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "project_id=project-123" \
  http://localhost:8090/files/upload

# 下載文件
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_file.pdf \
  http://localhost:8090/files/{file_id}/download
```