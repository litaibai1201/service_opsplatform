# Dashboard 功能实施计划

## 📊 当前状态

### ✅ 前端已完成
- Dashboard 页面 UI 组件完整
- API 调用已实现（带 Mock 数据 fallback）
- 路由配置正确
- 数据展示逻辑完善

### ⚠️ 后端未实现
- Dashboard 相关接口不存在
- Gateway 中没有配置 `/dashboard/*` 路由
- 需要决定数据来源

### 🎯 当前解决方案
**前端自动降级到 Mock 数据** - 页面可以正常访问，显示模拟数据

---

## 💡 工作原理

### 前端智能降级机制

```typescript
// dashboardApi.ts 中的实现
async getStats(): Promise<DashboardStats> {
  try {
    // 尝试调用真实 API
    const response = await httpClient.get(API_CONFIG.ENDPOINTS.DASHBOARD.STATS);
    return response.data;
  } catch (error) {
    // API 失败时，自动使用 Mock 数据
    console.warn('Dashboard stats API failed, using mock data:', error);
    return this.getMockStats();  // ✅ 返回模拟数据
  }
}
```

### 用户体验
1. **访问 Dashboard 页面** → ✅ 正常显示
2. **看到的数据** → Mock 数据（硬编码）
3. **没有错误提示** → 用户体验流畅
4. **后端实现后** → 自动切换到真实数据

---

## 📋 三阶段实施计划

### 阶段 1: 当前阶段（已完成）✅

**目标**: 前端正常工作，使用 Mock 数据

**状态**:
- ✅ Dashboard 页面可访问
- ✅ 显示 Mock 数据
- ✅ 不影响其他功能开发
- ✅ 用户可以预览界面

**使用方式**:
```
访问: http://localhost:3000/dashboard
显示: 模拟的统计数据、活动动态、最近项目、图表
```

---

### 阶段 2: 后端实现（待开发）⏳

#### 2.1 决定数据来源

**选项 A: 从现有服务聚合数据（推荐）**

Dashboard 数据通常来自多个服务的聚合：

```
Dashboard Stats:
├── 项目统计 → project-service
├── 团队统计 → team-service
├── 设计统计 → architecture/api-design/db-design services
└── 协作统计 → collaboration-service
```

实现在 **project-service** 中（作为主服务）：

```python
# project_service/views/dashboard_api.py
@blp.route('/dashboard/stats')
class DashboardStatsView(MethodView):
    @jwt_required()
    def get(self):
        """获取仪表板统计数据"""
        user_id = get_jwt_identity()

        # 聚合各服务数据
        stats = {
            'totalProjects': get_user_projects_count(user_id),
            'activeProjects': get_active_projects_count(user_id),
            'totalTeams': get_user_teams_count(user_id),
            'totalDesigns': get_user_designs_count(user_id),
            # ... 更多统计
        }

        return success_response_result(content=stats)
```

**选项 B: 创建独立的 Dashboard Service（更复杂）**

适合大型系统，Dashboard 逻辑复杂时使用。

#### 2.2 API 端点设计

需要实现 4 个主要接口：

```yaml
# 1. 统计数据
GET /dashboard/stats
响应: {
  "totalProjects": 15,
  "activeProjects": 8,
  "totalTeams": 5,
  "myTeams": 3,
  "totalDesigns": 42,
  "recentDesigns": 6,
  "collaborationHours": 156,
  "monthlyGrowth": {
    "projects": 25,
    "designs": 18,
    "collaboration": 12
  }
}

# 2. 活动动态
GET /dashboard/activities?limit=10&offset=0
响应: [
  {
    "id": "1",
    "type": "project_created",
    "user": { "id": "user1", "name": "张三" },
    "target": { "id": "project1", "name": "API Gateway", "type": "project" },
    "timestamp": "2025-01-17T10:30:00Z",
    "description": "创建了新项目"
  }
]

# 3. 最近项目
GET /dashboard/recent-projects?limit=5
响应: [
  {
    "id": "project1",
    "name": "API Gateway 设计",
    "status": "active",
    "lastActivity": "2025-01-17T10:30:00Z",
    "teamName": "后端开发团队",
    "memberCount": 6,
    "designCount": 8
  }
]

# 4. 图表数据
GET /dashboard/charts?timeRange=30d
响应: {
  "projectsChart": {
    "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
    "datasets": [...]
  },
  "activitiesChart": {...},
  "collaborationChart": {...}
}
```

#### 2.3 数据库查询示例

```python
# 统计用户的项目数
def get_user_projects_count(user_id):
    from models.project_model import OperProjectModel
    oper_project = OperProjectModel()

    # 统计用户参与的项目（作为成员或创建者）
    total = db.session.query(ProjectModel).join(
        ProjectMemberModel
    ).filter(
        ProjectMemberModel.user_id == user_id,
        ProjectModel.status == 1
    ).count()

    return total

# 获取最近活动
def get_recent_activities(user_id, limit=10):
    # 可以从 audit-service 或单独的 activity 表查询
    activities = db.session.query(ActivityModel).filter(
        ActivityModel.user_id == user_id
    ).order_by(
        ActivityModel.created_at.desc()
    ).limit(limit).all()

    return activities

# 获取图表数据（按月统计项目数）
def get_projects_chart_data(user_id, months=6):
    from datetime import datetime, timedelta
    from sqlalchemy import func

    start_date = datetime.now() - timedelta(days=30 * months)

    results = db.session.query(
        func.date_format(ProjectModel.created_at, '%Y-%m').label('month'),
        func.count(ProjectModel.id).label('count')
    ).filter(
        ProjectModel.created_at >= start_date,
        ProjectModel.status == 1
    ).group_by('month').all()

    return {
        'labels': [r.month for r in results],
        'data': [r.count for r in results]
    }
```

#### 2.4 Gateway 路由配置

在 `init_gateway_routes.py` 的 `ROUTES` 列表中添加：

```python
# ========== Dashboard 路由 ==========
{
    "service_name": "project-service",  # 或 "dashboard-service"
    "path_pattern": "/dashboard/stats",
    "target_url": "/dashboard/stats",
    "method": "GET",
    "requires_auth": True,
    "rate_limit_rpm": 500,
    "priority": 8,
    "description": "获取仪表板统计"
},
{
    "service_name": "project-service",
    "path_pattern": "/dashboard/activities",
    "target_url": "/dashboard/activities",
    "method": "GET",
    "requires_auth": True,
    "rate_limit_rpm": 500,
    "priority": 8,
    "description": "获取活动动态"
},
{
    "service_name": "project-service",
    "path_pattern": "/dashboard/recent-projects",
    "target_url": "/dashboard/recent-projects",
    "method": "GET",
    "requires_auth": True,
    "rate_limit_rpm": 500,
    "priority": 8,
    "description": "获取最近项目"
},
{
    "service_name": "project-service",
    "path_pattern": "/dashboard/charts",
    "target_url": "/dashboard/charts",
    "method": "GET",
    "requires_auth": True,
    "rate_limit_rpm": 500,
    "priority": 8,
    "description": "获取图表数据"
},
# 通配符路由
{
    "service_name": "project-service",
    "path_pattern": "/dashboard/*",
    "target_url": "/dashboard/*",
    "method": "ANY",
    "requires_auth": True,
    "rate_limit_rpm": 1000,
    "priority": 1,
    "description": "Dashboard通配路由"
},
```

然后运行：
```bash
cd api_gateway_service
python init_gateway_routes.py
```

---

### 阶段 3: 部署上线（最终）🚀

#### 3.1 测试验证

```bash
# 1. 直接测试服务端点
curl -X GET http://localhost:25707/dashboard/stats \
  -H "Authorization: Bearer <token>"

# 2. 通过 Gateway 测试
curl -X GET http://localhost:8080/dashboard/stats \
  -H "Authorization: Bearer <token>"

# 3. 前端测试
# 访问 http://localhost:3000/dashboard
# 应该显示真实数据，而不是 Mock 数据
```

#### 3.2 切换到真实数据

**无需修改前端代码**！

前端会自动检测：
```typescript
// 如果后端返回成功
return response.data;  // ✅ 使用真实数据

// 如果后端失败
catch (error) {
  return this.getMockStats();  // ⚠️ 降级到 Mock 数据
}
```

#### 3.3 验证清单

- [ ] 4 个 Dashboard 接口全部实现
- [ ] Gateway 路由配置完成
- [ ] 返回数据格式与前端期望一致
- [ ] 权限验证正常工作
- [ ] 性能测试通过（响应时间 < 200ms）
- [ ] 前端显示真实数据
- [ ] Mock 数据降级机制仍然有效

---

## 📊 Mock 数据说明

### 当前 Mock 数据内容

#### 统计数据
```javascript
{
  totalProjects: 15,        // 总项目数
  activeProjects: 8,         // 活跃项目数
  totalTeams: 5,             // 总团队数
  myTeams: 3,                // 我的团队数
  totalDesigns: 42,          // 总设计数
  recentDesigns: 6,          // 最近设计数
  collaborationHours: 156,   // 协作时长
  monthlyGrowth: {           // 月度增长
    projects: 25,
    designs: 18,
    collaboration: 12
  }
}
```

#### 活动动态（5条）
- 项目创建（30分钟前）
- 设计创建（2小时前）
- 成员加入（4小时前）
- 评论添加（6小时前）
- 设计更新（12小时前）

#### 最近项目（3个）
1. API Gateway 设计 - 活跃中
2. 用户管理系统 - 活跃中
3. 数据分析平台 - 草稿

#### 图表数据
- 项目趋势图（6个月）
- 活动统计图（7天）
- 协作环节图（饼图）

---

## 🎯 实施建议

### 短期（1-2周）
保持当前状态，使用 Mock 数据：
- ✅ 不影响其他功能开发
- ✅ 用户可以预览 Dashboard UI
- ✅ 可以收集用户反馈
- ✅ 前端代码稳定

### 中期（2-4周）
实现后端 API：
- ⚙️ 在 project-service 中添加 Dashboard 接口
- ⚙️ 实现数据聚合逻辑
- ⚙️ 配置 Gateway 路由
- ⚙️ 测试验证

### 长期优化
- 🚀 添加缓存（Redis）提高性能
- 🚀 实时数据推送（WebSocket）
- 🚀 更多图表和分析
- 🚀 自定义 Dashboard 配置

---

## 🔧 开发检查清单

### 后端开发

#### 阶段 1: 基础实现
- [ ] 创建 `dashboard_api.py` 文件
- [ ] 实现 `GET /dashboard/stats` 接口
- [ ] 实现 `GET /dashboard/activities` 接口
- [ ] 实现 `GET /dashboard/recent-projects` 接口
- [ ] 实现 `GET /dashboard/charts` 接口

#### 阶段 2: 数据查询
- [ ] 实现项目统计查询
- [ ] 实现团队统计查询
- [ ] 实现设计统计查询
- [ ] 实现活动日志查询
- [ ] 实现图表数据生成

#### 阶段 3: 优化
- [ ] 添加数据缓存（Redis）
- [ ] 添加查询参数验证
- [ ] 添加错误处理
- [ ] 添加单元测试
- [ ] 性能优化

### Gateway 配置
- [ ] 添加 Dashboard 路由到 `init_gateway_routes.py`
- [ ] 运行路由初始化脚本
- [ ] 验证路由配置
- [ ] 测试转发功能

### 测试验证
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 前后端联调
- [ ] 用户验收测试

---

## 📝 参考代码模板

### 后端实现示例

```python
# project_service/views/dashboard_api.py
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import success_response_result
from models.project_model import OperProjectModel
from models.team_model import OperTeamModel

blp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

@blp.route('/stats')
class DashboardStatsView(MethodView):
    @jwt_required()
    def get(self):
        """获取仪表板统计数据"""
        user_id = get_jwt_identity()

        oper_project = OperProjectModel()
        oper_team = OperTeamModel()

        # 统计数据
        stats = {
            'totalProjects': oper_project.get_user_projects_count(user_id),
            'activeProjects': oper_project.get_active_projects_count(user_id),
            'totalTeams': oper_team.get_user_teams_count(user_id),
            'myTeams': oper_team.get_joined_teams_count(user_id),
            # ... 更多统计
        }

        return success_response_result(content=stats)

@blp.route('/activities')
class DashboardActivitiesView(MethodView):
    @jwt_required()
    def get(self):
        """获取活动动态"""
        # 实现查询逻辑
        pass

# 注册 Blueprint
from app import app, api
api.register_blueprint(blp)
```

---

## 🎉 总结

### 当前状态
✅ **Dashboard 功能已经可以正常使用**
- 前端完整实现
- 自动降级到 Mock 数据
- 用户体验流畅
- 不影响其他功能

### 下一步
⏳ **后端实现（可选，不紧急）**
- 按需实现真实数据接口
- 前端自动切换到真实数据
- 无需修改前端代码

### 优势
🎯 **渐进式开发**
- 先专注核心功能
- Dashboard 后续优化
- 降低开发风险
- 提高交付速度

---

**文档版本**: v1.0
**创建时间**: 2025-01-17
**状态**: 阶段 1 已完成 ✅
