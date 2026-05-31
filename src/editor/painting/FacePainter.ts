import * as THREE from 'three';

export class FacePainter {
  private currentColor: THREE.Color;
  private enabled: boolean = false;

  constructor() {
    this.currentColor = new THREE.Color('#ff0000');
  }

  public setColor(color: string): void {
    this.currentColor.set(color);
  }

  public getColor(): THREE.Color {
    return this.currentColor;
  }

  public getColorHex(): string {
    return '#' + this.currentColor.getHexString();
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public ensureVertexColors(mesh: THREE.Mesh): void {
    const geo = mesh.geometry;
    if (!geo.attributes.color) {
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const baseColor = mat.color;
      for (let i = 0; i < count; i++) {
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      mat.vertexColors = true;
      mat.needsUpdate = true;
    }
  }
}
