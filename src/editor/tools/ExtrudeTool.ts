import * as THREE from 'three';
import { History, Action } from '../History';

export class ExtrudeTool {
  private history: History;
  public isInteractive: boolean = false;
  private interactiveCleanup: (() => void) | null = null;

  constructor(history: History) {
    this.history = history;
  }

  public startInteractiveExtrude(mesh: THREE.Mesh, faceIndex: number, camera: THREE.Camera, container: HTMLElement): void {
    if (this.isInteractive) return;
    this.isInteractive = true;

    const oldGeometry = mesh.geometry.clone();

    // Compute face normal from current geometry
    const geo = mesh.geometry;
    let workGeo = geo.index ? geo.toNonIndexed() : geo.clone();
    const positions = workGeo.attributes.position;
    const baseIdx = faceIndex * 3;

    const v0 = new THREE.Vector3(positions.getX(baseIdx), positions.getY(baseIdx), positions.getZ(baseIdx));
    const v1 = new THREE.Vector3(positions.getX(baseIdx + 1), positions.getY(baseIdx + 1), positions.getZ(baseIdx + 1));
    const v2 = new THREE.Vector3(positions.getX(baseIdx + 2), positions.getY(baseIdx + 2), positions.getZ(baseIdx + 2));

    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Perform extrude with distance=0 to create side face topology (without history)
    this.extrudeNoHistory(mesh, faceIndex, 0);

    // The mesh now has extruded topology with distance=0
    const newGeo = mesh.geometry as THREE.BufferGeometry;
    const newPositions = newGeo.attributes.position;

    // Identify which vertices should move during interactive extrusion.
    // Top face is at baseIdx, baseIdx+1, baseIdx+2.
    // Side faces were appended: 18 new vertices at the end (oldCount to oldCount+17).
    // Layout of side faces: for each of 3 quads [a,b,c,d] -> tri(a,b,c), tri(a,c,d) = 6 verts each
    // Side 1 [v0,v1,nv1,nv0]: verts at oldCount+0..5, nv1 at +2,+4; nv0 at +5
    // Side 2 [v1,v2,nv2,nv1]: verts at oldCount+6..11, nv2 at +8,+10; nv1 at +11
    // Side 3 [v2,v0,nv0,nv2]: verts at oldCount+12..17, nv0 at +14,+16; nv2 at +17
    const oldCount = newPositions.count - 18;

    // Track which extruded vertex each index corresponds to (0=v0, 1=v1, 2=v2, -1=static)
    const vertexGroup: number[] = new Array(newPositions.count).fill(-1);
    // Top face
    vertexGroup[baseIdx] = 0;
    vertexGroup[baseIdx + 1] = 1;
    vertexGroup[baseIdx + 2] = 2;
    // Side face extruded vertices (nv0, nv1, nv2 copies)
    // nv0: oldCount+5, oldCount+14, oldCount+16
    vertexGroup[oldCount + 5] = 0;
    vertexGroup[oldCount + 14] = 0;
    vertexGroup[oldCount + 16] = 0;
    // nv1: oldCount+2, oldCount+4, oldCount+11
    vertexGroup[oldCount + 2] = 1;
    vertexGroup[oldCount + 4] = 1;
    vertexGroup[oldCount + 11] = 1;
    // nv2: oldCount+8, oldCount+10, oldCount+17
    vertexGroup[oldCount + 8] = 2;
    vertexGroup[oldCount + 10] = 2;
    vertexGroup[oldCount + 17] = 2;

    // Base positions for the 3 extruded vertices (at distance=0 they equal originals)
    const basePositions = [v0.clone(), v1.clone(), v2.clone()];

    let startMouseY = -1;
    let startX = -1;
    let startY = -1;
    let hasMovedEnough = false;

    // Create distance label
    const label = document.createElement('div');
    label.className = 'extrude-distance-label';
    label.textContent = '0.00';
    document.body.appendChild(label);

    const updateGeometry = (dist: number) => {
      const offset = normal.clone().multiplyScalar(dist);
      for (let i = 0; i < newPositions.count; i++) {
        const group = vertexGroup[i];
        if (group >= 0) {
          const base = basePositions[group];
          newPositions.setXYZ(i, base.x + offset.x, base.y + offset.y, base.z + offset.z);
        }
      }
      newPositions.needsUpdate = true;
      newGeo.computeVertexNormals();
      label.textContent = dist.toFixed(2);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (startMouseY === -1) {
        startMouseY = e.clientY;
        startX = e.clientX;
        startY = e.clientY;
      }
      if (!hasMovedEnough) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) >= 5) {
          hasMovedEnough = true;
        }
      }
      const delta = startMouseY - e.clientY; // Up = positive extrusion
      const dist = delta * 0.02;
      updateGeometry(dist);
      label.style.left = e.clientX + 15 + 'px';
      label.style.top = e.clientY - 10 + 'px';
    };

    const cleanup = () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onConfirm);
      window.removeEventListener('keydown', onCancel);
      container.removeEventListener('contextmenu', onRightClick);
      label.remove();
      this.isInteractive = false;
      this.interactiveCleanup = null;
    };

    const onConfirm = (e: MouseEvent) => {
      if (!hasMovedEnough) return;
      e.stopPropagation();
      e.preventDefault();
      const finalGeo = mesh.geometry;
      const action: Action = {
        description: 'Экструзия грани',
        execute: () => { mesh.geometry = finalGeo; },
        undo: () => { mesh.geometry = oldGeometry; },
      };
      this.history.record(action);
      cleanup();
    };

    const onCancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        mesh.geometry = oldGeometry;
        cleanup();
      }
    };

    const onRightClick = (e: MouseEvent) => {
      e.preventDefault();
      mesh.geometry = oldGeometry;
      cleanup();
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onConfirm);
    window.addEventListener('keydown', onCancel);
    container.addEventListener('contextmenu', onRightClick, { once: true });

    this.interactiveCleanup = cleanup;
  }

  /**
   * Extrude without recording to history (used internally for interactive extrusion).
   * Converting indexed geometry to non-indexed is intentional for this low-poly editor
   * since most editing operations (vertex paint, face delete, sculpt) work on non-indexed geometry.
   */
  private extrudeNoHistory(mesh: THREE.Mesh, faceIndex: number, distance: number): void {
    const geo = mesh.geometry;
    let workGeo = geo.index ? geo.toNonIndexed() : geo.clone();

    const positions = workGeo.attributes.position;
    const baseIdx = faceIndex * 3;

    const v0 = new THREE.Vector3(positions.getX(baseIdx), positions.getY(baseIdx), positions.getZ(baseIdx));
    const v1 = new THREE.Vector3(positions.getX(baseIdx + 1), positions.getY(baseIdx + 1), positions.getZ(baseIdx + 1));
    const v2 = new THREE.Vector3(positions.getX(baseIdx + 2), positions.getY(baseIdx + 2), positions.getZ(baseIdx + 2));

    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const offset = normal.multiplyScalar(distance);
    const nv0 = v0.clone().add(offset);
    const nv1 = v1.clone().add(offset);
    const nv2 = v2.clone().add(offset);

    const oldPositions = positions.array;
    const newVertCount = positions.count + 18;
    const newPositions = new Float32Array(newVertCount * 3);

    for (let i = 0; i < oldPositions.length; i++) {
      newPositions[i] = oldPositions[i];
    }

    const hasColors = !!workGeo.attributes.color;
    let newColors: Float32Array | null = null;
    if (hasColors) {
      const oldColors = workGeo.attributes.color.array;
      newColors = new Float32Array(newVertCount * 3);
      for (let i = 0; i < oldColors.length; i++) {
        newColors[i] = oldColors[i];
      }
    }

    newPositions[baseIdx * 3] = nv0.x;
    newPositions[baseIdx * 3 + 1] = nv0.y;
    newPositions[baseIdx * 3 + 2] = nv0.z;
    newPositions[(baseIdx + 1) * 3] = nv1.x;
    newPositions[(baseIdx + 1) * 3 + 1] = nv1.y;
    newPositions[(baseIdx + 1) * 3 + 2] = nv1.z;
    newPositions[(baseIdx + 2) * 3] = nv2.x;
    newPositions[(baseIdx + 2) * 3 + 1] = nv2.y;
    newPositions[(baseIdx + 2) * 3 + 2] = nv2.z;

    let offset2 = positions.count * 3;
    const sides: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
      [v0, v1, nv1, nv0],
      [v1, v2, nv2, nv1],
      [v2, v0, nv0, nv2],
    ];

    let sideR = 0.7, sideG = 0.7, sideB = 0.7;
    if (hasColors && newColors) {
      const colorAttr = workGeo.attributes.color;
      sideR = (colorAttr.getX(baseIdx) + colorAttr.getX(baseIdx + 1) + colorAttr.getX(baseIdx + 2)) / 3;
      sideG = (colorAttr.getY(baseIdx) + colorAttr.getY(baseIdx + 1) + colorAttr.getY(baseIdx + 2)) / 3;
      sideB = (colorAttr.getZ(baseIdx) + colorAttr.getZ(baseIdx + 1) + colorAttr.getZ(baseIdx + 2)) / 3;
    }

    let colorOffset = positions.count * 3;
    for (const [a, b, c, d] of sides) {
      newPositions[offset2++] = a.x; newPositions[offset2++] = a.y; newPositions[offset2++] = a.z;
      newPositions[offset2++] = b.x; newPositions[offset2++] = b.y; newPositions[offset2++] = b.z;
      newPositions[offset2++] = c.x; newPositions[offset2++] = c.y; newPositions[offset2++] = c.z;
      newPositions[offset2++] = a.x; newPositions[offset2++] = a.y; newPositions[offset2++] = a.z;
      newPositions[offset2++] = c.x; newPositions[offset2++] = c.y; newPositions[offset2++] = c.z;
      newPositions[offset2++] = d.x; newPositions[offset2++] = d.y; newPositions[offset2++] = d.z;

      if (newColors) {
        for (let vi = 0; vi < 6; vi++) {
          newColors[colorOffset++] = sideR;
          newColors[colorOffset++] = sideG;
          newColors[colorOffset++] = sideB;
        }
      }
    }

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    if (newColors) {
      newGeo.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
    }
    newGeo.computeVertexNormals();

    mesh.geometry = newGeo;
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

    // Preserve vertex colors if they exist
    const hasColors = !!workGeo.attributes.color;
    let newColors: Float32Array | null = null;
    if (hasColors) {
      const oldColors = workGeo.attributes.color.array;
      newColors = new Float32Array(newVertCount * 3);
      for (let i = 0; i < oldColors.length; i++) {
        newColors[i] = oldColors[i];
      }
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

    // Default color for side face vertices (use average of extruded face or grey)
    let sideR = 0.7, sideG = 0.7, sideB = 0.7;
    if (hasColors && newColors) {
      const colorAttr = workGeo.attributes.color;
      sideR = (colorAttr.getX(baseIdx) + colorAttr.getX(baseIdx + 1) + colorAttr.getX(baseIdx + 2)) / 3;
      sideG = (colorAttr.getY(baseIdx) + colorAttr.getY(baseIdx + 1) + colorAttr.getY(baseIdx + 2)) / 3;
      sideB = (colorAttr.getZ(baseIdx) + colorAttr.getZ(baseIdx + 1) + colorAttr.getZ(baseIdx + 2)) / 3;
    }

    let colorOffset = positions.count * 3;
    for (const [a, b, c, d] of sides) {
      // Triangle 1: a, b, c
      newPositions[offset2++] = a.x; newPositions[offset2++] = a.y; newPositions[offset2++] = a.z;
      newPositions[offset2++] = b.x; newPositions[offset2++] = b.y; newPositions[offset2++] = b.z;
      newPositions[offset2++] = c.x; newPositions[offset2++] = c.y; newPositions[offset2++] = c.z;
      // Triangle 2: a, c, d
      newPositions[offset2++] = a.x; newPositions[offset2++] = a.y; newPositions[offset2++] = a.z;
      newPositions[offset2++] = c.x; newPositions[offset2++] = c.y; newPositions[offset2++] = c.z;
      newPositions[offset2++] = d.x; newPositions[offset2++] = d.y; newPositions[offset2++] = d.z;

      // Set side face vertex colors
      if (newColors) {
        for (let vi = 0; vi < 6; vi++) {
          newColors[colorOffset++] = sideR;
          newColors[colorOffset++] = sideG;
          newColors[colorOffset++] = sideB;
        }
      }
    }

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    if (newColors) {
      newGeo.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
    }
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

    this.history.record(action);
  }
}
