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
import { WeightPaintMode } from './modes/WeightPaintMode';
import { SculptMode } from './modes/SculptMode';
import { GridSnap } from './GridSnap';
import { ShadingManager } from './shading/ShadingManager';
import { GLTFExporter } from './export/GLTFExporter';
import { OBJExporter } from './export/OBJExporter';
import { ExtrudeTool } from './tools/ExtrudeTool';
import { DeleteTool } from './tools/DeleteTool';
import { DuplicateTool } from './tools/DuplicateTool';
import { MirrorTool } from './tools/MirrorTool';
import { SubdivideTool } from './tools/SubdivideTool';
import { DecimateTool } from './tools/DecimateTool';
import { ModelImporter } from './import/ModelImporter';
import { LoopCutTool } from './tools/LoopCutTool';
import { MergeVerticesTool } from './tools/MergeVerticesTool';
import { BooleanTool } from './tools/BooleanTool';
import { PrimitiveLibrary } from './primitives/PrimitiveLibrary';
import { BoneSystem } from './animation/BoneSystem';
import { Timeline, KeyframeTransform } from './animation/Timeline';
import { AnimationPlayer } from './animation/AnimationPlayer';
import { AnimationPresets } from './animation/AnimationPresets';
import { Toast } from '../ui/Toast';

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
  public weightPaintMode: WeightPaintMode;
  public sculptMode: SculptMode;
  public gridSnap: GridSnap;
  public shadingManager: ShadingManager;
  public gltfExporter: GLTFExporter;
  public objExporter: OBJExporter;
  public extrudeTool: ExtrudeTool;
  public deleteTool: DeleteTool;
  public duplicateTool: DuplicateTool;
  public mirrorTool: MirrorTool;
  public subdivideTool: SubdivideTool;
  public decimateTool: DecimateTool;
  public modelImporter: ModelImporter;
  public loopCutTool: LoopCutTool;
  public mergeVerticesTool: MergeVerticesTool;
  public booleanTool: BooleanTool;
  public primitiveLibrary: PrimitiveLibrary;
  public boneSystem: BoneSystem;
  public timeline: Timeline;
  public animationPlayer: AnimationPlayer;
  public animationPresets: AnimationPresets;

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

    // Animation systems
    this.boneSystem = new BoneSystem(this.viewport.scene, this.history);
    this.timeline = new Timeline(this.history);
    this.animationPlayer = new AnimationPlayer(this.timeline, this.boneSystem, this.viewport.scene);
    this.animationPresets = new AnimationPresets(this.history);

    // Wire animation player to viewport update loop
    this.viewport.addUpdateCallback((delta) => {
      this.animationPlayer.update(delta);
    });
    this.weightPaintMode = new WeightPaintMode(
      this.viewport.scene,
      this.viewport.camera,
      container,
      this.boneSystem
    );

    // Sculpt mode
    this.sculptMode = new SculptMode(
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
    this.subdivideTool = new SubdivideTool();
    this.decimateTool = new DecimateTool();
    this.modelImporter = new ModelImporter();
    this.loopCutTool = new LoopCutTool(
      this.viewport.scene,
      this.viewport.camera,
      container,
      this.history
    );
    this.mergeVerticesTool = new MergeVerticesTool();
    this.booleanTool = new BooleanTool();
    this.primitiveLibrary = new PrimitiveLibrary(this.viewport.scene, this.history);

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
    this.weightPaintMode.deactivate();
    this.sculptMode.deactivate();

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
      case 'weightpaint':
        this.weightPaintMode.activate(selected);
        break;
      case 'sculpt':
        this.sculptMode.activate();
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

    // Place at an offset based on existing user meshes so objects don't stack
    let meshCount = 0;
    this.viewport.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.userData.isEditorInternal && !obj.name.startsWith('__')) {
        meshCount++;
      }
    });
    mesh.position.set(meshCount * 2, 0.5, 0);

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
    if (this.vertexMode.isActive()) this.vertexMode.refreshMarkers();
  }

  public redo(): void {
    this.history.redo();
    this.notifyStatsChange();
    if (this.vertexMode.isActive()) this.vertexMode.refreshMarkers();
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
      Toast.show('Объект удалён (Ctrl+Z чтобы вернуть)');
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
    if (this.extrudeTool.isInteractive) return;
    const faceIdx = this.faceMode.getSelectedFaceIndex();
    if (faceIdx >= 0) {
      this.extrudeTool.startInteractiveExtrude(
        selected, faceIdx, this.viewport.camera,
        this.viewport.renderer.domElement.parentElement || this.viewport.renderer.domElement
      );
      this.notifyStatsChange();
    }
  }

  public exportGLTF(): void {
    this.gltfExporter.exportScene(this.viewport.scene, this.timeline, this.boneSystem);
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

  public subdivideSelected(): void {
    const selected = this.selectionManager.getSelected();
    if (!selected) return;
    this.subdivideTool.subdivide(selected, this.history);
    this.notifyStatsChange();
  }

  public decimateSelected(): void {
    const selected = this.selectionManager.getSelected();
    if (!selected) return;
    this.decimateTool.decimate(selected, this.history);
    this.notifyStatsChange();
  }

  public async importModel(file: File): Promise<void> {
    const meshes = await this.modelImporter.importFromFile(file);
    if (meshes.length === 0) return;

    const scene = this.viewport.scene;

    const action: Action = {
      description: `Импорт ${file.name}`,
      execute: () => {
        for (const mesh of meshes) {
          scene.add(mesh);
        }
        this.selectionManager.select(meshes[0]);
        this.notifyStatsChange();
      },
      undo: () => {
        for (const mesh of meshes) {
          scene.remove(mesh);
        }
        this.selectionManager.select(null);
        this.notifyStatsChange();
      },
    };

    this.history.push(action);
  }

  public getStats(): SceneStats {
    let vertices = 0;
    let faces = 0;

    this.viewport.scene.traverse((object) => {
      if (object.userData.isEditorInternal === true || object.name.startsWith('__')) return;
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

  public activateLoopCut(): void {
    this.loopCutTool.activate();
  }

  public mergeVertices(): void {
    const selected = this.selectionManager.getSelected();
    if (!selected) return;
    if (this.modeManager.getMode() !== 'vertex') return;
    const indices = this.vertexMode.getSelectedVertexIndices();
    if (!indices || indices.length < 2) return;
    this.mergeVerticesTool.merge(selected, indices, this.history);
    this.notifyStatsChange();
  }

  public booleanUnion(): void {
    const meshes = this.selectionManager.getSelectedAll();
    if (meshes.length !== 2) return;
    const result = this.booleanTool.operate(meshes[0], meshes[1], 'union', this.viewport.scene, this.history);
    if (result) {
      this.selectionManager.select(result);
    }
    this.notifyStatsChange();
  }

  public booleanSubtract(): void {
    const meshes = this.selectionManager.getSelectedAll();
    if (meshes.length !== 2) return;
    const result = this.booleanTool.operate(meshes[0], meshes[1], 'subtract', this.viewport.scene, this.history);
    if (result) {
      this.selectionManager.select(result);
    }
    this.notifyStatsChange();
  }

  public booleanIntersect(): void {
    const meshes = this.selectionManager.getSelectedAll();
    if (meshes.length !== 2) return;
    const result = this.booleanTool.operate(meshes[0], meshes[1], 'intersect', this.viewport.scene, this.history);
    if (result) {
      this.selectionManager.select(result);
    }
    this.notifyStatsChange();
  }

  public playAnimation(): void {
    this.animationPlayer.play();
  }

  public pauseAnimation(): void {
    this.animationPlayer.pause();
  }

  public stopAnimation(): void {
    this.animationPlayer.stop();
  }

  public applyPreset(name: 'idle' | 'walk' | 'attack'): void {
    const selected = this.selectionManager.getSelected();
    if (!selected) return;
    if (!this.boneSystem.hasSkeleton(selected)) return;

    switch (name) {
      case 'idle':
        this.animationPresets.generateIdle(this.boneSystem, selected, this.timeline);
        break;
      case 'walk':
        this.animationPresets.generateWalk(this.boneSystem, selected, this.timeline);
        break;
      case 'attack':
        this.animationPresets.generateAttack(this.boneSystem, selected, this.timeline);
        break;
    }
  }

  public addBoneToSelected(): void {
    const selected = this.selectionManager.getSelected();
    if (!selected) return;
    const parentBone = this.boneSystem.getSelectedBone();
    const position = new THREE.Vector3(0, 1, 0);
    this.boneSystem.addBone(selected, parentBone, position);
  }

  public removeBoneFromSelected(): void {
    const bone = this.boneSystem.getSelectedBone();
    if (!bone) return;
    this.boneSystem.removeBone(bone.uuid);
  }

  public addKeyframe(): void {
    const bone = this.boneSystem.getSelectedBone();
    if (!bone) return;
    const frame = this.timeline.getCurrentFrame();
    const transform: KeyframeTransform = {
      position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
      rotation: { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z },
      scale: { x: bone.scale.x, y: bone.scale.y, z: bone.scale.z },
    };
    this.timeline.addKeyframe(bone.uuid, frame, transform);
  }

  public removeKeyframe(): void {
    const bone = this.boneSystem.getSelectedBone();
    if (!bone) return;
    const frame = this.timeline.getCurrentFrame();
    this.timeline.removeKeyframe(bone.uuid, frame);
  }
}
