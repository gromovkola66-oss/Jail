import { History, Action } from '../History';

export interface KeyframeTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export class Timeline {
  private keyframes: Map<string, Map<number, KeyframeTransform>> = new Map();
  private currentFrame: number = 0;
  private totalFrames: number = 120;
  private fps: number = 24;
  private history: History;
  private onFrameChangeListeners: ((frame: number) => void)[] = [];
  private onKeyframeChangeListeners: (() => void)[] = [];

  constructor(history: History) {
    this.history = history;
  }

  public addKeyframe(boneId: string, frame: number, transform: KeyframeTransform): void {
    const prevTransform = this.getKeyframe(boneId, frame);

    const action: Action = {
      description: 'Добавить ключевой кадр',
      execute: () => {
        if (!this.keyframes.has(boneId)) {
          this.keyframes.set(boneId, new Map());
        }
        this.keyframes.get(boneId)!.set(frame, { ...transform });
        this.notifyKeyframeChange();
      },
      undo: () => {
        if (prevTransform) {
          this.keyframes.get(boneId)!.set(frame, prevTransform);
        } else {
          this.keyframes.get(boneId)?.delete(frame);
          if (this.keyframes.get(boneId)?.size === 0) {
            this.keyframes.delete(boneId);
          }
        }
        this.notifyKeyframeChange();
      },
    };

    this.history.push(action);
  }

  public removeKeyframe(boneId: string, frame: number): void {
    const boneKeyframes = this.keyframes.get(boneId);
    if (!boneKeyframes || !boneKeyframes.has(frame)) return;

    const prevTransform = boneKeyframes.get(frame)!;

    const action: Action = {
      description: 'Удалить ключевой кадр',
      execute: () => {
        this.keyframes.get(boneId)?.delete(frame);
        if (this.keyframes.get(boneId)?.size === 0) {
          this.keyframes.delete(boneId);
        }
        this.notifyKeyframeChange();
      },
      undo: () => {
        if (!this.keyframes.has(boneId)) {
          this.keyframes.set(boneId, new Map());
        }
        this.keyframes.get(boneId)!.set(frame, prevTransform);
        this.notifyKeyframeChange();
      },
    };

    this.history.push(action);
  }

  public getKeyframesForBone(boneId: string): Map<number, KeyframeTransform> | undefined {
    return this.keyframes.get(boneId);
  }

  public getAllKeyframes(): Map<string, Map<number, KeyframeTransform>> {
    return this.keyframes;
  }

  public getKeyframe(boneId: string, frame: number): KeyframeTransform | undefined {
    return this.keyframes.get(boneId)?.get(frame);
  }

  public setCurrentFrame(frame: number): void {
    this.currentFrame = Math.max(0, Math.min(frame, this.totalFrames - 1));
    this.notifyFrameChange();
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  public setTotalFrames(count: number): void {
    this.totalFrames = Math.max(1, count);
  }

  public getTotalFrames(): number {
    return this.totalFrames;
  }

  public setFPS(fps: number): void {
    this.fps = fps;
  }

  public getFPS(): number {
    return this.fps;
  }

  public onFrameChange(callback: (frame: number) => void): void {
    this.onFrameChangeListeners.push(callback);
  }

  public onKeyframeChange(callback: () => void): void {
    this.onKeyframeChangeListeners.push(callback);
  }

  private notifyFrameChange(): void {
    this.onFrameChangeListeners.forEach(cb => cb(this.currentFrame));
  }

  public clearAllKeyframes(): void {
    this.keyframes.clear();
    this.notifyKeyframeChange();
  }

  public setKeyframeNoHistory(boneId: string, frame: number, transform: KeyframeTransform): void {
    if (!this.keyframes.has(boneId)) {
      this.keyframes.set(boneId, new Map());
    }
    this.keyframes.get(boneId)!.set(frame, { ...transform });
    this.notifyKeyframeChange();
  }

  private notifyKeyframeChange(): void {
    this.onKeyframeChangeListeners.forEach(cb => cb());
  }
}
