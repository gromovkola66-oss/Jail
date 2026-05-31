import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { History, Action } from '../History';

export class ObjectMode {
  private transformControls: TransformControls;
  private scene: THREE.Scene;
  private history: History;
  private orbitControls: OrbitControls;
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
    history: History
  ) {
    this.scene = scene;
    this.history = history;
    this.orbitControls = orbitControls;

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

    const action: Action = {
      description: 'Трансформация объекта',
      execute: () => {
        obj.position.copy(newPos);
        obj.rotation.copy(newRot);
        obj.scale.copy(newScale);
      },
      undo: () => {
        obj.position.copy(oldPos);
        obj.rotation.copy(oldRot);
        obj.scale.copy(oldScale);
      },
    };

    // Push without re-executing
    this.history['undoStack'].push(action);
    this.history['redoStack'] = [];
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
