import * as THREE from 'three';

export class PrimitiveFactory {
  private defaultMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      flatShading: true,
    });
  }

  createCube(detail: number = 4): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1, detail, detail, detail);
    const mesh = new THREE.Mesh(geometry, this.defaultMaterial());
    mesh.name = 'Куб';
    return mesh;
  }

  createSphere(detail: number = 4): THREE.Mesh {
    const widthSegments = detail * 2;
    const heightSegments = detail;
    const geometry = new THREE.SphereGeometry(0.5, widthSegments, heightSegments);
    const mesh = new THREE.Mesh(geometry, this.defaultMaterial());
    mesh.name = 'Сфера';
    return mesh;
  }

  createCylinder(detail: number = 4): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, detail, 1);
    const mesh = new THREE.Mesh(geometry, this.defaultMaterial());
    mesh.name = 'Цилиндр';
    return mesh;
  }

  createPlane(detail: number = 4): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1, 1, detail, detail);
    const mesh = new THREE.Mesh(geometry, this.defaultMaterial());
    mesh.name = 'Плоскость';
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  createCone(detail: number = 4): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(0.5, 1, detail, 1);
    const mesh = new THREE.Mesh(geometry, this.defaultMaterial());
    mesh.name = 'Конус';
    return mesh;
  }
}
