export interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position?: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
}

export interface TextOperation {
  ops: Operation[];
  baseLength: number;
  targetLength: number;
}

export class OperationalTransform {
  // Transform two operations that were applied to the same document
  static transform(op1: TextOperation, op2: TextOperation): [TextOperation, TextOperation] {
    if (op1.baseLength !== op2.baseLength) {
      throw new Error('Operations must have the same base length');
    }

    const ops1 = [...op1.ops];
    const ops2 = [...op2.ops];
    const newOps1: Operation[] = [];
    const newOps2: Operation[] = [];
    let i1 = 0, i2 = 0;
    let op1Current = ops1[i1];
    let op2Current = ops2[i2];
    let offset = 0;

    while (op1Current || op2Current) {
      // If both ops are insert
      if (op1Current?.type === 'insert' && op2Current?.type === 'insert') {
        if (offset < op1Current.position && offset < op2Current.position) {
          const minLength = Math.min(
            op1Current.position - offset,
            op2Current.position - offset
          );
          
          newOps1.push({ type: 'retain', length: minLength });
          newOps2.push({ type: 'retain', length: minLength });
          offset += minLength;
        } else if (op1Current.position <= op2Current.position) {
          newOps1.push(op1Current);
          offset += op1Current.content?.length || 0;
          newOps2.push({ type: 'retain', length: op1Current.content?.length || 0 });
          op1Current = ops1[++i1];
        } else {
          newOps2.push(op2Current);
          offset += op2Current.content?.length || 0;
          newOps1.push({ type: 'retain', length: op2Current.content?.length || 0 });
          op2Current = ops2[++i2];
        }
      }
      // If op1 is insert and op2 is not
      else if (op1Current?.type === 'insert') {
        newOps1.push(op1Current);
        newOps2.push({ type: 'retain', length: op1Current.content?.length || 0 });
        offset += op1Current.content?.length || 0;
        op1Current = ops1[++i1];
      }
      // If op2 is insert and op1 is not
      else if (op2Current?.type === 'insert') {
        newOps2.push(op2Current);
        newOps1.push({ type: 'retain', length: op2Current.content?.length || 0 });
        offset += op2Current.content?.length || 0;
        op2Current = ops2[++i2];
      }
      // Handle delete and retain operations
      else {
        if (op1Current?.type === 'delete' || op2Current?.type === 'delete') {
          const minLength = Math.min(
            op1Current?.length || Infinity,
            op2Current?.length || Infinity
          );
          
          if (minLength === Infinity) {
            // One of the operations doesn't have a length (retain)
            const retainLength = (op1Current?.type === 'retain' ? op1Current.length : op2Current?.length) || 0;
            newOps1.push({ type: 'retain', length: retainLength });
            newOps2.push({ type: 'retain', length: retainLength });
            offset += retainLength;
          } else {
            if (op1Current?.type === 'delete') {
              newOps1.push({ type: 'delete', length: minLength });
            }
            if (op2Current?.type === 'delete') {
              newOps2.push({ type: 'delete', length: minLength });
            }
            offset += minLength;
            
            if (op1Current && op1Current.type === 'delete') {
              op1Current.length! -= minLength;
              if (op1Current.length === 0) op1Current = ops1[++i1];
            }
            if (op2Current && op2Current.type === 'delete') {
              op2Current.length! -= minLength;
              if (op2Current.length === 0) op2Current = ops2[++i2];
            }
          }
        } else {
          // Both are retain
          const minLength = Math.min(
            op1Current?.length || 0,
            op2Current?.length || 0
          );
          
          newOps1.push({ type: 'retain', length: minLength });
          newOps2.push({ type: 'retain', length: minLength });
          offset += minLength;
          
          if (op1Current) {
            op1Current.length! -= minLength;
            if (op1Current.length === 0) op1Current = ops1[++i1];
          }
          if (op2Current) {
            op2Current.length! -= minLength;
            if (op2Current.length === 0) op2Current = ops2[++i2];
          }
        }
      }
    }

    return [
      {
        ops: this.normalizeOps(newOps1),
        baseLength: op1.baseLength,
        targetLength: op1.targetLength
      },
      {
        ops: this.normalizeOps(newOps2),
        baseLength: op2.baseLength,
        targetLength: op2.targetLength
      }
    ];
  }

  // Apply operation to text
  static apply(operation: TextOperation, text: string): string {
    let result = '';
    let textIndex = 0;

    for (const op of operation.ops) {
      switch (op.type) {
        case 'retain':
          result += text.slice(textIndex, textIndex + op.length!);
          textIndex += op.length!;
          break;
        case 'insert':
          result += op.content || '';
          break;
        case 'delete':
          textIndex += op.length!;
          break;
      }
    }

    return result;
  }

  // Create insert operation
  static insert(position: number, content: string): TextOperation {
    return {
      ops: [
        { type: 'retain', length: position },
        { type: 'insert', position, content }
      ],
      baseLength: position,
      targetLength: position + content.length
    };
  }

  // Create delete operation
  static delete(position: number, length: number): TextOperation {
    return {
      ops: [
        { type: 'retain', length: position },
        { type: 'delete', position, length }
      ],
      baseLength: position + length,
      targetLength: position
    };
  }

  // Normalize operations (merge consecutive operations of same type)
  private static normalizeOps(ops: Operation[]): Operation[] {
    const normalized: Operation[] = [];
    let current: Operation | null = null;

    for (const op of ops) {
      if (!current) {
        current = { ...op };
      } else if (current.type === op.type && current.type === 'retain') {
        current.length = (current.length || 0) + (op.length || 0);
      } else if (current.type === op.type && op.type === 'insert') {
        current.content = (current.content || '') + (op.content || '');
      } else {
        normalized.push(current);
        current = { ...op };
      }
    }

    if (current) {
      normalized.push(current);
    }

    return normalized;
  }

  // Invert operation
  static invert(operation: TextOperation, text: string): TextOperation {
    const ops: Operation[] = [];
    let textIndex = 0;

    for (const op of operation.ops) {
      switch (op.type) {
        case 'retain':
          ops.push({ type: 'retain', length: op.length });
          textIndex += op.length!;
          break;
        case 'insert':
          ops.push({ type: 'delete', position: op.position, length: op.content?.length || 0 });
          break;
        case 'delete':
          ops.push({ 
            type: 'insert', 
            position: op.position, 
            content: text.slice(textIndex, textIndex + op.length!) 
          });
          textIndex += op.length!;
          break;
      }
    }

    return {
      ops,
      baseLength: operation.targetLength,
      targetLength: operation.baseLength
    };
  }

  // Compose two operations
  static compose(op1: TextOperation, op2: TextOperation): TextOperation {
    if (op1.targetLength !== op2.baseLength) {
      throw new Error('Cannot compose operations: target length of first must equal base length of second');
    }

    const ops: Operation[] = [];
    let i1 = 0, i2 = 0;
    let op1Current = op1.ops[i1];
    let op2Current = op2.ops[i2];

    while (op1Current || op2Current) {
      if (op1Current?.type === 'delete') {
        ops.push(op1Current);
        op1Current = op1.ops[++i1];
      } else if (op2Current?.type === 'insert') {
        ops.push(op2Current);
        op2Current = op2.ops[++i2];
      } else if (!op1Current) {
        ops.push(op2Current!);
        op2Current = op2.ops[++i2];
      } else if (!op2Current) {
        ops.push(op1Current);
        op1Current = op1.ops[++i1];
      } else {
        const minLength = Math.min(
          op1Current.type === 'retain' ? op1Current.length || 0 : 0,
          op2Current.type === 'retain' ? op2Current.length || 0 : 0
        );

        if (minLength > 0) {
          ops.push({ type: 'retain', length: minLength });
          op1Current.length! -= minLength;
          op2Current.length! -= minLength;
          if (op1Current.length === 0) op1Current = op1.ops[++i1];
          if (op2Current.length === 0) op2Current = op2.ops[++i2];
        } else {
          // Handle other cases (insert + retain, etc.)
          if (op1Current.type === 'insert') {
            ops.push(op1Current);
            op1Current = op1.ops[++i1];
          } else if (op2Current.type === 'delete') {
            ops.push(op2Current);
            op2Current = op2.ops[++i2];
          }
        }
      }
    }

    return {
      ops: this.normalizeOps(ops),
      baseLength: op1.baseLength,
      targetLength: op2.targetLength
    };
  }
}
