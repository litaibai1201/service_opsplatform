# -*- coding: utf-8 -*-
"""
@文件: db_design_serialize.py
@說明: 數據庫設計序列化 (Database Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, post_load
from typing import Dict, Any


class ColumnSchema(Schema):
    """數據庫列Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    type = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    length = fields.Int(allow_none=True, validate=validate.Range(min=1))
    precision = fields.Int(allow_none=True, validate=validate.Range(min=1))
    scale = fields.Int(allow_none=True, validate=validate.Range(min=0))
    nullable = fields.Bool(load_default=True)
    default_value = fields.Str(allow_none=True)
    auto_increment = fields.Bool(load_default=False)
    primary_key = fields.Bool(load_default=False)
    unique = fields.Bool(load_default=False)
    comment = fields.Str(allow_none=True, validate=validate.Length(max=500))
    foreign_key = fields.Dict(allow_none=True)


class IndexSchema(Schema):
    """數據庫索引Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    type = fields.Str(load_default="btree", validate=validate.OneOf(["btree", "hash", "fulltext", "spatial"]))
    columns = fields.List(fields.Str(), required=True, validate=validate.Length(min=1))
    unique = fields.Bool(load_default=False)
    comment = fields.Str(allow_none=True, validate=validate.Length(max=500))


class TriggerSchema(Schema):
    """數據庫觸發器Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    event = fields.Str(required=True, validate=validate.OneOf(["insert", "update", "delete"]))
    timing = fields.Str(required=True, validate=validate.OneOf(["before", "after"]))
    definition = fields.Str(required=True)


class PartitioningSchema(Schema):
    """分區Schema"""
    type = fields.Str(required=True, validate=validate.OneOf(["range", "hash", "list"]))
    column = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    partitions = fields.List(fields.Dict(), load_default=list)


class TableSchema(Schema):
    """數據庫表Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    comment = fields.Str(allow_none=True, validate=validate.Length(max=500))
    columns = fields.List(fields.Nested(ColumnSchema), load_default=list)
    indexes = fields.List(fields.Nested(IndexSchema), load_default=list)
    triggers = fields.List(fields.Nested(TriggerSchema), load_default=list)
    partitioning = fields.Nested(PartitioningSchema, allow_none=True)


class ViewSchema(Schema):
    """數據庫視圖Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    definition = fields.Str(required=True)
    comment = fields.Str(allow_none=True, validate=validate.Length(max=500))
    dependencies = fields.List(fields.Str(), load_default=list)


class ProcedureSchema(Schema):
    """存儲過程Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    parameters = fields.List(fields.Dict(), load_default=list)
    definition = fields.Str(required=True)
    comment = fields.Str(allow_none=True, validate=validate.Length(max=500))


class FunctionSchema(Schema):
    """函數Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    parameters = fields.List(fields.Dict(), load_default=list)
    return_type = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    definition = fields.Str(required=True)
    comment = fields.Str(allow_none=True, validate=validate.Length(max=500))


class SchemaSchema(Schema):
    """數據庫架構Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    tables = fields.List(fields.Nested(TableSchema), load_default=list)
    views = fields.List(fields.Nested(ViewSchema), load_default=list)
    procedures = fields.List(fields.Nested(ProcedureSchema), load_default=list)
    functions = fields.List(fields.Nested(FunctionSchema), load_default=list)


class RelationshipSchema(Schema):
    """表關係Schema"""
    from_table = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    from_column = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    to_table = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    to_column = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    type = fields.Str(required=True, validate=validate.OneOf(["one-to-one", "one-to-many", "many-to-many"]))
    cardinality = fields.Str(allow_none=True)
    description = fields.Str(allow_none=True, validate=validate.Length(max=500))


class OptimizationSchema(Schema):
    """優化信息Schema"""
    performance_analysis = fields.Dict(load_default=dict)
    index_suggestions = fields.List(fields.Dict(), load_default=list)
    normalization_level = fields.Str(load_default="3NF")
    query_optimization = fields.List(fields.Dict(), load_default=list)


class DataDictionarySchema(Schema):
    """數據字典Schema"""
    business_terms = fields.Dict(load_default=dict)
    data_lineage = fields.Dict(load_default=dict)
    privacy_classifications = fields.Dict(load_default=dict)


class DatabaseDesignCreateSchema(Schema):
    """創建數據庫設計Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(allow_none=True, validate=validate.Length(max=1000))
    db_type = fields.Str(load_default="mysql", validate=validate.OneOf(["mysql", "postgresql", "mongodb", "redis", "oracle"]))
    version = fields.Str(load_default="1.0.0", validate=validate.Length(min=1, max=20))
    schemas = fields.List(fields.Nested(SchemaSchema), allow_none=True)
    relationships = fields.List(fields.Nested(RelationshipSchema), allow_none=True)
    optimization = fields.Nested(OptimizationSchema, allow_none=True)
    data_dictionary = fields.Nested(DataDictionarySchema, allow_none=True)


class DatabaseDesignUpdateSchema(Schema):
    """更新數據庫設計Schema"""
    name = fields.Str(allow_none=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(allow_none=True, validate=validate.Length(max=1000))
    db_type = fields.Str(allow_none=True, validate=validate.OneOf(["mysql", "postgresql", "mongodb", "redis", "oracle"]))
    version = fields.Str(allow_none=True, validate=validate.Length(min=1, max=20))
    schemas = fields.List(fields.Nested(SchemaSchema), allow_none=True)
    relationships = fields.List(fields.Nested(RelationshipSchema), allow_none=True)
    optimization = fields.Nested(OptimizationSchema, allow_none=True)
    data_dictionary = fields.Nested(DataDictionarySchema, allow_none=True)


class DatabaseDesignDuplicateSchema(Schema):
    """複製數據庫設計Schema"""
    new_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))


class ERDGenerateSchema(Schema):
    """生成ERD圖Schema"""
    layout = fields.Str(load_default="auto", validate=validate.OneOf(["auto", "circular", "hierarchical", "grid"]))


class ERDUpdateSchema(Schema):
    """更新ERD圖Schema"""
    entities = fields.List(fields.Dict(), allow_none=True)
    relationships = fields.List(fields.Nested(RelationshipSchema), allow_none=True)


class ValidateDesignSchema(Schema):
    """驗證設計Schema"""
    strict_mode = fields.Bool(load_default=False)


class NormalizeDesignSchema(Schema):
    """規範化分析Schema"""
    target_level = fields.Str(load_default="3NF", validate=validate.OneOf(["1NF", "2NF", "3NF", "BCNF", "4NF", "5NF"]))


class GenerateSQLSchema(Schema):
    """生成SQL腳本Schema"""
    script_type = fields.Str(load_default="ddl", validate=validate.OneOf(["ddl", "dml", "all"]))


class GenerateMigrationSchema(Schema):
    """生成遷移腳本Schema"""
    target_version = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    migration_type = fields.Str(load_default="forward", validate=validate.OneOf(["forward", "rollback"]))


class GenerateDocumentationSchema(Schema):
    """生成文檔Schema"""
    format = fields.Str(load_default="html", validate=validate.OneOf(["html", "markdown", "pdf", "json"]))


class GenerateORMModelsSchema(Schema):
    """生成ORM模型Schema"""
    orm_type = fields.Str(load_default="sqlalchemy", validate=validate.OneOf(["sqlalchemy", "django", "sequelize", "typeorm"]))
    language = fields.Str(load_default="python", validate=validate.OneOf(["python", "javascript", "typescript", "java", "csharp"]))


class ConnectionConfigSchema(Schema):
    """數據庫連接配置Schema"""
    type = fields.Str(required=True, validate=validate.OneOf(["mysql", "postgresql", "mongodb", "redis", "oracle"]))
    host = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    port = fields.Int(required=True, validate=validate.Range(min=1, max=65535))
    database = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    username = fields.Str(allow_none=True, validate=validate.Length(max=100))
    password = fields.Str(allow_none=True, validate=validate.Length(max=255))
    ssl = fields.Bool(load_default=False)
    charset = fields.Str(load_default="utf8mb4")


class ReverseEngineerSchema(Schema):
    """逆向工程Schema"""
    connection_config = fields.Nested(ConnectionConfigSchema, required=True)
    project_id = fields.Str(required=True, validate=validate.Length(min=1, max=50))


class ImportSQLSchema(Schema):
    """導入SQL腳本Schema"""
    sql_script = fields.Str(required=True, validate=validate.Length(min=1))
    project_id = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    design_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))


class CompareDesignsSchema(Schema):
    """比較設計Schema"""
    target_design_id = fields.Str(required=True, validate=validate.Length(min=1, max=50))


class SyncDatabaseSchema(Schema):
    """同步到數據庫Schema"""
    target_connection = fields.Nested(ConnectionConfigSchema, required=True)


# Migration Schemas
class MigrationCreateSchema(Schema):
    """創建遷移Schema"""
    version_from = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    version_to = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    migration_script = fields.Str(required=True)
    rollback_script = fields.Str(allow_none=True)


# Response Schemas
class DatabaseDesignResponseSchema(Schema):
    """數據庫設計響應Schema"""
    _id = fields.Str()
    project_id = fields.Str()
    name = fields.Str()
    description = fields.Str(allow_none=True)
    db_type = fields.Str()
    version = fields.Str()
    schemas = fields.List(fields.Nested(SchemaSchema))
    relationships = fields.List(fields.Nested(RelationshipSchema))
    optimization = fields.Nested(OptimizationSchema)
    data_dictionary = fields.Nested(DataDictionarySchema)
    created_by = fields.Str()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class MigrationResponseSchema(Schema):
    """遷移響應Schema"""
    _id = fields.Str()
    design_id = fields.Str()
    version_from = fields.Str()
    version_to = fields.Str()
    migration_script = fields.Str()
    rollback_script = fields.Str()
    applied = fields.Bool()
    applied_at = fields.DateTime(allow_none=True)
    created_by = fields.Str()
    created_at = fields.DateTime()


class ERDResponseSchema(Schema):
    """ERD響應Schema"""
    entities = fields.List(fields.Dict())
    relationships = fields.List(fields.Nested(RelationshipSchema))
    metadata = fields.Dict()


class ValidationResponseSchema(Schema):
    """驗證結果響應Schema"""
    is_valid = fields.Bool()
    errors = fields.List(fields.Str())
    warnings = fields.List(fields.Str())
    suggestions = fields.List(fields.Str())
    metrics = fields.Dict()


class OptimizationResponseSchema(Schema):
    """優化建議響應Schema"""
    performance_analysis = fields.Dict()
    index_suggestions = fields.List(fields.Dict())
    normalization_level = fields.Str()
    query_optimization = fields.List(fields.Dict())


class SQLGenerationResponseSchema(Schema):
    """SQL生成響應Schema"""
    script_type = fields.Str()
    sql_script = fields.Str()
    db_type = fields.Str()
    generated_at = fields.DateTime()


class DocumentationResponseSchema(Schema):
    """文檔生成響應Schema"""
    format = fields.Str()
    documentation = fields.Str()
    generated_at = fields.DateTime()


class ORMModelsResponseSchema(Schema):
    """ORM模型生成響應Schema"""
    orm_type = fields.Str()
    language = fields.Str()
    model_code = fields.Str()
    generated_at = fields.DateTime()


class ComparisonResponseSchema(Schema):
    """比較結果響應Schema"""
    differences = fields.List(fields.Str())
    additions = fields.List(fields.Str())
    deletions = fields.List(fields.Str())
    modifications = fields.List(fields.Str())
    summary = fields.Dict()


class SyncResponseSchema(Schema):
    """同步響應Schema"""
    sync_script = fields.Str()
    target_database = fields.Str()
    estimated_operations = fields.Int()
    requires_confirmation = fields.Bool()