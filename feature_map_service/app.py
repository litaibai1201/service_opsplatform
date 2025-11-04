# -*- coding: utf-8 -*-
"""
@文件: app.py
@說明: Feature Map service啟動文件
@時間: 2025-01-09
@作者: LiDong
"""
import json
from datetime import timedelta
from flask import Flask, request
from flask_cors import CORS
from flask_marshmallow import Marshmallow
from flask_smorest import Api
from flask_jwt_extended import JWTManager

from cache import redis_client
from common.common_method import fail_response_result
from configs.app_config import REDIS_DATABASE_URI, SERVER_HOST, SERVER_PORT
from dbs.mongodb import init_mongodb
from controllers.feature_map_controller import init_feature_map_controller
from loggers import logger
from views.feature_map_api import blp as feature_map_blp

# from waitress import serve


app = Flask(__name__)
jwt = JWTManager()
jwt.init_app(app)


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return fail_response_result(msg="Token已過期，請重新登錄")


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return fail_response_result(msg="Token無效，請重新登錄")


@jwt.unauthorized_loader
def missing_token_callback(error):
    return fail_response_result(msg="缺少身份驗證Token")


@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return fail_response_result(msg="Token已被撤銷，請重新登錄")


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """检查token是否在黑名单中"""
    jti = jwt_payload.get('jti')
    if jti:
        blacklist_key = f"blacklisted_token:{jti}"
        return redis_client.exists(blacklist_key)
    return False


def create_app(app):
    CORS(app, supports_credentials=True)
    app.config["Access-Control-Allow-Origin"] = "*"
    app.config["API_TITLE"] = "Feature Map REST API"
    app.config["API_VERSION"] = "v1"
    app.config["OPENAPI_VERSION"] = "3.0.3"
    app.config["OPENAPI_URL_PREFIX"] = "/"
    app.config["OPENAPI_SWAGGER_UI_PATH"] = "/swagger-ui"
    app.config[
        "OPENAPI_SWAGGER_UI_URL"
    ] = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
    
    # MongoDB 配置
    app.config["MONGO_URI"] = "mongodb://localhost:27017/feature_map_service"
    
    # Redis 配置
    app.config["REDIS_URL"] = REDIS_DATABASE_URI
    app.config["REDIS_RESPONSE"] = True
    
    # Flask 配置
    app.config["PROPAGATE_EXCEPTIONS"] = True
    app.config["JSON_AS_ASCII"] = False
    app.config["CORS_HEADERS"] = "Content-Type"
    app.config["KEEP_ALIVE"] = False
    
    # JWT 配置
    app.config["JWT_ALGORITHM"] = "HS256"
    app.config["JWT_SECRET_KEY"] = "APIGateway2025!"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
    app.config["JWT_BLACKLIST_ENABLED"] = True
    app.config["JWT_BLACKLIST_TOKEN_CHECKS"] = ["access", "refresh"]

    app.logger = logger
    
    # 初始化 MongoDB
    db_instance = init_mongodb(app)
    
    # 初始化功能导图控制器
    init_feature_map_controller(db_instance)
    
    # 初始化 Redis
    redis_client.init_app(app)
    
    # 初始化 Marshmallow
    marsh = Marshmallow()
    marsh.init_app(app)

    # 注册蓝图
    api = Api(app)
    api.register_blueprint(feature_map_blp)
    return app


@app.after_request
def after_request(resp):
    """统一错误响应处理 (优化版本)"""
    try:
        if request.method == "OPTIONS":
            return resp
            
        # 只处理JSON响应
        if resp.content_type and 'application/json' in resp.content_type:
            data = json.loads(resp.data)
            
            # 处理验证错误(422)
            if data.get("code", 200) == 422:
                error_msg = "請求參數驗證失敗"
                
                # 提取第一个错误信息
                errors = data.get("errors", {}).get("json", {})
                if errors:
                    for field, messages in errors.items():
                        if isinstance(messages, list) and messages:
                            error_msg = f"{field}: {messages[0]}"
                            break
                        elif isinstance(messages, dict):
                            for sub_field, sub_messages in messages.items():
                                if isinstance(sub_messages, list) and sub_messages:
                                    error_msg = f"{sub_field}: {sub_messages[0]}"
                                    break
                            break
                
                resp.data = json.dumps(
                    fail_response_result(msg=error_msg),
                    ensure_ascii=False,
                )
                resp.status_code = 200  # 统一返回200状态码
                
    except (json.JSONDecodeError, AttributeError, KeyError) as e:
        # 记录解析错误但不影响正常响应
        logger.warning(f"響應後處理警告: {str(e)}")
    except Exception as e:
        # 记录未知错误
        logger.error(f"響應後處理錯誤: {str(e)}")
        
    return resp


if __name__ == "__main__":
    app = create_app(app)
    print("===================Feature Map Service starting============================")
    # serve(app, host="0.0.0.0", port=8000, threads=30)
    app.run(SERVER_HOST, SERVER_PORT, debug=True)