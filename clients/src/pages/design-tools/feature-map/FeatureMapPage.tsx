import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { 
  DocumentPlusIcon,
  FolderOpenIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  PlayIcon,
  Cog6ToothIcon,
  EyeIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import MindMapCanvas from './components/MindMapCanvas';
import FeatureNode from './components/FeatureNode';
import DependencyGraph from './components/DependencyGraph';
import FeatureManager from './components/FeatureManager';
import RoadmapPlanner from './components/RoadmapPlanner';

interface Feature {
  id: string;
  name: string;
  description?: string;
  type: 'epic' | 'feature' | 'story' | 'task' | 'bug';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: number; // 工作量估计（人天）
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  parent?: string;
  children: string[];
  dependencies: string[];
  tags: string[];
  assignee?: string;
  startDate?: Date;
  endDate?: Date;
  progress: number; // 0-100
  attachments: string[];
  comments: Comment[];
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface FeatureMap {
  id: string;
  name: string;
  description?: string;
  version: string;
  features: Feature[];
  connections: Connection[];
  layout: 'mindmap' | 'hierarchy' | 'timeline' | 'kanban';
  settings: {
    showProgress: boolean;
    showDependencies: boolean;
    showAssignees: boolean;
    showPriorities: boolean;
    autoLayout: boolean;
  };
}

interface Connection {
  id: string;
  fromFeature: string;
  toFeature: string;
  type: 'dependency' | 'parent-child' | 'related' | 'blocks';
  label?: string;
}

const FeatureMapPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'mindmap' | 'features' | 'dependencies' | 'roadmap' | 'settings'>('mindmap');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 示例功能地图数据
  const [featureMap, setFeatureMap] = useState<FeatureMap>({
    id: 'map_1',
    name: '产品功能地图',
    description: '软件服务管理平台功能规划',
    version: '1.0.0',
    features: [
      {
        id: 'epic_1',
        name: '用户管理系统',
        description: '完整的用户认证、授权和管理功能',
        type: 'epic',
        status: 'completed',
        priority: 'critical',
        effort: 20,
        position: { x: 300, y: 100 },
        size: { width: 200, height: 80 },
        color: '#3b82f6',
        children: ['feature_1', 'feature_2'],
        dependencies: [],
        tags: ['authentication', 'security'],
        assignee: '张三',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-20'),
        progress: 100,
        attachments: [],
        comments: []
      },
      {
        id: 'feature_1',
        name: '用户认证',
        description: '登录、注册、密码重置功能',
        type: 'feature',
        status: 'completed',
        priority: 'critical',
        effort: 8,
        position: { x: 100, y: 250 },
        size: { width: 150, height: 60 },
        color: '#10b981',
        parent: 'epic_1',
        children: ['story_1', 'story_2'],
        dependencies: [],
        tags: ['login', 'security'],
        assignee: '李四',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        progress: 100,
        attachments: [],
        comments: []
      },
      {
        id: 'feature_2',
        name: '权限管理',
        description: 'RBAC权限控制系统',
        type: 'feature',
        status: 'completed',
        priority: 'high',
        effort: 12,
        position: { x: 500, y: 250 },
        size: { width: 150, height: 60 },
        color: '#10b981',
        parent: 'epic_1',
        children: ['story_3', 'story_4'],
        dependencies: ['feature_1'],
        tags: ['rbac', 'permissions'],
        assignee: '王五',
        startDate: new Date('2024-01-11'),
        endDate: new Date('2024-01-20'),
        progress: 100,
        attachments: [],
        comments: []
      },
      {
        id: 'epic_2',
        name: '项目管理系统',
        description: '项目创建、管理和协作功能',
        type: 'epic',
        status: 'in-progress',
        priority: 'high',
        effort: 30,
        position: { x: 300, y: 400 },
        size: { width: 200, height: 80 },
        color: '#f59e0b',
        children: ['feature_3', 'feature_4'],
        dependencies: ['epic_1'],
        tags: ['project', 'collaboration'],
        assignee: '赵六',
        startDate: new Date('2024-01-21'),
        endDate: new Date('2024-02-20'),
        progress: 60,
        attachments: [],
        comments: []
      },
      {
        id: 'feature_3',
        name: '项目创建',
        description: '创建和配置新项目',
        type: 'feature',
        status: 'completed',
        priority: 'high',
        effort: 10,
        position: { x: 100, y: 550 },
        size: { width: 150, height: 60 },
        color: '#10b981',
        parent: 'epic_2',
        children: [],
        dependencies: ['feature_2'],
        tags: ['project', 'setup'],
        assignee: '孙七',
        startDate: new Date('2024-01-21'),
        endDate: new Date('2024-01-30'),
        progress: 100,
        attachments: [],
        comments: []
      },
      {
        id: 'feature_4',
        name: '团队协作',
        description: '团队成员管理和协作工具',
        type: 'feature',
        status: 'in-progress',
        priority: 'medium',
        effort: 20,
        position: { x: 500, y: 550 },
        size: { width: 150, height: 60 },
        color: '#f59e0b',
        parent: 'epic_2',
        children: [],
        dependencies: ['feature_3'],
        tags: ['team', 'collaboration'],
        assignee: '周八',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-20'),
        progress: 40,
        attachments: [],
        comments: []
      }
    ],
    connections: [
      {
        id: 'conn_1',
        fromFeature: 'epic_1',
        toFeature: 'feature_1',
        type: 'parent-child'
      },
      {
        id: 'conn_2',
        fromFeature: 'epic_1',
        toFeature: 'feature_2',
        type: 'parent-child'
      },
      {
        id: 'conn_3',
        fromFeature: 'feature_1',
        toFeature: 'feature_2',
        type: 'dependency',
        label: '登录后才能设置权限'
      },
      {
        id: 'conn_4',
        fromFeature: 'epic_1',
        toFeature: 'epic_2',
        type: 'dependency',
        label: '用户系统是项目系统的基础'
      },
      {
        id: 'conn_5',
        fromFeature: 'epic_2',
        toFeature: 'feature_3',
        type: 'parent-child'
      },
      {
        id: 'conn_6',
        fromFeature: 'epic_2',
        toFeature: 'feature_4',
        type: 'parent-child'
      },
      {
        id: 'conn_7',
        fromFeature: 'feature_3',
        toFeature: 'feature_4',
        type: 'dependency',
        label: '需要先创建项目'
      }
    ],
    layout: 'mindmap',
    settings: {
      showProgress: true,
      showDependencies: true,
      showAssignees: true,
      showPriorities: true,
      autoLayout: false
    }
  });

  // 添加功能
  const handleAddFeature = useCallback((parentId?: string) => {
    const newFeature: Feature = {
      id: `feature_${Date.now()}`,
      name: '新功能',
      description: '',
      type: 'feature',
      status: 'planned',
      priority: 'medium',
      effort: 1,
      position: { x: 400, y: 300 },
      size: { width: 150, height: 60 },
      color: '#6b7280',
      parent: parentId,
      children: [],
      dependencies: [],
      tags: [],
      progress: 0,
      attachments: [],
      comments: []
    };

    setFeatureMap(prev => {
      const updated = { ...prev };
      updated.features = [...updated.features, newFeature];
      
      // 如果有父功能，更新父功能的children
      if (parentId) {
        const parentFeature = updated.features.find(f => f.id === parentId);
        if (parentFeature) {
          parentFeature.children.push(newFeature.id);
        }
      }
      
      return updated;
    });

    setSelectedFeature(newFeature);
  }, []);

  // 更新功能
  const handleUpdateFeature = useCallback((featureId: string, updates: Partial<Feature>) => {
    setFeatureMap(prev => ({
      ...prev,
      features: prev.features.map(feature => 
        feature.id === featureId ? { ...feature, ...updates } : feature
      )
    }));

    if (selectedFeature?.id === featureId) {
      setSelectedFeature(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedFeature]);

  // 删除功能
  const handleDeleteFeature = useCallback((featureId: string) => {
    setFeatureMap(prev => {
      const updated = { ...prev };
      
      // 递归删除所有子功能
      const deleteFeatureAndChildren = (id: string) => {
        const feature = updated.features.find(f => f.id === id);
        if (feature) {
          // 先删除所有子功能
          feature.children.forEach(childId => {
            deleteFeatureAndChildren(childId);
          });
          
          // 删除功能本身
          updated.features = updated.features.filter(f => f.id !== id);
          
          // 删除相关连接
          updated.connections = updated.connections.filter(conn => 
            conn.fromFeature !== id && conn.toFeature !== id
          );
          
          // 从其他功能的依赖中移除
          updated.features.forEach(f => {
            f.dependencies = f.dependencies.filter(depId => depId !== id);
            f.children = f.children.filter(childId => childId !== id);
          });
        }
      };
      
      deleteFeatureAndChildren(featureId);
      return updated;
    });

    if (selectedFeature?.id === featureId) {
      setSelectedFeature(null);
    }
  }, [selectedFeature]);

  // 添加连接
  const handleAddConnection = useCallback((connection: Omit<Connection, 'id'>) => {
    const newConnection: Connection = {
      id: `conn_${Date.now()}`,
      ...connection
    };

    setFeatureMap(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection]
    }));
  }, []);

  // 更新连接
  const handleUpdateConnection = useCallback((connectionId: string, updates: Partial<Connection>) => {
    setFeatureMap(prev => ({
      ...prev,
      connections: prev.connections.map(conn => 
        conn.id === connectionId ? { ...conn, ...updates } : conn
      )
    }));
  }, []);

  // 删除连接
  const handleDeleteConnection = useCallback((connectionId: string) => {
    setFeatureMap(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId)
    }));
  }, []);

  // 导入功能地图
  const handleImportMap = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsLoading(true);
        try {
          const content = await file.text();
          const importedMap = JSON.parse(content);
          setFeatureMap(importedMap);
        } catch (error) {
          console.error('导入失败:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  }, []);

  // 导出功能地图
  const handleExportMap = useCallback((format: 'json' | 'png' | 'pdf') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(featureMap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${featureMap.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // TODO: 实现图片和PDF导出
      console.log(`导出${format.toUpperCase()}格式`);
    }
  }, [featureMap]);

  // 更新地图设置
  const handleUpdateSettings = useCallback((updates: Partial<FeatureMap['settings']>) => {
    setFeatureMap(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  }, []);

  const tabs = [
    { id: 'mindmap', label: '功能地图', icon: PuzzlePieceIcon },
    { id: 'features', label: '功能管理', icon: DocumentPlusIcon },
    { id: 'dependencies', label: '依赖关系', icon: ShareIcon },
    { id: 'roadmap', label: '路线图', icon: PlayIcon },
    { id: 'settings', label: '设置', icon: Cog6ToothIcon }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">功能地图</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{featureMap.name}</span>
              <span>•</span>
              <span>v{featureMap.version}</span>
              <span>•</span>
              <span>{featureMap.features.length} 个功能</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportMap}
              disabled={isLoading}
            >
              <FolderOpenIcon className="w-4 h-4 mr-1" />
              导入
            </Button>
            
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                导出
              </Button>
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExportMap('json')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  JSON 格式
                </button>
                <button
                  onClick={() => handleExportMap('png')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  PNG 图片
                </button>
                <button
                  onClick={() => handleExportMap('pdf')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  PDF 文档
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAddFeature()}
            >
              <DocumentPlusIcon className="w-4 h-4 mr-1" />
              新建功能
            </Button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex items-center space-x-1 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-1 inline" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'mindmap' && (
          <MindMapCanvas
            featureMap={featureMap}
            selectedFeature={selectedFeature}
            onFeatureSelect={setSelectedFeature}
            onFeatureUpdate={handleUpdateFeature}
            onFeatureDelete={handleDeleteFeature}
            onConnectionAdd={handleAddConnection}
            onConnectionUpdate={handleUpdateConnection}
            onConnectionDelete={handleDeleteConnection}
          />
        )}

        {currentTab === 'features' && (
          <FeatureManager
            features={featureMap.features}
            connections={featureMap.connections}
            selectedFeature={selectedFeature}
            onFeatureSelect={setSelectedFeature}
            onFeatureUpdate={handleUpdateFeature}
            onFeatureDelete={handleDeleteFeature}
            onAddFeature={handleAddFeature}
          />
        )}

        {currentTab === 'dependencies' && (
          <DependencyGraph
            features={featureMap.features}
            connections={featureMap.connections}
            selectedFeature={selectedFeature}
            onFeatureSelect={setSelectedFeature}
            onConnectionAdd={handleAddConnection}
            onConnectionUpdate={handleUpdateConnection}
            onConnectionDelete={handleDeleteConnection}
          />
        )}

        {currentTab === 'roadmap' && (
          <RoadmapPlanner
            features={featureMap.features}
            onFeatureUpdate={handleUpdateFeature}
          />
        )}

        {currentTab === 'settings' && (
          <div className="p-6 bg-gray-50">
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">地图设置</h3>
              {/* TODO: 实现设置面板 */}
              <div className="bg-white rounded-lg border p-4">
                <p className="text-gray-600">设置面板开发中...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureMapPage;