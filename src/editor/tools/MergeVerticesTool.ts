import * as THREE from 'three';
import { History, Action } from '../History';

export class MergeVerticesTool {
  public merge(mesh: THREE.Mesh, selectedVertexIndices: number[], history: History): void {
    if (selectedVertexIndices.length < 2) return;

    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;

    // Collect the positions of the selected vertices
    const selectedPositions: THREE.Vector3[] = [];
    for (const idx of selectedVertexIndices) {
      selectedPositions.push(new THREE.Vector3(
        positions.getX(idx),
        positions.getY(idx),
        positions.getZ(idx)
      ));
    }

    // Calculate average position
    const avg = new THREE.Vector3();
    for (const p of selectedPositions) {
      avg.add(p);
    }
    avg.divideScalar(selectedPositions.length);

    // Save old positions for undo
    const oldPositionsArray = new Float32Array(positions.array.length);
    oldPositionsArray.set(positions.array as Float32Array);

    // For all vertex indices in the buffer that match any of the selected positions,
    // set them to the average position
    for (let i = 0; i < positions.count; i++) {
      const vx = positions.getX(i);
      const vy = positions.getY(i);
      const vz = positions.getZ(i);

      for (const sp of selectedPositions) {
        if (
          Math.abs(vx - sp.x) < 0.0001 &&
          Math.abs(vy - sp.y) < 0.0001 &&
          Math.abs(vz - sp.z) < 0.0001
        ) {
          positions.setXYZ(i, avg.x, avg.y, avg.z);
          break;
        }
      }
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const newPositionsArray = new Float32Array(positions.array.length);
    newPositionsArray.set(positions.array as Float32Array);

    const action: Action = {
      description: 'Объединить вершины',
      execute: () => {
        const pos = mesh.geometry.attributes.position;
        (pos.array as Float32Array).set(newPositionsArray);
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeBoundingSphere();
      },
      undo: () => {
        const pos = mesh.geometry.attributes.position;
        (pos.array as Float32Array).set(oldPositionsArray);
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeBoundingSphere();
      },
    };

    history.record(action);
  }
}
