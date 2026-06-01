import * as THREE from 'three';
import { SelectionManager } from './SelectionManager';

interface OutlineEntry {
  line: THREE.LineSegments;
  geometry: THREE.BufferGeometry;
}

export class SelectionOutline {
  private scene: THREE.Scene;
  private selectionManager: SelectionManager;
  private outlines: Map<THREE.Mesh, OutlineEntry> = new Map();

  constructor(scene: THREE.Scene, selectionManager: SelectionManager) {
    this.scene = scene;
    this.selectionManager = selectionManager;

    this.selectionManager.onSelectionChange(() => this.updateOutlines());
  }

  private updateOutlines(): void {
    // Remove all existing outlines
    for (const [, entry] of this.outlines) {
      this.scene.remove(entry.line);
      entry.line.geometry.dispose();
      (entry.line.material as THREE.Material).dispose();
    }
    this.outlines.clear();

    // Create outlines for all selected objects
    const selected = this.selectionManager.getSelectedAll();
    for (const mesh of selected) {
      this.addOutline(mesh);
    }
  }

  private addOutline(mesh: THREE.Mesh): void {
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 1);
    const material = new THREE.LineBasicMaterial({ color: 0xff8800 });
    const lineSegments = new THREE.LineSegments(edgesGeo, material);

    lineSegments.matrixAutoUpdate = false;
    lineSegments.matrix.copy(mesh.matrixWorld);
    lineSegments.name = '__selection_outline__';
    lineSegments.userData.isEditorInternal = true;

    this.scene.add(lineSegments);
    this.outlines.set(mesh, { line: lineSegments, geometry: mesh.geometry });
  }

  public update(): void {
    // Sync outline transforms with source meshes
    for (const [mesh, entry] of this.outlines) {
      if (!mesh.parent) {
        // Mesh was removed from scene
        this.scene.remove(entry.line);
        entry.line.geometry.dispose();
        (entry.line.material as THREE.Material).dispose();
        this.outlines.delete(mesh);
        continue;
      }

      // If geometry has changed, rebuild the outline
      if (mesh.geometry !== entry.geometry) {
        this.scene.remove(entry.line);
        entry.line.geometry.dispose();
        (entry.line.material as THREE.Material).dispose();
        this.outlines.delete(mesh);
        this.addOutline(mesh);
        continue;
      }

      entry.line.matrix.copy(mesh.matrixWorld);
    }
  }

  public dispose(): void {
    for (const [, entry] of this.outlines) {
      this.scene.remove(entry.line);
      entry.line.geometry.dispose();
      (entry.line.material as THREE.Material).dispose();
    }
    this.outlines.clear();
  }
}
