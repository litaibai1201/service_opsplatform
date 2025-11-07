import React, { useState, useCallback, useRef } from 'react';
import { Card, Button, Tabs } from '@/components/ui';
import { 
  PlusIcon, 
  DocumentArrowDownIcon, 
  DocumentArrowUpIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import DiagramCanvas from './components/DiagramCanvas';
import NodePalette from './components/NodePalette';
import PropertyPanel from './components/PropertyPanel';
import ToolBar from './components/ToolBar';
import LayerPanel from './components/LayerPanel';
import ZoomControls from './components/ZoomControls';
import GridOverlay from './components/GridOverlay';

interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: {
    label: string;
    description?: string;
    properties?: Record<string, any>;
  };
  style?: Record<string, any>;
}

interface DiagramConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  style?: Record<string, any>;
}

interface DiagramLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  nodeIds: string[];
}

const ArchitecturePage: React.FC = () => {
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);
  const [layers, setLayers] = useState<DiagramLayer[]>([
    {
      id: 'default',
      name: '默认图层',
      visible: true,
      locked: false,
      opacity: 1,
      nodeIds: []
    }
  ]);
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<DiagramConnection | null>(null);
  const [activeTab, setActiveTab] = useState('design');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [canvasSize] = useState({ width: 2000, height: 1500 });
  const [viewPort, setViewPort] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // 节点操作
  const handleAddNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: DiagramNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      position,
      size: { width: 120, height: 80 },
      data: {
        label: `新${nodeType}`,
        description: '',
        properties: {}
      }
    };

    setNodes(prev => [...prev, newNode]);
    setLayers(prev => prev.map(layer => 
      layer.id === 'default' 
        ? { ...layer, nodeIds: [...layer.nodeIds, newNode.id] }
        : layer
    ));
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<DiagramNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => 
      conn.sourceId !== nodeId && conn.targetId !== nodeId
    ));
    setLayers(prev => prev.map(layer => ({
      ...layer,
      nodeIds: layer.nodeIds.filter(id => id !== nodeId)
    })));
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  // 连接操作
  const handleAddConnection = useCallback((sourceId: string, targetId: string, connectionType: string = 'default') => {
    const newConnection: DiagramConnection = {
      id: `conn_${Date.now()}`,
      sourceId,
      targetId,
      type: connectionType,
      label: ''
    };

    setConnections(prev => [...prev, newConnection]);
  }, []);

  const handleUpdateConnection = useCallback((connectionId: string, updates: Partial<DiagramConnection>) => {
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

  // 图层操作
  const handleUpdateLayer = useCallback((layerId: string, updates: Partial<DiagramLayer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  }, []);

  const handleAddLayer = useCallback(() => {
    const newLayer: DiagramLayer = {
      id: `layer_${Date.now()}`,
      name: `图层 ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      nodeIds: []
    };
    setLayers(prev => [...prev, newLayer]);
  }, [layers.length]);

  // 画布操作
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.max(25, Math.min(400, newZoom)));
  }, []);

  const handleViewPortChange = useCallback((delta: { x: number; y: number }) => {
    setViewPort(prev => ({
      x: prev.x + delta.x,
      y: prev.y + delta.y
    }));
  }, []);

  // 文件操作
  const handleExport = useCallback((format: 'json' | 'png' | 'svg' | 'pdf') => {
    const diagramData = {
      nodes,
      connections,
      layers,
      metadata: {
        name: '架构图',
        createdAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(diagramData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'architecture-diagram.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // TODO: 实现其他格式的导出
      console.log(`导出 ${format} 格式`);
    }
  }, [nodes, connections, layers]);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setNodes(data.nodes || []);
        setConnections(data.connections || []);
        setLayers(data.layers || []);
      } catch (error) {
        console.error('导入文件失败:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  // 模拟操作
  const handleToggleSimulation = useCallback(() => {
    setIsSimulating(prev => !prev);
  }, []);

  const tabs = [
    { id: 'design', label: '设计', icon: Cog6ToothIcon },
    { id: 'preview', label: '预览', icon: EyeIcon },
    { id: 'simulate', label: '仿真', icon: PlayIcon }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">架构设计工具</h1>
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
                onClick={handleToggleSimulation}
              >
                {isSimulating ? (
                  <>
                    <StopIcon className="w-4 h-4 mr-1" />
                    停止仿真
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4 mr-1" />
                    开始仿真
                  </>
                )}
              </Button>
            </div>
          </div>

          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              {showGrid ? (
                <EyeSlashIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
              网格
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 */}
        <div className="w-64 border-r bg-white flex flex-col">
          <NodePalette onAddNode={handleAddNode} />
        </div>

        {/* 中央画布区域 */}
        <div className="flex-1 relative bg-gray-100">
          {/* 工具栏 */}
          <ToolBar
            onZoomIn={() => handleZoomChange(zoom + 25)}
            onZoomOut={() => handleZoomChange(zoom - 25)}
            onResetZoom={() => handleZoomChange(100)}
            onFitToScreen={() => {
              // TODO: 实现适应屏幕功能
            }}
            onUndo={() => {
              // TODO: 实现撤销功能
            }}
            onRedo={() => {
              // TODO: 实现重做功能
            }}
          />

          {/* 画布容器 */}
          <div 
            ref={canvasRef}
            className="absolute inset-0 overflow-auto"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left'
            }}
          >
            {/* 网格背景 */}
            {showGrid && <GridOverlay zoom={zoom} />}
            
            {/* 图表画布 */}
            <DiagramCanvas
              nodes={nodes}
              connections={connections}
              layers={layers}
              selectedNode={selectedNode}
              selectedConnection={selectedConnection}
              isSimulating={isSimulating}
              canvasSize={canvasSize}
              viewPort={viewPort}
              onNodeSelect={setSelectedNode}
              onConnectionSelect={setSelectedConnection}
              onNodeUpdate={handleUpdateNode}
              onConnectionUpdate={handleUpdateConnection}
              onNodeDelete={handleDeleteNode}
              onConnectionDelete={handleDeleteConnection}
              onAddConnection={handleAddConnection}
              onViewPortChange={handleViewPortChange}
            />
          </div>

          {/* 缩放控制 */}
          <ZoomControls
            zoom={zoom}
            onZoomChange={handleZoomChange}
            onFitToScreen={() => {
              // TODO: 实现适应屏幕功能
            }}
          />
        </div>

        {/* 右侧面板 */}
        <div className="w-80 border-l bg-white flex flex-col">
          <div className="flex-1">
            <PropertyPanel
              selectedNode={selectedNode}
              selectedConnection={selectedConnection}
              onNodeUpdate={handleUpdateNode}
              onConnectionUpdate={handleUpdateConnection}
            />
          </div>
          
          <div className="border-t">
            <LayerPanel
              layers={layers}
              onLayerUpdate={handleUpdateLayer}
              onAddLayer={handleAddLayer}
              onLayerSelect={(layerId) => {
                // TODO: 实现图层选择逻辑
              }}
            />
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="border-t bg-white px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>节点数: {nodes.length}</span>
            <span>连接数: {connections.length}</span>
            <span>图层数: {layers.length}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>缩放: {zoom}%</span>
            <span>位置: ({viewPort.x}, {viewPort.y})</span>
            {isSimulating && (
              <span className="text-green-600 font-medium">● 仿真运行中</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitecturePage;