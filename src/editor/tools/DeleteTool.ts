import * as THREE from 'three';
import { History, Action } from '../History';

export class DeleteTool {
  private scene: THREE.Scene;
  private history: History;

  constructor(scene: THREE.Scene, history: History) {
    this.scene = scene;
    this.history = history;
  }

  public deleteObject(mesh: THREE.Mesh): void {
    const scene = this.scene;
    const action: Action = {
      description: 'Удалить объект',
      execute: () => {
        scene.remove(mesh);
      },
      undo: () => {
        scene.add(mesh);
      },
    };
    this.history.push(action);
  }

  public deleteFace(mesh: THREE.Mesh, faceIndex: number): void {
    const oldGeometry = mesh.geometry.clone();
    const geo = mesh.geometry;
    const positions = geo.attributes.position;

    // Remove face (3 vertices for non-indexed, or indices for indexed)
    if (geo.index) {
      const indices = Array.from(geo.index.array);
      indices.splice(faceIndex * 3, 3);
      geo.setIndex(indices);
    } else {
      // Rebuild without the face
      const newCount = positions.count - 3;
      if (newCount <= 0) return;
      const newPositions = new Float32Array(newCount * 3);
      let writeIdx = 0;
      for (let i = 0; i < positions.count; i++) {
        if (i >= faceIndex * 3 && i < faceIndex * 3 + 3) continue;
        newPositions[writeIdx * 3] = positions.getX(i);
        newPositions[writeIdx * 3 + 1] = positions.getY(i);
        newPositions[writeIdx * 3 + 2] = positions.getZ(i);
        writeIdx++;
      }
      const newGeo = new THREE.BufferGeometry();
      newGeo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
      newGeo.computeVertexNormals();
      mesh.geometry = newGeo;
    }

    const newGeometry = mesh.geometry;

    const action: Action = {
      description: 'Удалить грань',
      execute: () => {
        mesh.geometry = newGeometry;
      },
      undo: () => {
        mesh.geometry = oldGeometry;
      },
    };

    this.history.record(action);
  }
}
