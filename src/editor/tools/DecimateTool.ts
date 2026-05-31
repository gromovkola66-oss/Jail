import * as THREE from 'three';
import { History, Action } from '../History';

interface Edge {
  i0: number;
  i1: number;
  length: number;
}

export class DecimateTool {
  public decimate(mesh: THREE.Mesh, history: History, targetReduction: number = 0.5): void {
    const oldGeometry = mesh.geometry;
    const geo = oldGeometry.index ? oldGeometry.toNonIndexed() : oldGeometry.clone();

    const posAttr = geo.attributes.position;
    const colorAttr = geo.attributes.color;
    const hasColors = !!colorAttr;
    const itemSize = hasColors ? colorAttr.itemSize : 0;

    const vertexCount = posAttr.count;
    const triCount = vertexCount / 3;
    const targetTriCount = Math.max(1, Math.floor(triCount * targetReduction));

    // Build vertex array
    const vertices: number[][] = [];
    for (let i = 0; i < vertexCount; i++) {
      vertices.push([
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i),
      ]);
    }

    // Build color array if present
    const colors: number[][] = [];
    if (hasColors) {
      for (let i = 0; i < vertexCount; i++) {
        const c: number[] = [];
        for (let ci = 0; ci < itemSize; ci++) {
          c.push((colorAttr.array as Float32Array)[i * itemSize + ci]);
        }
        colors.push(c);
      }
    }

    // Build triangles as index triples
    const triangles: number[][] = [];
    for (let t = 0; t < triCount; t++) {
      triangles.push([t * 3, t * 3 + 1, t * 3 + 2]);
    }

    // Mapping from vertex index to its current "canonical" index (for collapsed vertices)
    const canonical: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      canonical.push(i);
    }

    const getCanonical = (idx: number): number => {
      while (canonical[idx] !== idx) {
        canonical[idx] = canonical[canonical[idx]];
        idx = canonical[idx];
      }
      return idx;
    };

    // Build edge list
    const edges: Edge[] = [];
    const edgeSet = new Set<string>();
    for (const tri of triangles) {
      const pairs = [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]];
      for (const [a, b] of pairs) {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          const dx = vertices[a][0] - vertices[b][0];
          const dy = vertices[a][1] - vertices[b][1];
          const dz = vertices[a][2] - vertices[b][2];
          edges.push({ i0: a, i1: b, length: Math.sqrt(dx * dx + dy * dy + dz * dz) });
        }
      }
    }

    // Sort edges by length
    edges.sort((a, b) => a.length - b.length);

    let currentTriCount = triCount;
    let edgeIdx = 0;

    while (currentTriCount > targetTriCount && edgeIdx < edges.length) {
      const edge = edges[edgeIdx++];
      const ci0 = getCanonical(edge.i0);
      const ci1 = getCanonical(edge.i1);

      if (ci0 === ci1) continue; // Already merged

      // Merge ci1 into ci0 (move ci0 to midpoint)
      vertices[ci0][0] = (vertices[ci0][0] + vertices[ci1][0]) / 2;
      vertices[ci0][1] = (vertices[ci0][1] + vertices[ci1][1]) / 2;
      vertices[ci0][2] = (vertices[ci0][2] + vertices[ci1][2]) / 2;

      if (hasColors && colors[ci0] && colors[ci1]) {
        for (let ci = 0; ci < itemSize; ci++) {
          colors[ci0][ci] = (colors[ci0][ci] + colors[ci1][ci]) / 2;
        }
      }

      canonical[ci1] = ci0;

      // Remove degenerate triangles
      for (let t = triangles.length - 1; t >= 0; t--) {
        const tri = triangles[t];
        tri[0] = getCanonical(tri[0]);
        tri[1] = getCanonical(tri[1]);
        tri[2] = getCanonical(tri[2]);

        if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) {
          triangles.splice(t, 1);
          currentTriCount--;
        }
      }
    }

    // Build new geometry from remaining triangles
    const newVertCount = currentTriCount * 3;
    const newPositions = new Float32Array(newVertCount * 3);
    let newColors: Float32Array | null = null;
    if (hasColors) {
      newColors = new Float32Array(newVertCount * itemSize);
    }

    for (let t = 0; t < triangles.length; t++) {
      const tri = triangles[t];
      for (let v = 0; v < 3; v++) {
        const ci = getCanonical(tri[v]);
        const outIdx = t * 3 + v;
        newPositions[outIdx * 3]     = vertices[ci][0];
        newPositions[outIdx * 3 + 1] = vertices[ci][1];
        newPositions[outIdx * 3 + 2] = vertices[ci][2];

        if (hasColors && newColors && colors[ci]) {
          for (let cIdx = 0; cIdx < itemSize; cIdx++) {
            newColors[outIdx * itemSize + cIdx] = colors[ci][cIdx];
          }
        }
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
      description: 'Упростить меш',
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
