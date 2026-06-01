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

  // Stroke tracking for batched undo
  private strokeOldColors: Map<number, { i0: number; i1: number; i2: number; c0: number[]; c1: number[]; c2: number[] }> = new Map();
  private strokeColor: THREE.Color | null = null;

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
    // Flush any pending paint stroke
    if (this.isPainting && this.strokeOldColors.size > 0 && this.targetMesh && this.strokeColor) {
      const mesh = this.targetMesh;
      const oldColorsMap = new Map(this.strokeOldColors);
      const paintR = this.strokeColor.r;
      const paintG = this.strokeColor.g;
      const paintB = this.strokeColor.b;

      const action: Action = {
        description: 'Покраска грани',
        execute: () => {
          const ca = mesh.geometry.attributes.color;
          for (const [, entry] of oldColorsMap) {
            ca.setXYZ(entry.i0, paintR, paintG, paintB);
            ca.setXYZ(entry.i1, paintR, paintG, paintB);
            ca.setXYZ(entry.i2, paintR, paintG, paintB);
          }
          ca.needsUpdate = true;
        },
        undo: () => {
          const ca = mesh.geometry.attributes.color;
          for (const [, entry] of oldColorsMap) {
            ca.setXYZ(entry.i0, entry.c0[0], entry.c0[1], entry.c0[2]);
            ca.setXYZ(entry.i1, entry.c1[0], entry.c1[1], entry.c1[2]);
            ca.setXYZ(entry.i2, entry.c2[0], entry.c2[1], entry.c2[2]);
          }
          ca.needsUpdate = true;
        },
      };
      this.history.record(action);
    }

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
      this.strokeOldColors = new Map();
      this.strokeColor = new THREE.Color(this.paintColor);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this.isPainting && this.strokeOldColors.size > 0 && this.targetMesh && this.strokeColor) {
      const mesh = this.targetMesh;
      const oldColorsMap = new Map(this.strokeOldColors);
      const paintR = this.strokeColor.r;
      const paintG = this.strokeColor.g;
      const paintB = this.strokeColor.b;

      const action: Action = {
        description: 'Покраска граней',
        execute: () => {
          const ca = mesh.geometry.attributes.color;
          for (const [, entry] of oldColorsMap) {
            ca.setXYZ(entry.i0, paintR, paintG, paintB);
            ca.setXYZ(entry.i1, paintR, paintG, paintB);
            ca.setXYZ(entry.i2, paintR, paintG, paintB);
          }
          ca.needsUpdate = true;
        },
        undo: () => {
          const ca = mesh.geometry.attributes.color;
          for (const [, entry] of oldColorsMap) {
            ca.setXYZ(entry.i0, entry.c0[0], entry.c0[1], entry.c0[2]);
            ca.setXYZ(entry.i1, entry.c1[0], entry.c1[1], entry.c1[2]);
            ca.setXYZ(entry.i2, entry.c2[0], entry.c2[1], entry.c2[2]);
          }
          ca.needsUpdate = true;
        },
      };
      this.history.record(action);
    }
    this.isPainting = false;
    this.strokeOldColors = new Map();
    this.strokeColor = null;
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
      // Guard against multi-material meshes
      const rawMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (rawMat instanceof THREE.MeshStandardMaterial) {
        return '#' + rawMat.color.getHexString();
      }
      return '#ffffff';
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
      // Guard against multi-material meshes
      const rawMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!(rawMat instanceof THREE.MeshStandardMaterial)) return;
      const baseColor = rawMat.color;
      for (let i = 0; i < count; i++) {
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      rawMat.vertexColors = true;
      rawMat.needsUpdate = true;
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

    // Build adjacency: faces that share at least one vertex position.
    // NOTE: posKey rounds to 3 decimal places (multiply by 1000, round). This can produce
    // false adjacency for micro-geometry with vertices closer than 0.001 units, or miss
    // adjacency when shared-edge vertices differ by floating-point epsilon above 0.0005.
    const posKey = (vi: number): string => {
      const x = Math.round(posAttr.getX(vi) * 1000);
      const y = Math.round(posAttr.getY(vi) * 1000);
      const z = Math.round(posAttr.getZ(vi) * 1000);
      return `${x},${y},${z}`;
    };

    // NOTE: This adjacency map is rebuilt on every Shift+Click. For the current max of 256
    // polygons this is fine, but on imported meshes with >10k faces this could freeze the UI.
    // Consider caching on mesh.userData._faceAdjacency and invalidating on geometry change.
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

    // Save old colors for undo before painting
    const oldColors: { v0: number; v1: number; v2: number; c0: number[]; c1: number[]; c2: number[] }[] = [];
    for (const fi of filledFaces) {
      const v0 = getVertexIndex(fi, 0);
      const v1 = getVertexIndex(fi, 1);
      const v2 = getVertexIndex(fi, 2);
      oldColors.push({
        v0, v1, v2,
        c0: [colorAttr.getX(v0), colorAttr.getY(v0), colorAttr.getZ(v0)],
        c1: [colorAttr.getX(v1), colorAttr.getY(v1), colorAttr.getZ(v1)],
        c2: [colorAttr.getX(v2), colorAttr.getY(v2), colorAttr.getZ(v2)],
      });
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

    // Record compound undo action for the entire flood fill
    const newR = paintColor.r, newG = paintColor.g, newB = paintColor.b;
    const action: Action = {
      description: 'Заливка граней',
      execute: () => {
        const ca = mesh.geometry.attributes.color;
        for (const entry of oldColors) {
          ca.setXYZ(entry.v0, newR, newG, newB);
          ca.setXYZ(entry.v1, newR, newG, newB);
          ca.setXYZ(entry.v2, newR, newG, newB);
        }
        ca.needsUpdate = true;
      },
      undo: () => {
        const ca = mesh.geometry.attributes.color;
        for (const entry of oldColors) {
          ca.setXYZ(entry.v0, entry.c0[0], entry.c0[1], entry.c0[2]);
          ca.setXYZ(entry.v1, entry.c1[0], entry.c1[1], entry.c1[2]);
          ca.setXYZ(entry.v2, entry.c2[0], entry.c2[1], entry.c2[2]);
        }
        ca.needsUpdate = true;
      },
    };
    this.history.record(action);
  }

  private paintFace(faceIndex: number): void {
    if (!this.targetMesh) return;
    const mesh = this.targetMesh;
    const geo = mesh.geometry;

    // Ensure vertex colors attribute exists
    if (!geo.attributes.color) {
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      // Guard against multi-material meshes
      const rawMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!(rawMat instanceof THREE.MeshStandardMaterial)) return;
      const baseColor = rawMat.color;
      for (let i = 0; i < count; i++) {
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      rawMat.vertexColors = true;
      rawMat.needsUpdate = true;
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

    if (this.isPainting) {
      // Stroke mode: collect old colors only on first paint per face, skip per-face history
      if (!this.strokeOldColors.has(faceIndex)) {
        this.strokeOldColors.set(faceIndex, {
          i0, i1, i2,
          c0: [colorAttr.getX(i0), colorAttr.getY(i0), colorAttr.getZ(i0)],
          c1: [colorAttr.getX(i1), colorAttr.getY(i1), colorAttr.getZ(i1)],
          c2: [colorAttr.getX(i2), colorAttr.getY(i2), colorAttr.getZ(i2)],
        });
      }

      // Apply new color
      colorAttr.setXYZ(i0, color.r, color.g, color.b);
      colorAttr.setXYZ(i1, color.r, color.g, color.b);
      colorAttr.setXYZ(i2, color.r, color.g, color.b);
      colorAttr.needsUpdate = true;
    } else {
      // Single-click mode: record immediately
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
}
