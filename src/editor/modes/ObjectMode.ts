import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { History, Action } from '../History';
import { GridSnap } from '../GridSnap';
import { SelectionManager } from '../SelectionManager';

export class ObjectMode {
  private transformControls: TransformControls;
  private scene: THREE.Scene;
  private history: History;
  private orbitControls: OrbitControls;
  private gridSnap: GridSnap;
  private selectionManager: SelectionManager | null = null;
  private attached: THREE.Object3D | null = null;
  private startPosition = new THREE.Vector3();
  private startRotation = new THREE.Euler();
  private startScale = new THREE.Vector3();
  private active: boolean = false;

  constructor(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    orbitControls: OrbitControls,
    history: History,
    gridSnap: GridSnap
  ) {
    this.scene = scene;
    this.history = history;
    this.orbitControls = orbitControls;
    this.gridSnap = gridSnap;

    this.transformControls = new TransformControls(camera, renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event) => {
      const dragging = event.value as boolean;
      this.orbitControls.enabled = !dragging;
      if (dragging) {
        this.saveStartTransform();
      } else {
        this.recordTransformAction();
      }
    });

    this.scene.add(this.transformControls.getHelper());

    // Wire grid snap to TransformControls
    this.updateTranslationSnap();
    this.gridSnap.onChange(() => this.updateTranslationSnap());
  }

  private updateTranslationSnap(): void {
    this.transformControls.translationSnap = this.gridSnap.isEnabled()
      ? this.gridSnap.getGridSize()
      : null;
  }

  public setSelectionManager(selectionManager: SelectionManager): void {
    this.selectionManager = selectionManager;
  }

  private saveStartTransform(): void {
    if (this.attached) {
      this.startPosition.copy(this.attached.position);
      this.startRotation.copy(this.attached.rotation);
      this.startScale.copy(this.attached.scale);
    }
  }

  private recordTransformAction(): void {
    if (!this.attached) return;

    const obj = this.attached;
    const oldPos = this.startPosition.clone();
    const oldRot = this.startRotation.clone();
    const oldScale = this.startScale.clone();
    const newPos = obj.position.clone();
    const newRot = obj.rotation.clone();
    const newScale = obj.scale.clone();

    // Only record if something changed
    if (oldPos.equals(newPos) && oldRot.equals(newRot) && oldScale.equals(newScale)) {
      return;
    }

    // Apply delta to other selected objects
    const otherOldPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();
    const otherNewPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();
    const otherOldRotations: Map<THREE.Object3D, THREE.Euler> = new Map();
    const otherNewRotations: Map<THREE.Object3D, THREE.Euler> = new Map();
    const otherOldScales: Map<THREE.Object3D, THREE.Vector3> = new Map();
    const otherNewScales: Map<THREE.Object3D, THREE.Vector3> = new Map();

    if (this.selectionManager) {
      const allSelected = this.selectionManager.getSelectedAll();
      const posDelta = newPos.clone().sub(oldPos);
      // NOTE: Euler delta via component subtraction only works correctly for
      // single-axis rotations (which is what TransformControls constrains to
      // when using axis handles). Multi-axis simultaneous rotation would require
      // quaternion-based delta computation.
      const rotDelta = new THREE.Euler(
        newRot.x - oldRot.x,
        newRot.y - oldRot.y,
        newRot.z - oldRot.z
      );
      const scaleDelta = new THREE.Vector3(
        oldScale.x !== 0 ? newScale.x / oldScale.x : 1,
        oldScale.y !== 0 ? newScale.y / oldScale.y : 1,
        oldScale.z !== 0 ? newScale.z / oldScale.z : 1
      );

      for (const mesh of allSelected) {
        if (mesh === obj) continue;
        otherOldPositions.set(mesh, mesh.position.clone());
        otherOldRotations.set(mesh, mesh.rotation.clone());
        otherOldScales.set(mesh, mesh.scale.clone());

        mesh.position.add(posDelta);
        mesh.rotation.x += rotDelta.x;
        mesh.rotation.y += rotDelta.y;
        mesh.rotation.z += rotDelta.z;
        mesh.scale.multiply(scaleDelta);

        otherNewPositions.set(mesh, mesh.position.clone());
        otherNewRotations.set(mesh, mesh.rotation.clone());
        otherNewScales.set(mesh, mesh.scale.clone());
      }
    }

    const action: Action = {
      description: 'Трансформация объекта',
      execute: () => {
        obj.position.copy(newPos);
        obj.rotation.copy(newRot);
        obj.scale.copy(newScale);
        otherNewPositions.forEach((pos, o) => o.position.copy(pos));
        otherNewRotations.forEach((rot, o) => o.rotation.copy(rot));
        otherNewScales.forEach((s, o) => o.scale.copy(s));
      },
      undo: () => {
        obj.position.copy(oldPos);
        obj.rotation.copy(oldRot);
        obj.scale.copy(oldScale);
        otherOldPositions.forEach((pos, o) => o.position.copy(pos));
        otherOldRotations.forEach((rot, o) => o.rotation.copy(rot));
        otherOldScales.forEach((s, o) => o.scale.copy(s));
      },
    };

    this.history.record(action);
  }

  public setTransformMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.transformControls.setMode(mode);
  }

  public attach(object: THREE.Object3D | null): void {
    if (object) {
      this.transformControls.attach(object);
      this.attached = object;
    } else {
      this.transformControls.detach();
      this.attached = null;
    }
  }

  public activate(): void {
    this.active = true;
    this.transformControls.enabled = true;
    this.transformControls.getHelper().visible = !!this.attached;
  }

  public deactivate(): void {
    this.active = false;
    this.transformControls.detach();
    this.transformControls.enabled = false;
    this.transformControls.getHelper().visible = false;
    this.attached = null;
  }

  public isActive(): boolean {
    return this.active;
  }

  public dispose(): void {
    this.scene.remove(this.transformControls.getHelper());
    this.transformControls.dispose();
  }
}
