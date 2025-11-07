// Data synchronization engine for real-time collaboration
import { Operation, OperationalTransform, OTDocument } from './OperationalTransform';
import { ConflictResolver, ConflictData } from './ConflictResolver';
import { WebSocketClient, WebSocketManager } from './WebSocketClient';

export interface SyncState {
  documentId: string;
  localVersion: number;
  serverVersion: number;
  pendingOperations: Operation[];
  acknowledgedOperations: Operation[];
  lastSyncTimestamp: number;
  isSyncing: boolean;
  hasConflicts: boolean;
}

export interface SyncOptions {
  syncInterval: number;          // 同步间隔（毫秒）
  maxPendingOps: number;         // 最大待处理操作数
  conflictResolutionTimeout: number; // 冲突解决超时时间
  retryAttempts: number;         // 重试次数
  batchSize: number;            // 批量操作大小
}

export interface DocumentSnapshot {
  id: string;
  content: string;
  version: number;
  timestamp: number;
  userId: string;
  operations: Operation[];
}

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'conflict-detected' | 'operation-applied';
  data: any;
  timestamp: number;
}

export class SyncEngine {
  private static instance: SyncEngine | null = null;
  private ot: OperationalTransform;
  private conflictResolver: ConflictResolver;
  private documents = new Map<string, OTDocument>();
  private syncStates = new Map<string, SyncState>();
  private syncTimers = new Map<string, NodeJS.Timeout>();
  private options: SyncOptions;
  private eventListeners = new Map<string, Function[]>();

  constructor(options: Partial<SyncOptions> = {}) {
    this.ot = OperationalTransform.getInstance();
    this.conflictResolver = ConflictResolver.getInstance();
    this.options = {
      syncInterval: 1000,
      maxPendingOps: 100,
      conflictResolutionTimeout: 5000,
      retryAttempts: 3,
      batchSize: 10,
      ...options,
    };
  }

  static getInstance(options?: Partial<SyncOptions>): SyncEngine {
    if (!this.instance) {
      this.instance = new SyncEngine(options);
    }
    return this.instance;
  }

  // 初始化文档同步
  async initializeDocument(documentId: string, initialContent: string = ''): Promise<void> {
    const document: OTDocument = {
      id: documentId,
      content: initialContent,
      version: 0,
      operations: [],
    };

    const syncState: SyncState = {
      documentId,
      localVersion: 0,
      serverVersion: 0,
      pendingOperations: [],
      acknowledgedOperations: [],
      lastSyncTimestamp: Date.now(),
      isSyncing: false,
      hasConflicts: false,
    };

    this.documents.set(documentId, document);
    this.syncStates.set(documentId, syncState);

    // 启动定期同步
    this.startSync(documentId);

    // 从服务器获取最新版本
    await this.fetchServerVersion(documentId);
  }

  // 应用本地操作
  applyLocalOperation(documentId: string, operation: Operation): void {
    const document = this.documents.get(documentId);
    const syncState = this.syncStates.get(documentId);
    
    if (!document || !syncState) {
      throw new Error(`Document ${documentId} not initialized`);
    }

    // 验证操作
    if (!this.ot.validateOperation(operation, document)) {
      throw new Error('Invalid operation');
    }

    // 应用操作到本地文档
    const updatedDocument = this.ot.applyOperation(document, operation);
    this.documents.set(documentId, updatedDocument);

    // 添加到待处理操作队列
    syncState.pendingOperations.push(operation);
    syncState.localVersion++;

    // 触发事件
    this.emit('operation-applied', { documentId, operation });

    // 立即同步重要操作
    if (this.isImportantOperation(operation)) {
      this.syncDocument(documentId);
    }

    // 检查是否需要批量同步
    if (syncState.pendingOperations.length >= this.options.batchSize) {
      this.syncDocument(documentId);
    }
  }

  // 接收远程操作
  async receiveRemoteOperation(documentId: string, operation: Operation): Promise<void> {
    const document = this.documents.get(documentId);
    const syncState = this.syncStates.get(documentId);
    
    if (!document || !syncState) {
      throw new Error(`Document ${documentId} not initialized`);
    }

    // 检测冲突
    const conflicts = this.conflictResolver.detectConflicts([
      ...syncState.pendingOperations,
      operation
    ]);

    if (conflicts.length > 0) {
      await this.handleConflicts(documentId, conflicts);
      return;
    }

    // 转换操作
    let transformedOperation = operation;
    for (const pendingOp of syncState.pendingOperations) {
      const result = this.ot.transform(transformedOperation, pendingOp);
      transformedOperation = result.transformedOp1;
    }

    // 应用转换后的操作
    const updatedDocument = this.ot.applyOperation(document, transformedOperation);
    this.documents.set(documentId, updatedDocument);

    syncState.serverVersion++;
    this.emit('operation-applied', { documentId, operation: transformedOperation, remote: true });
  }

  // 同步文档
  async syncDocument(documentId: string): Promise<void> {
    const syncState = this.syncStates.get(documentId);
    if (!syncState || syncState.isSyncing) {
      return;
    }

    syncState.isSyncing = true;
    this.emit('sync-start', { documentId });

    try {
      // 发送待处理操作
      if (syncState.pendingOperations.length > 0) {
        await this.sendOperations(documentId, syncState.pendingOperations);
      }

      // 获取服务器更新
      await this.fetchServerUpdates(documentId);

      syncState.lastSyncTimestamp = Date.now();
      this.emit('sync-complete', { documentId });

    } catch (error) {
      this.emit('sync-error', { documentId, error });
      throw error;
    } finally {
      syncState.isSyncing = false;
    }
  }

  // 发送操作到服务器
  private async sendOperations(documentId: string, operations: Operation[]): Promise<void> {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient) {
      throw new Error('WebSocket client not available');
    }

    const syncState = this.syncStates.get(documentId)!;

    try {
      const response = await wsClient.sendWithResponse('sync_operations', {
        documentId,
        operations,
        clientVersion: syncState.localVersion,
        serverVersion: syncState.serverVersion,
      });

      if (response.data.success) {
        // 移动到已确认操作
        syncState.acknowledgedOperations.push(...operations);
        syncState.pendingOperations = [];
        syncState.serverVersion = response.data.serverVersion;
      } else if (response.data.conflicts) {
        // 处理服务器返回的冲突
        await this.handleServerConflicts(documentId, response.data.conflicts);
      }

    } catch (error) {
      console.error('Failed to send operations:', error);
      throw error;
    }
  }

  // 获取服务器更新
  private async fetchServerUpdates(documentId: string): Promise<void> {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient) {
      throw new Error('WebSocket client not available');
    }

    const syncState = this.syncStates.get(documentId)!;

    try {
      const response = await wsClient.sendWithResponse('fetch_updates', {
        documentId,
        clientVersion: syncState.serverVersion,
      });

      if (response.data.operations && response.data.operations.length > 0) {
        for (const operation of response.data.operations) {
          await this.receiveRemoteOperation(documentId, operation);
        }
      }

    } catch (error) {
      console.error('Failed to fetch server updates:', error);
      throw error;
    }
  }

  // 获取服务器版本
  private async fetchServerVersion(documentId: string): Promise<void> {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient) {
      return;
    }

    try {
      const response = await wsClient.sendWithResponse('get_document_info', {
        documentId,
      });

      const syncState = this.syncStates.get(documentId)!;
      syncState.serverVersion = response.data.version;

      // 如果服务器版本更新，获取内容
      if (response.data.version > 0) {
        const contentResponse = await wsClient.sendWithResponse('get_document_content', {
          documentId,
        });

        const document = this.documents.get(documentId)!;
        this.documents.set(documentId, {
          ...document,
          content: contentResponse.data.content,
          version: contentResponse.data.version,
          operations: contentResponse.data.operations || [],
        });
      }

    } catch (error) {
      console.error('Failed to fetch server version:', error);
    }
  }

  // 处理冲突
  private async handleConflicts(documentId: string, conflicts: ConflictData[]): Promise<void> {
    const syncState = this.syncStates.get(documentId)!;
    syncState.hasConflicts = true;

    this.emit('conflict-detected', { documentId, conflicts });

    for (const conflict of conflicts) {
      try {
        const resolution = await this.conflictResolver.resolveConflict(
          conflict.id,
          'operational-transform'
        );

        if (resolution.mergedOperation) {
          // 应用合并后的操作
          const document = this.documents.get(documentId)!;
          const updatedDocument = this.ot.applyOperation(document, resolution.mergedOperation);
          this.documents.set(documentId, updatedDocument);
        }

      } catch (error) {
        console.error(`Failed to resolve conflict ${conflict.id}:`, error);
        // 回退到最后写入者获胜策略
        await this.conflictResolver.resolveConflict(conflict.id, 'last-writer-wins');
      }
    }

    syncState.hasConflicts = false;
  }

  // 处理服务器冲突
  private async handleServerConflicts(documentId: string, serverConflicts: any[]): Promise<void> {
    // 服务器检测到冲突，需要重新获取最新状态
    await this.fetchServerVersion(documentId);
    
    // 重新计算本地操作
    const syncState = this.syncStates.get(documentId)!;
    const document = this.documents.get(documentId)!;
    
    // 撤销所有待处理操作
    let currentDocument = { ...document };
    for (const op of syncState.pendingOperations.reverse()) {
      const undoOp = this.ot.createUndoOperation(op);
      currentDocument = this.ot.applyOperation(currentDocument, undoOp);
    }
    
    // 重新应用操作
    for (const op of syncState.pendingOperations.reverse()) {
      try {
        currentDocument = this.ot.applyOperation(currentDocument, op);
      } catch (error) {
        console.error('Failed to reapply operation:', error);
        // 移除有问题的操作
        syncState.pendingOperations = syncState.pendingOperations.filter(o => o.id !== op.id);
      }
    }
    
    this.documents.set(documentId, currentDocument);
  }

  // 创建文档快照
  createSnapshot(documentId: string): DocumentSnapshot {
    const document = this.documents.get(documentId);
    const syncState = this.syncStates.get(documentId);
    
    if (!document || !syncState) {
      throw new Error(`Document ${documentId} not found`);
    }

    return {
      id: documentId,
      content: document.content,
      version: document.version,
      timestamp: Date.now(),
      userId: 'current-user', // 应该从认证上下文获取
      operations: [...document.operations],
    };
  }

  // 恢复文档快照
  async restoreSnapshot(snapshot: DocumentSnapshot): Promise<void> {
    const document: OTDocument = {
      id: snapshot.id,
      content: snapshot.content,
      version: snapshot.version,
      operations: snapshot.operations,
    };

    this.documents.set(snapshot.id, document);

    // 重置同步状态
    const syncState: SyncState = {
      documentId: snapshot.id,
      localVersion: snapshot.version,
      serverVersion: snapshot.version,
      pendingOperations: [],
      acknowledgedOperations: [],
      lastSyncTimestamp: snapshot.timestamp,
      isSyncing: false,
      hasConflicts: false,
    };

    this.syncStates.set(snapshot.id, syncState);
  }

  // 获取文档状态
  getDocumentState(documentId: string): {
    document: OTDocument | null;
    syncState: SyncState | null;
  } {
    return {
      document: this.documents.get(documentId) || null,
      syncState: this.syncStates.get(documentId) || null,
    };
  }

  // 启动定期同步
  private startSync(documentId: string): void {
    // 清除现有定时器
    this.stopSync(documentId);

    const timer = setInterval(() => {
      const syncState = this.syncStates.get(documentId);
      if (syncState && syncState.pendingOperations.length > 0) {
        this.syncDocument(documentId).catch(error => {
          console.error(`Sync failed for document ${documentId}:`, error);
        });
      }
    }, this.options.syncInterval);

    this.syncTimers.set(documentId, timer);
  }

  // 停止同步
  stopSync(documentId: string): void {
    const timer = this.syncTimers.get(documentId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(documentId);
    }
  }

  // 清理文档
  cleanupDocument(documentId: string): void {
    this.stopSync(documentId);
    this.documents.delete(documentId);
    this.syncStates.delete(documentId);
  }

  // 判断是否为重要操作
  private isImportantOperation(operation: Operation): boolean {
    return operation.type === 'createNode' || 
           operation.type === 'deleteNode' ||
           (operation.type === 'delete' && (operation.length || 0) > 10);
  }

  // 事件系统
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const syncEvent: SyncEvent = {
        type: event as any,
        data,
        timestamp: Date.now(),
      };
      
      listeners.forEach(listener => {
        try {
          listener(syncEvent);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  // 获取同步统计
  getSyncStats(documentId: string): {
    pendingCount: number;
    acknowledgedCount: number;
    lastSyncTime: number;
    syncFrequency: number;
    conflictCount: number;
  } {
    const syncState = this.syncStates.get(documentId);
    if (!syncState) {
      return {
        pendingCount: 0,
        acknowledgedCount: 0,
        lastSyncTime: 0,
        syncFrequency: 0,
        conflictCount: 0,
      };
    }

    const conflicts = this.conflictResolver.getActiveConflicts()
      .filter(c => c.operations.some(op => op.data?.documentId === documentId));

    return {
      pendingCount: syncState.pendingOperations.length,
      acknowledgedCount: syncState.acknowledgedOperations.length,
      lastSyncTime: syncState.lastSyncTimestamp,
      syncFrequency: this.options.syncInterval,
      conflictCount: conflicts.length,
    };
  }

  // 强制全量同步
  async forceFullSync(documentId: string): Promise<void> {
    const syncState = this.syncStates.get(documentId);
    if (!syncState) {
      throw new Error(`Document ${documentId} not found`);
    }

    // 重置版本信息
    syncState.localVersion = 0;
    syncState.serverVersion = 0;
    syncState.pendingOperations = [];
    syncState.acknowledgedOperations = [];

    // 重新获取服务器状态
    await this.fetchServerVersion(documentId);
    await this.syncDocument(documentId);
  }
}