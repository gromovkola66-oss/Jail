import * as THREE from 'three';
import { History, Action } from '../History';

export class SubdivideTool {
  public subdivide(mesh: THREE.Mesh, history: History): void {
    const oldGeometry = mesh.geometry;
    const geo = oldGeometry.index ? oldGeometry.toNonIndexed() : oldGeometry;

    const posAttr = geo.attributes.position;
    const colorAttr = geo.attributes.color;
    const triCount = posAttr.count / 3;
    const newTriCount = triCount * 4;
    const newPositions = new Float32Array(newTriCount * 3 * 3);
    const hasColors = !!colorAttr;
    let newColors: Float32Array | null = null;
    if (hasColors) {
      newColors = new Float32Array(newTriCount * 3 * colorAttr.itemSize);
    }

    const itemSize = hasColors ? colorAttr.itemSize : 0;

    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const i1 = t * 3 + 1;
      const i2 = t * 3 + 2;

      // Get vertices
      const v0x = posAttr.getX(i0), v0y = posAttr.getY(i0), v0z = posAttr.getZ(i0);
      const v1x = posAttr.getX(i1), v1y = posAttr.getY(i1), v1z = posAttr.getZ(i1);
      const v2x = posAttr.getX(i2), v2y = posAttr.getY(i2), v2z = posAttr.getZ(i2);

      // Midpoints
      const m01x = (v0x + v1x) / 2, m01y = (v0y + v1y) / 2, m01z = (v0z + v1z) / 2;
      const m12x = (v1x + v2x) / 2, m12y = (v1y + v2y) / 2, m12z = (v1z + v2z) / 2;
      const m20x = (v2x + v0x) / 2, m20y = (v2y + v0y) / 2, m20z = (v2z + v0z) / 2;

      // 4 new triangles: (v0, m01, m20), (m01, v1, m12), (m20, m12, v2), (m01, m12, m20)
      const base = t * 4 * 9; // 4 triangles * 3 vertices * 3 components
      // Triangle 0: v0, m01, m20
      newPositions[base]      = v0x;  newPositions[base + 1]  = v0y;  newPositions[base + 2]  = v0z;
      newPositions[base + 3]  = m01x; newPositions[base + 4]  = m01y; newPositions[base + 5]  = m01z;
      newPositions[base + 6]  = m20x; newPositions[base + 7]  = m20y; newPositions[base + 8]  = m20z;
      // Triangle 1: m01, v1, m12
      newPositions[base + 9]  = m01x; newPositions[base + 10] = m01y; newPositions[base + 11] = m01z;
      newPositions[base + 12] = v1x;  newPositions[base + 13] = v1y;  newPositions[base + 14] = v1z;
      newPositions[base + 15] = m12x; newPositions[base + 16] = m12y; newPositions[base + 17] = m12z;
      // Triangle 2: m20, m12, v2
      newPositions[base + 18] = m20x; newPositions[base + 19] = m20y; newPositions[base + 20] = m20z;
      newPositions[base + 21] = m12x; newPositions[base + 22] = m12y; newPositions[base + 23] = m12z;
      newPositions[base + 24] = v2x;  newPositions[base + 25] = v2y;  newPositions[base + 26] = v2z;
      // Triangle 3: m01, m12, m20
      newPositions[base + 27] = m01x; newPositions[base + 28] = m01y; newPositions[base + 29] = m01z;
      newPositions[base + 30] = m12x; newPositions[base + 31] = m12y; newPositions[base + 32] = m12z;
      newPositions[base + 33] = m20x; newPositions[base + 34] = m20y; newPositions[base + 35] = m20z;

      // Interpolate colors if present
      if (hasColors && newColors) {
        const getColor = (idx: number): number[] => {
          const c: number[] = [];
          for (let ci = 0; ci < itemSize; ci++) {
            c.push((colorAttr.array as Float32Array)[idx * itemSize + ci]);
          }
          return c;
        };
        const avgColor = (a: number[], b: number[]): number[] => {
          return a.map((v, i) => (v + b[i]) / 2);
        };

        const c0 = getColor(i0);
        const c1 = getColor(i1);
        const c2 = getColor(i2);
        const cm01 = avgColor(c0, c1);
        const cm12 = avgColor(c1, c2);
        const cm20 = avgColor(c2, c0);

        const cBase = t * 4 * 3 * itemSize;
        const setColor = (offset: number, c: number[]) => {
          for (let ci = 0; ci < itemSize; ci++) {
            newColors![offset + ci] = c[ci];
          }
        };

        // Triangle 0: v0, m01, m20
        setColor(cBase, c0);
        setColor(cBase + itemSize, cm01);
        setColor(cBase + itemSize * 2, cm20);
        // Triangle 1: m01, v1, m12
        setColor(cBase + itemSize * 3, cm01);
        setColor(cBase + itemSize * 4, c1);
        setColor(cBase + itemSize * 5, cm12);
        // Triangle 2: m20, m12, v2
        setColor(cBase + itemSize * 6, cm20);
        setColor(cBase + itemSize * 7, cm12);
        setColor(cBase + itemSize * 8, c2);
        // Triangle 3: m01, m12, m20
        setColor(cBase + itemSize * 9, cm01);
        setColor(cBase + itemSize * 10, cm12);
        setColor(cBase + itemSize * 11, cm20);
      }
    }

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    if (hasColors && newColors) {
      newGeometry.setAttribute('color', new THREE.BufferAttribute(newColors, itemSize));
    }
    newGeometry.computeVertexNormals();

    const prevGeometry = mesh.geometry;
    mesh.geometry = newGeometry;

    const action: Action = {
      description: 'Подразделить меш',
      execute: () => {
        mesh.geometry = newGeometry;
      },
      undo: () => {
        mesh.geometry = prevGeometry;
      },
    };

    history.record(action);
  }
}
