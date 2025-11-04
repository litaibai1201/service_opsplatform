# Database Design Service API Documentation

本文檔描述了數據庫設計服務的所有API端點，完全按照設計方案實現。

## API 基礎信息

- **服務名稱**: Database Design Service
- **API 版本**: v1
- **基礎路徑**: /
- **認證方式**: JWT Token

## 數據庫設計管理 API

### 1. 獲取數據庫設計列表
```
GET /projects/{project_id}/db-designs
```
查詢參數：
- `page`: 頁碼（默認：1）
- `limit`: 每頁數量（默認：20）
- `db_type`: 數據庫類型過濾

### 2. 創建數據庫設計
```
POST /projects/{project_id}/db-designs
```

### 3. 獲取數據庫設計詳情
```
GET /db-designs/{design_id}
```
查詢參數：
- `full`: 是否包含完整數據（默認：true）

### 4. 更新數據庫設計
```
PUT /db-designs/{design_id}
```

### 5. 刪除數據庫設計
```
DELETE /db-designs/{design_id}
```

### 6. 複製數據庫設計
```
POST /db-designs/{design_id}/duplicate
```

## ERD 管理 API

### 1. 獲取ERD圖
```
GET /db-designs/{design_id}/erd
```

### 2. 生成ERD圖
```
POST /db-designs/{design_id}/erd/generate
```

### 3. 更新ERD圖
```
PUT /db-designs/{design_id}/erd
```

## 驗證和優化 API

### 1. 驗證設計
```
POST /db-designs/{design_id}/validate
```

### 2. 獲取優化建議
```
POST /db-designs/{design_id}/optimize
```

### 3. 性能分析
```
POST /db-designs/{design_id}/analyze
```

### 4. 規範化分析
```
POST /db-designs/{design_id}/normalize
```

## 代碼生成 API

### 1. 生成SQL腳本
```
POST /db-designs/{design_id}/generate-sql
```

### 2. 生成遷移腳本
```
POST /db-designs/{design_id}/generate-migration
```

### 3. 生成數據庫文檔
```
POST /db-designs/{design_id}/generate-docs
```

### 4. 生成ORM模型
```
POST /db-designs/{design_id}/generate-models
```

## 逆向工程 API

### 1. 從現有數據庫逆向生成設計
```
POST /db-designs/reverse-engineer
```

### 2. 從SQL腳本導入設計
```
POST /db-designs/import-sql
```

## 比較和同步 API

### 1. 比較不同版本
```
POST /db-designs/{design_id}/compare
```

### 2. 同步到目標數據庫
```
POST /db-designs/{design_id}/sync
```

### 3. 獲取版本差異
```
GET /db-designs/{design_id}/diff/{target_version}
```

## 遷移管理 API

### 1. 獲取遷移列表
```
GET /db-designs/{design_id}/migrations
```

### 2. 應用遷移
```
POST /migrations/{migration_id}/apply
```

### 3. 回滾遷移
```
POST /migrations/{migration_id}/rollback
```

## 支持的數據庫類型

- MySQL
- PostgreSQL
- MongoDB
- Redis
- Oracle

## 支持的數據格式

### 索引類型
- btree
- hash
- fulltext
- spatial

### 文檔格式
- HTML
- Markdown
- PDF
- JSON

### ORM類型
- SQLAlchemy (Python)
- Django ORM (Python)
- Sequelize (JavaScript)
- TypeORM (TypeScript)

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

## 權限說明

本服務按照設計方案實現，不涉及複雜的權限管理，僅通過JWT Token進行基礎認證。