import * as THREE from 'three';
import { Timeline, KeyframeTransform } from './Timeline';
import { BoneSystem } from './BoneSystem';
import { History, Action } from '../History';

export class AnimationPresets {
  private history: History;

  constructor(history: History) {
    this.history = history;
  }

  public generateIdle(boneSystem: BoneSystem, mesh: THREE.Mesh, timeline: Timeline): void {
    const skelData = boneSystem.getSkeletonData(mesh);
    if (!skelData) return;

    // Save previous keyframes for undo
    const previousKeyframes = this.captureKeyframes(timeline);

    // Clear and generate
    this.clearKeyframesInternal(timeline);

    const rootBone = skelData.rootBone;
    const boneId = rootBone.uuid;

    // Subtle vertical bob: up at frame 0, down at frame 12, back at frame 24
    const baseTransform: KeyframeTransform = {
      position: { x: rootBone.position.x, y: rootBone.position.y, z: rootBone.position.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };

    this.setKeyframeInternal(timeline, boneId, 0, {
      ...baseTransform,
      position: { ...baseTransform.position, y: baseTransform.position.y + 0.05 },
    });
    this.setKeyframeInternal(timeline, boneId, 12, {
      ...baseTransform,
      position: { ...baseTransform.position, y: baseTransform.position.y - 0.05 },
    });
    this.setKeyframeInternal(timeline, boneId, 24, {
      ...baseTransform,
      position: { ...baseTransform.position, y: baseTransform.position.y + 0.05 },
    });

    // Record history action
    const action: Action = {
      description: 'Пресет: Покой',
      execute: () => { /* already executed */ },
      undo: () => {
        this.restoreKeyframes(timeline, previousKeyframes);
      },
    };
    this.history.record(action);
  }

  public generateWalk(boneSystem: BoneSystem, mesh: THREE.Mesh, timeline: Timeline): void {
    const skelData = boneSystem.getSkeletonData(mesh);
    if (!skelData) return;

    const previousKeyframes = this.captureKeyframes(timeline);
    this.clearKeyframesInternal(timeline);

    const rootBone = skelData.rootBone;
    const bones = skelData.bones;

    // Check for leg/arm bones
    const legBones = bones.filter(b => b.name.toLowerCase().includes('leg') || b.name.toLowerCase().includes('foot'));
    const armBones = bones.filter(b => b.name.toLowerCase().includes('arm') || b.name.toLowerCase().includes('hand'));

    if (legBones.length > 0 || armBones.length > 0) {
      // Animate leg bones alternating forward/back
      for (let i = 0; i < legBones.length; i++) {
        const bone = legBones[i];
        const offset = i % 2 === 0 ? 0.3 : -0.3;
        this.setKeyframeInternal(timeline, bone.uuid, 0, {
          position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
          rotation: { x: offset, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
        this.setKeyframeInternal(timeline, bone.uuid, 12, {
          position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
          rotation: { x: -offset, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
        this.setKeyframeInternal(timeline, bone.uuid, 24, {
          position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
          rotation: { x: offset, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
      }

      // Animate arm bones opposite to legs
      for (let i = 0; i < armBones.length; i++) {
        const bone = armBones[i];
        const offset = i % 2 === 0 ? -0.2 : 0.2;
        this.setKeyframeInternal(timeline, bone.uuid, 0, {
          position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
          rotation: { x: offset, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
        this.setKeyframeInternal(timeline, bone.uuid, 12, {
          position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
          rotation: { x: -offset, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
        this.setKeyframeInternal(timeline, bone.uuid, 24, {
          position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
          rotation: { x: offset, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
      }
    } else {
      // Only root bone: bob and tilt
      const boneId = rootBone.uuid;
      this.setKeyframeInternal(timeline, boneId, 0, {
        position: { x: rootBone.position.x, y: rootBone.position.y + 0.05, z: rootBone.position.z },
        rotation: { x: 0, y: 0, z: 0.05 },
        scale: { x: 1, y: 1, z: 1 },
      });
      this.setKeyframeInternal(timeline, boneId, 12, {
        position: { x: rootBone.position.x, y: rootBone.position.y - 0.05, z: rootBone.position.z },
        rotation: { x: 0, y: 0, z: -0.05 },
        scale: { x: 1, y: 1, z: 1 },
      });
      this.setKeyframeInternal(timeline, boneId, 24, {
        position: { x: rootBone.position.x, y: rootBone.position.y + 0.05, z: rootBone.position.z },
        rotation: { x: 0, y: 0, z: 0.05 },
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    const action: Action = {
      description: 'Пресет: Ходьба',
      execute: () => { /* already executed */ },
      undo: () => {
        this.restoreKeyframes(timeline, previousKeyframes);
      },
    };
    this.history.record(action);
  }

  public generateAttack(boneSystem: BoneSystem, mesh: THREE.Mesh, timeline: Timeline): void {
    const skelData = boneSystem.getSkeletonData(mesh);
    if (!skelData) return;

    const previousKeyframes = this.captureKeyframes(timeline);
    this.clearKeyframesInternal(timeline);

    const rootBone = skelData.rootBone;
    const bones = skelData.bones;

    // Check for arm bones
    const armBones = bones.filter(b => b.name.toLowerCase().includes('arm') || b.name.toLowerCase().includes('hand'));

    if (armBones.length > 0) {
      // Swing first arm bone forward
      const armBone = armBones[0];
      this.setKeyframeInternal(timeline, armBone.uuid, 0, {
        position: { x: armBone.position.x, y: armBone.position.y, z: armBone.position.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });
      this.setKeyframeInternal(timeline, armBone.uuid, 6, {
        position: { x: armBone.position.x, y: armBone.position.y, z: armBone.position.z },
        rotation: { x: -1.2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });
      this.setKeyframeInternal(timeline, armBone.uuid, 12, {
        position: { x: armBone.position.x, y: armBone.position.y, z: armBone.position.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });
    } else {
      // Rotate root bone forward and back
      const boneId = rootBone.uuid;
      this.setKeyframeInternal(timeline, boneId, 0, {
        position: { x: rootBone.position.x, y: rootBone.position.y, z: rootBone.position.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });
      this.setKeyframeInternal(timeline, boneId, 6, {
        position: { x: rootBone.position.x, y: rootBone.position.y, z: rootBone.position.z },
        rotation: { x: -0.5, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });
      this.setKeyframeInternal(timeline, boneId, 12, {
        position: { x: rootBone.position.x, y: rootBone.position.y, z: rootBone.position.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    const action: Action = {
      description: 'Пресет: Атака',
      execute: () => { /* already executed */ },
      undo: () => {
        this.restoreKeyframes(timeline, previousKeyframes);
      },
    };
    this.history.record(action);
  }

  private captureKeyframes(timeline: Timeline): Map<string, Map<number, KeyframeTransform>> {
    const all = timeline.getAllKeyframes();
    const copy = new Map<string, Map<number, KeyframeTransform>>();
    all.forEach((boneFrames, boneId) => {
      const frameCopy = new Map<number, KeyframeTransform>();
      boneFrames.forEach((transform, frame) => {
        frameCopy.set(frame, {
          position: { ...transform.position },
          rotation: { ...transform.rotation },
          scale: { ...transform.scale },
        });
      });
      copy.set(boneId, frameCopy);
    });
    return copy;
  }

  private clearKeyframesInternal(timeline: Timeline): void {
    timeline.clearAllKeyframes();
  }

  private setKeyframeInternal(timeline: Timeline, boneId: string, frame: number, transform: KeyframeTransform): void {
    timeline.setKeyframeNoHistory(boneId, frame, transform);
  }

  private restoreKeyframes(timeline: Timeline, keyframes: Map<string, Map<number, KeyframeTransform>>): void {
    timeline.clearAllKeyframes();
    keyframes.forEach((boneFrames, boneId) => {
      boneFrames.forEach((transform, frame) => {
        timeline.setKeyframeNoHistory(boneId, frame, transform);
      });
    });
  }
}
