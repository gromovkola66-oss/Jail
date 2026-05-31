import * as THREE from 'three';

export type SelectionChangeCallback = (object: THREE.Mesh | null) => void;

export class SelectionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private container: HTMLElement;
  private selectedObject: THREE.Mesh | null = null;
  private originalEmissive: THREE.Color | null = null;
  private listeners: SelectionChangeCallback[] = [];

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene, container: HTMLElement) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.scene = scene;
    this.container = container;

    container.addEventListener('click', this.onMouseClick.bind(this));
  }

  public onSelectionChange(callback: SelectionChangeCallback): void {
    this.listeners.push(callback);
  }

  public getSelected(): THREE.Mesh | null {
    return this.selectedObject;
  }

  public select(object: THREE.Mesh | null): void {
    // Deselect previous
    if (this.selectedObject && this.originalEmissive !== null) {
      const material = this.selectedObject.material as THREE.MeshStandardMaterial;
      material.emissive.copy(this.originalEmissive);
    }

    this.selectedObject = object;

    // Highlight new selection
    if (object) {
      const material = object.material as THREE.MeshStandardMaterial;
      this.originalEmissive = material.emissive.clone();
      material.emissive.set(0x333333);
    } else {
      this.originalEmissive = null;
    }

    // Notify listeners
    this.listeners.forEach(cb => cb(object));
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Filter only meshes that are user-created (not grid/helpers)
    const meshes = this.scene.children.filter(
      (obj): obj is THREE.Mesh => obj instanceof THREE.Mesh
    );

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      this.select(hit);
    } else {
      this.select(null);
    }
  }

  public dispose(): void {
    this.container.removeEventListener('click', this.onMouseClick.bind(this));
  }
}
