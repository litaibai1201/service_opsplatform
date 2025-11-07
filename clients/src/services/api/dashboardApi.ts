import httpClient from './httpClient';
import { API_CONFIG } from './apiConfig';
import type { DashboardStats } from '@/pages/dashboard/components/StatsCards';
import type { Activity } from '@/pages/dashboard/components/ActivityFeed';
import type { RecentProject } from '@/pages/dashboard/components/RecentProjects';

// 图表数据接口
export interface ChartData {
  projectsChart: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }>;
  };
  activitiesChart: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }>;
  };
  collaborationChart: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }>;
  };
}

// 仪表板API服务类
class DashboardApiService {
  /**
   * 获取仪表板统计数据
   */
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await httpClient.get<DashboardStats>(
        API_CONFIG.ENDPOINTS.DASHBOARD.STATS
      );
      return response.data;
    } catch (error) {
      // 如果API失败，返回模拟数据
      console.warn('Dashboard stats API failed, using mock data:', error);
      return this.getMockStats();
    }
  }

  /**
   * 获取活动动态
   */
  async getActivities(params?: {
    limit?: number;
    offset?: number;
    type?: string[];
  }): Promise<Activity[]> {
    try {
      const response = await httpClient.get<Activity[]>(
        API_CONFIG.ENDPOINTS.DASHBOARD.ACTIVITIES,
        { params }
      );
      return response.data;
    } catch (error) {
      // 如果API失败，返回模拟数据
      console.warn('Dashboard activities API failed, using mock data:', error);
      return this.getMockActivities();
    }
  }

  /**
   * 获取最近项目
   */
  async getRecentProjects(params?: {
    limit?: number;
    status?: string[];
  }): Promise<RecentProject[]> {
    try {
      const response = await httpClient.get<RecentProject[]>(
        API_CONFIG.ENDPOINTS.DASHBOARD.RECENT_PROJECTS,
        { params }
      );
      return response.data;
    } catch (error) {
      // 如果API失败，返回模拟数据
      console.warn('Dashboard projects API failed, using mock data:', error);
      return this.getMockRecentProjects();
    }
  }

  /**
   * 获取图表数据
   */
  async getCharts(params?: {
    timeRange?: '7d' | '30d' | '90d' | '1y';
    metrics?: string[];
  }): Promise<ChartData> {
    try {
      const response = await httpClient.get<ChartData>(
        API_CONFIG.ENDPOINTS.DASHBOARD.CHARTS,
        { params }
      );
      return response.data;
    } catch (error) {
      // 如果API失败，返回模拟数据
      console.warn('Dashboard charts API failed, using mock data:', error);
      return this.getMockCharts();
    }
  }

  // 模拟数据方法
  private getMockStats(): DashboardStats {
    return {
      totalProjects: 15,
      activeProjects: 8,
      totalTeams: 5,
      myTeams: 3,
      totalDesigns: 42,
      recentDesigns: 6,
      collaborationHours: 156,
      monthlyGrowth: {
        projects: 25,
        designs: 18,
        collaboration: 12,
      },
    };
  }

  private getMockActivities(): Activity[] {
    const now = new Date();
    return [
      {
        id: '1',
        type: 'project_created',
        user: {
          id: 'user1',
          name: '张三',
          avatar: undefined,
        },
        target: {
          id: 'project1',
          name: 'API Gateway 设计',
          type: 'project',
          url: '/projects/project1',
        },
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30分钟前
        description: '为微服务架构设计统一网关',
        metadata: {
          tags: ['微服务', 'API'],
        },
      },
      {
        id: '2',
        type: 'design_created',
        user: {
          id: 'user2',
          name: '李四',
          avatar: undefined,
        },
        target: {
          id: 'design1',
          name: '用户管理系统架构',
          type: 'design',
          url: '/design-tools/architecture/design1',
        },
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
        description: '设计用户权限管理的整体架构',
        metadata: {
          tags: ['架构', '权限'],
        },
      },
      {
        id: '3',
        type: 'member_joined',
        user: {
          id: 'user3',
          name: '王五',
          avatar: undefined,
        },
        target: {
          id: 'team1',
          name: '前端开发团队',
          type: 'team',
          url: '/teams/team1',
        },
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4小时前
      },
      {
        id: '4',
        type: 'comment_added',
        user: {
          id: 'user4',
          name: '赵六',
          avatar: undefined,
        },
        target: {
          id: 'design2',
          name: '数据库设计 v2.0',
          type: 'design',
          url: '/design-tools/database-design/design2',
        },
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6小时前
        description: '建议优化索引设计',
      },
      {
        id: '5',
        type: 'design_updated',
        user: {
          id: 'user1',
          name: '张三',
          avatar: undefined,
        },
        target: {
          id: 'design3',
          name: 'API 接口设计',
          type: 'design',
          url: '/design-tools/api-design/design3',
        },
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12小时前
        description: '更新了认证相关接口',
        metadata: {
          tags: ['API', '认证'],
        },
      },
    ];
  }

  private getMockRecentProjects(): RecentProject[] {
    const now = new Date();
    return [
      {
        id: 'project1',
        name: 'API Gateway 设计',
        description: '为微服务架构设计统一的API网关，包括认证、限流、路由等功能',
        status: 'active',
        lastActivity: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        teamName: '后端开发团队',
        memberCount: 6,
        designCount: 8,
        tags: ['微服务', 'API', '网关'],
        collaborators: [
          { id: 'user1', name: '张三' },
          { id: 'user2', name: '李四' },
          { id: 'user3', name: '王五' },
        ],
      },
      {
        id: 'project2',
        name: '用户管理系统',
        description: '企业级用户权限管理系统，支持RBAC权限模型和SSO集成',
        status: 'active',
        lastActivity: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        teamName: '全栈开发团队',
        memberCount: 4,
        designCount: 12,
        tags: ['权限', 'RBAC', 'SSO'],
        collaborators: [
          { id: 'user2', name: '李四' },
          { id: 'user4', name: '赵六' },
        ],
      },
      {
        id: 'project3',
        name: '数据分析平台',
        description: '实时数据处理和可视化分析平台，支持多种数据源和图表类型',
        status: 'draft',
        lastActivity: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        teamName: '数据团队',
        memberCount: 3,
        designCount: 5,
        tags: ['数据', '可视化', '实时'],
        collaborators: [
          { id: 'user3', name: '王五' },
          { id: 'user5', name: '钱七' },
        ],
      },
    ];
  }

  private getMockCharts(): ChartData {
    return {
      projectsChart: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        datasets: [
          {
            label: '新增项目',
            data: [2, 3, 5, 4, 6, 8],
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgb(59, 130, 246)',
          },
        ],
      },
      activitiesChart: {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        datasets: [
          {
            label: '活动数量',
            data: [12, 19, 15, 25, 22, 8, 5],
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgb(34, 197, 94)',
          },
        ],
      },
      collaborationChart: {
        labels: ['设计', '评审', '讨论', '修改', '完成'],
        datasets: [
          {
            label: '协作环节',
            data: [30, 25, 35, 20, 15],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(168, 85, 247, 0.8)',
            ],
          },
        ],
      },
    };
  }
}

// 创建并导出服务实例
export const dashboardApi = new DashboardApiService();
export default dashboardApi;