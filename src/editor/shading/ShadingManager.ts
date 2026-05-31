import * as THREE from 'three';

export class ShadingManager {
  private flatShading: boolean = true;
  private scene: THREE.Scene;
  private listeners: ((flat: boolean) => void)[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public isFlatShading(): boolean {
    return this.flatShading;
  }

  public toggleShading(): void {
    this.flatShading = !this.flatShading;
    this.applyToAll();
    this.listeners.forEach(cb => cb(this.flatShading));
  }

  public setFlatShading(flat: boolean): void {
    this.flatShading = flat;
    this.applyToAll();
    this.listeners.forEach(cb => cb(this.flatShading));
  }

  public applyToMesh(mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.flatShading = this.flatShading;
    material.needsUpdate = true;
    if (!this.flatShading) {
      mesh.geometry.computeVertexNormals();
    }
  }

  public applyToAll(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        this.applyToMesh(object);
      }
    });
  }

  public onChange(callback: (flat: boolean) => void): void {
    this.listeners.push(callback);
  }
}
