import * as THREE from 'three';
import { History, Action } from '../History';

export class MirrorTool {
  public enabled: boolean = false;
  public axis: 'x' | 'y' | 'z' = 'x';
  public visualPlane: THREE.Mesh | null = null;

  public toggle(scene: THREE.Scene): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.createVisualPlane(scene);
    } else {
      this.removeVisualPlane(scene);
    }
  }

  public setAxis(axis: 'x' | 'y' | 'z', scene?: THREE.Scene): void {
    this.axis = axis;
    if (this.enabled && scene) {
      this.removeVisualPlane(scene);
      this.createVisualPlane(scene);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getAxis(): string {
    return this.axis;
  }

  public createVisualPlane(scene: THREE.Scene): void {
    if (this.visualPlane) {
      this.removeVisualPlane(scene);
    }

    const size = 10;
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      opacity: 0.15,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.visualPlane = new THREE.Mesh(geometry, material);
    this.visualPlane.name = '__mirror_plane__';

    // Orient plane based on axis
    switch (this.axis) {
      case 'x':
        // YZ plane - rotate around Y axis 90 degrees
        this.visualPlane.rotation.y = Math.PI / 2;
        break;
      case 'y':
        // XZ plane - rotate around X axis 90 degrees
        this.visualPlane.rotation.x = Math.PI / 2;
        break;
      case 'z':
        // XY plane - no rotation needed (plane is already XY by default)
        break;
    }

    scene.add(this.visualPlane);
  }

  public removeVisualPlane(scene: THREE.Scene): void {
    if (this.visualPlane) {
      scene.remove(this.visualPlane);
      this.visualPlane.geometry.dispose();
      (this.visualPlane.material as THREE.Material).dispose();
      this.visualPlane = null;
    }
  }

  public mirrorPosition(pos: THREE.Vector3): THREE.Vector3 {
    const mirrored = pos.clone();
    switch (this.axis) {
      case 'x':
        mirrored.x = -mirrored.x;
        break;
      case 'y':
        mirrored.y = -mirrored.y;
        break;
      case 'z':
        mirrored.z = -mirrored.z;
        break;
    }
    return mirrored;
  }

  public applyMirror(mesh: THREE.Mesh, history: History): void {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const oldPositions = new Float32Array(positions.array.length);
    oldPositions.set(positions.array as Float32Array);

    const vertexCount = positions.count;

    // Non-indexed geometry: each 3 vertices form a triangle
    const oldCount = vertexCount;
    const newCount = oldCount * 2;
    const newPositions = new Float32Array(newCount * 3);

    // Copy original vertices
    for (let i = 0; i < oldCount * 3; i++) {
      newPositions[i] = (positions.array as Float32Array)[i];
    }

    // Create mirrored vertices with reversed winding order
    for (let tri = 0; tri < oldCount / 3; tri++) {
      for (let v = 0; v < 3; v++) {
        const srcIdx = tri * 3 + v;
        // Reverse winding: 0->0, 1->2, 2->1
        const dstV = v === 0 ? 0 : v === 1 ? 2 : 1;
        const dstIdx = oldCount + tri * 3 + dstV;

        const x = (positions.array as Float32Array)[srcIdx * 3];
        const y = (positions.array as Float32Array)[srcIdx * 3 + 1];
        const z = (positions.array as Float32Array)[srcIdx * 3 + 2];

        const mirrored = this.mirrorPosition(new THREE.Vector3(x, y, z));
        newPositions[dstIdx * 3] = mirrored.x;
        newPositions[dstIdx * 3 + 1] = mirrored.y;
        newPositions[dstIdx * 3 + 2] = mirrored.z;
      }
    }

    // Also handle normals if present
    const normals = geometry.attributes.normal;
    let oldNormals: Float32Array | null = null;
    let newNormals: Float32Array | null = null;
    if (normals) {
      oldNormals = new Float32Array(normals.array.length);
      oldNormals.set(normals.array as Float32Array);
    }

    // Apply new geometry
    const newPosAttr = new THREE.BufferAttribute(newPositions, 3);
    geometry.setAttribute('position', newPosAttr);

    // Remove index if present (we handle non-indexed)
    if (geometry.index) {
      const oldIndex = geometry.index.array;
      const oldIndexCount = oldIndex.length;
      const newIndex = new Uint32Array(oldIndexCount * 2);
      // Copy original indices
      for (let i = 0; i < oldIndexCount; i++) {
        newIndex[i] = oldIndex[i];
      }
      // Mirrored indices with reversed winding
      for (let tri = 0; tri < oldIndexCount / 3; tri++) {
        newIndex[oldIndexCount + tri * 3] = oldIndex[tri * 3] + oldCount;
        newIndex[oldIndexCount + tri * 3 + 1] = oldIndex[tri * 3 + 2] + oldCount;
        newIndex[oldIndexCount + tri * 3 + 2] = oldIndex[tri * 3 + 1] + oldCount;
      }
      geometry.setIndex(new THREE.BufferAttribute(newIndex, 1));
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const action: Action = {
      description: 'Применить зеркало',
      execute: () => {
        geometry.setAttribute('position', newPosAttr);
        if (geometry.index) {
          // already set above, but for redo
          geometry.setAttribute('position', newPosAttr);
        }
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
      },
      undo: () => {
        const restorePos = new THREE.BufferAttribute(oldPositions, 3);
        geometry.setAttribute('position', restorePos);
        if (oldNormals) {
          geometry.setAttribute('normal', new THREE.BufferAttribute(oldNormals, 3));
        }
        // Restore original index if there was one
        geometry.setIndex(null);
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
      },
    };

    history.record(action);
  }
}
