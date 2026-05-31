import * as THREE from 'three';
import { History, Action } from '../History';

interface BoneData {
  skeleton: THREE.Skeleton;
  helper: THREE.SkeletonHelper;
  bones: THREE.Bone[];
  rootBone: THREE.Bone;
}

export class BoneSystem {
  private meshBones: Map<THREE.Mesh, BoneData> = new Map();
  private history: History;
  private scene: THREE.Scene;
  private selectedBone: THREE.Bone | null = null;

  constructor(scene: THREE.Scene, history: History) {
    this.scene = scene;
    this.history = history;
  }

  public addBone(mesh: THREE.Mesh, parentBone: THREE.Bone | null, position: THREE.Vector3): THREE.Bone {
    const bone = new THREE.Bone();
    bone.position.copy(position);
    bone.name = `Bone_${Date.now()}`;

    let data = this.meshBones.get(mesh);

    if (!data) {
      // Create root bone and skeleton
      const rootBone = new THREE.Bone();
      rootBone.name = '__root_bone__';
      rootBone.position.set(0, 0, 0);

      if (parentBone) {
        parentBone.add(bone);
      } else {
        rootBone.add(bone);
      }

      const bones = [rootBone, bone];
      const skeleton = new THREE.Skeleton(bones);

      // Bind skeleton to mesh
      this.bindSkeletonToMesh(mesh, skeleton, rootBone);

      const helper = new THREE.SkeletonHelper(rootBone);
      helper.name = '__skeleton_helper__';
      (helper as any).userData = { isEditorInternal: true };
      this.scene.add(helper);

      data = { skeleton, helper, bones, rootBone };
      this.meshBones.set(mesh, data);
    } else {
      // Add to existing skeleton
      if (parentBone) {
        parentBone.add(bone);
      } else {
        data.rootBone.add(bone);
      }

      data.bones.push(bone);

      // Rebuild skeleton
      const skeleton = new THREE.Skeleton(data.bones);
      data.skeleton = skeleton;

      // Rebuild helper
      this.scene.remove(data.helper);
      data.helper.dispose();
      const helper = new THREE.SkeletonHelper(data.rootBone);
      helper.name = '__skeleton_helper__';
      (helper as any).userData = { isEditorInternal: true };
      this.scene.add(helper);
      data.helper = helper;
    }

    // History action
    const action: Action = {
      description: 'Добавить кость',
      execute: () => { /* already executed */ },
      undo: () => {
        this.removeBoneInternal(bone, mesh);
      },
    };
    this.history.record(action);

    return bone;
  }

  public removeBone(boneId: string): void {
    for (const [mesh, data] of this.meshBones.entries()) {
      const bone = data.bones.find(b => b.uuid === boneId);
      if (bone) {
        const parent = bone.parent;
        const position = bone.position.clone();

        const action: Action = {
          description: 'Удалить кость',
          execute: () => {
            this.removeBoneInternal(bone, mesh);
          },
          undo: () => {
            this.addBone(mesh, parent instanceof THREE.Bone ? parent : null, position);
          },
        };
        this.history.push(action);
        return;
      }
    }
  }

  private removeBoneInternal(bone: THREE.Bone, mesh: THREE.Mesh): void {
    const data = this.meshBones.get(mesh);
    if (!data) return;

    // Remove from parent
    if (bone.parent) {
      bone.parent.remove(bone);
    }

    // Remove from bones array
    const idx = data.bones.indexOf(bone);
    if (idx >= 0) {
      data.bones.splice(idx, 1);
    }

    // Rebuild skeleton and helper
    if (data.bones.length > 1) {
      data.skeleton = new THREE.Skeleton(data.bones);
      this.scene.remove(data.helper);
      data.helper.dispose();
      const helper = new THREE.SkeletonHelper(data.rootBone);
      helper.name = '__skeleton_helper__';
      (helper as any).userData = { isEditorInternal: true };
      this.scene.add(helper);
      data.helper = helper;
    } else {
      // Remove entire bone system
      this.scene.remove(data.helper);
      data.helper.dispose();
      this.meshBones.delete(mesh);
    }
  }

  public selectBone(bone: THREE.Bone | null): void {
    this.selectedBone = bone;
  }

  public getSelectedBone(): THREE.Bone | null {
    return this.selectedBone;
  }

  public getBones(mesh: THREE.Mesh): THREE.Bone[] {
    const data = this.meshBones.get(mesh);
    return data ? data.bones : [];
  }

  public toggleBoneVisibility(mesh: THREE.Mesh): void {
    const data = this.meshBones.get(mesh);
    if (data) {
      data.helper.visible = !data.helper.visible;
    }
  }

  public hasSkeleton(mesh: THREE.Mesh): boolean {
    return this.meshBones.has(mesh);
  }

  public getSkeletonData(mesh: THREE.Mesh): BoneData | undefined {
    return this.meshBones.get(mesh);
  }

  private bindSkeletonToMesh(mesh: THREE.Mesh, skeleton: THREE.Skeleton, rootBone: THREE.Bone): void {
    mesh.add(rootBone);
    // We store the skeleton reference but don't convert to SkinnedMesh
    // to avoid breaking the existing mesh workflow. The skeleton is used
    // for animation data and visual display via SkeletonHelper.
  }
}
