import * as THREE from 'three';
import { History, Action } from '../History';

export class EdgeMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private history: History;
  private container: HTMLElement;
  private edgeLines: THREE.LineSegments | null = null;
  private targetMesh: THREE.Mesh | null = null;
  private selectedEdge: [number, number] | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private active: boolean = false;

  private onClickBound: (e: MouseEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, history: History) {
    this.scene = scene;
    this.camera = camera;
    this.history = history;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.1 };
    this.mouse = new THREE.Vector2();

    this.onClickBound = this.onClick.bind(this);
  }

  public activate(mesh: THREE.Mesh | null): void {
    this.active = true;
    this.clearVisualization();
    if (mesh) {
      this.targetMesh = mesh;
      this.createEdgeVisualization();
    }
    this.container.addEventListener('click', this.onClickBound);
  }

  public deactivate(): void {
    this.active = false;
    this.clearVisualization();
    this.targetMesh = null;
    this.selectedEdge = null;
    this.container.removeEventListener('click', this.onClickBound);
  }

  public isActive(): boolean {
    return this.active;
  }

  public updateMesh(mesh: THREE.Mesh | null): void {
    this.clearVisualization();
    this.targetMesh = mesh;
    if (mesh && this.active) {
      this.createEdgeVisualization();
    }
  }

  private createEdgeVisualization(): void {
    if (!this.targetMesh) return;
    const edges = new THREE.EdgesGeometry(this.targetMesh.geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 1 });
    this.edgeLines = new THREE.LineSegments(edges, material);
    this.edgeLines.position.copy(this.targetMesh.position);
    this.edgeLines.rotation.copy(this.targetMesh.rotation);
    this.edgeLines.scale.copy(this.targetMesh.scale);
    this.scene.add(this.edgeLines);
  }

  private clearVisualization(): void {
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      this.edgeLines.geometry.dispose();
      (this.edgeLines.material as THREE.Material).dispose();
      this.edgeLines = null;
    }
  }

  private onClick(event: MouseEvent): void {
    if (!this.edgeLines) return;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.edgeLines);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const idx = Math.floor(intersects[0].index / 2) * 2;
      this.selectedEdge = [idx, idx + 1];
      // Highlight selected edge by changing material color
      (this.edgeLines.material as THREE.LineBasicMaterial).color.set(0xffff00);
    } else {
      this.selectedEdge = null;
      if (this.edgeLines) {
        (this.edgeLines.material as THREE.LineBasicMaterial).color.set(0x00ffff);
      }
    }
  }

  public getSelectedEdge(): [number, number] | null {
    return this.selectedEdge;
  }
}
