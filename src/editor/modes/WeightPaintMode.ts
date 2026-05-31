import * as THREE from 'three';
import { BoneSystem } from '../animation/BoneSystem';

// NOTE: Weight paint data is currently visual-only and is not exported or
// applied to the skeleton for vertex skinning. Full vertex deformation
// requires converting meshes to SkinnedMesh with skin indices/weights,
// which is not yet implemented.
export class WeightPaintMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private container: HTMLElement;
  private boneSystem: BoneSystem;
  private active: boolean = false;
  private targetMesh: THREE.Mesh | null = null;
  private activeBone: THREE.Bone | null = null;
  private brushSize: number = 0.5;
  private brushStrength: number = 0.3;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isPainting: boolean = false;
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private weightData: Map<string, Float32Array> = new Map();

  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, boneSystem: BoneSystem) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.boneSystem = boneSystem;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
  }

  public activate(mesh: THREE.Mesh | null): void {
    this.active = true;
    if (!mesh || !this.boneSystem.hasSkeleton(mesh)) {
      return;
    }

    this.targetMesh = mesh;
    this.showWeightColors();
    this.container.addEventListener('mousedown', this.onMouseDownBound);
    this.container.addEventListener('mousemove', this.onMouseMoveBound);
    this.container.addEventListener('mouseup', this.onMouseUpBound);
  }

  public deactivate(): void {
    this.active = false;
    this.restoreMaterials();
    this.targetMesh = null;
    this.isPainting = false;
    this.container.removeEventListener('mousedown', this.onMouseDownBound);
    this.container.removeEventListener('mousemove', this.onMouseMoveBound);
    this.container.removeEventListener('mouseup', this.onMouseUpBound);
  }

  public isActive(): boolean {
    return this.active;
  }

  public setActiveBone(bone: THREE.Bone | null): void {
    this.activeBone = bone;
    if (this.active && this.targetMesh) {
      this.updateWeightVisualization();
    }
  }

  public setBrushSize(size: number): void {
    this.brushSize = Math.max(0.01, Math.min(5.0, size));
  }

  public getBrushSize(): number {
    return this.brushSize;
  }

  public setBrushStrength(strength: number): void {
    this.brushStrength = Math.max(0.01, Math.min(1.0, strength));
  }

  public getBrushStrength(): number {
    return this.brushStrength;
  }

  private showWeightColors(): void {
    if (!this.targetMesh) return;

    // Save original material
    this.originalMaterials.set(this.targetMesh, this.targetMesh.material);

    // Create vertex color material
    const geometry = this.targetMesh.geometry;
    const posAttr = geometry.attributes.position;
    const vertexCount = posAttr.count;

    // Initialize weight data for the active bone
    const boneId = this.activeBone?.uuid || 'default';
    if (!this.weightData.has(boneId)) {
      this.weightData.set(boneId, new Float32Array(vertexCount).fill(0));
    }

    // Add color attribute
    const colors = new Float32Array(vertexCount * 3);
    this.computeWeightColors(colors, boneId);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Apply vertex color material
    const weightMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    this.targetMesh.material = weightMat;
  }

  private computeWeightColors(colors: Float32Array, boneId: string): void {
    const weights = this.weightData.get(boneId);
    if (!weights) return;

    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      // Blue (0) to Red (1) gradient
      colors[i * 3] = w;        // R
      colors[i * 3 + 1] = 0;    // G
      colors[i * 3 + 2] = 1 - w; // B
    }
  }

  private updateWeightVisualization(): void {
    if (!this.targetMesh) return;

    const geometry = this.targetMesh.geometry;
    const colorAttr = geometry.attributes.color;
    if (!colorAttr) return;

    const boneId = this.activeBone?.uuid || 'default';
    if (!this.weightData.has(boneId)) {
      const vertexCount = geometry.attributes.position.count;
      this.weightData.set(boneId, new Float32Array(vertexCount).fill(0));
    }

    const colors = (colorAttr as THREE.BufferAttribute).array as Float32Array;
    this.computeWeightColors(colors, boneId);
    colorAttr.needsUpdate = true;
  }

  private restoreMaterials(): void {
    for (const [mesh, material] of this.originalMaterials.entries()) {
      mesh.material = material;
      // Remove vertex color attribute
      if (mesh.geometry.attributes.color) {
        mesh.geometry.deleteAttribute('color');
      }
    }
    this.originalMaterials.clear();
  }

  private getMouseCoords(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (!this.targetMesh || !this.activeBone) return;

    this.isPainting = true;
    this.paint(event);
    event.stopPropagation();
    event.preventDefault();
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isPainting) return;
    this.paint(event);
    event.stopPropagation();
    event.preventDefault();
  }

  private onMouseUp(_event: MouseEvent): void {
    this.isPainting = false;
  }

  private paint(event: MouseEvent): void {
    if (!this.targetMesh || !this.activeBone) return;

    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.targetMesh);
    if (intersects.length === 0) return;

    const point = intersects[0].point;
    const geometry = this.targetMesh.geometry;
    const posAttr = geometry.attributes.position;
    const boneId = this.activeBone.uuid;

    if (!this.weightData.has(boneId)) {
      this.weightData.set(boneId, new Float32Array(posAttr.count).fill(0));
    }
    const weights = this.weightData.get(boneId)!;

    // Adjust weights for nearby vertices
    const localPoint = this.targetMesh.worldToLocal(point.clone());
    const subtract = event.shiftKey;

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const dist = localPoint.distanceTo(new THREE.Vector3(vx, vy, vz));

      if (dist < this.brushSize) {
        const falloff = 1 - (dist / this.brushSize);
        const delta = this.brushStrength * falloff;
        if (subtract) {
          weights[i] = Math.max(0, weights[i] - delta);
        } else {
          weights[i] = Math.min(1, weights[i] + delta);
        }
      }
    }

    this.updateWeightVisualization();
  }
}
