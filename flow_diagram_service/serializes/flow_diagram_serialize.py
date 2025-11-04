# -*- coding: utf-8 -*-
"""
@文件: flow_diagram_serialize.py
@說明: 流程圖序列化模式 (Flow Diagram Service)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError


class NodeDataSchema(Schema):
    """節點數據模式"""
    label = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(missing="", validate=validate.Length(max=500))
    conditions = fields.List(fields.Raw(), missing=[])
    duration = fields.Float(missing=1.0, validate=validate.Range(min=0))
    responsible = fields.Str(missing="", validate=validate.Length(max=100))
    properties = fields.Dict(missing={})


class NodePositionSchema(Schema):
    """節點位置模式"""
    x = fields.Float(required=True)
    y = fields.Float(required=True)


class FlowNodeSchema(Schema):
    """流程節點模式"""
    id = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    type = fields.Str(
        required=True,
        validate=validate.OneOf([
            "start", "process", "decision", "end", "parallel", "timer", "gateway"
        ])
    )
    position = fields.Nested(NodePositionSchema, required=True)
    data = fields.Nested(NodeDataSchema, required=True)


class FlowEdgeSchema(Schema):
    """流程邊模式"""
    id = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    source = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    target = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    label = fields.Str(missing="", validate=validate.Length(max=100))
    conditions = fields.Dict(missing={})
    probability = fields.Float(missing=1.0, validate=validate.Range(min=0, max=1))


class FlowDataSchema(Schema):
    """流程數據模式"""
    nodes = fields.List(fields.Nested(FlowNodeSchema), required=True)
    edges = fields.List(fields.Nested(FlowEdgeSchema), required=True)


class ValidationRulesSchema(Schema):
    """驗證規則模式"""
    required_nodes = fields.List(fields.Str(), missing=["start", "end"])
    forbidden_loops = fields.Bool(missing=False)
    max_complexity = fields.Int(missing=100, validate=validate.Range(min=1))
    custom_rules = fields.List(fields.Dict(), missing=[])


class SharingSchema(Schema):
    """分享配置模式"""
    is_public = fields.Bool(missing=False)
    share_token = fields.Str(allow_none=True, missing=None)


class FlowDiagramCreateSchema(Schema):
    """創建流程圖模式"""
    project_id = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(missing="", validate=validate.Length(max=1000))
    type = fields.Str(
        missing="business_process",
        validate=validate.OneOf([
            "business_process", "system_flow", "user_journey", "workflow", "decision_tree"
        ])
    )
    flow_data = fields.Nested(FlowDataSchema, missing=None)
    validation_rules = fields.Nested(ValidationRulesSchema, missing=None)


class FlowDiagramUpdateSchema(Schema):
    """更新流程圖模式"""
    name = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=1000))
    type = fields.Str(
        validate=validate.OneOf([
            "business_process", "system_flow", "user_journey", "workflow", "decision_tree"
        ])
    )
    flow_data = fields.Nested(FlowDataSchema)
    validation_rules = fields.Nested(ValidationRulesSchema)


class FlowDiagramDuplicateSchema(Schema):
    """複製流程圖模式"""
    new_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))


class SimulationConfigSchema(Schema):
    """模擬配置模式"""
    iterations = fields.Int(missing=1000, validate=validate.Range(min=1, max=10000))
    enable_timing = fields.Bool(missing=True)
    enable_probability = fields.Bool(missing=True)
    random_seed = fields.Int(allow_none=True, missing=None)


class FlowDiagramValidateSchema(Schema):
    """流程圖驗證模式"""
    strict_mode = fields.Bool(missing=False)
    custom_rules = fields.List(fields.Dict(), missing=[])


class FlowDiagramSimulateSchema(Schema):
    """流程圖模擬模式"""
    simulation_config = fields.Nested(SimulationConfigSchema, missing=None)
    save_history = fields.Bool(missing=True)


class FlowDiagramExportSchema(Schema):
    """流程圖導出模式"""
    format = fields.Str(
        missing="json",
        validate=validate.OneOf(["json", "xml", "png", "svg", "pdf"])
    )
    include_simulation = fields.Bool(missing=False)


class FlowDiagramQuerySchema(Schema):
    """流程圖查詢模式"""
    type = fields.Str(
        validate=validate.OneOf([
            "business_process", "system_flow", "user_journey", "workflow", "decision_tree"
        ])
    )
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    limit = fields.Int(missing=20, validate=validate.Range(min=1, max=100))


class ShareTokenSchema(Schema):
    """分享令牌模式"""
    share_token = fields.Str(required=True, validate=validate.Length(min=1))