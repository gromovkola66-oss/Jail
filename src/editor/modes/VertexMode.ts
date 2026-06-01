import * as THREE from 'three';
import { History, Action } from '../History';
import { GridSnap } from '../GridSnap';
import { MirrorTool } from '../tools/MirrorTool';

export class VertexMode {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private history: History;
  private gridSnap: GridSnap;
  private container: HTMLElement;
  private markers: THREE.Mesh[] = [];
  private targetMesh: THREE.Mesh | null = null;
  private selectedVertexIndex: number = -1;
  private selectedVertexIndices: number[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private startPos: THREE.Vector3;
  private active: boolean = false;
  private mirrorTool: MirrorTool | null = null;
  private mirrorStartLocal: THREE.Vector3 | null = null;

  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement, history: History, gridSnap: GridSnap) {
    this.scene = scene;
    this.camera = camera;
    this.history = history;
    this.gridSnap = gridSnap;
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
    this.selectedVertexIndices = [];
    this.container.removeEventListener('mousedown', this.onMouseDownBound);
    this.container.removeEventListener('mousemove', this.onMouseMoveBound);
    this.container.removeEventListener('mouseup', this.onMouseUpBound);
  }

  public isActive(): boolean {
    return this.active;
  }

  public getSelectedVertexIndices(): number[] {
    return this.selectedVertexIndices;
  }

  public setMirrorTool(tool: MirrorTool): void {
    this.mirrorTool = tool;
  }

  public refreshMarkers(): void {
    this.clearMarkers();
    if (this.targetMesh && this.active) {
      this.createMarkers();
    }
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
      marker.userData.isEditorInternal = true;
      marker.name = '__vertex_marker__';
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
      const vertexIndex = marker.userData.vertexIndex as number;

      if (event.shiftKey) {
        // Toggle vertex in selection
        const idx = this.selectedVertexIndices.indexOf(vertexIndex);
        if (idx >= 0) {
          this.selectedVertexIndices.splice(idx, 1);
          (marker.material as THREE.MeshBasicMaterial).color.set(0x00ff00);
        } else {
          this.selectedVertexIndices.push(vertexIndex);
          (marker.material as THREE.MeshBasicMaterial).color.set(0xffff00);
        }
        this.selectedVertexIndex = this.selectedVertexIndices.length > 0
          ? this.selectedVertexIndices[this.selectedVertexIndices.length - 1]
          : -1;
      } else {
        this.selectedVertexIndex = vertexIndex;
        this.selectedVertexIndices = [vertexIndex];

        // Highlight all markers
        this.markers.forEach(m => {
          (m.material as THREE.MeshBasicMaterial).color.set(0x00ff00);
        });
        (marker.material as THREE.MeshBasicMaterial).color.set(0xffff00);
      }

      // Set up drag for the clicked vertex
      this.isDragging = true;
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      this.dragPlane.setFromNormalAndCoplanarPoint(camDir, marker.position);
      this.startPos.copy(marker.position);

      // Capture mirrored start position
      if (this.mirrorTool && this.mirrorTool.isEnabled() && this.targetMesh) {
        const startLocal = this.startPos.clone();
        this.targetMesh.worldToLocal(startLocal);
        this.mirrorStartLocal = this.mirrorTool.mirrorPosition(startLocal);
      } else {
        this.mirrorStartLocal = null;
      }

      event.stopPropagation();
      event.preventDefault();
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.selectedVertexIndices.length === 0 || !this.targetMesh) return;
    this.getMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    if (!intersection) return;

    // Compute movement delta in local space from the primary vertex's start
    const localPos = intersection.clone();
    this.targetMesh.worldToLocal(localPos);

    // Apply grid snap
    localPos.x = this.gridSnap.snapToGrid(localPos.x);
    localPos.y = this.gridSnap.snapToGrid(localPos.y);
    localPos.z = this.gridSnap.snapToGrid(localPos.z);

    const positions = this.targetMesh.geometry.attributes.position;

    // Get current position of the primary (dragged) vertex to compute delta
    const primaryIdx = this.selectedVertexIndex;
    const primaryOrigX = positions.getX(primaryIdx);
    const primaryOrigY = positions.getY(primaryIdx);
    const primaryOrigZ = positions.getZ(primaryIdx);

    // Delta is the difference between new position and current position of primary vertex
    const dx = localPos.x - primaryOrigX;
    const dy = localPos.y - primaryOrigY;
    const dz = localPos.z - primaryOrigZ;

    // Move all selected vertices by the delta
    for (const vertIdx of this.selectedVertexIndices) {
      const origX = positions.getX(vertIdx);
      const origY = positions.getY(vertIdx);
      const origZ = positions.getZ(vertIdx);

      const newX = origX + dx;
      const newY = origY + dy;
      const newZ = origZ + dz;

      // Update all vertices that share this position
      for (let i = 0; i < positions.count; i++) {
        if (
          Math.abs(positions.getX(i) - origX) < 0.0001 &&
          Math.abs(positions.getY(i) - origY) < 0.0001 &&
          Math.abs(positions.getZ(i) - origZ) < 0.0001
        ) {
          positions.setXYZ(i, newX, newY, newZ);
        }
      }

      // Update corresponding marker
      const markerIdx = this.markers.findIndex(m => m.userData.vertexIndex === vertIdx);
      if (markerIdx >= 0) {
        const worldPos = new THREE.Vector3(newX, newY, newZ);
        this.targetMesh.localToWorld(worldPos);
        this.markers[markerIdx].position.copy(worldPos);
      }
    }

    // Mirror: move the mirrored vertex symmetrically (for primary vertex only)
    if (this.mirrorTool && this.mirrorTool.isEnabled() && this.mirrorStartLocal) {
      const mirroredTarget = this.mirrorTool.mirrorPosition(localPos);
      const ms = this.mirrorStartLocal;
      for (let i = 0; i < positions.count; i++) {
        if (
          Math.abs(positions.getX(i) - ms.x) < 0.0001 &&
          Math.abs(positions.getY(i) - ms.y) < 0.0001 &&
          Math.abs(positions.getZ(i) - ms.z) < 0.0001
        ) {
          positions.setXYZ(i, mirroredTarget.x, mirroredTarget.y, mirroredTarget.z);
        }
      }
    }

    positions.needsUpdate = true;
    this.targetMesh.geometry.computeVertexNormals();
    this.targetMesh.geometry.computeBoundingSphere();

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

    // Record history if moved
    if (!this.startPos.equals(endPos)) {
      const startLocal = this.startPos.clone();
      mesh.worldToLocal(startLocal);
      const endLocal = endPos.clone();
      mesh.worldToLocal(endLocal);

      // Mirror data for undo/redo
      const hasMirror = !!(this.mirrorTool && this.mirrorTool.isEnabled() && this.mirrorStartLocal);
      const mirrorStartL = this.mirrorStartLocal ? this.mirrorStartLocal.clone() : null;
      const mirrorEndL = hasMirror && this.mirrorTool ? this.mirrorTool.mirrorPosition(endLocal) : null;

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
          if (hasMirror && mirrorStartL && mirrorEndL) {
            for (let i = 0; i < positions.count; i++) {
              if (
                Math.abs(positions.getX(i) - mirrorStartL.x) < 0.0001 &&
                Math.abs(positions.getY(i) - mirrorStartL.y) < 0.0001 &&
                Math.abs(positions.getZ(i) - mirrorStartL.z) < 0.0001
              ) {
                positions.setXYZ(i, mirrorEndL.x, mirrorEndL.y, mirrorEndL.z);
              }
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
          if (hasMirror && mirrorStartL && mirrorEndL) {
            for (let i = 0; i < positions.count; i++) {
              if (
                Math.abs(positions.getX(i) - mirrorEndL.x) < 0.0001 &&
                Math.abs(positions.getY(i) - mirrorEndL.y) < 0.0001 &&
                Math.abs(positions.getZ(i) - mirrorEndL.z) < 0.0001
              ) {
                positions.setXYZ(i, mirrorStartL.x, mirrorStartL.y, mirrorStartL.z);
              }
            }
          }
          positions.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
        },
      };

      this.history.record(action);
    }

    this.mirrorStartLocal = null;
    event.stopPropagation();
  }
}
