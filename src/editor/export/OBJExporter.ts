import * as THREE from 'three';
import { OBJExporter as ThreeOBJExporter } from 'three/addons/exporters/OBJExporter.js';

export class OBJExporter {
  private exporter: ThreeOBJExporter;

  constructor() {
    this.exporter = new ThreeOBJExporter();
  }

  public exportScene(scene: THREE.Scene): void {
    // Filter exportable objects (exclude grid, lights, helpers)
    const exportScene = new THREE.Scene();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && !(object instanceof THREE.GridHelper)) {
        exportScene.add(object.clone());
      }
    });

    const result = this.exporter.parse(exportScene);
    const blob = new Blob([result], { type: 'text/plain' });
    this.download(blob, 'model.obj');
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
