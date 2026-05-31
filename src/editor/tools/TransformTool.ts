import * as THREE from 'three';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export class TransformTool {
  private mode: TransformMode = 'translate';
  private gridSnapEnabled: boolean = false;
  private gridSize: number = 0.5;

  public setMode(mode: TransformMode): void {
    this.mode = mode;
  }

  public getMode(): TransformMode {
    return this.mode;
  }

  public setGridSnap(enabled: boolean): void {
    this.gridSnapEnabled = enabled;
  }

  public setGridSize(size: number): void {
    this.gridSize = size;
  }

  public snapValue(value: number): number {
    if (!this.gridSnapEnabled) return value;
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  public snapVector(vec: THREE.Vector3): THREE.Vector3 {
    if (!this.gridSnapEnabled) return vec;
    return new THREE.Vector3(
      this.snapValue(vec.x),
      this.snapValue(vec.y),
      this.snapValue(vec.z)
    );
  }
}
