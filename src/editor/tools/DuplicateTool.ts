import * as THREE from 'three';
import { History, Action } from '../History';

export class DuplicateTool {
  private scene: THREE.Scene;
  private history: History;

  constructor(scene: THREE.Scene, history: History) {
    this.scene = scene;
    this.history = history;
  }

  public duplicate(mesh: THREE.Mesh): THREE.Mesh {
    const clone = mesh.clone();
    clone.geometry = mesh.geometry.clone();
    clone.material = (mesh.material as THREE.Material).clone();
    clone.position.x += 1;
    clone.name = mesh.name + ' (копия)';

    const scene = this.scene;
    const action: Action = {
      description: 'Дублировать объект',
      execute: () => {
        scene.add(clone);
      },
      undo: () => {
        scene.remove(clone);
      },
    };

    this.history.push(action);
    return clone;
  }
}
