import * as THREE from 'three';
import { SelectionManager } from './SelectionManager';

export class SelectionOutline {
  private scene: THREE.Scene;
  private selectionManager: SelectionManager;
  private outlines: Map<THREE.Mesh, THREE.LineSegments> = new Map();

  constructor(scene: THREE.Scene, selectionManager: SelectionManager) {
    this.scene = scene;
    this.selectionManager = selectionManager;

    this.selectionManager.onSelectionChange(() => this.updateOutlines());
  }

  private updateOutlines(): void {
    // Remove all existing outlines
    for (const [, line] of this.outlines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.outlines.clear();

    // Create outlines for all selected objects
    const selected = this.selectionManager.getSelectedAll();
    for (const mesh of selected) {
      this.addOutline(mesh);
    }
  }

  private addOutline(mesh: THREE.Mesh): void {
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 30);
    const material = new THREE.LineBasicMaterial({ color: 0xff8800 });
    const lineSegments = new THREE.LineSegments(edgesGeo, material);

    lineSegments.position.copy(mesh.position);
    lineSegments.rotation.copy(mesh.rotation);
    lineSegments.scale.copy(mesh.scale);
    lineSegments.name = '__selection_outline__';
    lineSegments.userData.isEditorInternal = true;

    this.scene.add(lineSegments);
    this.outlines.set(mesh, lineSegments);
  }

  public update(): void {
    // Sync outline transforms with source meshes
    for (const [mesh, line] of this.outlines) {
      if (!mesh.parent) {
        // Mesh was removed from scene
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        this.outlines.delete(mesh);
        continue;
      }
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      line.scale.copy(mesh.scale);
    }
  }

  public dispose(): void {
    for (const [, line] of this.outlines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.outlines.clear();
  }
}
