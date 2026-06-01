import * as THREE from 'three';
import { History, Action } from '../History';

export class EdgeMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private history: History;
  private container: HTMLElement;
  private edgeLines: THREE.LineSegments | null = null;
  private selectedEdgeOverlay: THREE.LineSegments | null = null;
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
    this.edgeLines.name = '__edge_lines__';
    this.edgeLines.userData.isEditorInternal = true;
    // Add as child of targetMesh so it follows transforms
    this.targetMesh.add(this.edgeLines);
  }

  private clearVisualization(): void {
    if (this.edgeLines) {
      if (this.edgeLines.parent) {
        this.edgeLines.parent.remove(this.edgeLines);
      } else {
        this.scene.remove(this.edgeLines);
      }
      this.edgeLines.geometry.dispose();
      (this.edgeLines.material as THREE.Material).dispose();
      this.edgeLines = null;
    }
    this.clearSelectedOverlay();
  }

  private clearSelectedOverlay(): void {
    if (this.selectedEdgeOverlay) {
      if (this.selectedEdgeOverlay.parent) {
        this.selectedEdgeOverlay.parent.remove(this.selectedEdgeOverlay);
      } else {
        this.scene.remove(this.selectedEdgeOverlay);
      }
      this.selectedEdgeOverlay.geometry.dispose();
      (this.selectedEdgeOverlay.material as THREE.Material).dispose();
      this.selectedEdgeOverlay = null;
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

      // Create a separate yellow overlay for the selected edge
      this.clearSelectedOverlay();
      const posAttr = this.edgeLines.geometry.attributes.position;
      const positions = new Float32Array(6);
      positions[0] = posAttr.getX(idx);
      positions[1] = posAttr.getY(idx);
      positions[2] = posAttr.getZ(idx);
      positions[3] = posAttr.getX(idx + 1);
      positions[4] = posAttr.getY(idx + 1);
      positions[5] = posAttr.getZ(idx + 1);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
      this.selectedEdgeOverlay = new THREE.LineSegments(geo, mat);
      this.selectedEdgeOverlay.name = '__edge_selection__';
      this.selectedEdgeOverlay.userData.isEditorInternal = true;

      if (this.targetMesh) {
        this.targetMesh.add(this.selectedEdgeOverlay);
      }
    } else {
      this.selectedEdge = null;
      this.clearSelectedOverlay();
    }
  }

  public getSelectedEdge(): [number, number] | null {
    return this.selectedEdge;
  }
}
