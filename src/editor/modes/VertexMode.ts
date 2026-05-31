import * as THREE from 'three';
import { History, Action } from '../History';

export class VertexMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private history: History;
  private container: HTMLElement;
  private markers: THREE.Mesh[] = [];
  private targetMesh: THREE.Mesh | null = null;
  private selectedVertexIndex: number = -1;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private startPos: THREE.Vector3;
  private active: boolean = false;

  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, history: History) {
    this.scene = scene;
    this.camera = camera;
    this.history = history;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.2 };
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.startPos = new THREE.Vector3();

    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
  }

  public activate(mesh: THREE.Mesh | null): void {
    this.active = true;
    this.clearMarkers();
    if (mesh) {
      this.targetMesh = mesh;
      this.createMarkers();
    }
    this.container.addEventListener('mousedown', this.onMouseDownBound);
    this.container.addEventListener('mousemove', this.onMouseMoveBound);
    this.container.addEventListener('mouseup', this.onMouseUpBound);
  }

  public deactivate(): void {
    this.active = false;
    this.clearMarkers();
    this.targetMesh = null;
    this.selectedVertexIndex = -1;
    this.container.removeEventListener('mousedown', this.onMouseDownBound);
    this.container.removeEventListener('mousemove', this.onMouseMoveBound);
    this.container.removeEventListener('mouseup', this.onMouseUpBound);
  }

  public isActive(): boolean {
    return this.active;
  }

  public updateMesh(mesh: THREE.Mesh | null): void {
    this.clearMarkers();
    this.targetMesh = mesh;
    if (mesh && this.active) {
      this.createMarkers();
    }
  }

  private createMarkers(): void {
    if (!this.targetMesh) return;
    const geometry = this.targetMesh.geometry;
    const positions = geometry.attributes.position;
    const markerGeo = new THREE.SphereGeometry(0.05, 6, 6);

    const visited = new Set<string>();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const key = `${x.toFixed(4)}_${y.toFixed(4)}_${z.toFixed(4)}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      const worldPos = new THREE.Vector3(x, y, z);
      this.targetMesh.localToWorld(worldPos);
      marker.position.copy(worldPos);
      marker.userData.vertexIndex = i;
      this.scene.add(marker);
      this.markers.push(marker);
    }
  }

  private clearMarkers(): void {
    this.markers.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.markers = [];
  }

  private getMouseCoords(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.markers);
    if (intersects.length > 0) {
      const marker = intersects[0].object as THREE.Mesh;
      this.selectedVertexIndex = marker.userData.vertexIndex;

      // Highlight selected
      this.markers.forEach(m => {
        (m.material as THREE.MeshBasicMaterial).color.set(0x00ff00);
      });
      (marker.material as THREE.MeshBasicMaterial).color.set(0xffff00);

      // Set up drag
      this.isDragging = true;
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      this.dragPlane.setFromNormalAndCoplanarPoint(camDir, marker.position);
      this.startPos.copy(marker.position);

      event.stopPropagation();
      event.preventDefault();
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.selectedVertexIndex < 0 || !this.targetMesh) return;
    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    if (!intersection) return;

    // Move vertex in local space
    const localPos = intersection.clone();
    this.targetMesh.worldToLocal(localPos);

    const positions = this.targetMesh.geometry.attributes.position;
    const origX = positions.getX(this.selectedVertexIndex);
    const origY = positions.getY(this.selectedVertexIndex);
    const origZ = positions.getZ(this.selectedVertexIndex);

    // Update all vertices that share this position
    for (let i = 0; i < positions.count; i++) {
      if (
        Math.abs(positions.getX(i) - origX) < 0.0001 &&
        Math.abs(positions.getY(i) - origY) < 0.0001 &&
        Math.abs(positions.getZ(i) - origZ) < 0.0001
      ) {
        positions.setXYZ(i, localPos.x, localPos.y, localPos.z);
      }
    }
    positions.needsUpdate = true;
    this.targetMesh.geometry.computeVertexNormals();
    this.targetMesh.geometry.computeBoundingSphere();

    // Update marker
    const markerIdx = this.markers.findIndex(m => m.userData.vertexIndex === this.selectedVertexIndex);
    if (markerIdx >= 0) {
      this.markers[markerIdx].position.copy(intersection);
    }

    event.stopPropagation();
    event.preventDefault();
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.isDragging || !this.targetMesh) return;
    this.isDragging = false;

    const markerIdx = this.markers.findIndex(m => m.userData.vertexIndex === this.selectedVertexIndex);
    if (markerIdx < 0) return;
    const marker = this.markers[markerIdx];
    const endPos = marker.position.clone();
    const mesh = this.targetMesh;
    const vertIdx = this.selectedVertexIndex;
    const oldLocalPos = new THREE.Vector3();
    mesh.worldToLocal(this.startPos.clone());
    oldLocalPos.copy(this.startPos);
    mesh.worldToLocal(oldLocalPos);
    const newLocalPos = new THREE.Vector3();
    mesh.worldToLocal(endPos.clone());
    newLocalPos.copy(endPos);
    mesh.worldToLocal(newLocalPos);

    // Record history if moved
    if (!this.startPos.equals(endPos)) {
      const startLocal = this.startPos.clone();
      mesh.worldToLocal(startLocal);
      const endLocal = endPos.clone();
      mesh.worldToLocal(endLocal);

      const action: Action = {
        description: 'Переместить вершину',
        execute: () => {
          const positions = mesh.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            if (
              Math.abs(positions.getX(i) - startLocal.x) < 0.0001 &&
              Math.abs(positions.getY(i) - startLocal.y) < 0.0001 &&
              Math.abs(positions.getZ(i) - startLocal.z) < 0.0001
            ) {
              positions.setXYZ(i, endLocal.x, endLocal.y, endLocal.z);
            }
          }
          positions.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
        },
        undo: () => {
          const positions = mesh.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            if (
              Math.abs(positions.getX(i) - endLocal.x) < 0.0001 &&
              Math.abs(positions.getY(i) - endLocal.y) < 0.0001 &&
              Math.abs(positions.getZ(i) - endLocal.z) < 0.0001
            ) {
              positions.setXYZ(i, startLocal.x, startLocal.y, startLocal.z);
            }
          }
          positions.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
        },
      };

      this.history['undoStack'].push(action);
      this.history['redoStack'] = [];
    }

    event.stopPropagation();
  }
}
