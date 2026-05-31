import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export class ModelImporter {
  private gltfLoader: GLTFLoader;
  private objLoader: OBJLoader;

  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
  }

  public async importFromFile(file: File): Promise<THREE.Mesh[]> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    if (extension === 'glb' || extension === 'gltf') {
      const arrayBuffer = await this.readAsArrayBuffer(file);
      return this.parseGLTF(arrayBuffer, baseName);
    } else if (extension === 'obj') {
      const text = await this.readAsText(file);
      return this.parseOBJ(text, baseName);
    }

    return [];
  }

  private parseGLTF(arrayBuffer: ArrayBuffer, baseName: string): Promise<THREE.Mesh[]> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(arrayBuffer, '', (result) => {
        const meshes = this.extractMeshes(result.scene, baseName);
        resolve(meshes);
      }, (error) => {
        reject(error);
      });
    });
  }

  private parseOBJ(text: string, baseName: string): THREE.Mesh[] {
    const group = this.objLoader.parse(text);
    return this.extractMeshes(group, baseName);
  }

  private extractMeshes(root: THREE.Object3D, baseName: string): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];

    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const hasVertexColors = mesh.geometry.attributes.color !== undefined;

      mesh.material = new THREE.MeshStandardMaterial({
        flatShading: true,
        vertexColors: hasVertexColors,
      });

      mesh.name = meshes.length > 1 ? `${baseName}_${i}` : baseName;
    }

    return meshes;
  }

  private readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}
