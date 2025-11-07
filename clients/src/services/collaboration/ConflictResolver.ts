// Conflict resolution system for real-time collaboration
import { Operation, OperationalTransform } from './OperationalTransform';

export interface ConflictData {
  id: string;
  operations: Operation[];
  users: string[];
  timestamp: number;
  resolved: boolean;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  winnerUserId?: string;
  mergedOperation?: Operation;
  customResolution?: any;
  timestamp: number;
}

export type ResolutionStrategy = 
  | 'last-writer-wins'    // 最后写入者获胜
  | 'first-writer-wins'   // 最先写入者获胜
  | 'user-priority'       // 基于用户优先级
  | 'manual-resolution'   // 手动解决
  | 'semantic-merge'      // 语义合并
  | 'operational-transform'; // 操作转换

export interface UserPriority {
  userId: string;
  priority: number;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}

export interface SemanticMergeRule {
  elementType: string;
  conflictType: string;
  strategy: ResolutionStrategy;
  customHandler?: (operations: Operation[]) => Operation;
}

export interface ConflictDetectionRule {
  name: string;
  detector: (op1: Operation, op2: Operation) => boolean;
  severity: 'low' | 'medium' | 'high';
  autoResolvable: boolean;
}

export class ConflictResolver {
  private static instance: ConflictResolver | null = null;
  private ot: OperationalTransform;
  private userPriorities = new Map<string, UserPriority>();
  private semanticRules: SemanticMergeRule[] = [];
  private detectionRules: ConflictDetectionRule[] = [];
  private activeConflicts = new Map<string, ConflictData>();

  constructor() {
    this.ot = OperationalTransform.getInstance();
    this.initializeDefaultRules();
  }

  static getInstance(): ConflictResolver {
    if (!this.instance) {
      this.instance = new ConflictResolver();
    }
    return this.instance;
  }

  // 初始化默认规则
  private initializeDefaultRules(): void {
    // 冲突检测规则
    this.detectionRules = [
      {
        name: 'overlapping-text-edit',
        detector: (op1, op2) => this.detectOverlappingTextEdit(op1, op2),
        severity: 'high',
        autoResolvable: true,
      },
      {
        name: 'concurrent-delete',
        detector: (op1, op2) => this.detectConcurrentDelete(op1, op2),
        severity: 'medium',
        autoResolvable: true,
      },
      {
        name: 'attribute-conflict',
        detector: (op1, op2) => this.detectAttributeConflict(op1, op2),
        severity: 'low',
        autoResolvable: true,
      },
      {
        name: 'structural-conflict',
        detector: (op1, op2) => this.detectStructuralConflict(op1, op2),
        severity: 'high',
        autoResolvable: false,
      },
    ];

    // 语义合并规则
    this.semanticRules = [
      {
        elementType: 'text',
        conflictType: 'overlapping-edit',
        strategy: 'operational-transform',
      },
      {
        elementType: 'attribute',
        conflictType: 'same-attribute',
        strategy: 'last-writer-wins',
      },
      {
        elementType: 'node',
        conflictType: 'concurrent-delete',
        strategy: 'first-writer-wins',
      },
    ];
  }

  // 检测操作冲突
  detectConflicts(operations: Operation[]): ConflictData[] {
    const conflicts: ConflictData[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1 = operations[i];
        const op2 = operations[j];
        
        for (const rule of this.detectionRules) {
          if (rule.detector(op1, op2)) {
            const conflictId = this.generateConflictId(op1, op2);
            const conflict: ConflictData = {
              id: conflictId,
              operations: [op1, op2],
              users: [op1.userId, op2.userId],
              timestamp: Math.max(op1.timestamp, op2.timestamp),
              resolved: false,
            };
            
            conflicts.push(conflict);
            this.activeConflicts.set(conflictId, conflict);
            break;
          }
        }
      }
    }
    
    return conflicts;
  }

  // 解决冲突
  async resolveConflict(
    conflictId: string, 
    strategy: ResolutionStrategy = 'operational-transform',
    options?: any
  ): Promise<ConflictResolution> {
    const conflict = this.activeConflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let resolution: ConflictResolution;

    switch (strategy) {
      case 'last-writer-wins':
        resolution = this.resolveLastWriterWins(conflict);
        break;
      case 'first-writer-wins':
        resolution = this.resolveFirstWriterWins(conflict);
        break;
      case 'user-priority':
        resolution = this.resolveByUserPriority(conflict);
        break;
      case 'operational-transform':
        resolution = this.resolveByOperationalTransform(conflict);
        break;
      case 'semantic-merge':
        resolution = this.resolveBySemanticMerge(conflict);
        break;
      case 'manual-resolution':
        resolution = this.resolveManually(conflict, options);
        break;
      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }

    // 标记冲突为已解决
    conflict.resolved = true;
    conflict.resolution = resolution;

    return resolution;
  }

  // 最后写入者获胜策略
  private resolveLastWriterWins(conflict: ConflictData): ConflictResolution {
    const latestOp = conflict.operations.reduce((latest, op) => 
      op.timestamp > latest.timestamp ? op : latest
    );

    return {
      strategy: 'last-writer-wins',
      winnerUserId: latestOp.userId,
      mergedOperation: latestOp,
      timestamp: Date.now(),
    };
  }

  // 最先写入者获胜策略
  private resolveFirstWriterWins(conflict: ConflictData): ConflictResolution {
    const earliestOp = conflict.operations.reduce((earliest, op) => 
      op.timestamp < earliest.timestamp ? op : earliest
    );

    return {
      strategy: 'first-writer-wins',
      winnerUserId: earliestOp.userId,
      mergedOperation: earliestOp,
      timestamp: Date.now(),
    };
  }

  // 基于用户优先级解决
  private resolveByUserPriority(conflict: ConflictData): ConflictResolution {
    let winnerOp = conflict.operations[0];
    let highestPriority = -1;

    for (const op of conflict.operations) {
      const userPriority = this.userPriorities.get(op.userId);
      const priority = userPriority?.priority || 0;
      
      if (priority > highestPriority) {
        highestPriority = priority;
        winnerOp = op;
      }
    }

    return {
      strategy: 'user-priority',
      winnerUserId: winnerOp.userId,
      mergedOperation: winnerOp,
      timestamp: Date.now(),
    };
  }

  // 操作转换解决
  private resolveByOperationalTransform(conflict: ConflictData): ConflictResolution {
    if (conflict.operations.length !== 2) {
      throw new Error('Operational transform requires exactly 2 operations');
    }

    const [op1, op2] = conflict.operations;
    const result = this.ot.transform(op1, op2);

    // 创建合并操作
    const mergedOp: Operation = {
      id: `merged_${conflict.id}`,
      type: 'retain', // 特殊类型表示合并操作
      userId: 'system',
      timestamp: Date.now(),
      data: {
        transformedOperations: [result.transformedOp1, result.transformedOp2],
        originalOperations: conflict.operations,
      },
    };

    return {
      strategy: 'operational-transform',
      mergedOperation: mergedOp,
      timestamp: Date.now(),
    };
  }

  // 语义合并解决
  private resolveBySemanticMerge(conflict: ConflictData): ConflictResolution {
    const conflictType = this.analyzeConflictType(conflict);
    const elementType = this.getElementType(conflict.operations[0]);
    
    const rule = this.semanticRules.find(r => 
      r.elementType === elementType && r.conflictType === conflictType
    );

    if (rule && rule.customHandler) {
      const mergedOp = rule.customHandler(conflict.operations);
      return {
        strategy: 'semantic-merge',
        mergedOperation: mergedOp,
        timestamp: Date.now(),
      };
    }

    // 回退到默认策略
    return this.resolveLastWriterWins(conflict);
  }

  // 手动解决
  private resolveManually(conflict: ConflictData, resolution: any): ConflictResolution {
    return {
      strategy: 'manual-resolution',
      customResolution: resolution,
      timestamp: Date.now(),
    };
  }

  // 设置用户优先级
  setUserPriority(userId: string, priority: UserPriority): void {
    this.userPriorities.set(userId, priority);
  }

  // 添加语义合并规则
  addSemanticRule(rule: SemanticMergeRule): void {
    this.semanticRules.push(rule);
  }

  // 添加冲突检测规则
  addDetectionRule(rule: ConflictDetectionRule): void {
    this.detectionRules.push(rule);
  }

  // 获取活跃冲突
  getActiveConflicts(): ConflictData[] {
    return Array.from(this.activeConflicts.values()).filter(c => !c.resolved);
  }

  // 清除已解决的冲突
  clearResolvedConflicts(): void {
    for (const [id, conflict] of this.activeConflicts) {
      if (conflict.resolved) {
        this.activeConflicts.delete(id);
      }
    }
  }

  // 冲突检测器实现
  private detectOverlappingTextEdit(op1: Operation, op2: Operation): boolean {
    if ((op1.type === 'insert' || op1.type === 'delete' || op1.type === 'replace') &&
        (op2.type === 'insert' || op2.type === 'delete' || op2.type === 'replace')) {
      
      const pos1 = op1.position || 0;
      const len1 = op1.length || op1.content?.length || 0;
      const end1 = pos1 + len1;
      
      const pos2 = op2.position || 0;
      const len2 = op2.length || op2.content?.length || 0;
      const end2 = pos2 + len2;
      
      // 检查是否有重叠
      return !(end1 <= pos2 || end2 <= pos1);
    }
    
    return false;
  }

  private detectConcurrentDelete(op1: Operation, op2: Operation): boolean {
    return op1.type === 'delete' && op2.type === 'delete' && 
           op1.position === op2.position;
  }

  private detectAttributeConflict(op1: Operation, op2: Operation): boolean {
    return op1.type === 'setAttribute' && op2.type === 'setAttribute' &&
           op1.data?.elementId === op2.data?.elementId &&
           op1.data?.attribute === op2.data?.attribute;
  }

  private detectStructuralConflict(op1: Operation, op2: Operation): boolean {
    // 检测结构性冲突，如同时删除和修改同一节点
    if ((op1.type === 'deleteNode' && op2.type === 'updateNode') ||
        (op1.type === 'updateNode' && op2.type === 'deleteNode')) {
      return op1.data?.nodeId === op2.data?.nodeId;
    }
    
    return false;
  }

  // 辅助方法
  private generateConflictId(op1: Operation, op2: Operation): string {
    return `conflict_${op1.id}_${op2.id}`;
  }

  private analyzeConflictType(conflict: ConflictData): string {
    const ops = conflict.operations;
    
    if (ops.every(op => op.type === 'setAttribute')) {
      return 'same-attribute';
    }
    
    if (ops.every(op => op.type === 'delete')) {
      return 'concurrent-delete';
    }
    
    if (ops.some(op => op.type === 'insert' || op.type === 'delete' || op.type === 'replace')) {
      return 'overlapping-edit';
    }
    
    return 'unknown';
  }

  private getElementType(operation: Operation): string {
    switch (operation.type) {
      case 'insert':
      case 'delete':
      case 'replace':
        return 'text';
      case 'setAttribute':
      case 'removeAttribute':
        return 'attribute';
      case 'createNode':
      case 'deleteNode':
      case 'updateNode':
        return 'node';
      default:
        return 'unknown';
    }
  }

  // 冲突统计
  getConflictStats(): {
    total: number;
    resolved: number;
    pending: number;
    byStrategy: Record<ResolutionStrategy, number>;
    bySeverity: Record<string, number>;
  } {
    const conflicts = Array.from(this.activeConflicts.values());
    const resolved = conflicts.filter(c => c.resolved);
    const pending = conflicts.filter(c => !c.resolved);
    
    const byStrategy: Record<ResolutionStrategy, number> = {
      'last-writer-wins': 0,
      'first-writer-wins': 0,
      'user-priority': 0,
      'manual-resolution': 0,
      'semantic-merge': 0,
      'operational-transform': 0,
    };
    
    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };
    
    resolved.forEach(conflict => {
      if (conflict.resolution?.strategy) {
        byStrategy[conflict.resolution.strategy]++;
      }
    });
    
    return {
      total: conflicts.length,
      resolved: resolved.length,
      pending: pending.length,
      byStrategy,
      bySeverity,
    };
  }

  // 预测冲突
  predictConflict(newOperation: Operation, existingOperations: Operation[]): {
    hasConflict: boolean;
    conflictingOperations: Operation[];
    severity: 'low' | 'medium' | 'high';
    suggestedStrategy: ResolutionStrategy;
  } {
    const conflictingOps: Operation[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' = 'low';
    
    for (const existingOp of existingOperations) {
      for (const rule of this.detectionRules) {
        if (rule.detector(newOperation, existingOp)) {
          conflictingOps.push(existingOp);
          if (rule.severity === 'high') maxSeverity = 'high';
          else if (rule.severity === 'medium' && maxSeverity !== 'high') maxSeverity = 'medium';
          break;
        }
      }
    }
    
    const hasConflict = conflictingOps.length > 0;
    let suggestedStrategy: ResolutionStrategy = 'operational-transform';
    
    if (hasConflict) {
      // 根据冲突类型建议策略
      const elementType = this.getElementType(newOperation);
      if (elementType === 'text') {
        suggestedStrategy = 'operational-transform';
      } else if (elementType === 'attribute') {
        suggestedStrategy = 'last-writer-wins';
      } else {
        suggestedStrategy = 'user-priority';
      }
    }
    
    return {
      hasConflict,
      conflictingOperations: conflictingOps,
      severity: maxSeverity,
      suggestedStrategy,
    };
  }
}