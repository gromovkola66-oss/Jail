import * as THREE from 'three';
import { Timeline, KeyframeTransform } from './Timeline';
import { BoneSystem } from './BoneSystem';

export class AnimationPlayer {
  private mixer: THREE.AnimationMixer | null = null;
  private action: THREE.AnimationAction | null = null;
  private playing: boolean = false;
  private loop: boolean = true;
  private timeline: Timeline;
  private boneSystem: BoneSystem;
  private scene: THREE.Scene;
  private onFrameUpdateCallback: ((frame: number) => void) | null = null;
  private currentMesh: THREE.Mesh | null = null;
  private clock: THREE.Clock = new THREE.Clock(false);

  constructor(timeline: Timeline, boneSystem: BoneSystem, scene: THREE.Scene) {
    this.timeline = timeline;
    this.boneSystem = boneSystem;
    this.scene = scene;
  }

  public play(): void {
    if (this.playing) return;

    // Find a mesh with a skeleton
    const mesh = this.findSkinnedMesh();
    if (!mesh) return;

    this.currentMesh = mesh;

    const clip = this.buildClip(this.timeline, this.boneSystem, mesh);
    if (!clip) return;

    // Create mixer on the root bone so tracks resolve by bone name
    const skelData = this.boneSystem.getSkeletonData(mesh);
    if (!skelData) return;

    this.mixer = new THREE.AnimationMixer(skelData.rootBone);
    this.action = this.mixer.clipAction(clip);
    this.action.setLoop(this.loop ? THREE.LoopRepeat : THREE.LoopOnce, this.loop ? Infinity : 1);
    this.action.clampWhenFinished = !this.loop;

    // Start from current frame
    const startTime = this.timeline.getCurrentFrame() / this.timeline.getFPS();
    this.action.play();
    this.mixer.setTime(startTime);

    this.clock.start();
    this.playing = true;
  }

  public pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.clock.stop();
  }

  public stop(): void {
    this.playing = false;
    this.clock.stop();

    if (this.action) {
      this.action.stop();
      this.action = null;
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    this.timeline.setCurrentFrame(0);
    if (this.onFrameUpdateCallback) {
      this.onFrameUpdateCallback(0);
    }
  }

  public setLoop(loop: boolean): void {
    this.loop = loop;
    if (this.action) {
      this.action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      this.action.clampWhenFinished = !loop;
    }
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public update(deltaTime: number): void {
    if (!this.playing || !this.mixer) return;

    this.mixer.update(deltaTime);

    // Update timeline frame counter
    const currentTime = this.mixer.time;
    const fps = this.timeline.getFPS();
    const frame = Math.floor(currentTime * fps) % this.timeline.getTotalFrames();
    this.timeline.setCurrentFrame(frame);

    if (this.onFrameUpdateCallback) {
      this.onFrameUpdateCallback(frame);
    }
  }

  public onFrameUpdate(callback: (frame: number) => void): void {
    this.onFrameUpdateCallback = callback;
  }

  public buildClip(timeline: Timeline, boneSystem: BoneSystem, mesh: THREE.Mesh): THREE.AnimationClip | null {
    const allKeyframes = timeline.getAllKeyframes();
    if (allKeyframes.size === 0) return null;

    const skelData = boneSystem.getSkeletonData(mesh);
    if (!skelData) return null;

    const fps = timeline.getFPS();
    const tracks: THREE.KeyframeTrack[] = [];

    allKeyframes.forEach((boneFrames, boneId) => {
      // Find bone by UUID
      const bone = skelData.bones.find(b => b.uuid === boneId);
      if (!bone) return;

      const boneName = bone.name;
      const times: number[] = [];
      const posValues: number[] = [];
      const quatValues: number[] = [];
      const scaleValues: number[] = [];

      // Sort frames
      const sortedFrames = Array.from(boneFrames.entries()).sort((a, b) => a[0] - b[0]);

      for (const [frame, transform] of sortedFrames) {
        const time = frame / fps;
        times.push(time);
        posValues.push(transform.position.x, transform.position.y, transform.position.z);

        // Convert Euler to Quaternion for rotation track
        const euler = new THREE.Euler(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        const quat = new THREE.Quaternion().setFromEuler(euler);
        quatValues.push(quat.x, quat.y, quat.z, quat.w);

        scaleValues.push(transform.scale.x, transform.scale.y, transform.scale.z);
      }

      if (times.length > 0) {
        tracks.push(new THREE.VectorKeyframeTrack(
          `${boneName}.position`,
          times,
          posValues
        ));
        tracks.push(new THREE.QuaternionKeyframeTrack(
          `${boneName}.quaternion`,
          times,
          quatValues
        ));
        tracks.push(new THREE.VectorKeyframeTrack(
          `${boneName}.scale`,
          times,
          scaleValues
        ));
      }
    });

    if (tracks.length === 0) return null;

    const duration = (timeline.getTotalFrames() - 1) / fps;
    return new THREE.AnimationClip('Animation', duration, tracks);
  }

  private findSkinnedMesh(): THREE.Mesh | null {
    let foundMesh: THREE.Mesh | null = null;
    this.scene.traverse((object) => {
      if (foundMesh) return;
      if (object instanceof THREE.Mesh && this.boneSystem.hasSkeleton(object)) {
        foundMesh = object;
      }
    });
    return foundMesh;
  }
}
