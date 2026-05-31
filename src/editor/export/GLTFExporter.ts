import * as THREE from 'three';
import { GLTFExporter as ThreeGLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Timeline } from '../animation/Timeline';
import { BoneSystem } from '../animation/BoneSystem';
import { AnimationPlayer } from '../animation/AnimationPlayer';

export class GLTFExporter {
  private exporter: ThreeGLTFExporter;

  constructor() {
    this.exporter = new ThreeGLTFExporter();
  }

  public exportScene(scene: THREE.Scene, timeline?: Timeline, boneSystem?: BoneSystem): void {
    // Filter exportable objects (exclude grid, lights, helpers)
    const exportScene = new THREE.Scene();
    const animations: THREE.AnimationClip[] = [];

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && !(object instanceof THREE.GridHelper)) {
        // Skip internal editor objects
        if (object.userData?.isEditorInternal) return;
        if (object.name.startsWith('__')) return;

        if (boneSystem && boneSystem.hasSkeleton(object)) {
          // Export as SkinnedMesh with skeleton
          const skelData = boneSystem.getSkeletonData(object);
          if (skelData) {
            const clonedMesh = object.clone();
            const skinnedMesh = new THREE.SkinnedMesh(clonedMesh.geometry, clonedMesh.material);
            skinnedMesh.position.copy(object.position);
            skinnedMesh.rotation.copy(object.rotation);
            skinnedMesh.scale.copy(object.scale);
            skinnedMesh.name = object.name;

            // Clone bones for export
            const rootBoneClone = skelData.rootBone.clone(true);
            const bones = this.collectBones(rootBoneClone);
            const skeleton = new THREE.Skeleton(bones);
            skinnedMesh.add(rootBoneClone);
            skinnedMesh.bind(skeleton);

            exportScene.add(skinnedMesh);

            // Build animation clip if timeline has keyframes
            if (timeline && timeline.getAllKeyframes().size > 0) {
              const player = new AnimationPlayer(timeline, boneSystem, scene);
              const clip = player.buildClip(timeline, boneSystem, object);
              if (clip) {
                animations.push(clip);
              }
            }
          }
        } else {
          exportScene.add(object.clone());
        }
      }
    });

    const options: any = { binary: true };
    if (animations.length > 0) {
      options.animations = animations;
    }

    this.exporter.parse(
      exportScene,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        this.download(blob, 'model.glb');
      },
      (error) => {
        console.error('GLTFExporter error:', error);
      },
      options
    );
  }

  private collectBones(root: THREE.Object3D): THREE.Bone[] {
    const bones: THREE.Bone[] = [];
    root.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        bones.push(obj);
      }
    });
    return bones;
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
