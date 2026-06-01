import * as THREE from 'three';
import { History, Action } from '../History';

export class SculptMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private container: HTMLElement;
  private history: History;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private active: boolean = false;
  private highlightMesh: THREE.Mesh | null = null;

  // Drag state
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragMesh: THREE.Mesh | null = null;
  private dragFaceIndex: number = -1;
  private dragNormal: THREE.Vector3 = new THREE.Vector3();
  private dragOriginalGeometry: THREE.BufferGeometry | null = null;
  private dragExtruded: boolean = false;
  private dragCurrentDistance: number = 0;

  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, history: History) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.history = history;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
  }

  public activate(): void {
    this.active = true;

    // Create highlight mesh (triangle overlay)
    const triGeo = new THREE.BufferGeometry();
    const verts = new Float32Array(9);
    triGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.highlightMesh = new THREE.Mesh(triGeo, mat);
    this.highlightMesh.visible = false;
    this.highlightMesh.name = '__sculpt_highlight__';
    this.highlightMesh.userData.isEditorInternal = true;
    this.scene.add(this.highlightMesh);

    this.container.addEventListener('mousemove', this.onMouseMoveBound);
    this.container.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
  }

  public deactivate(): void {
    this.active = false;

    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }

    this.isDragging = false;
    this.dragMesh = null;
    this.dragFaceIndex = -1;
    this.dragOriginalGeometry = null;
    this.dragExtruded = false;

    this.container.removeEventListener('mousemove', this.onMouseMoveBound);
    this.container.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
  }

  public isActive(): boolean {
    return this.active;
  }

  private getMouseCoords(event: MouseEvent): void {
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

  private onMouseMove(event: MouseEvent): void {
    if (!this.active) return;

    if (this.isDragging) {
      this.onDragMove(event);
      return;
    }

    // Hover highlight
    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.getSceneMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0 && intersects[0].faceIndex != null) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const faceIndex = hit.faceIndex!;
      this.showFaceHighlight(mesh, faceIndex);
    } else {
      if (this.highlightMesh) {
        this.highlightMesh.visible = false;
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.active || event.button !== 0) return;

    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.getSceneMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0 && intersects[0].faceIndex != null) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const faceIndex = hit.faceIndex!;

      // Compute face normal in local space
      const geo = mesh.geometry;
      const normal = this.computeFaceNormal(geo, faceIndex);

      // Record drag start
      this.isDragging = true;
      this.dragStartY = event.clientY;
      this.dragMesh = mesh;
      this.dragFaceIndex = faceIndex;
      this.dragNormal = normal;
      this.dragOriginalGeometry = geo.clone();
      this.dragExtruded = false;
      this.dragCurrentDistance = 0;

      // Hide highlight during drag
      if (this.highlightMesh) {
        this.highlightMesh.visible = false;
      }
    }
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.isDragging || !this.dragMesh || !this.dragOriginalGeometry) return;

    const deltaY = this.dragStartY - event.clientY;
    const distance = deltaY * 0.01;
    this.dragCurrentDistance = distance;

    // Restore original geometry each frame, then apply extrude with current distance
    const mesh = this.dragMesh;
    const originalGeo = this.dragOriginalGeometry;

    // Perform extrude from original geometry with the given distance
    const newGeo = this.extrudeFromGeometry(originalGeo, this.dragFaceIndex, this.dragNormal, distance);
    if (newGeo) {
      mesh.geometry.dispose();
      mesh.geometry = newGeo;
      this.dragExtruded = true;
    }
  }

  private onMouseUp(_event: MouseEvent): void {
    if (!this.isDragging) return;

    if (this.dragExtruded && this.dragMesh && this.dragOriginalGeometry) {
      const mesh = this.dragMesh;
      const finalGeometry = mesh.geometry;
      const originalGeometry = this.dragOriginalGeometry;

      const action: Action = {
        description: 'Скульптинг грани',
        execute: () => {
          mesh.geometry = finalGeometry;
        },
        undo: () => {
          mesh.geometry = originalGeometry;
        },
      };

      this.history.record(action);
    } else if (this.dragOriginalGeometry) {
      // No significant drag, restore original
      if (this.dragMesh) {
        this.dragMesh.geometry.dispose();
        this.dragMesh.geometry = this.dragOriginalGeometry;
      }
    }

    this.isDragging = false;
    this.dragMesh = null;
    this.dragFaceIndex = -1;
    this.dragOriginalGeometry = null;
    this.dragExtruded = false;
    this.dragCurrentDistance = 0;
  }

  private computeFaceNormal(geo: THREE.BufferGeometry, faceIndex: number): THREE.Vector3 {
    const positions = geo.attributes.position;
    let i0: number, i1: number, i2: number;

    if (geo.index) {
      i0 = geo.index.getX(faceIndex * 3);
      i1 = geo.index.getX(faceIndex * 3 + 1);
      i2 = geo.index.getX(faceIndex * 3 + 2);
    } else {
      i0 = faceIndex * 3;
      i1 = faceIndex * 3 + 1;
      i2 = faceIndex * 3 + 2;
    }

    const v0 = new THREE.Vector3(positions.getX(i0), positions.getY(i0), positions.getZ(i0));
    const v1 = new THREE.Vector3(positions.getX(i1), positions.getY(i1), positions.getZ(i1));
    const v2 = new THREE.Vector3(positions.getX(i2), positions.getY(i2), positions.getZ(i2));

    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    return new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  }

  private extrudeFromGeometry(
    sourceGeo: THREE.BufferGeometry,
    faceIndex: number,
    normal: THREE.Vector3,
    distance: number
  ): THREE.BufferGeometry | null {
    // Convert to non-indexed for easier manipulation
    const workGeo = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
    const positions = workGeo.attributes.position;
    const baseIdx = faceIndex * 3;

    if (baseIdx + 2 >= positions.count) return null;

    // Get face vertices
    const v0 = new THREE.Vector3(positions.getX(baseIdx), positions.getY(baseIdx), positions.getZ(baseIdx));
    const v1 = new THREE.Vector3(positions.getX(baseIdx + 1), positions.getY(baseIdx + 1), positions.getZ(baseIdx + 1));
    const v2 = new THREE.Vector3(positions.getX(baseIdx + 2), positions.getY(baseIdx + 2), positions.getZ(baseIdx + 2));

    // Extruded positions
    const offset = normal.clone().multiplyScalar(distance);
    const nv0 = v0.clone().add(offset);
    const nv1 = v1.clone().add(offset);
    const nv2 = v2.clone().add(offset);

    // Build new geometry
    const oldPositions = positions.array as Float32Array;
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
      const oldColors = workGeo.attributes.color.array as Float32Array;
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
    let posOffset = positions.count * 3;
    const sides: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
      [v0, v1, nv1, nv0],
      [v1, v2, nv2, nv1],
      [v2, v0, nv0, nv2],
    ];

    // Default color for side face vertices
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
      newPositions[posOffset++] = a.x; newPositions[posOffset++] = a.y; newPositions[posOffset++] = a.z;
      newPositions[posOffset++] = b.x; newPositions[posOffset++] = b.y; newPositions[posOffset++] = b.z;
      newPositions[posOffset++] = c.x; newPositions[posOffset++] = c.y; newPositions[posOffset++] = c.z;
      // Triangle 2: a, c, d
      newPositions[posOffset++] = a.x; newPositions[posOffset++] = a.y; newPositions[posOffset++] = a.z;
      newPositions[posOffset++] = c.x; newPositions[posOffset++] = c.y; newPositions[posOffset++] = c.z;
      newPositions[posOffset++] = d.x; newPositions[posOffset++] = d.y; newPositions[posOffset++] = d.z;

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

    return newGeo;
  }

  private showFaceHighlight(mesh: THREE.Mesh, faceIndex: number): void {
    if (!this.highlightMesh) return;
    const geo = mesh.geometry;
    const positions = geo.attributes.position;

    let i0: number, i1: number, i2: number;
    if (geo.index) {
      i0 = geo.index.getX(faceIndex * 3);
      i1 = geo.index.getX(faceIndex * 3 + 1);
      i2 = geo.index.getX(faceIndex * 3 + 2);
    } else {
      i0 = faceIndex * 3;
      i1 = faceIndex * 3 + 1;
      i2 = faceIndex * 3 + 2;
    }

    const posAttr = this.highlightMesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    arr[0] = positions.getX(i0); arr[1] = positions.getY(i0); arr[2] = positions.getZ(i0);
    arr[3] = positions.getX(i1); arr[4] = positions.getY(i1); arr[5] = positions.getZ(i1);
    arr[6] = positions.getX(i2); arr[7] = positions.getY(i2); arr[8] = positions.getZ(i2);
    posAttr.needsUpdate = true;

    this.highlightMesh.position.copy(mesh.position);
    this.highlightMesh.rotation.copy(mesh.rotation);
    this.highlightMesh.scale.copy(mesh.scale);
    this.highlightMesh.visible = true;
  }
}
