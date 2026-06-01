export interface Action {
  execute(): void;
  undo(): void;
  description: string;
}

export class History {
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private maxSize: number = 50;
  private actionListeners: (() => void)[] = [];

  public onAction(callback: () => void): void {
    this.actionListeners.push(callback);
  }

  private notifyListeners(): void {
    for (const cb of this.actionListeners) {
      cb();
    }
  }

  public push(action: Action): void {
    action.execute();
    this.undoStack.push(action);
    this.redoStack = [];

    // Enforce max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    this.notifyListeners();
  }

  /** Record an already-executed action without re-executing it. */
  public record(action: Action): void {
    this.undoStack.push(action);
    this.redoStack = [];

    // Enforce max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    this.notifyListeners();
  }

  public undo(): void {
    const action = this.undoStack.pop();
    if (action) {
      action.undo();
      this.redoStack.push(action);
    }
  }

  public redo(): void {
    const action = this.redoStack.pop();
    if (action) {
      action.execute();
      this.undoStack.push(action);
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
