import * as THREE from 'three';
import { GLTFExporter as ThreeGLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export class GLTFExporter {
  private exporter: ThreeGLTFExporter;

  constructor() {
    this.exporter = new ThreeGLTFExporter();
  }

  public exportScene(scene: THREE.Scene): void {
    // Filter exportable objects (exclude grid, lights, helpers)
    const exportScene = new THREE.Scene();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && !(object instanceof THREE.GridHelper)) {
        exportScene.add(object.clone());
      }
    });

    this.exporter.parse(
      exportScene,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        this.download(blob, 'model.glb');
      },
      (error) => {
        console.error('GLTFExporter error:', error);
      },
      { binary: true }
    );
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
