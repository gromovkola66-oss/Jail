import * as THREE from 'three';
import { History, Action } from '../History';

type BooleanOp = 'union' | 'subtract' | 'intersect';

interface Triangle {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
}

export class BooleanTool {
  public operate(
    meshA: THREE.Mesh,
    meshB: THREE.Mesh,
    operation: BooleanOp,
    scene: THREE.Scene,
    history: History
  ): THREE.Mesh | null {
    // Extract world-space triangles from both meshes
    const trisA = this.extractTriangles(meshA);
    const trisB = this.extractTriangles(meshB);

    if (trisA.length === 0 || trisB.length === 0) return null;

    let resultTris: Triangle[] = [];

    switch (operation) {
      case 'union':
        // Keep triangles from A that are outside B + triangles from B that are outside A
        resultTris = [
          ...this.filterTriangles(trisA, meshB, false),
          ...this.filterTriangles(trisB, meshA, false),
        ];
        break;
      case 'subtract':
        // Keep triangles from A that are outside B + triangles from B that are inside A (flipped)
        resultTris = [
          ...this.filterTriangles(trisA, meshB, false),
          ...this.flipTriangles(this.filterTriangles(trisB, meshA, true)),
        ];
        break;
      case 'intersect':
        // Keep triangles from A that are inside B + triangles from B that are inside A
        resultTris = [
          ...this.filterTriangles(trisA, meshB, true),
          ...this.filterTriangles(trisB, meshA, true),
        ];
        break;
    }

    if (resultTris.length === 0) return null;

    // Build result mesh
    const positions = new Float32Array(resultTris.length * 9);
    for (let i = 0; i < resultTris.length; i++) {
      const tri = resultTris[i];
      positions[i * 9] = tri.a.x;
      positions[i * 9 + 1] = tri.a.y;
      positions[i * 9 + 2] = tri.a.z;
      positions[i * 9 + 3] = tri.b.x;
      positions[i * 9 + 4] = tri.b.y;
      positions[i * 9 + 5] = tri.b.z;
      positions[i * 9 + 6] = tri.c.x;
      positions[i * 9 + 7] = tri.c.y;
      positions[i * 9 + 8] = tri.c.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      flatShading: true,
    });

    const opNames: Record<BooleanOp, string> = {
      union: 'Объединение',
      subtract: 'Вычитание',
      intersect: 'Пересечение',
    };

    const resultMesh = new THREE.Mesh(geometry, material);
    resultMesh.name = opNames[operation];

    // Remove originals, add result
    scene.remove(meshA);
    scene.remove(meshB);
    scene.add(resultMesh);

    const action: Action = {
      description: opNames[operation],
      execute: () => {
        scene.remove(meshA);
        scene.remove(meshB);
        scene.add(resultMesh);
      },
      undo: () => {
        scene.remove(resultMesh);
        scene.add(meshA);
        scene.add(meshB);
      },
    };

    history.record(action);

    return resultMesh;
  }

  private extractTriangles(mesh: THREE.Mesh): Triangle[] {
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const positions = geo.attributes.position;
    const triangles: Triangle[] = [];
    const matrix = mesh.matrixWorld;

    for (let i = 0; i < positions.count; i += 3) {
      const a = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)).applyMatrix4(matrix);
      const b = new THREE.Vector3(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1)).applyMatrix4(matrix);
      const c = new THREE.Vector3(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2)).applyMatrix4(matrix);
      triangles.push({ a, b, c });
    }

    return triangles;
  }

  private filterTriangles(triangles: Triangle[], otherMesh: THREE.Mesh, keepInside: boolean): Triangle[] {
    const result: Triangle[] = [];
    const raycaster = new THREE.Raycaster();

    for (const tri of triangles) {
      // Use centroid for inside/outside test
      const centroid = new THREE.Vector3()
        .add(tri.a)
        .add(tri.b)
        .add(tri.c)
        .divideScalar(3);

      const isInside = this.isPointInside(centroid, otherMesh, raycaster);

      if (keepInside && isInside) {
        result.push(tri);
      } else if (!keepInside && !isInside) {
        result.push(tri);
      }
    }

    return result;
  }

  private isPointInside(point: THREE.Vector3, mesh: THREE.Mesh, raycaster: THREE.Raycaster): boolean {
    // Cast ray in arbitrary direction and count intersections
    const direction = new THREE.Vector3(1, 0.1, 0.05).normalize();
    raycaster.set(point, direction);
    raycaster.far = Infinity;

    const intersections = raycaster.intersectObject(mesh, false);
    return intersections.length % 2 === 1;
  }

  private flipTriangles(triangles: Triangle[]): Triangle[] {
    return triangles.map(tri => ({
      a: tri.a,
      b: tri.c,
      c: tri.b,
    }));
  }
}
