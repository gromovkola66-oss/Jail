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

      if (geo.attributes.color) {
        const oldColors = geo.attributes.color;
        const newColors = new Float32Array(newCount * 3);
        let colorIdx = 0;
        for (let i = 0; i < oldColors.count; i++) {
          if (i >= faceIndex * 3 && i < faceIndex * 3 + 3) continue;
          newColors[colorIdx * 3] = oldColors.getX(i);
          newColors[colorIdx * 3 + 1] = oldColors.getY(i);
          newColors[colorIdx * 3 + 2] = oldColors.getZ(i);
          colorIdx++;
        }
        newGeo.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
      }

      if (geo.attributes.normal) {
        const oldNormals = geo.attributes.normal;
        const newNormals = new Float32Array(newCount * 3);
        let normalIdx = 0;
        for (let i = 0; i < oldNormals.count; i++) {
          if (i >= faceIndex * 3 && i < faceIndex * 3 + 3) continue;
          newNormals[normalIdx * 3] = oldNormals.getX(i);
          newNormals[normalIdx * 3 + 1] = oldNormals.getY(i);
          newNormals[normalIdx * 3 + 2] = oldNormals.getZ(i);
          normalIdx++;
        }
        newGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
      } else {
        newGeo.computeVertexNormals();
      }

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
