import React from 'react';
import { Card } from '@/components/ui';
import { 
  UserGroupIcon, 
  FolderIcon, 
  PresentationChartBarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTeams: number;
  myTeams: number;
  totalDesigns: number;
  recentDesigns: number;
  collaborationHours: number;
  monthlyGrowth: {
    projects: number;
    designs: number;
    collaboration: number;
  };
}

interface StatsCardsProps {
  stats?: DashboardStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const formatGrowth = (value: number) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center space-x-1 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{value}%
        </span>
      </div>
    );
  };

  const cards = [
    {
      title: '我的项目',
      value: stats.activeProjects,
      total: stats.totalProjects,
      icon: FolderIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      growth: stats.monthlyGrowth.projects,
      description: `总共 ${stats.totalProjects} 个项目`,
    },
    {
      title: '参与团队',
      value: stats.myTeams,
      total: stats.totalTeams,
      icon: UserGroupIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      growth: 0,
      description: `平台共 ${stats.totalTeams} 个团队`,
    },
    {
      title: '设计图表',
      value: stats.recentDesigns,
      total: stats.totalDesigns,
      icon: PresentationChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      growth: stats.monthlyGrowth.designs,
      description: `总共 ${stats.totalDesigns} 个设计`,
    },
    {
      title: '协作时长',
      value: stats.collaborationHours,
      icon: ClockIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      growth: stats.monthlyGrowth.collaboration,
      description: '本月累计小时',
      unit: 'h',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                {card.growth !== undefined && formatGrowth(card.growth)}
              </div>
              
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                  {card.unit && <span className="text-lg text-gray-500 ml-1">{card.unit}</span>}
                </p>
                {card.total && (
                  <p className="text-sm text-gray-500">/ {card.total}</p>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-1">{card.description}</p>
            </div>
            
            <div className={`w-12 h-12 rounded-lg ${card.bgColor} flex items-center justify-center ml-4`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;