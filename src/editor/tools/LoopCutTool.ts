import * as THREE from 'three';
import { History, Action } from '../History';

export class LoopCutTool {
  private active: boolean = false;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private container: HTMLElement;
  private history: History;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private previewLine: THREE.LineLoop | null = null;
  private targetMesh: THREE.Mesh | null = null;
  private cutEdgeIndex: number = -1;

  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, history: History) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.history = history;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
  }

  public activate(): void {
    this.active = true;
    this.container.addEventListener('mousemove', this.onMouseMoveBound);
    this.container.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('keydown', this.onKeyDownBound);
  }

  public deactivate(): void {
    this.active = false;
    this.removePreview();
    this.container.removeEventListener('mousemove', this.onMouseMoveBound);
    this.container.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
  }

  public isActive(): boolean {
    return this.active;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.deactivate();
    }
  }

  private getMouseCoords(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.active) return;
    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Find meshes in scene (exclude internal objects)
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.userData.isEditorInternal) {
        meshes.push(obj);
      }
    });

    const intersects = this.raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const faceIndex = hit.faceIndex;
      if (faceIndex !== undefined) {
        this.targetMesh = mesh;
        this.cutEdgeIndex = faceIndex;
        this.showPreview(mesh, faceIndex);
      }
    } else {
      this.removePreview();
      this.targetMesh = null;
      this.cutEdgeIndex = -1;
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.active || event.button !== 0) return;
    if (!this.targetMesh || this.cutEdgeIndex < 0) return;

    event.preventDefault();
    event.stopPropagation();

    this.performCut(this.targetMesh, this.cutEdgeIndex);
    this.removePreview();
    this.deactivate();
  }

  private showPreview(mesh: THREE.Mesh, faceIndex: number): void {
    this.removePreview();

    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const triIndex = faceIndex * 3;

    if (triIndex + 2 >= positions.count) return;

    // Get the face normal to determine cut plane direction
    const v0 = new THREE.Vector3(positions.getX(triIndex), positions.getY(triIndex), positions.getZ(triIndex));
    const v1 = new THREE.Vector3(positions.getX(triIndex + 1), positions.getY(triIndex + 1), positions.getZ(triIndex + 1));
    const v2 = new THREE.Vector3(positions.getX(triIndex + 2), positions.getY(triIndex + 2), positions.getZ(triIndex + 2));

    // Find the longest edge to determine cut direction
    const e01 = v1.clone().sub(v0);
    const e12 = v2.clone().sub(v1);
    const e20 = v0.clone().sub(v2);

    const lengths = [e01.length(), e12.length(), e20.length()];
    const maxIdx = lengths.indexOf(Math.max(...lengths));

    // Cut perpendicular to the longest edge - compute midpoints of the other two edges
    let cutPoints: THREE.Vector3[] = [];

    // For the preview, find all triangles that share edges parallel to the chosen edge
    // and show midpoints as a ring
    const cutDirection = maxIdx === 0 ? e01.normalize() : maxIdx === 1 ? e12.normalize() : e20.normalize();

    // Collect midpoints of edges that are roughly perpendicular to cutDirection
    const triCount = positions.count / 3;
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const tv0 = new THREE.Vector3(positions.getX(i0), positions.getY(i0), positions.getZ(i0));
      const tv1 = new THREE.Vector3(positions.getX(i0 + 1), positions.getY(i0 + 1), positions.getZ(i0 + 1));
      const tv2 = new THREE.Vector3(positions.getX(i0 + 2), positions.getY(i0 + 2), positions.getZ(i0 + 2));

      const edges = [
        { a: tv0, b: tv1 },
        { a: tv1, b: tv2 },
        { a: tv2, b: tv0 },
      ];

      for (const edge of edges) {
        const dir = edge.b.clone().sub(edge.a).normalize();
        const dot = Math.abs(dir.dot(cutDirection));
        // Edges roughly parallel to cut direction
        if (dot > 0.7) {
          const mid = edge.a.clone().add(edge.b).multiplyScalar(0.5);
          cutPoints.push(mid);
        }
      }
    }

    if (cutPoints.length < 2) return;

    // Sort points to form a loop by nearest neighbor
    cutPoints = this.sortPointsLoop(cutPoints);

    // Transform to world space
    const worldPoints = cutPoints.map(p => {
      const wp = p.clone();
      mesh.localToWorld(wp);
      return wp;
    });

    const lineGeo = new THREE.BufferGeometry().setFromPoints(worldPoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
    this.previewLine = new THREE.LineLoop(lineGeo, lineMat);
    this.previewLine.name = '__loopcut_preview__';
    this.previewLine.userData.isEditorInternal = true;
    this.scene.add(this.previewLine);
  }

  private sortPointsLoop(points: THREE.Vector3[]): THREE.Vector3[] {
    if (points.length <= 2) return points;

    // Remove duplicates
    const unique: THREE.Vector3[] = [];
    for (const p of points) {
      let isDup = false;
      for (const u of unique) {
        if (p.distanceTo(u) < 0.001) {
          isDup = true;
          break;
        }
      }
      if (!isDup) unique.push(p);
    }

    if (unique.length <= 2) return unique;

    // Nearest neighbor sort
    const sorted: THREE.Vector3[] = [unique[0]];
    const remaining = unique.slice(1);

    while (remaining.length > 0) {
      const last = sorted[sorted.length - 1];
      let nearestIdx = 0;
      let nearestDist = last.distanceTo(remaining[0]);
      for (let i = 1; i < remaining.length; i++) {
        const d = last.distanceTo(remaining[i]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      sorted.push(remaining[nearestIdx]);
      remaining.splice(nearestIdx, 1);
    }

    return sorted;
  }

  private removePreview(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
  }

  private performCut(mesh: THREE.Mesh, faceIndex: number): void {
    const geometry = mesh.geometry;
    const oldGeo = geometry.index ? geometry.toNonIndexed() : geometry;
    const positions = oldGeo.attributes.position;
    const triIndex = faceIndex * 3;

    if (triIndex + 2 >= positions.count) return;

    // Determine cut direction from the hit face
    const v0 = new THREE.Vector3(positions.getX(triIndex), positions.getY(triIndex), positions.getZ(triIndex));
    const v1 = new THREE.Vector3(positions.getX(triIndex + 1), positions.getY(triIndex + 1), positions.getZ(triIndex + 1));
    const v2 = new THREE.Vector3(positions.getX(triIndex + 2), positions.getY(triIndex + 2), positions.getZ(triIndex + 2));

    const e01 = v1.clone().sub(v0);
    const e12 = v2.clone().sub(v1);
    const e20 = v0.clone().sub(v2);

    const lengths = [e01.length(), e12.length(), e20.length()];
    const maxIdx = lengths.indexOf(Math.max(...lengths));
    const cutDirection = maxIdx === 0 ? e01.normalize() : maxIdx === 1 ? e12.normalize() : e20.normalize();

    // For each triangle, check if it has edges parallel to cutDirection
    // If so, subdivide it by inserting midpoints on those edges
    const triCount = positions.count / 3;
    const newTriangles: number[][] = [];

    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const tv0 = [positions.getX(i0), positions.getY(i0), positions.getZ(i0)];
      const tv1 = [positions.getX(i0 + 1), positions.getY(i0 + 1), positions.getZ(i0 + 1)];
      const tv2 = [positions.getX(i0 + 2), positions.getY(i0 + 2), positions.getZ(i0 + 2)];

      const edges = [
        { a: tv0, b: tv1, aIdx: 0, bIdx: 1 },
        { a: tv1, b: tv2, aIdx: 1, bIdx: 2 },
        { a: tv2, b: tv0, aIdx: 2, bIdx: 0 },
      ];

      // Find edges parallel to cut direction
      const parallelEdges: { a: number[]; b: number[]; mid: number[] }[] = [];
      for (const edge of edges) {
        const dir = new THREE.Vector3(
          edge.b[0] - edge.a[0],
          edge.b[1] - edge.a[1],
          edge.b[2] - edge.a[2]
        ).normalize();
        const dot = Math.abs(dir.dot(cutDirection));
        if (dot > 0.7) {
          const mid = [
            (edge.a[0] + edge.b[0]) / 2,
            (edge.a[1] + edge.b[1]) / 2,
            (edge.a[2] + edge.b[2]) / 2,
          ];
          parallelEdges.push({ a: edge.a, b: edge.b, mid });
        }
      }

      if (parallelEdges.length === 2) {
        // Split the triangle into 3 triangles using two midpoints
        const m0 = parallelEdges[0].mid;
        const m1 = parallelEdges[1].mid;

        // Find the vertex shared by both parallel edges
        const verts = [tv0, tv1, tv2];
        let sharedVert: number[] | null = null;
        let otherVerts: number[][] = [];

        for (const v of verts) {
          const inFirst = (sameVert(v, parallelEdges[0].a) || sameVert(v, parallelEdges[0].b));
          const inSecond = (sameVert(v, parallelEdges[1].a) || sameVert(v, parallelEdges[1].b));
          if (inFirst && inSecond) {
            sharedVert = v;
          } else {
            otherVerts.push(v);
          }
        }

        if (sharedVert && otherVerts.length === 2) {
          // 3 new triangles: (shared, m0, m1), (other0, m0, m1), (other1, m0, m1) -- wrong
          // Actually: (shared, m0, m1), (other0, m0_or_m1, other1_or_m1)
          // Better: split into 3 triangles
          // Triangle: sharedVert-m0-m1
          newTriangles.push([...sharedVert, ...m0, ...m1]);
          // Triangle: otherVerts[0]-m0-m1
          newTriangles.push([...otherVerts[0], ...m0, ...m1]);
          // Triangle: the remaining part - depends on which edges the mids are on
          // Actually for proper subdivision with 2 midpoints:
          // sharedVert, m0, m1
          // otherVerts[0], midOnItsEdge, m_other
          // We need to connect properly. Simpler approach:
          // Tri 1: shared, m0, m1
          // Tri 2: other0, m_on_edge_with_other0, m_on_edge_with_other0's_opposite
          // Let's just do a quad split:
          // shared-m0-m1, other0-m0-other1, other0-m1-other1 -- NO
          // Correct: (shared, m0, m1), (other0, find_which_mid, other1 or mid)
          // Just split into (shared, m0, m1) and two triangles covering the quad (other0, m0, m1, other1)
          // Quad: other0, m0, m1, other1 -> two triangles
          newTriangles.pop(); // remove last
          newTriangles.pop(); // remove last
          newTriangles.push([...sharedVert, ...m0, ...m1]);
          newTriangles.push([...otherVerts[0], ...m0, ...otherVerts[1]]);
          newTriangles.push([...m0, ...m1, ...otherVerts[1]]);
        } else {
          // Fallback: keep original triangle
          newTriangles.push([...tv0, ...tv1, ...tv2]);
        }
      } else if (parallelEdges.length === 1) {
        // Split into 2 triangles using one midpoint
        const m = parallelEdges[0].mid;
        const edgeA = parallelEdges[0].a;
        const edgeB = parallelEdges[0].b;

        // Find the opposite vertex (not on the parallel edge)
        const verts = [tv0, tv1, tv2];
        let opposite: number[] | null = null;
        for (const v of verts) {
          if (!sameVert(v, edgeA) && !sameVert(v, edgeB)) {
            opposite = v;
            break;
          }
        }

        if (opposite) {
          newTriangles.push([...edgeA, ...m, ...opposite]);
          newTriangles.push([...m, ...edgeB, ...opposite]);
        } else {
          newTriangles.push([...tv0, ...tv1, ...tv2]);
        }
      } else {
        // No parallel edge: keep original triangle
        newTriangles.push([...tv0, ...tv1, ...tv2]);
      }
    }

    // Build new geometry
    const newPositions = new Float32Array(newTriangles.length * 9);
    for (let i = 0; i < newTriangles.length; i++) {
      const tri = newTriangles[i];
      for (let j = 0; j < 9; j++) {
        newPositions[i * 9 + j] = tri[j];
      }
    }

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    newGeometry.computeVertexNormals();
    newGeometry.computeBoundingSphere();

    const prevGeometry = mesh.geometry;
    mesh.geometry = newGeometry;

    const action: Action = {
      description: 'Петлевой разрез',
      execute: () => {
        mesh.geometry = newGeometry;
      },
      undo: () => {
        mesh.geometry = prevGeometry;
      },
    };

    this.history.record(action);
  }
}

function sameVert(a: number[], b: number[]): boolean {
  return Math.abs(a[0] - b[0]) < 0.0001 &&
    Math.abs(a[1] - b[1]) < 0.0001 &&
    Math.abs(a[2] - b[2]) < 0.0001;
}
