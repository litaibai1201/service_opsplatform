# -*- coding: utf-8 -*-
"""
@文件: api_design_serialize.py
@說明: API設計序列化模式 (API Design Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError


class EnvironmentSchema(Schema):
    """環境配置模式"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    base_url = fields.Url(required=True)
    headers = fields.Dict(missing={})
    auth_config = fields.Dict(missing={})
    variables = fields.Dict(missing={})


class TestCaseSchema(Schema):
    """測試用例模式"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    method = fields.Str(required=True, validate=validate.OneOf(["GET", "POST", "PUT", "DELETE", "PATCH"]))
    path = fields.Str(required=True, validate=validate.Length(min=1))
    headers = fields.Dict(missing={})
    request_body = fields.Dict(allow_none=True, missing=None)
    expected_status = fields.Int(missing=200, validate=validate.Range(min=100, max=599))
    expected_response = fields.Dict(allow_none=True, missing=None)


class TestingConfigSchema(Schema):
    """測試配置模式"""
    test_cases = fields.List(fields.Nested(TestCaseSchema), missing=[])
    coverage_report = fields.Dict(missing={})
    performance_metrics = fields.Dict(missing={})
    last_test_run = fields.DateTime(allow_none=True, missing=None)


class DocumentationSchema(Schema):
    """文檔配置模式"""
    examples = fields.List(fields.Dict(), missing=[])
    guides = fields.List(fields.Dict(), missing=[])
    changelogs = fields.List(fields.Dict(), missing=[])
    auto_generated = fields.Bool(missing=False)


class CollaborationSchema(Schema):
    """協作配置模式"""
    reviewers = fields.List(fields.Str(), missing=[])
    approval_status = fields.Str(missing="pending", validate=validate.OneOf(["pending", "approved", "rejected"]))
    comments = fields.List(fields.Dict(), missing=[])


class ApiSpecCreateSchema(Schema):
    """創建API規範模式"""
    project_id = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(missing="", validate=validate.Length(max=1000))
    type = fields.Str(
        missing="rest",
        validate=validate.OneOf(["rest", "graphql", "grpc", "websocket"])
    )
    spec = fields.Dict(missing=None)
    version = fields.Str(missing="1.0.0", validate=validate.Length(min=1, max=20))
    status = fields.Str(
        missing="draft",
        validate=validate.OneOf(["draft", "review", "published", "deprecated"])
    )
    environments = fields.List(fields.Nested(EnvironmentSchema), missing=None)


class ApiSpecUpdateSchema(Schema):
    """更新API規範模式"""
    name = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=1000))
    type = fields.Str(validate=validate.OneOf(["rest", "graphql", "grpc", "websocket"]))
    spec = fields.Dict()
    version = fields.Str(validate=validate.Length(min=1, max=20))
    status = fields.Str(validate=validate.OneOf(["draft", "review", "published", "deprecated"]))
    environments = fields.List(fields.Nested(EnvironmentSchema))
    testing = fields.Nested(TestingConfigSchema)
    documentation = fields.Nested(DocumentationSchema)
    collaboration = fields.Nested(CollaborationSchema)


class ApiSpecDuplicateSchema(Schema):
    """複製API規範模式"""
    new_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))


class ApiSpecVersionSchema(Schema):
    """API規範版本模式"""
    new_version = fields.Str(required=True, validate=validate.Length(min=1, max=20))


class ApiSpecValidateSchema(Schema):
    """API規範驗證模式"""
    strict_mode = fields.Bool(missing=False)
    custom_rules = fields.List(fields.Dict(), missing=[])


class ApiSpecTestSchema(Schema):
    """API規範測試模式"""
    environment = fields.Str(missing="dev", validate=validate.Length(min=1, max=50))
    test_config = fields.Dict(missing=None)


class TestSuiteCreateSchema(Schema):
    """創建測試套件模式"""
    test_cases = fields.List(fields.Nested(TestCaseSchema), required=True, validate=validate.Length(min=1))


class DocumentationGenerateSchema(Schema):
    """生成文檔模式"""
    doc_type = fields.Str(missing="html", validate=validate.OneOf(["html", "markdown", "json"]))


class DocumentationExportSchema(Schema):
    """導出文檔模式"""
    export_format = fields.Str(
        missing="html",
        validate=validate.OneOf(["json", "yaml", "html", "pdf", "markdown"])
    )


class ResponseScenarioSchema(Schema):
    """響應場景模式"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    condition = fields.Dict(missing={})
    response = fields.Dict(required=True)
    delay_ms = fields.Int(missing=100, validate=validate.Range(min=0, max=10000))


class ApiMockCreateSchema(Schema):
    """創建Mock數據模式"""
    endpoint_path = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    method = fields.Str(
        required=True,
        validate=validate.OneOf(["GET", "POST", "PUT", "DELETE", "PATCH"])
    )
    mock_data = fields.Dict(required=True)
    rules = fields.Dict(missing={})
    response_scenarios = fields.List(fields.Nested(ResponseScenarioSchema), missing=None)


class ApiMockUpdateSchema(Schema):
    """更新Mock數據模式"""
    endpoint_path = fields.Str(validate=validate.Length(min=1, max=200))
    method = fields.Str(validate=validate.OneOf(["GET", "POST", "PUT", "DELETE", "PATCH"]))
    mock_data = fields.Dict()
    rules = fields.Dict()
    response_scenarios = fields.List(fields.Nested(ResponseScenarioSchema))
    is_active = fields.Bool()


class MockActivateSchema(Schema):
    """激活Mock模式"""
    is_active = fields.Bool(required=True)


class CodeGenerateClientSchema(Schema):
    """生成客戶端代碼模式"""
    language = fields.Str(
        missing="javascript",
        validate=validate.OneOf(["javascript", "python", "java", "csharp", "go", "swift"])
    )
    options = fields.Dict(missing={})


class CodeGenerateServerSchema(Schema):
    """生成服務端代碼模式"""
    framework = fields.Str(
        missing="express",
        validate=validate.OneOf(["express", "flask", "spring", "aspnet", "gin", "django"])
    )
    options = fields.Dict(missing={})


class ApiSpecQuerySchema(Schema):
    """API規範查詢模式"""
    type = fields.Str(validate=validate.OneOf(["rest", "graphql", "grpc", "websocket"]))
    status = fields.Str(validate=validate.OneOf(["draft", "review", "published", "deprecated"]))
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    limit = fields.Int(missing=20, validate=validate.Range(min=1, max=100))


class AnalyticsQuerySchema(Schema):
    """分析查詢模式"""
    days = fields.Int(missing=30, validate=validate.Range(min=1, max=365))


class PerformanceQuerySchema(Schema):
    """性能查詢模式"""
    days = fields.Int(missing=7, validate=validate.Range(min=1, max=90))


class UsageRecordSchema(Schema):
    """使用記錄模式"""
    endpoint = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    method = fields.Str(
        required=True,
        validate=validate.OneOf(["GET", "POST", "PUT", "DELETE", "PATCH"])
    )
    response_time = fields.Float(allow_none=True, validate=validate.Range(min=0))
    status_code = fields.Int(missing=200, validate=validate.Range(min=100, max=599))