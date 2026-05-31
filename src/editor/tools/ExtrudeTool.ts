import * as THREE from 'three';
import { History, Action } from '../History';

export class ExtrudeTool {
  private history: History;

  constructor(history: History) {
    this.history = history;
  }

  public extrude(mesh: THREE.Mesh, faceIndex: number, distance: number = 0.5): void {
    const geo = mesh.geometry;
    const oldGeoJson = geo.toJSON();

    // Convert to non-indexed geometry for easier manipulation
    let workGeo = geo.index ? geo.toNonIndexed() : geo.clone();

    const positions = workGeo.attributes.position;
    const baseIdx = faceIndex * 3;

    // Get face vertices
    const v0 = new THREE.Vector3(positions.getX(baseIdx), positions.getY(baseIdx), positions.getZ(baseIdx));
    const v1 = new THREE.Vector3(positions.getX(baseIdx + 1), positions.getY(baseIdx + 1), positions.getZ(baseIdx + 1));
    const v2 = new THREE.Vector3(positions.getX(baseIdx + 2), positions.getY(baseIdx + 2), positions.getZ(baseIdx + 2));

    // Compute face normal
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Extruded positions
    const offset = normal.multiplyScalar(distance);
    const nv0 = v0.clone().add(offset);
    const nv1 = v1.clone().add(offset);
    const nv2 = v2.clone().add(offset);

    // Build new geometry with extruded face and side faces
    const oldPositions = positions.array;
    // New vertices: replace original face with extruded, add 3 side quads (6 triangles)
    const newVertCount = positions.count + 18; // 6 triangles * 3 verts for sides
    const newPositions = new Float32Array(newVertCount * 3);

    // Copy old positions
    for (let i = 0; i < oldPositions.length; i++) {
      newPositions[i] = oldPositions[i];
    }

    // Move original face to extruded position
    newPositions[baseIdx * 3] = nv0.x;
    newPositions[baseIdx * 3 + 1] = nv0.y;
    newPositions[baseIdx * 3 + 2] = nv0.z;
    newPositions[(baseIdx + 1) * 3] = nv1.x;
    newPositions[(baseIdx + 1) * 3 + 1] = nv1.y;
    newPositions[(baseIdx + 1) * 3 + 2] = nv1.z;
    newPositions[(baseIdx + 2) * 3] = nv2.x;
    newPositions[(baseIdx + 2) * 3 + 1] = nv2.y;
    newPositions[(baseIdx + 2) * 3 + 2] = nv2.z;

    // Add side faces (3 quads = 6 triangles)
    let offset2 = positions.count * 3;
    const sides: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
      [v0, v1, nv1, nv0],
      [v1, v2, nv2, nv1],
      [v2, v0, nv0, nv2],
    ];

    for (const [a, b, c, d] of sides) {
      // Triangle 1: a, b, c
      newPositions[offset2++] = a.x; newPositions[offset2++] = a.y; newPositions[offset2++] = a.z;
      newPositions[offset2++] = b.x; newPositions[offset2++] = b.y; newPositions[offset2++] = b.z;
      newPositions[offset2++] = c.x; newPositions[offset2++] = c.y; newPositions[offset2++] = c.z;
      // Triangle 2: a, c, d
      newPositions[offset2++] = a.x; newPositions[offset2++] = a.y; newPositions[offset2++] = a.z;
      newPositions[offset2++] = c.x; newPositions[offset2++] = c.y; newPositions[offset2++] = c.z;
      newPositions[offset2++] = d.x; newPositions[offset2++] = d.y; newPositions[offset2++] = d.z;
    }

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    newGeo.computeVertexNormals();

    const oldGeometry = mesh.geometry;
    mesh.geometry = newGeo;

    const action: Action = {
      description: 'Экструзия грани',
      execute: () => {
        mesh.geometry = newGeo;
      },
      undo: () => {
        mesh.geometry = oldGeometry;
      },
    };

    this.history['undoStack'].push(action);
    this.history['redoStack'] = [];
  }
}
