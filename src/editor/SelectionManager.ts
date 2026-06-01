import * as THREE from 'three';

export type SelectionChangeCallback = (object: THREE.Mesh | null) => void;

export class SelectionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private container: HTMLElement;
  private selectedObjects: THREE.Mesh[] = [];
  private originalEmissives: Map<THREE.Mesh, THREE.Color> = new Map();
  private listeners: SelectionChangeCallback[] = [];
  private onMouseClickBound: (e: MouseEvent) => void;
  private cycleIntersections: THREE.Mesh[] = [];
  private cycleIndex: number = 0;
  private lastCycleMouseX: number = 0;
  private lastCycleMouseY: number = 0;
  private modeGetter: (() => string) | null = null;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene, container: HTMLElement) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.scene = scene;
    this.container = container;

    this.onMouseClickBound = this.onMouseClick.bind(this);
    container.addEventListener('click', this.onMouseClickBound);
  }

  public setModeGetter(getter: () => string): void {
    this.modeGetter = getter;
  }

  public onSelectionChange(callback: SelectionChangeCallback): void {
    this.listeners.push(callback);
  }

  /** Backward-compatible: returns the first selected object or null */
  public getSelected(): THREE.Mesh | null {
    return this.selectedObjects.length > 0 ? this.selectedObjects[0] : null;
  }

  /** Returns all selected objects */
  public getSelectedAll(): THREE.Mesh[] {
    return [...this.selectedObjects];
  }

  public addToSelection(mesh: THREE.Mesh): void {
    if (this.selectedObjects.includes(mesh)) return;
    this.selectedObjects.push(mesh);
    this.applyHighlight(mesh);
    this.notifyListeners();
  }

  public removeFromSelection(mesh: THREE.Mesh): void {
    const idx = this.selectedObjects.indexOf(mesh);
    if (idx < 0) return;
    this.removeHighlight(mesh);
    this.selectedObjects.splice(idx, 1);
    this.notifyListeners();
  }

  public toggleSelection(mesh: THREE.Mesh): void {
    if (this.selectedObjects.includes(mesh)) {
      this.removeFromSelection(mesh);
    } else {
      this.addToSelection(mesh);
    }
  }

  public isSelected(mesh: THREE.Mesh): boolean {
    return this.selectedObjects.includes(mesh);
  }

  public clearSelection(): void {
    for (const mesh of this.selectedObjects) {
      this.removeHighlight(mesh);
    }
    this.selectedObjects = [];
    this.notifyListeners();
  }

  public select(object: THREE.Mesh | null): void {
    // Clear all current highlights
    for (const mesh of this.selectedObjects) {
      this.removeHighlight(mesh);
    }
    this.selectedObjects = [];

    if (object) {
      this.selectedObjects.push(object);
      this.applyHighlight(object);
    }

    this.notifyListeners();
  }

  private applyHighlight(mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    this.originalEmissives.set(mesh, material.emissive.clone());
    material.emissive.set(0x333333);
  }

  private removeHighlight(mesh: THREE.Mesh): void {
    const original = this.originalEmissives.get(mesh);
    if (original) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.copy(original);
      this.originalEmissives.delete(mesh);
    }
  }

  private notifyListeners(): void {
    const first = this.getSelected();
    this.listeners.forEach(cb => cb(first));
  }

  private onMouseClick(event: MouseEvent): void {
    if (this.modeGetter && this.modeGetter() !== 'object') return;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Filter only meshes that are user-created (not grid/helpers/internal)
    const meshes = this.scene.children.filter(
      (obj): obj is THREE.Mesh => obj instanceof THREE.Mesh && !obj.userData.isEditorInternal && !obj.name.startsWith('__')
    );

    const intersects = this.raycaster.intersectObjects(meshes, false);

    // Alt+Click: cycle through overlapping objects
    if (event.altKey && intersects.length > 1) {
      const mouseMoved = Math.abs(event.clientX - this.lastCycleMouseX) > 5 ||
                         Math.abs(event.clientY - this.lastCycleMouseY) > 5;

      if (mouseMoved || this.cycleIntersections.length === 0) {
        this.cycleIntersections = intersects.map(i => i.object as THREE.Mesh);
        this.cycleIndex = 0;
        this.lastCycleMouseX = event.clientX;
        this.lastCycleMouseY = event.clientY;
      } else {
        this.cycleIndex = (this.cycleIndex + 1) % this.cycleIntersections.length;
      }

      this.select(this.cycleIntersections[this.cycleIndex]);
      return;
    }

    // Reset cycle state on non-alt click
    this.cycleIntersections = [];
    this.cycleIndex = 0;

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      if (event.shiftKey) {
        this.toggleSelection(hit);
      } else {
        this.select(hit);
      }
    } else {
      if (!event.shiftKey) {
        this.select(null);
      }
    }
  }

  public dispose(): void {
    this.container.removeEventListener('click', this.onMouseClickBound);
  }
}
