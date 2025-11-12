import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  BackwardIcon,
  ClockIcon,
  CodeBracketIcon,
  ChartBarSquareIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  value: any;
  description?: string;
}

interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  stepCount: number;
  variables: Record<string, FlowVariable>;
  executionPath: string[];
  breakpoints: string[];
}

interface FlowSimulatorProps {
  simulationState: SimulationState;
  onStepSimulation: () => void;
}

const FlowSimulator: React.FC<FlowSimulatorProps> = ({
  simulationState,
  onStepSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'execution' | 'breakpoints'>('variables');
  const [newVariable, setNewVariable] = useState({ name: '', type: 'string', value: '' });

  // 添加变量
  const handleAddVariable = () => {
    if (!newVariable.name.trim()) return;

    const variable: FlowVariable = {
      name: newVariable.name,
      type: newVariable.type as any,
      value: convertValue(newVariable.value, newVariable.type),
      description: ''
    };

    // TODO: 实现添加变量到仿真状态
    console.log('添加变量:', variable);
    
    setNewVariable({ name: '', type: 'string', value: '' });
  };

  // 转换值类型
  const convertValue = (value: string, type: string) => {
    switch (type) {
      case 'number':
        return Number(value) || 0;
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      default:
        return value;
    }
  };

  // 格式化值显示
  const formatValue = (value: any, type: string) => {
    switch (type) {
      case 'object':
        return JSON.stringify(value, null, 2);
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value);
    }
  };

  // 渲染变量面板
  const renderVariablesPanel = () => (
    <div className="space-y-4">
      {/* 添加变量 */}
      <div className="p-3 border rounded-lg bg-gray-50">
        <h4 className="font-medium text-sm mb-3">添加变量</h4>
        <div className="space-y-2">
          <Input
            placeholder="变量名"
            value={newVariable.name}
            onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
            size="sm"
          />
          <div className="flex space-x-2">
            <select
              value={newVariable.type}
              onChange={(e) => setNewVariable(prev => ({ ...prev, type: e.target.value }))}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="string">字符串</option>
              <option value="number">数字</option>
              <option value="boolean">布尔值</option>
              <option value="object">对象</option>
            </select>
            <Button
              size="sm"
              onClick={handleAddVariable}
              disabled={!newVariable.name.trim()}
            >
              添加
            </Button>
          </div>
          <Input
            placeholder="初始值"
            value={newVariable.value}
            onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
            size="sm"
          />
        </div>
      </div>

      {/* 变量列表 */}
      <div>
        <h4 className="font-medium text-sm mb-2">当前变量</h4>
        {Object.keys(simulationState.variables).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(simulationState.variables).map(([name, variable]) => (
              <div key={name} className="p-2 border rounded bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {variable.type}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {formatValue(variable.value, variable.type)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            <CodeBracketIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>暂无变量</p>
            <p className="text-xs text-gray-400">添加变量来跟踪仿真状态</p>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染执行历史面板
  const renderExecutionPanel = () => (
    <div className="space-y-4">
      {/* 执行统计 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{simulationState.stepCount}</div>
          <div className="text-xs text-blue-800">执行步数</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{simulationState.executionPath.length}</div>
          <div className="text-xs text-green-800">访问节点</div>
        </div>
      </div>

      {/* 执行路径 */}
      <div>
        <h4 className="font-medium text-sm mb-2">执行路径</h4>
        {simulationState.executionPath.length > 0 ? (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {simulationState.executionPath.map((nodeId, index) => (
              <div
                key={`${nodeId}-${index}`}
                className={`flex items-center space-x-2 p-2 rounded text-sm ${
                  simulationState.currentNodeId === nodeId
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">{index + 1}</span>
                <span className="flex-1">{nodeId}</span>
                {simulationState.currentNodeId === nodeId && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>暂无执行记录</p>
            <p className="text-xs text-gray-400">开始仿真后将显示执行路径</p>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染断点面板
  const renderBreakpointsPanel = () => (
    <div className="space-y-4">
      {/* 断点说明 */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">断点功能</p>
            <p className="text-yellow-700 text-xs mt-1">
              在节点上设置断点，仿真运行到该节点时会自动暂停
            </p>
          </div>
        </div>
      </div>

      {/* 断点列表 */}
      <div>
        <h4 className="font-medium text-sm mb-2">已设置断点</h4>
        {simulationState.breakpoints.length > 0 ? (
          <div className="space-y-2">
            {simulationState.breakpoints.map((nodeId, index) => (
              <div key={nodeId} className="flex items-center justify-between p-2 border rounded bg-white">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">{nodeId}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: 实现移除断点
                    console.log('移除断点:', nodeId);
                  }}
                >
                  移除
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            <div className="w-8 h-8 mx-auto mb-2 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
            <p>暂无断点</p>
            <p className="text-xs text-gray-400">在节点上右键添加断点</p>
          </div>
        )}
      </div>

      {/* 断点操作 */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // TODO: 实现清除所有断点
            console.log('清除所有断点');
          }}
          disabled={simulationState.breakpoints.length === 0}
        >
          清除所有断点
        </Button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'variables', label: '变量', icon: CodeBracketIcon },
    { id: 'execution', label: '执行', icon: ChartBarSquareIcon },
    { id: 'breakpoints', label: '断点', icon: StopIcon }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">流程仿真</h3>
        <p className="text-xs text-gray-500 mt-1">
          {simulationState.isRunning 
            ? `运行中${simulationState.isPaused ? ' (已暂停)' : ''}`
            : '未运行'
          }
        </p>
      </div>

      {/* 仿真控制 */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={simulationState.isRunning ? 'outline' : 'primary'}
            onClick={() => {
              // TODO: 实现播放/暂停逻辑
              console.log('播放/暂停仿真');
            }}
            disabled={!simulationState.isRunning && !simulationState.currentNodeId}
          >
            {simulationState.isRunning && !simulationState.isPaused ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onStepSimulation}
            disabled={!simulationState.isRunning || !simulationState.isPaused}
          >
            <ForwardIcon className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // TODO: 实现停止仿真逻辑
              console.log('停止仿真');
            }}
            disabled={!simulationState.isRunning}
          >
            <StopIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* 仿真速度控制 */}
        {simulationState.isRunning && (
          <div className="mt-3">
            <label className="block text-xs text-gray-600 mb-1">仿真速度</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              defaultValue="1"
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              onChange={(e) => {
                // TODO: 实现速度控制
                console.log('仿真速度:', e.target.value);
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>慢</span>
              <span>快</span>
            </div>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div className="border-b">
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'variables' && renderVariablesPanel()}
        {activeTab === 'execution' && renderExecutionPanel()}
        {activeTab === 'breakpoints' && renderBreakpointsPanel()}
      </div>

      {/* 状态提示 */}
      {simulationState.isRunning && (
        <div className="p-3 bg-green-50 border-t">
          <div className="flex items-center space-x-2 text-sm text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              当前节点: {simulationState.currentNodeId || '无'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowSimulator;