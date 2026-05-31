import * as THREE from 'three';
import { Editor } from './Editor';

interface SerializedMesh {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  geometry: {
    vertices: number[];
    indices: number[] | null;
    colors: number[] | null;
  };
  material: {
    color: string;
    flatShading: boolean;
  };
}

interface ProjectData {
  version: 1;
  meshes: SerializedMesh[];
}

export class ProjectSerializer {
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  public saveProject(): void {
    const scene = this.editor.viewport.scene;
    const meshes: SerializedMesh[] = [];

    scene.children.forEach((obj) => {
      if (obj instanceof THREE.Mesh && !obj.name.startsWith('__') && !obj.userData.isEditorInternal) {
        const geo = obj.geometry;
        const positions = Array.from(geo.attributes.position.array);
        const indices = geo.index ? Array.from(geo.index.array) : null;
        const colors = geo.attributes.color ? Array.from(geo.attributes.color.array) : null;

        const mat = obj.material as THREE.MeshStandardMaterial;

        meshes.push({
          name: obj.name,
          position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
          scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
          geometry: {
            vertices: positions,
            indices: indices,
            colors: colors,
          },
          material: {
            color: '#' + mat.color.getHexString(),
            flatShading: mat.flatShading || false,
          },
        });
      }
    });

    const data: ProjectData = { version: 1, meshes };
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  public loadProject(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const data: ProjectData = JSON.parse(text);
        this.rebuildScene(data);
      } catch (err) {
        console.error('Failed to parse project file:', err);
      }
    };
    reader.readAsText(file);
  }

  private rebuildScene(data: ProjectData): void {
    const scene = this.editor.viewport.scene;

    // Remove existing user meshes
    const toRemove: THREE.Object3D[] = [];
    scene.children.forEach((obj) => {
      if (obj instanceof THREE.Mesh && !obj.name.startsWith('__') && !obj.userData.isEditorInternal) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => scene.remove(obj));

    // Rebuild meshes
    data.meshes.forEach((sm) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(sm.geometry.vertices, 3));

      if (sm.geometry.indices) {
        geo.setIndex(sm.geometry.indices);
      }
      if (sm.geometry.colors) {
        geo.setAttribute('color', new THREE.Float32BufferAttribute(sm.geometry.colors, 3));
      }

      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: sm.material.color,
        flatShading: sm.material.flatShading,
        vertexColors: sm.geometry.colors !== null,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = sm.name;
      mesh.position.set(sm.position.x, sm.position.y, sm.position.z);
      mesh.rotation.set(sm.rotation.x, sm.rotation.y, sm.rotation.z);
      mesh.scale.set(sm.scale.x, sm.scale.y, sm.scale.z);

      scene.add(mesh);
    });

    this.editor.selectionManager.select(null);
    this.editor.notifyStatsChange();
  }
}
