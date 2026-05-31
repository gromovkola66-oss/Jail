import * as THREE from 'three';
import { Viewport } from './Viewport';
import { SelectionManager } from './SelectionManager';
import { History, Action } from './History';
import { PrimitiveFactory } from './primitives/PrimitiveFactory';
import { ModeManager, EditMode } from './modes/ModeManager';
import { ObjectMode } from './modes/ObjectMode';
import { VertexMode } from './modes/VertexMode';
import { EdgeMode } from './modes/EdgeMode';
import { FaceMode } from './modes/FaceMode';
import { GridSnap } from './GridSnap';
import { ShadingManager } from './shading/ShadingManager';
import { GLTFExporter } from './export/GLTFExporter';
import { OBJExporter } from './export/OBJExporter';
import { ExtrudeTool } from './tools/ExtrudeTool';
import { DeleteTool } from './tools/DeleteTool';
import { DuplicateTool } from './tools/DuplicateTool';
import { MirrorTool } from './tools/MirrorTool';

export type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'plane' | 'cone';
export type ToolMode = 'select' | 'move' | 'rotate' | 'scale' | 'extrude' | 'duplicate' | 'delete' | 'paint';

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

  public modeManager: ModeManager;
  public objectMode: ObjectMode;
  public vertexMode: VertexMode;
  public edgeMode: EdgeMode;
  public faceMode: FaceMode;
  public gridSnap: GridSnap;
  public shadingManager: ShadingManager;
  public gltfExporter: GLTFExporter;
  public objExporter: OBJExporter;
  public extrudeTool: ExtrudeTool;
  public deleteTool: DeleteTool;
  public duplicateTool: DuplicateTool;
  public mirrorTool: MirrorTool;

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

    // Mode management
    this.modeManager = new ModeManager();
    this.gridSnap = new GridSnap();
    this.objectMode = new ObjectMode(
      this.viewport.camera,
      this.viewport.renderer,
      this.viewport.scene,
      this.viewport.controls,
      this.history,
      this.gridSnap
    );
    this.vertexMode = new VertexMode(
      this.viewport.scene,
      this.viewport.camera,
      container,
      this.history,
      this.gridSnap
    );
    this.edgeMode = new EdgeMode(
      this.viewport.scene,
      this.viewport.camera,
      container,
      this.history
    );
    this.faceMode = new FaceMode(
      this.viewport.scene,
      this.viewport.camera,
      container,
      this.history
    );

    // Tools
    this.shadingManager = new ShadingManager(this.viewport.scene);
    this.gltfExporter = new GLTFExporter();
    this.objExporter = new OBJExporter();
    this.extrudeTool = new ExtrudeTool(this.history);
    this.deleteTool = new DeleteTool(this.viewport.scene, this.history);
    this.duplicateTool = new DuplicateTool(this.viewport.scene, this.history);
    this.mirrorTool = new MirrorTool();

    // Pass mirror tool to vertex mode
    this.vertexMode.setMirrorTool(this.mirrorTool);

    // Activate object mode by default
    this.objectMode.activate();
    this.objectMode.setSelectionManager(this.selectionManager);

    // Wire up mode changes
    this.modeManager.onModeChange((mode) => this.handleModeChange(mode));

    // Wire up selection changes to modes
    this.selectionManager.onSelectionChange((obj) => {
      const mode = this.modeManager.getMode();
      if (mode === 'object') {
        this.objectMode.attach(obj);
      } else if (mode === 'vertex') {
        this.vertexMode.updateMesh(obj);
      } else if (mode === 'edge') {
        this.edgeMode.updateMesh(obj);
      } else if (mode === 'face') {
        this.faceMode.updateMesh(obj);
      }
    });
  }

  private handleModeChange(mode: EditMode): void {
    // Deactivate all modes
    this.objectMode.deactivate();
    this.vertexMode.deactivate();
    this.edgeMode.deactivate();
    this.faceMode.deactivate();

    const selected = this.selectionManager.getSelected();

    // Activate new mode
    switch (mode) {
      case 'object':
        this.objectMode.activate();
        if (selected) this.objectMode.attach(selected);
        break;
      case 'vertex':
        this.vertexMode.activate(selected);
        break;
      case 'edge':
        this.edgeMode.activate(selected);
        break;
      case 'face':
        this.faceMode.activate(selected);
        break;
    }
  }

  public setMode(mode: EditMode): void {
    this.modeManager.setMode(mode);
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

    // Update object mode transform based on tool
    if (this.modeManager.getMode() === 'object') {
      switch (tool) {
        case 'move':
          this.objectMode.setTransformMode('translate');
          break;
        case 'rotate':
          this.objectMode.setTransformMode('rotate');
          break;
        case 'scale':
          this.objectMode.setTransformMode('scale');
          break;
      }
    }

    // Handle painting
    if (tool === 'paint') {
      this.faceMode.setPaintingEnabled(true);
    } else {
      this.faceMode.setPaintingEnabled(false);
    }
  }

  public duplicate(): void {
    const allSelected = this.selectionManager.getSelectedAll();
    if (allSelected.length === 0) return;

    const clones: THREE.Mesh[] = [];
    for (const mesh of allSelected) {
      const clone = this.duplicateTool.duplicate(mesh);
      clones.push(clone);
    }
    // Select the last clone
    this.selectionManager.select(clones[clones.length - 1]);
    this.notifyStatsChange();
  }

  public deleteSelected(): void {
    const mode = this.modeManager.getMode();
    if (mode === 'object') {
      const allSelected = this.selectionManager.getSelectedAll();
      if (allSelected.length === 0) return;
      for (const mesh of allSelected) {
        this.deleteTool.deleteObject(mesh);
      }
      this.selectionManager.select(null);
      this.notifyStatsChange();
    } else if (mode === 'face') {
      const selected = this.selectionManager.getSelected();
      if (!selected) return;
      const faceIdx = this.faceMode.getSelectedFaceIndex();
      if (faceIdx >= 0) {
        this.deleteTool.deleteFace(selected, faceIdx);
        this.notifyStatsChange();
      }
    }
  }

  public extrudeSelected(): void {
    const selected = this.selectionManager.getSelected();
    if (!selected) return;
    if (this.modeManager.getMode() !== 'face') return;
    const faceIdx = this.faceMode.getSelectedFaceIndex();
    if (faceIdx >= 0) {
      this.extrudeTool.extrude(selected, faceIdx);
      this.notifyStatsChange();
    }
  }

  public exportGLTF(): void {
    this.gltfExporter.exportScene(this.viewport.scene);
  }

  public exportOBJ(): void {
    this.objExporter.exportScene(this.viewport.scene);
  }

  public toggleShading(): void {
    this.shadingManager.toggleShading();
  }

  public toggleMirror(): void {
    this.mirrorTool.toggle(this.viewport.scene);
  }

  public applyMirror(): void {
    const selected = this.selectionManager.getSelected();
    if (!selected) return;
    this.mirrorTool.applyMirror(selected, this.history);
    this.notifyStatsChange();
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

  public notifyStatsChange(): void {
    const stats = this.getStats();
    this.statsListeners.forEach(cb => cb(stats));
  }
}
