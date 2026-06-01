import * as THREE from 'three';
import { History, Action } from '../History';

export class FaceMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private history: History;
  private container: HTMLElement;
  private targetMesh: THREE.Mesh | null = null;
  private selectedFaceIndex: number = -1;
  private selectedFaceIndices: number[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private active: boolean = false;
  private highlightMesh: THREE.Mesh | null = null;
  private paintColor: string = '#ff0000';
  private paintingEnabled: boolean = false;
  private colorPickListeners: ((color: string) => void)[] = [];

  private onClickBound: (e: MouseEvent) => void;
  private onMoveBound: (e: MouseEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private isPainting: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, history: History) {
    this.scene = scene;
    this.camera = camera;
    this.history = history;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onClickBound = this.onClick.bind(this);
    this.onMoveBound = this.onMouseMove.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
  }

  public activate(mesh: THREE.Mesh | null): void {
    this.active = true;
    this.targetMesh = mesh;

    // Create persistent highlight mesh
    const triGeo = new THREE.BufferGeometry();
    const verts = new Float32Array(9);
    triGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.highlightMesh = new THREE.Mesh(triGeo, mat);
    this.highlightMesh.visible = false;
    this.highlightMesh.name = '__face_highlight__';
    this.highlightMesh.userData.isEditorInternal = true;
    this.scene.add(this.highlightMesh);

    this.container.addEventListener('click', this.onClickBound);
    this.container.addEventListener('mousemove', this.onMoveBound);
    this.container.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
  }

  public deactivate(): void {
    this.active = false;
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
    this.targetMesh = null;
    this.selectedFaceIndex = -1;
    this.selectedFaceIndices = [];
    this.container.removeEventListener('click', this.onClickBound);
    this.container.removeEventListener('mousemove', this.onMoveBound);
    this.container.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    this.container.classList.remove('eyedropper-cursor');
    this.isPainting = false;
  }

  public isActive(): boolean {
    return this.active;
  }

  public updateMesh(mesh: THREE.Mesh | null): void {
    this.targetMesh = mesh;
  }

  public setPaintColor(color: string): void {
    this.paintColor = color;
  }

  public setPaintingEnabled(enabled: boolean): void {
    this.paintingEnabled = enabled;
    if (!enabled) {
      this.container.classList.remove('eyedropper-cursor');
    }
  }

  public onColorPick(callback: (color: string) => void): void {
    this.colorPickListeners.push(callback);
  }

  public getSelectedFaceIndex(): number {
    return this.selectedFaceIndex;
  }

  public getSelectedFaceIndices(): number[] {
    return [...this.selectedFaceIndices];
  }

  private getMouseCoords(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.targetMesh || !this.highlightMesh) return;
    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.targetMesh);

    if (intersects.length > 0 && intersects[0].faceIndex != null) {
      this.showFaceHighlight(intersects[0].faceIndex);
      // Continuous painting while dragging
      if (this.isPainting && this.paintingEnabled && !event.altKey) {
        this.paintFace(intersects[0].faceIndex);
      }
    } else {
      this.highlightMesh.visible = false;
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this.paintingEnabled && !event.altKey && !event.shiftKey) {
      this.isPainting = true;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isPainting = false;
  }

  private onClick(event: MouseEvent): void {
    if (!this.targetMesh) return;
    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.targetMesh);

    if (intersects.length > 0 && intersects[0].faceIndex != null) {
      const faceIndex = intersects[0].faceIndex;

      // Eyedropper: Alt+Click picks the face color
      if (this.paintingEnabled && event.altKey) {
        const pickedColor = this.pickFaceColor(faceIndex);
        this.colorPickListeners.forEach(cb => cb(pickedColor));
        return;
      }

      // Flood fill: Shift+Click fills adjacent same-colored faces
      if (this.paintingEnabled && event.shiftKey) {
        this.floodFill(faceIndex);
        return;
      }

      if (event.shiftKey) {
        // Toggle face in multi-selection
        const idx = this.selectedFaceIndices.indexOf(faceIndex);
        if (idx >= 0) {
          this.selectedFaceIndices.splice(idx, 1);
        } else {
          this.selectedFaceIndices.push(faceIndex);
        }
        this.selectedFaceIndex = this.selectedFaceIndices.length > 0
          ? this.selectedFaceIndices[this.selectedFaceIndices.length - 1]
          : -1;
      } else {
        this.selectedFaceIndex = faceIndex;
        this.selectedFaceIndices = [faceIndex];
      }

      if (this.paintingEnabled) {
        // Paint all selected faces
        for (const fi of this.selectedFaceIndices) {
          this.paintFace(fi);
        }
      }
    } else {
      this.selectedFaceIndex = -1;
      this.selectedFaceIndices = [];
    }
  }

  private pickFaceColor(faceIndex: number): string {
    const mesh = this.targetMesh!;
    const geo = mesh.geometry;
    const colorAttr = geo.attributes.color;

    if (colorAttr) {
      let i0: number;
      if (geo.index) {
        i0 = geo.index.getX(faceIndex * 3);
      } else {
        i0 = faceIndex * 3;
      }
      const color = new THREE.Color(colorAttr.getX(i0), colorAttr.getY(i0), colorAttr.getZ(i0));
      return '#' + color.getHexString();
    } else {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      return '#' + mat.color.getHexString();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Alt' && this.paintingEnabled) {
      this.container.classList.add('eyedropper-cursor');
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Alt') {
      this.container.classList.remove('eyedropper-cursor');
    }
  }

  private showFaceHighlight(faceIndex: number): void {
    if (!this.targetMesh || !this.highlightMesh) return;
    const geo = this.targetMesh.geometry;
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

    // Update existing geometry buffer in-place
    const posAttr = this.highlightMesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    arr[0] = positions.getX(i0); arr[1] = positions.getY(i0); arr[2] = positions.getZ(i0);
    arr[3] = positions.getX(i1); arr[4] = positions.getY(i1); arr[5] = positions.getZ(i1);
    arr[6] = positions.getX(i2); arr[7] = positions.getY(i2); arr[8] = positions.getZ(i2);
    posAttr.needsUpdate = true;

    this.highlightMesh.position.copy(this.targetMesh.position);
    this.highlightMesh.rotation.copy(this.targetMesh.rotation);
    this.highlightMesh.scale.copy(this.targetMesh.scale);
    this.highlightMesh.visible = true;
  }

  private floodFill(startFaceIndex: number): void {
    if (!this.targetMesh) return;
    const mesh = this.targetMesh;
    const geo = mesh.geometry;

    // Ensure vertex colors exist
    if (!geo.attributes.color) {
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const baseColor = mat.color;
      for (let i = 0; i < count; i++) {
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      mat.vertexColors = true;
      mat.needsUpdate = true;
    }

    const colorAttr = geo.attributes.color;
    const posAttr = geo.attributes.position;
    const index = geo.index;
    const faceCount = index ? index.count / 3 : posAttr.count / 3;

    // Get the color of the start face
    const getVertexIndex = (faceIdx: number, vertIdx: number): number => {
      if (index) return index.getX(faceIdx * 3 + vertIdx);
      return faceIdx * 3 + vertIdx;
    };

    const i0 = getVertexIndex(startFaceIndex, 0);
    const targetColor = new THREE.Color(
      colorAttr.getX(i0), colorAttr.getY(i0), colorAttr.getZ(i0)
    );

    const paintColor = new THREE.Color(this.paintColor);

    // If target color is same as paint color, do nothing
    if (targetColor.equals(paintColor)) return;

    // Check if a face has the target color
    const faceHasColor = (faceIdx: number): boolean => {
      const vi = getVertexIndex(faceIdx, 0);
      const r = colorAttr.getX(vi);
      const g = colorAttr.getY(vi);
      const b = colorAttr.getZ(vi);
      return Math.abs(r - targetColor.r) < 0.01 &&
             Math.abs(g - targetColor.g) < 0.01 &&
             Math.abs(b - targetColor.b) < 0.01;
    };

    // Build adjacency: faces that share at least one vertex position
    const posKey = (vi: number): string => {
      const x = Math.round(posAttr.getX(vi) * 1000);
      const y = Math.round(posAttr.getY(vi) * 1000);
      const z = Math.round(posAttr.getZ(vi) * 1000);
      return `${x},${y},${z}`;
    };

    const vertexToFaces = new Map<string, number[]>();
    for (let f = 0; f < faceCount; f++) {
      for (let v = 0; v < 3; v++) {
        const vi = getVertexIndex(f, v);
        const key = posKey(vi);
        if (!vertexToFaces.has(key)) vertexToFaces.set(key, []);
        vertexToFaces.get(key)!.push(f);
      }
    }

    const getAdjacentFaces = (faceIdx: number): number[] => {
      const neighbors = new Set<number>();
      for (let v = 0; v < 3; v++) {
        const vi = getVertexIndex(faceIdx, v);
        const key = posKey(vi);
        const faces = vertexToFaces.get(key);
        if (faces) {
          for (const f of faces) {
            if (f !== faceIdx) neighbors.add(f);
          }
        }
      }
      return Array.from(neighbors);
    };

    // BFS flood fill
    const visited = new Set<number>();
    const queue: number[] = [startFaceIndex];
    visited.add(startFaceIndex);
    const filledFaces: number[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!faceHasColor(current)) continue;
      filledFaces.push(current);

      const neighbors = getAdjacentFaces(current);
      for (const n of neighbors) {
        if (!visited.has(n) && faceHasColor(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }

    // Paint all filled faces
    for (const fi of filledFaces) {
      const v0 = getVertexIndex(fi, 0);
      const v1 = getVertexIndex(fi, 1);
      const v2 = getVertexIndex(fi, 2);
      colorAttr.setXYZ(v0, paintColor.r, paintColor.g, paintColor.b);
      colorAttr.setXYZ(v1, paintColor.r, paintColor.g, paintColor.b);
      colorAttr.setXYZ(v2, paintColor.r, paintColor.g, paintColor.b);
    }
    colorAttr.needsUpdate = true;
  }

  private paintFace(faceIndex: number): void {
    if (!this.targetMesh) return;
    const mesh = this.targetMesh;
    const geo = mesh.geometry;

    // Ensure vertex colors attribute exists
    if (!geo.attributes.color) {
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      // Initialize with current material color
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const baseColor = mat.color;
      for (let i = 0; i < count; i++) {
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      mat.vertexColors = true;
      mat.needsUpdate = true;
    }

    const color = new THREE.Color(this.paintColor);
    const colorAttr = geo.attributes.color;

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

    // Save old colors for undo
    const oldColors = [
      [colorAttr.getX(i0), colorAttr.getY(i0), colorAttr.getZ(i0)],
      [colorAttr.getX(i1), colorAttr.getY(i1), colorAttr.getZ(i1)],
      [colorAttr.getX(i2), colorAttr.getY(i2), colorAttr.getZ(i2)],
    ];

    // Apply new color
    colorAttr.setXYZ(i0, color.r, color.g, color.b);
    colorAttr.setXYZ(i1, color.r, color.g, color.b);
    colorAttr.setXYZ(i2, color.r, color.g, color.b);
    colorAttr.needsUpdate = true;

    const action: Action = {
      description: 'Покраска грани',
      execute: () => {
        const ca = mesh.geometry.attributes.color;
        ca.setXYZ(i0, color.r, color.g, color.b);
        ca.setXYZ(i1, color.r, color.g, color.b);
        ca.setXYZ(i2, color.r, color.g, color.b);
        ca.needsUpdate = true;
      },
      undo: () => {
        const ca = mesh.geometry.attributes.color;
        ca.setXYZ(i0, oldColors[0][0], oldColors[0][1], oldColors[0][2]);
        ca.setXYZ(i1, oldColors[1][0], oldColors[1][1], oldColors[1][2]);
        ca.setXYZ(i2, oldColors[2][0], oldColors[2][1], oldColors[2][2]);
        ca.needsUpdate = true;
      },
    };

    this.history.record(action);
  }
}
