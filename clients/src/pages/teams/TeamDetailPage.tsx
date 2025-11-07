import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Card, Button, Badge, Tabs, TabPanel, Avatar, Dropdown } from '@/components/ui';
import { useTeamDetail } from '@/hooks/data/useTeams';
import { RequireTeamManage, usePermissions } from '@/components/layout/PermissionGuard';
import TeamSettings from './components/TeamSettings';
import TeamMembers from './components/TeamMembers';
import TeamProjects from './components/TeamProjects';
import TeamActivity from './components/TeamActivity';
import InviteMemberModal from './components/InviteMemberModal';
import { 
  UserPlusIcon, 
  Cog6ToothIcon, 
  EllipsisVerticalIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  FolderIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const TeamDetailPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  const { canManageTeam } = usePermissions();
  
  const { team, isLoading, error, refreshTeam } = useTeamDetail(teamId!);
  const [activeTab, setActiveTab] = useState('overview');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    if (teamId) {
      refreshTeam();
    }
  }, [teamId, refreshTeam]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">加载团队信息...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-6">{error || '团队不存在或您没有访问权限'}</p>
          <div className="flex space-x-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/teams')}>
              返回团队列表
            </Button>
            <Button onClick={() => refreshTeam()}>重试</Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentUserMember = team.members?.find(member => member.userId === user?.id);
  const canManage = canManageTeam(teamId!);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: '活跃', variant: 'success' as const },
      archived: { label: '已归档', variant: 'secondary' as const },
      pending: { label: '待处理', variant: 'warning' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { label: '所有者', variant: 'primary' as const },
      admin: { label: '管理员', variant: 'success' as const },
      member: { label: '成员', variant: 'secondary' as const },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig];
    return config ? <Badge variant={config.variant} size="sm">{config.label}</Badge> : null;
  };

  const tabs = [
    { id: 'overview', label: '概览', icon: UserGroupIcon },
    { id: 'members', label: '成员', icon: UserGroupIcon },
    { id: 'projects', label: '项目', icon: FolderIcon },
    { id: 'activity', label: '活动', icon: ClockIcon },
    ...(canManage ? [{ id: 'settings', label: '设置', icon: Cog6ToothIcon }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/teams')}
          className="p-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link to="/teams" className="text-gray-500 hover:text-gray-700">
                  团队管理
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium">{team.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* 团队信息头部 */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-8 w-8 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                {getStatusBadge(team.status)}
                {currentUserMember && getRoleBadge(currentUserMember.role)}
              </div>
              
              {team.description && (
                <p className="text-gray-600 mb-3">{team.description}</p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>{team.memberCount || 0} 名成员</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FolderIcon className="h-4 w-4" />
                  <span>{team.projectCount || 0} 个项目</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>
                    创建于 {formatDistanceToNow(new Date(team.createdAt), { 
                      addSuffix: true, 
                      locale: zhCN 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={() => setIsInviteModalOpen(true)}>
              <UserPlusIcon className="h-4 w-4 mr-2" />
              邀请成员
            </Button>
            
            <RequireTeamManage teamId={teamId!}>
              <Dropdown
                trigger={
                  <Button variant="outline" size="sm">
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </Button>
                }
                items={[
                  {
                    label: '团队设置',
                    icon: Cog6ToothIcon,
                    onClick: () => setActiveTab('settings'),
                  },
                  {
                    label: '归档团队',
                    icon: ArchiveBoxIcon,
                    onClick: () => console.log('Archive team'),
                    disabled: team.status === 'archived',
                  },
                  {
                    type: 'divider',
                  },
                  {
                    label: '删除团队',
                    icon: TrashIcon,
                    onClick: () => console.log('Delete team'),
                    className: 'text-red-600',
                  },
                ]}
              />
            </RequireTeamManage>
          </div>
        </div>
      </Card>

      {/* 标签页导航 */}
      <Card>
        <Tabs value={activeTab} onChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <TabPanel value="overview" currentValue={activeTab}>
              <TeamOverview team={team} />
            </TabPanel>
            
            <TabPanel value="members" currentValue={activeTab}>
              <TeamMembers teamId={teamId!} />
            </TabPanel>
            
            <TabPanel value="projects" currentValue={activeTab}>
              <TeamProjects teamId={teamId!} />
            </TabPanel>
            
            <TabPanel value="activity" currentValue={activeTab}>
              <TeamActivity teamId={teamId!} />
            </TabPanel>
            
            {canManage && (
              <TabPanel value="settings" currentValue={activeTab}>
                <TeamSettings team={team} onUpdate={refreshTeam} />
              </TabPanel>
            )}
          </div>
        </Tabs>
      </Card>

      {/* 邀请成员模态框 */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        teamId={teamId!}
        teamName={team.name}
        onSuccess={() => {
          setIsInviteModalOpen(false);
          refreshTeam();
        }}
      />
    </div>
  );
};

// 团队概览组件
const TeamOverview: React.FC<{ team: any }> = ({ team }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* 最近活动 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近活动</h3>
          <Card className="p-4">
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">暂无活动记录</p>
            </div>
          </Card>
        </div>

        {/* 项目统计 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">项目统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{team.projectCount || 0}</div>
              <div className="text-sm text-gray-600">总项目数</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">活跃项目</div>
            </Card>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 团队统计 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">团队统计</h3>
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">成员总数</span>
                <span className="font-medium">{team.memberCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">管理员数</span>
                <span className="font-medium">
                  {team.members?.filter((m: any) => m.role === 'admin' || m.role === 'owner').length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">活跃度</span>
                <Badge variant="success" size="sm">高</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* 最近加入的成员 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近加入</h3>
          <Card className="p-4">
            <div className="space-y-3">
              {team.members?.slice(0, 3).map((member: any, index: number) => (
                <div key={member.id || index} className="flex items-center space-x-3">
                  <Avatar src={member.avatar} alt={member.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4">
                  <UserGroupIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">暂无成员</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamDetailPage;