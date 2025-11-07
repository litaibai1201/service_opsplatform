// Operational Transformation for real-time collaboration
export interface Operation {
  id: string;
  type: OperationType;
  userId: string;
  timestamp: number;
  data: any;
  position?: number;
  length?: number;
  content?: string;
}

export type OperationType = 
  | 'insert' 
  | 'delete' 
  | 'retain' 
  | 'move' 
  | 'replace'
  | 'setAttribute'
  | 'removeAttribute'
  | 'createNode'
  | 'deleteNode'
  | 'updateNode';

export interface TransformResult {
  transformedOp1: Operation;
  transformedOp2: Operation;
}

export interface OTDocument {
  id: string;
  content: string;
  version: number;
  operations: Operation[];
}

export interface AttributeOperation {
  elementId: string;
  attribute: string;
  value: any;
  oldValue?: any;
}

export interface NodeOperation {
  nodeId: string;
  nodeType: string;
  parentId?: string;
  position?: number;
  properties?: Record<string, any>;
}

export class OperationalTransform {
  private static instance: OperationalTransform | null = null;

  static getInstance(): OperationalTransform {
    if (!this.instance) {
      this.instance = new OperationalTransform();
    }
    return this.instance;
  }

  // 转换两个并发操作
  transform(op1: Operation, op2: Operation): TransformResult {
    // 如果操作来自同一用户且时间戳相同，按ID排序
    if (op1.userId === op2.userId && op1.timestamp === op2.timestamp) {
      if (op1.id < op2.id) {
        return { transformedOp1: op1, transformedOp2: this.transformAgainst(op2, op1) };
      } else {
        return { transformedOp1: this.transformAgainst(op1, op2), transformedOp2: op2 };
      }
    }

    // 按时间戳排序
    if (op1.timestamp < op2.timestamp) {
      return { transformedOp1: op1, transformedOp2: this.transformAgainst(op2, op1) };
    } else if (op1.timestamp > op2.timestamp) {
      return { transformedOp1: this.transformAgainst(op1, op2), transformedOp2: op2 };
    }

    // 时间戳相同，按用户ID排序
    if (op1.userId < op2.userId) {
      return { transformedOp1: op1, transformedOp2: this.transformAgainst(op2, op1) };
    } else {
      return { transformedOp1: this.transformAgainst(op1, op2), transformedOp2: op2 };
    }
  }

  // 将操作op1相对于操作op2进行转换
  private transformAgainst(op1: Operation, op2: Operation): Operation {
    switch (op2.type) {
      case 'insert':
        return this.transformAgainstInsert(op1, op2);
      case 'delete':
        return this.transformAgainstDelete(op1, op2);
      case 'move':
        return this.transformAgainstMove(op1, op2);
      case 'replace':
        return this.transformAgainstReplace(op1, op2);
      case 'setAttribute':
        return this.transformAgainstSetAttribute(op1, op2);
      case 'removeAttribute':
        return this.transformAgainstRemoveAttribute(op1, op2);
      case 'createNode':
        return this.transformAgainstCreateNode(op1, op2);
      case 'deleteNode':
        return this.transformAgainstDeleteNode(op1, op2);
      case 'updateNode':
        return this.transformAgainstUpdateNode(op1, op2);
      default:
        return op1;
    }
  }

  // 文本插入操作的转换
  private transformAgainstInsert(op1: Operation, op2: Operation): Operation {
    const insertPos = op2.position || 0;
    const insertLength = op2.content?.length || 0;

    switch (op1.type) {
      case 'insert':
        const op1Pos = op1.position || 0;
        if (op1Pos >= insertPos) {
          return { ...op1, position: op1Pos + insertLength };
        }
        return op1;

      case 'delete':
        const deletePos = op1.position || 0;
        const deleteLength = op1.length || 0;
        
        if (deletePos >= insertPos) {
          return { ...op1, position: deletePos + insertLength };
        } else if (deletePos + deleteLength > insertPos) {
          return { ...op1, length: deleteLength + insertLength };
        }
        return op1;

      case 'move':
        const fromPos = op1.data?.from || 0;
        const toPos = op1.data?.to || 0;
        const moveLength = op1.length || 0;
        
        let newFromPos = fromPos >= insertPos ? fromPos + insertLength : fromPos;
        let newToPos = toPos >= insertPos ? toPos + insertLength : toPos;
        
        return { 
          ...op1, 
          data: { ...op1.data, from: newFromPos, to: newToPos } 
        };

      default:
        return op1;
    }
  }

  // 文本删除操作的转换
  private transformAgainstDelete(op1: Operation, op2: Operation): Operation {
    const deletePos = op2.position || 0;
    const deleteLength = op2.length || 0;
    const deleteEnd = deletePos + deleteLength;

    switch (op1.type) {
      case 'insert':
        const insertPos = op1.position || 0;
        if (insertPos >= deleteEnd) {
          return { ...op1, position: insertPos - deleteLength };
        } else if (insertPos > deletePos) {
          return { ...op1, position: deletePos };
        }
        return op1;

      case 'delete':
        const op1Pos = op1.position || 0;
        const op1Length = op1.length || 0;
        const op1End = op1Pos + op1Length;

        if (op1Pos >= deleteEnd) {
          return { ...op1, position: op1Pos - deleteLength };
        } else if (op1End <= deletePos) {
          return op1;
        } else {
          // 重叠删除
          const newPos = Math.min(op1Pos, deletePos);
          const newEnd = Math.max(op1End - deleteLength, deletePos);
          return { 
            ...op1, 
            position: newPos, 
            length: Math.max(0, newEnd - newPos) 
          };
        }

      default:
        return op1;
    }
  }

  // 移动操作的转换
  private transformAgainstMove(op1: Operation, op2: Operation): Operation {
    const fromPos = op2.data?.from || 0;
    const toPos = op2.data?.to || 0;
    const moveLength = op2.length || 0;

    switch (op1.type) {
      case 'insert':
      case 'delete':
        const pos = op1.position || 0;
        
        // 调整位置基于移动操作
        let newPos = pos;
        
        if (pos >= fromPos && pos < fromPos + moveLength) {
          // 位置在移动的范围内
          newPos = toPos + (pos - fromPos);
        } else if (pos >= fromPos + moveLength && pos < toPos) {
          // 位置在移动范围和目标位置之间
          newPos = pos - moveLength;
        } else if (pos >= toPos && pos < fromPos) {
          // 位置在目标位置和移动范围之间
          newPos = pos + moveLength;
        }
        
        return { ...op1, position: newPos };

      default:
        return op1;
    }
  }

  // 替换操作的转换
  private transformAgainstReplace(op1: Operation, op2: Operation): Operation {
    const replacePos = op2.position || 0;
    const replaceLength = op2.length || 0;
    const newLength = op2.content?.length || 0;
    const lengthDiff = newLength - replaceLength;

    switch (op1.type) {
      case 'insert':
        const insertPos = op1.position || 0;
        if (insertPos > replacePos + replaceLength) {
          return { ...op1, position: insertPos + lengthDiff };
        } else if (insertPos > replacePos) {
          return { ...op1, position: replacePos + newLength };
        }
        return op1;

      case 'delete':
        const deletePos = op1.position || 0;
        if (deletePos >= replacePos + replaceLength) {
          return { ...op1, position: deletePos + lengthDiff };
        } else if (deletePos > replacePos) {
          // 删除位置在替换范围内，转换为无操作
          return { ...op1, type: 'retain', position: deletePos, length: 0 };
        }
        return op1;

      default:
        return op1;
    }
  }

  // 属性设置操作的转换
  private transformAgainstSetAttribute(op1: Operation, op2: Operation): Operation {
    const elementId = op2.data?.elementId;
    const attribute = op2.data?.attribute;

    if (op1.type === 'setAttribute' && 
        op1.data?.elementId === elementId && 
        op1.data?.attribute === attribute) {
      // 同一元素的同一属性，后面的操作优先
      return op2.timestamp > op1.timestamp ? 
        { ...op1, type: 'retain' } : op1;
    }

    return op1;
  }

  // 属性移除操作的转换
  private transformAgainstRemoveAttribute(op1: Operation, op2: Operation): Operation {
    const elementId = op2.data?.elementId;
    const attribute = op2.data?.attribute;

    if (op1.type === 'setAttribute' && 
        op1.data?.elementId === elementId && 
        op1.data?.attribute === attribute) {
      // 如果要设置的属性被移除了，转换为无操作
      return { ...op1, type: 'retain' };
    }

    return op1;
  }

  // 节点创建操作的转换
  private transformAgainstCreateNode(op1: Operation, op2: Operation): Operation {
    const nodeId = op2.data?.nodeId;
    const parentId = op2.data?.parentId;
    const position = op2.data?.position || 0;

    switch (op1.type) {
      case 'createNode':
        if (op1.data?.parentId === parentId && 
            (op1.data?.position || 0) >= position) {
          return { 
            ...op1, 
            data: { 
              ...op1.data, 
              position: (op1.data?.position || 0) + 1 
            } 
          };
        }
        return op1;

      case 'deleteNode':
        if (op1.data?.nodeId === nodeId) {
          // 删除刚创建的节点，转换为无操作
          return { ...op1, type: 'retain' };
        }
        return op1;

      default:
        return op1;
    }
  }

  // 节点删除操作的转换
  private transformAgainstDeleteNode(op1: Operation, op2: Operation): Operation {
    const nodeId = op2.data?.nodeId;

    switch (op1.type) {
      case 'updateNode':
      case 'setAttribute':
      case 'removeAttribute':
        if (op1.data?.nodeId === nodeId || op1.data?.elementId === nodeId) {
          // 节点已被删除，转换为无操作
          return { ...op1, type: 'retain' };
        }
        return op1;

      case 'deleteNode':
        if (op1.data?.nodeId === nodeId) {
          // 重复删除，转换为无操作
          return { ...op1, type: 'retain' };
        }
        return op1;

      default:
        return op1;
    }
  }

  // 节点更新操作的转换
  private transformAgainstUpdateNode(op1: Operation, op2: Operation): Operation {
    const nodeId = op2.data?.nodeId;

    if (op1.type === 'updateNode' && op1.data?.nodeId === nodeId) {
      // 合并更新操作
      return {
        ...op1,
        data: {
          ...op1.data,
          properties: {
            ...op2.data?.properties,
            ...op1.data?.properties,
          }
        }
      };
    }

    return op1;
  }

  // 应用操作到文档
  applyOperation(document: OTDocument, operation: Operation): OTDocument {
    let newContent = document.content;
    const newOperations = [...document.operations, operation];

    switch (operation.type) {
      case 'insert':
        const insertPos = operation.position || 0;
        const insertContent = operation.content || '';
        newContent = newContent.slice(0, insertPos) + insertContent + newContent.slice(insertPos);
        break;

      case 'delete':
        const deletePos = operation.position || 0;
        const deleteLength = operation.length || 0;
        newContent = newContent.slice(0, deletePos) + newContent.slice(deletePos + deleteLength);
        break;

      case 'replace':
        const replacePos = operation.position || 0;
        const replaceLength = operation.length || 0;
        const replaceContent = operation.content || '';
        newContent = newContent.slice(0, replacePos) + replaceContent + newContent.slice(replacePos + replaceLength);
        break;

      case 'retain':
        // 无操作
        break;

      default:
        // 其他操作类型（节点操作等）需要特殊处理
        break;
    }

    return {
      ...document,
      content: newContent,
      version: document.version + 1,
      operations: newOperations.slice(-1000), // 保留最近1000个操作
    };
  }

  // 撤销操作
  createUndoOperation(operation: Operation): Operation {
    switch (operation.type) {
      case 'insert':
        return {
          ...operation,
          id: `undo_${operation.id}`,
          type: 'delete',
          length: operation.content?.length || 0,
          content: undefined,
        };

      case 'delete':
        return {
          ...operation,
          id: `undo_${operation.id}`,
          type: 'insert',
          length: undefined,
        };

      case 'replace':
        return {
          ...operation,
          id: `undo_${operation.id}`,
          content: operation.data?.oldContent,
          data: { ...operation.data, oldContent: operation.content },
        };

      case 'setAttribute':
        return {
          ...operation,
          id: `undo_${operation.id}`,
          type: 'removeAttribute',
          data: {
            ...operation.data,
            value: operation.data?.oldValue,
            oldValue: operation.data?.value,
          },
        };

      case 'removeAttribute':
        return {
          ...operation,
          id: `undo_${operation.id}`,
          type: 'setAttribute',
        };

      case 'createNode':
        return {
          ...operation,
          id: `undo_${operation.id}`,
          type: 'deleteNode',
        };

      case 'deleteNode':
        return {
          ...operation,
          id: `undo_${operation.id}`,
          type: 'createNode',
        };

      default:
        return {
          ...operation,
          id: `undo_${operation.id}`,
          type: 'retain',
        };
    }
  }

  // 压缩操作序列
  compressOperations(operations: Operation[]): Operation[] {
    if (operations.length === 0) return [];

    const compressed: Operation[] = [];
    let current = operations[0];

    for (let i = 1; i < operations.length; i++) {
      const next = operations[i];
      
      // 尝试合并相邻的操作
      const merged = this.tryMergeOperations(current, next);
      if (merged) {
        current = merged;
      } else {
        compressed.push(current);
        current = next;
      }
    }
    
    compressed.push(current);
    return compressed;
  }

  // 尝试合并两个操作
  private tryMergeOperations(op1: Operation, op2: Operation): Operation | null {
    // 只合并同一用户的连续操作
    if (op1.userId !== op2.userId) return null;
    if (Math.abs(op2.timestamp - op1.timestamp) > 5000) return null; // 5秒内的操作

    switch (op1.type) {
      case 'insert':
        if (op2.type === 'insert' && 
            (op1.position || 0) + (op1.content?.length || 0) === op2.position) {
          return {
            ...op1,
            content: (op1.content || '') + (op2.content || ''),
            timestamp: op2.timestamp,
          };
        }
        break;

      case 'delete':
        if (op2.type === 'delete' && op1.position === op2.position) {
          return {
            ...op1,
            length: (op1.length || 0) + (op2.length || 0),
            timestamp: op2.timestamp,
          };
        }
        break;
    }

    return null;
  }

  // 验证操作的有效性
  validateOperation(operation: Operation, document: OTDocument): boolean {
    switch (operation.type) {
      case 'insert':
        const insertPos = operation.position || 0;
        return insertPos >= 0 && insertPos <= document.content.length;

      case 'delete':
        const deletePos = operation.position || 0;
        const deleteLength = operation.length || 0;
        return deletePos >= 0 && 
               deletePos + deleteLength <= document.content.length;

      case 'replace':
        const replacePos = operation.position || 0;
        const replaceLength = operation.length || 0;
        return replacePos >= 0 && 
               replacePos + replaceLength <= document.content.length;

      default:
        return true;
    }
  }
}