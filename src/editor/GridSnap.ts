export class GridSnap {
  private enabled: boolean = false;
  private gridSize: number = 0.5;
  private listeners: ((enabled: boolean) => void)[] = [];

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): void {
    this.enabled = !this.enabled;
    this.listeners.forEach(cb => cb(this.enabled));
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    this.listeners.forEach(cb => cb(this.enabled));
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public setGridSize(size: number): void {
    this.gridSize = size;
  }

  public snapToGrid(value: number): number {
    if (!this.enabled) return value;
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  public onChange(callback: (enabled: boolean) => void): void {
    this.listeners.push(callback);
  }
}
