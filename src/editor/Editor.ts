import * as THREE from 'three';
import { Viewport } from './Viewport';
import { SelectionManager } from './SelectionManager';
import { History, Action } from './History';
import { PrimitiveFactory } from './primitives/PrimitiveFactory';

export type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'plane' | 'cone';
export type ToolMode = 'select' | 'move' | 'rotate' | 'scale' | 'extrude';

export interface SceneStats {
  vertices: number;
  faces: number;
}

export class Editor {
  public viewport: Viewport;
  public selectionManager: SelectionManager;
  public history: History;
  public primitiveFactory: PrimitiveFactory;
  public currentTool: ToolMode = 'select';

  private statsListeners: ((stats: SceneStats) => void)[] = [];

  constructor(container: HTMLElement) {
    this.viewport = new Viewport(container);
    this.selectionManager = new SelectionManager(
      this.viewport.camera,
      this.viewport.scene,
      container
    );
    this.history = new History();
    this.primitiveFactory = new PrimitiveFactory();
  }

  public addPrimitive(type: PrimitiveType, detail: number = 4): void {
    let mesh: THREE.Mesh;

    switch (type) {
      case 'cube':
        mesh = this.primitiveFactory.createCube(detail);
        break;
      case 'sphere':
        mesh = this.primitiveFactory.createSphere(detail);
        break;
      case 'cylinder':
        mesh = this.primitiveFactory.createCylinder(detail);
        break;
      case 'plane':
        mesh = this.primitiveFactory.createPlane(detail);
        break;
      case 'cone':
        mesh = this.primitiveFactory.createCone(detail);
        break;
    }

    // Place at a slight random offset so objects don't stack perfectly
    mesh.position.y = 0.5;

    const scene = this.viewport.scene;

    const action: Action = {
      description: `Создать ${mesh.name}`,
      execute: () => {
        scene.add(mesh);
        this.selectionManager.select(mesh);
        this.notifyStatsChange();
      },
      undo: () => {
        scene.remove(mesh);
        this.selectionManager.select(null);
        this.notifyStatsChange();
      },
    };

    this.history.push(action);
  }

  public undo(): void {
    this.history.undo();
    this.notifyStatsChange();
  }

  public redo(): void {
    this.history.redo();
    this.notifyStatsChange();
  }

  public setTool(tool: ToolMode): void {
    this.currentTool = tool;
  }

  public getStats(): SceneStats {
    let vertices = 0;
    let faces = 0;

    this.viewport.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        const geo = object.geometry;
        if (geo.index) {
          vertices += geo.attributes.position.count;
          faces += geo.index.count / 3;
        } else {
          vertices += geo.attributes.position.count;
          faces += geo.attributes.position.count / 3;
        }
      }
    });

    return { vertices: Math.floor(vertices), faces: Math.floor(faces) };
  }

  public onStatsChange(callback: (stats: SceneStats) => void): void {
    this.statsListeners.push(callback);
  }

  private notifyStatsChange(): void {
    const stats = this.getStats();
    this.statsListeners.forEach(cb => cb(stats));
  }
}
