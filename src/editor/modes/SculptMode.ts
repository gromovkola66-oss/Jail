import * as THREE from 'three';
import { History, Action } from '../History';

export type BrushType = 'push_pull' | 'smooth' | 'flatten' | 'inflate';
export type FalloffType = 'sharp' | 'smooth' | 'constant';

export class SculptMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private container: HTMLElement;
  private history: History;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private active: boolean = false;

  // Brush settings
  private radius: number = 1.0;
  private strength: number = 0.3;
  private falloffType: FalloffType = 'smooth';
  private brushType: BrushType = 'push_pull';

  // Visual cursor
  private cursorMesh: THREE.Mesh | null = null;

  // Stroke state
  private isSculpting: boolean = false;
  private strokeMesh: THREE.Mesh | null = null;
  private strokeOriginalPositions: Float32Array | null = null;
  private strokeChanged: boolean = false;

  // Modifier keys
  private shiftHeld: boolean = false;
  private ctrlHeld: boolean = false;

  // Bound handlers
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;

  // Canvas reference
  private canvas: HTMLElement | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, history: History) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.history = history;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
  }

  public activate(): void {
    this.active = true;
    this.createCursor();

    this.canvas = this.container.querySelector('canvas') || this.container;
    this.canvas.addEventListener('pointerdown', this.onPointerDownBound, { capture: true });
    this.canvas.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
  }

  public deactivate(): void {
    this.active = false;
    this.isSculpting = false;
    this.strokeMesh = null;
    this.strokeOriginalPositions = null;

    this.removeCursor();

    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.onPointerDownBound, { capture: true } as EventListenerOptions);
      this.canvas.removeEventListener('pointermove', this.onPointerMoveBound);
    }
    window.removeEventListener('pointerup', this.onPointerUpBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    this.canvas = null;
  }

  public isActive(): boolean {
    return this.active;
  }

  // Public API
  public setRadius(r: number): void {
    this.radius = Math.max(0.1, Math.min(5.0, r));
    this.updateCursorGeometry();
  }

  public getRadius(): number {
    return this.radius;
  }

  public setStrength(s: number): void {
    this.strength = Math.max(0.01, Math.min(1.0, s));
    this.updateCursorOpacity();
  }

  public getStrength(): number {
    return this.strength;
  }

  public setFalloff(type: FalloffType): void {
    this.falloffType = type;
  }

  public getFalloff(): string {
    return this.falloffType;
  }

  public setBrushType(type: BrushType): void {
    this.brushType = type;
  }

  public getBrushType(): string {
    return this.brushType;
  }

  // Cursor management
  private createCursor(): void {
    const geo = new THREE.RingGeometry(this.radius * 0.9, this.radius, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.3 + this.strength * 0.5,
    });
    this.cursorMesh = new THREE.Mesh(geo, mat);
    this.cursorMesh.userData.isEditorInternal = true;
    this.cursorMesh.visible = false;
    this.cursorMesh.renderOrder = 999;
    this.scene.add(this.cursorMesh);
  }

  private removeCursor(): void {
    if (this.cursorMesh) {
      this.scene.remove(this.cursorMesh);
      this.cursorMesh.geometry.dispose();
      (this.cursorMesh.material as THREE.Material).dispose();
      this.cursorMesh = null;
    }
  }

  private updateCursorGeometry(): void {
    if (!this.cursorMesh) return;
    this.cursorMesh.geometry.dispose();
    this.cursorMesh.geometry = new THREE.RingGeometry(this.radius * 0.9, this.radius, 32);
  }

  private updateCursorOpacity(): void {
    if (!this.cursorMesh) return;
    const mat = this.cursorMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.3 + this.strength * 0.5;
  }

  private updateCursorColor(): void {
    if (!this.cursorMesh) return;
    const mat = this.cursorMesh.material as THREE.MeshBasicMaterial;
    if (this.shiftHeld) {
      mat.color.setHex(0x4488ff);
    } else if (this.ctrlHeld) {
      mat.color.setHex(0xff4444);
    } else {
      mat.color.setHex(0x00ff88);
    }
  }

  private positionCursor(point: THREE.Vector3, normal: THREE.Vector3): void {
    if (!this.cursorMesh) return;
    this.cursorMesh.position.copy(point);
    // Orient cursor to face along the surface normal
    const up = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
    this.cursorMesh.quaternion.copy(quat);
    this.cursorMesh.visible = true;
  }

  // Event handlers
  private getMouseCoords(event: PointerEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getSceneMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && !object.userData.isEditorInternal) {
        meshes.push(object);
      }
    });
    return meshes;
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.active) return;
    // Only intercept LMB
    if (event.button !== 0) return;

    // If Alt is held, let OrbitControls handle the event (camera orbit)
    if (event.altKey) return;

    // Prevent OrbitControls from receiving LMB
    event.stopPropagation();

    this.shiftHeld = event.shiftKey;
    this.ctrlHeld = event.ctrlKey;
    this.updateCursorColor();

    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.getSceneMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;

      // Ensure geometry is non-indexed for sculpting
      this.ensureNonIndexed(mesh);

      // Snapshot positions for undo
      const posAttr = mesh.geometry.attributes.position;
      this.strokeOriginalPositions = new Float32Array(posAttr.array.length);
      this.strokeOriginalPositions.set(posAttr.array as Float32Array);
      this.strokeMesh = mesh;
      this.strokeChanged = false;
      this.isSculpting = true;

      // Apply first sculpt stroke at this point
      this.applySculpt(mesh, hit.point);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.active) return;

    this.shiftHeld = event.shiftKey;
    this.ctrlHeld = event.ctrlKey;
    this.updateCursorColor();

    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.getSceneMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
      // Transform normal to world space
      const mesh = hit.object as THREE.Mesh;
      normal.transformDirection(mesh.matrixWorld);
      this.positionCursor(hit.point, normal);

      if (this.isSculpting && this.strokeMesh === mesh) {
        this.applySculpt(mesh, hit.point);
      }
    } else {
      if (this.cursorMesh) {
        this.cursorMesh.visible = false;
      }
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isSculpting) return;
    if (event.button !== 0) return;

    if (this.strokeChanged && this.strokeMesh && this.strokeOriginalPositions) {
      const mesh = this.strokeMesh;
      const beforePositions = this.strokeOriginalPositions;
      const afterPositions = new Float32Array(mesh.geometry.attributes.position.array.length);
      afterPositions.set(mesh.geometry.attributes.position.array as Float32Array);

      const action: Action = {
        description: 'Скульптинг кистью',
        execute: () => {
          const posAttr = mesh.geometry.attributes.position;
          (posAttr.array as Float32Array).set(afterPositions);
          posAttr.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
        },
        undo: () => {
          const posAttr = mesh.geometry.attributes.position;
          (posAttr.array as Float32Array).set(beforePositions);
          posAttr.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
        },
      };

      this.history.record(action);
    }

    this.isSculpting = false;
    this.strokeMesh = null;
    this.strokeOriginalPositions = null;
    this.strokeChanged = false;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.shiftHeld = true;
      this.updateCursorColor();
    }
    if (event.key === 'Control') {
      this.ctrlHeld = true;
      this.updateCursorColor();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.shiftHeld = false;
      this.updateCursorColor();
    }
    if (event.key === 'Control') {
      this.ctrlHeld = false;
      this.updateCursorColor();
    }
  }

  // Geometry helpers
  private ensureNonIndexed(mesh: THREE.Mesh): void {
    if (mesh.userData._sculptNonIndexed) return;
    if (mesh.geometry.index) {
      mesh.geometry = mesh.geometry.toNonIndexed();
      mesh.userData._sculptNonIndexed = true;
    } else {
      mesh.userData._sculptNonIndexed = true;
    }
  }

  // Sculpt logic
  private applySculpt(mesh: THREE.Mesh, hitPoint: THREE.Vector3): void {
    const geo = mesh.geometry;
    const posAttr = geo.attributes.position;
    const positions = posAttr.array as Float32Array;
    const vertexCount = posAttr.count;

    // Get inverse world matrix to convert hit point to local space
    const inverseMatrix = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const localHitPoint = hitPoint.clone().applyMatrix4(inverseMatrix);

    // Determine effective brush type
    let effectiveBrush = this.brushType;
    if (this.shiftHeld) {
      effectiveBrush = 'smooth';
    }

    // Determine direction multiplier
    const dirMult = this.ctrlHeld ? -1 : 1;

    // Collect affected vertices (indices and their falloff weights)
    const affected: { index: number; weight: number }[] = [];

    // We need to account for the mesh scale when computing distances
    const worldScale = new THREE.Vector3();
    mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);
    const avgScale = (Math.abs(worldScale.x) + Math.abs(worldScale.y) + Math.abs(worldScale.z)) / 3;
    const localRadius = this.radius / avgScale;

    for (let i = 0; i < vertexCount; i++) {
      const vx = positions[i * 3];
      const vy = positions[i * 3 + 1];
      const vz = positions[i * 3 + 2];

      const dx = vx - localHitPoint.x;
      const dy = vy - localHitPoint.y;
      const dz = vz - localHitPoint.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= localRadius) {
        const normalizedDist = dist / localRadius;
        const weight = this.computeFalloff(normalizedDist);
        affected.push({ index: i, weight });
      }
    }

    if (affected.length === 0) return;

    // Apply brush
    switch (effectiveBrush) {
      case 'push_pull':
        this.applyPushPull(positions, affected, geo, dirMult);
        break;
      case 'smooth':
        this.applySmooth(positions, affected, localRadius);
        break;
      case 'flatten':
        this.applyFlatten(positions, affected, dirMult);
        break;
      case 'inflate':
        this.applyInflate(positions, affected, geo, dirMult);
        break;
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    this.strokeChanged = true;
  }

  private computeFalloff(normalizedDist: number): number {
    switch (this.falloffType) {
      case 'smooth':
        return (1 + Math.cos(Math.PI * normalizedDist)) / 2;
      case 'sharp':
        return (1 - normalizedDist) * (1 - normalizedDist);
      case 'constant':
        return 1.0;
      default:
        return 1.0;
    }
  }

  private applyPushPull(
    positions: Float32Array,
    affected: { index: number; weight: number }[],
    geo: THREE.BufferGeometry,
    dirMult: number
  ): void {
    // Compute average normal of affected vertices
    const normals = geo.attributes.normal;
    if (!normals) return;
    const normArr = normals.array as Float32Array;

    let avgNx = 0, avgNy = 0, avgNz = 0;
    for (const { index } of affected) {
      avgNx += normArr[index * 3];
      avgNy += normArr[index * 3 + 1];
      avgNz += normArr[index * 3 + 2];
    }
    const len = Math.sqrt(avgNx * avgNx + avgNy * avgNy + avgNz * avgNz);
    if (len < 0.0001) return;
    avgNx /= len;
    avgNy /= len;
    avgNz /= len;

    const str = this.strength * 0.05 * dirMult;
    for (const { index, weight } of affected) {
      const factor = str * weight;
      positions[index * 3] += avgNx * factor;
      positions[index * 3 + 1] += avgNy * factor;
      positions[index * 3 + 2] += avgNz * factor;
    }
  }

  private applySmooth(
    positions: Float32Array,
    affected: { index: number; weight: number }[],
    localRadius: number
  ): void {
    const neighborRadius = localRadius * 0.3;
    const str = this.strength * 0.3;

    // Pre-compute new positions
    const newPositions: { index: number; x: number; y: number; z: number }[] = [];

    for (const { index, weight } of affected) {
      const vx = positions[index * 3];
      const vy = positions[index * 3 + 1];
      const vz = positions[index * 3 + 2];

      // Find neighbors within neighborRadius (only among affected vertices)
      let sumX = 0, sumY = 0, sumZ = 0;
      let count = 0;

      for (const neighbor of affected) {
        if (neighbor.index === index) continue;
        const nx = positions[neighbor.index * 3];
        const ny = positions[neighbor.index * 3 + 1];
        const nz = positions[neighbor.index * 3 + 2];
        const dx = nx - vx;
        const dy = ny - vy;
        const dz = nz - vz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= neighborRadius) {
          sumX += nx;
          sumY += ny;
          sumZ += nz;
          count++;
        }
      }

      if (count > 0) {
        const avgX = sumX / count;
        const avgY = sumY / count;
        const avgZ = sumZ / count;
        const factor = str * weight;
        newPositions.push({
          index,
          x: vx + (avgX - vx) * factor,
          y: vy + (avgY - vy) * factor,
          z: vz + (avgZ - vz) * factor,
        });
      }
    }

    // Apply new positions
    for (const { index, x, y, z } of newPositions) {
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
    }
  }

  private applyFlatten(
    positions: Float32Array,
    affected: { index: number; weight: number }[],
    _dirMult: number
  ): void {
    // Compute average position and average normal (as plane)
    let avgX = 0, avgY = 0, avgZ = 0;
    for (const { index } of affected) {
      avgX += positions[index * 3];
      avgY += positions[index * 3 + 1];
      avgZ += positions[index * 3 + 2];
    }
    const n = affected.length;
    avgX /= n;
    avgY /= n;
    avgZ /= n;

    // Compute plane normal via covariance / simplification: use average normal direction
    // Use average of vertex positions minus center to approximate normal
    // Simpler: project onto average height plane (use average as plane point, normal = average of per-vertex offsets)
    // Best simple approach: use the average position as the plane point
    // and compute plane normal from PCA of affected vertices
    // For performance, just use y-axis or compute simple normal from first few verts
    // Use cross product of two vectors in the affected set
    let planeNormal = new THREE.Vector3(0, 1, 0);
    if (affected.length >= 3) {
      const i0 = affected[0].index;
      const i1 = affected[Math.floor(affected.length / 3)].index;
      const i2 = affected[Math.floor(affected.length * 2 / 3)].index;
      const v0 = new THREE.Vector3(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
      const v1 = new THREE.Vector3(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
      const v2 = new THREE.Vector3(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
      const edge1 = v1.clone().sub(v0);
      const edge2 = v2.clone().sub(v0);
      const cross = edge1.cross(edge2);
      if (cross.length() > 0.0001) {
        planeNormal = cross.normalize();
      }
    }

    const planePoint = new THREE.Vector3(avgX, avgY, avgZ);
    const str = this.strength * 0.3;

    for (const { index, weight } of affected) {
      const vx = positions[index * 3];
      const vy = positions[index * 3 + 1];
      const vz = positions[index * 3 + 2];

      // Signed distance from vertex to plane
      const v = new THREE.Vector3(vx, vy, vz);
      const diff = v.clone().sub(planePoint);
      const dist = diff.dot(planeNormal);

      // Project vertex onto plane
      const factor = str * weight;
      positions[index * 3] -= planeNormal.x * dist * factor;
      positions[index * 3 + 1] -= planeNormal.y * dist * factor;
      positions[index * 3 + 2] -= planeNormal.z * dist * factor;
    }
  }

  private applyInflate(
    positions: Float32Array,
    affected: { index: number; weight: number }[],
    geo: THREE.BufferGeometry,
    dirMult: number
  ): void {
    const normals = geo.attributes.normal;
    if (!normals) return;
    const normArr = normals.array as Float32Array;

    const str = this.strength * 0.05 * dirMult;
    for (const { index, weight } of affected) {
      const nx = normArr[index * 3];
      const ny = normArr[index * 3 + 1];
      const nz = normArr[index * 3 + 2];
      const factor = str * weight;
      positions[index * 3] += nx * factor;
      positions[index * 3 + 1] += ny * factor;
      positions[index * 3 + 2] += nz * factor;
    }
  }
}
