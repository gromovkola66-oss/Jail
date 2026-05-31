import * as THREE from 'three';

export type EditMode = 'object' | 'vertex' | 'edge' | 'face';
export type ModeChangeCallback = (mode: EditMode) => void;

export class ModeManager {
  private currentMode: EditMode = 'object';
  private listeners: ModeChangeCallback[] = [];

  public getMode(): EditMode {
    return this.currentMode;
  }

  public setMode(mode: EditMode): void {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    this.listeners.forEach(cb => cb(mode));
  }

  public onModeChange(callback: ModeChangeCallback): void {
    this.listeners.push(callback);
  }
}
