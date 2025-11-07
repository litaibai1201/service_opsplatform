import React, { useState, useCallback, useRef } from 'react';
import { Card, Button, Tabs } from '@/components/ui';
import { 
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  BackwardIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import FlowCanvas from './components/FlowCanvas';
import FlowNodeTypes from './components/FlowNodeTypes';
import FlowSimulator from './components/FlowSimulator';
import ValidationPanel from './components/ValidationPanel';
import ConnectionLine from './components/ConnectionLine';

interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'input' | 'output' | 'connector';
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: {
    label: string;
    description?: string;
    condition?: string;
    variables?: Record<string, any>;
    properties?: Record<string, any>;
  };
  style?: Record<string, any>;
}

interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'default' | 'yes' | 'no' | 'conditional';
  label?: string;
  condition?: string;
  style?: Record<string, any>;
}

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

const FlowDiagramPage: React.FC = () => {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<FlowConnection | null>(null);
  const [activeTab, setActiveTab] = useState('design');
  const [zoom, setZoom] = useState(100);
  const [canvasSize] = useState({ width: 2000, height: 1500 });
  const [viewPort, setViewPort] = useState({ x: 0, y: 0 });
  
  // 仿真状态
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    isPaused: false,
    currentNodeId: null,
    stepCount: 0,
    variables: {},
    executionPath: [],
    breakpoints: []
  });

  // 验证状态
  const [validationResults, setValidationResults] = useState<any[]>([]);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // 节点操作
  const handleAddNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type: nodeType as any,
      position,
      size: getDefaultSizeForNodeType(nodeType),
      data: {
        label: getDefaultLabelForNodeType(nodeType),
        description: '',
        properties: {}
      }
    };

    setNodes(prev => [...prev, newNode]);
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<FlowNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => 
      conn.sourceId !== nodeId && conn.targetId !== nodeId
    ));
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  // 连接操作
  const handleAddConnection = useCallback((sourceId: string, targetId: string, connectionType: string = 'default') => {
    const newConnection: FlowConnection = {
      id: `conn_${Date.now()}`,
      sourceId,
      targetId,
      type: connectionType as any,
      label: connectionType === 'yes' ? '是' : connectionType === 'no' ? '否' : ''
    };

    setConnections(prev => [...prev, newConnection]);
  }, []);

  const handleUpdateConnection = useCallback((connectionId: string, updates: Partial<FlowConnection>) => {
    setConnections(prev => prev.map(conn => 
      conn.id === connectionId ? { ...conn, ...updates } : conn
    ));
  }, []);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    
    if (selectedConnection?.id === connectionId) {
      setSelectedConnection(null);
    }
  }, [selectedConnection]);

  // 仿真控制
  const handleStartSimulation = useCallback(() => {
    const startNode = nodes.find(node => node.type === 'start');
    if (!startNode) {
      alert('请添加开始节点');
      return;
    }

    setSimulationState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentNodeId: startNode.id,
      stepCount: 0,
      executionPath: [startNode.id]
    }));
  }, [nodes]);

  const handlePauseSimulation = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  }, []);

  const handleStopSimulation = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentNodeId: null,
      stepCount: 0,
      executionPath: []
    }));
  }, []);

  const handleStepSimulation = useCallback(() => {
    if (!simulationState.currentNodeId) return;

    const currentNode = nodes.find(n => n.id === simulationState.currentNodeId);
    if (!currentNode) return;

    // 找到下一个节点
    const outgoingConnections = connections.filter(c => c.sourceId === simulationState.currentNodeId);
    
    if (outgoingConnections.length === 0) {
      // 没有后续节点，仿真结束
      handleStopSimulation();
      return;
    }

    // 简单的下一步逻辑，实际应该根据节点类型和条件来决定
    const nextConnection = outgoingConnections[0];
    const nextNodeId = nextConnection.targetId;

    setSimulationState(prev => ({
      ...prev,
      currentNodeId: nextNodeId,
      stepCount: prev.stepCount + 1,
      executionPath: [...prev.executionPath, nextNodeId]
    }));
  }, [simulationState.currentNodeId, nodes, connections, handleStopSimulation]);

  // 验证流程图
  const handleValidateFlow = useCallback(() => {
    const results = [];

    // 检查是否有开始节点
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      results.push({
        type: 'error',
        message: '流程图必须包含一个开始节点',
        nodeId: null
      });
    } else if (startNodes.length > 1) {
      results.push({
        type: 'warning',
        message: '流程图不应包含多个开始节点',
        nodeId: null
      });
    }

    // 检查是否有结束节点
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      results.push({
        type: 'warning',
        message: '建议添加结束节点',
        nodeId: null
      });
    }

    // 检查孤立节点
    nodes.forEach(node => {
      const hasIncoming = connections.some(c => c.targetId === node.id);
      const hasOutgoing = connections.some(c => c.sourceId === node.id);
      
      if (!hasIncoming && node.type !== 'start') {
        results.push({
          type: 'warning',
          message: `节点 "${node.data.label}" 没有输入连接`,
          nodeId: node.id
        });
      }
      
      if (!hasOutgoing && node.type !== 'end') {
        results.push({
          type: 'warning',
          message: `节点 "${node.data.label}" 没有输出连接`,
          nodeId: node.id
        });
      }
    });

    // 检查决策节点
    nodes.filter(n => n.type === 'decision').forEach(node => {
      const outgoing = connections.filter(c => c.sourceId === node.id);
      if (outgoing.length < 2) {
        results.push({
          type: 'warning',
          message: `决策节点 "${node.data.label}" 应该有至少两个输出`,
          nodeId: node.id
        });
      }
    });

    setValidationResults(results);
  }, [nodes, connections]);

  // 导出流程图
  const handleExport = useCallback((format: 'json' | 'png' | 'svg') => {
    const flowData = {
      nodes,
      connections,
      metadata: {
        name: '流程图',
        createdAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flow-diagram.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // TODO: 实现其他格式的导出
      console.log(`导出 ${format} 格式`);
    }
  }, [nodes, connections]);

  // 导入流程图
  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setNodes(data.nodes || []);
        setConnections(data.connections || []);
      } catch (error) {
        console.error('导入文件失败:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  // 获取节点类型的默认尺寸
  function getDefaultSizeForNodeType(nodeType: string) {
    const sizeMap: Record<string, { width: number; height: number }> = {
      start: { width: 100, height: 60 },
      end: { width: 100, height: 60 },
      process: { width: 120, height: 80 },
      decision: { width: 140, height: 80 },
      input: { width: 120, height: 60 },
      output: { width: 120, height: 60 },
      connector: { width: 20, height: 20 }
    };
    return sizeMap[nodeType] || { width: 120, height: 80 };
  }

  // 获取节点类型的默认标签
  function getDefaultLabelForNodeType(nodeType: string) {
    const labelMap: Record<string, string> = {
      start: '开始',
      end: '结束',
      process: '处理',
      decision: '判断',
      input: '输入',
      output: '输出',
      connector: '连接点'
    };
    return labelMap[nodeType] || '新节点';
  }

  const tabs = [
    { id: 'design', label: '设计', icon: Cog6ToothIcon },
    { id: 'simulate', label: '仿真', icon: PlayIcon },
    { id: 'validate', label: '验证', icon: CheckCircleIcon }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">流程图设计工具</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <DocumentArrowUpIcon className="w-4 h-4 mr-1" />
                导入
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                导出
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidateFlow}
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                验证
              </Button>
            </div>
          </div>

          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* 仿真控制 */}
          <div className="flex items-center space-x-2">
            {simulationState.isRunning ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseSimulation}
                >
                  {simulationState.isPaused ? (
                    <PlayIcon className="w-4 h-4" />
                  ) : (
                    <PauseIcon className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStepSimulation}
                  disabled={!simulationState.isPaused}
                >
                  <ForwardIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopSimulation}
                >
                  <StopIcon className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartSimulation}
              >
                <PlayIcon className="w-4 h-4 mr-1" />
                开始仿真
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 */}
        <div className="w-64 border-r bg-white flex flex-col">
          {activeTab === 'design' && (
            <FlowNodeTypes onAddNode={handleAddNode} />
          )}
          {activeTab === 'simulate' && (
            <FlowSimulator 
              simulationState={simulationState}
              onStepSimulation={handleStepSimulation}
            />
          )}
          {activeTab === 'validate' && (
            <ValidationPanel 
              validationResults={validationResults}
              onValidate={handleValidateFlow}
              onNodeSelect={setSelectedNode}
            />
          )}
        </div>

        {/* 中央画布区域 */}
        <div className="flex-1 relative bg-gray-100">
          <FlowCanvas
            nodes={nodes}
            connections={connections}
            selectedNode={selectedNode}
            selectedConnection={selectedConnection}
            simulationState={simulationState}
            canvasSize={canvasSize}
            viewPort={viewPort}
            zoom={zoom}
            onNodeSelect={setSelectedNode}
            onConnectionSelect={setSelectedConnection}
            onNodeUpdate={handleUpdateNode}
            onConnectionUpdate={handleUpdateConnection}
            onNodeDelete={handleDeleteNode}
            onConnectionDelete={handleDeleteConnection}
            onAddConnection={handleAddConnection}
            onViewPortChange={setViewPort}
            onZoomChange={setZoom}
          />
        </div>

        {/* 右侧属性面板 */}
        <div className="w-80 border-l bg-white">
          {/* 这里可以复用之前的PropertyPanel，或者创建专门的FlowPropertyPanel */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">属性面板</h3>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    节点标签
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => handleUpdateNode(selectedNode.id, {
                      data: { ...selectedNode.data, label: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={selectedNode.data.description || ''}
                    onChange={(e) => handleUpdateNode(selectedNode.id, {
                      data: { ...selectedNode.data, description: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                {selectedNode.type === 'decision' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      判断条件
                    </label>
                    <textarea
                      value={selectedNode.data.condition || ''}
                      onChange={(e) => handleUpdateNode(selectedNode.id, {
                        data: { ...selectedNode.data, condition: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={2}
                      placeholder="例如: x > 10"
                    />
                  </div>
                )}
              </div>
            ) : selectedConnection ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    连接标签
                  </label>
                  <input
                    type="text"
                    value={selectedConnection.label || ''}
                    onChange={(e) => handleUpdateConnection(selectedConnection.id, {
                      label: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    连接类型
                  </label>
                  <select
                    value={selectedConnection.type}
                    onChange={(e) => handleUpdateConnection(selectedConnection.id, {
                      type: e.target.value as any
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="default">默认</option>
                    <option value="yes">是</option>
                    <option value="no">否</option>
                    <option value="conditional">条件</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-sm">选择节点或连接线</p>
                <p className="text-xs text-gray-400 mt-1">查看和编辑属性</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="border-t bg-white px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>节点数: {nodes.length}</span>
            <span>连接数: {connections.length}</span>
            {validationResults.length > 0 && (
              <span className="flex items-center space-x-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                <span>{validationResults.length} 个问题</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>缩放: {zoom}%</span>
            {simulationState.isRunning && (
              <span className="text-green-600 font-medium">
                ● 仿真运行中 (步骤: {simulationState.stepCount})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowDiagramPage;