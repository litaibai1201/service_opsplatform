import React, { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { Card, Button, Badge, Spinner } from '@/components/ui';
import StatsCards from './components/StatsCards';
import ActivityFeed from './components/ActivityFeed';
import QuickActions from './components/QuickActions';
import RecentProjects from './components/RecentProjects';
import { useDashboard } from '@/hooks/data/useDashboard';
import {
  PlusIcon,
  ChartBarSquareIcon,
  UserGroupIcon,
  FolderIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const { 
    stats, 
    activities, 
    recentProjects, 
    isLoading, 
    error, 
    refreshDashboard 
  } = useDashboard();

  useEffect(() => {
    // 页面加载时获取仪表板数据
    refreshDashboard();
  }, [refreshDashboard]);

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">加载仪表板数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshDashboard}>重试</Button>
        </Card>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {getGreeting()}，{user?.username}！
            </h1>
            <p className="text-blue-100">
              欢迎回到 Service Ops Platform，开始您的高效协作之旅
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="secondary" 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              创建项目
            </Button>
            <Button 
              variant="secondary" 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <UserGroupIcon className="h-4 w-4 mr-2" />
              邀请团队
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要内容区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 最近项目 */}
          <RecentProjects projects={recentProjects} />
          
          {/* 活动动态 */}
          <ActivityFeed activities={activities} />
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 快捷操作 */}
          <QuickActions />
          
          {/* 通知中心 */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">通知中心</h3>
                <Badge variant="primary" size="sm">3</Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">新的项目邀请</p>
                    <p className="text-xs text-gray-500">5分钟前</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">设计评审完成</p>
                    <p className="text-xs text-gray-500">1小时前</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">系统维护通知</p>
                    <p className="text-xs text-gray-500">2小时前</p>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" fullWidth className="mt-4">
                查看所有通知
              </Button>
            </div>
          </Card>

          {/* 使用统计 */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">本月使用统计</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ChartBarSquareIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">创建设计图</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">15</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">协作会话</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">32</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FolderIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">活跃项目</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">8</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;