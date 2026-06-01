import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FreeCamera } from './FreeCamera';

export class Viewport {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public freeCamera: FreeCamera;

  private container: HTMLElement;
  private animationId: number = 0;
  private updateCallbacks: ((delta: number) => void)[] = [];
  private clock: THREE.Clock = new THREE.Clock();
  private cameraMode: 'orbit' | 'free' = 'orbit';
  private cameraModeListeners: ((mode: 'orbit' | 'free') => void)[] = [];
  private onResizeBound: () => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // FreeCamera
    this.freeCamera = new FreeCamera(this.camera, this.renderer.domElement);

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    this.scene.add(grid);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    // Resize handling
    this.onResizeBound = this.onResize.bind(this);
    window.addEventListener('resize', this.onResizeBound);

    // Start animation loop
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    if (this.cameraMode === 'orbit') {
      this.controls.update();
    } else {
      this.freeCamera.update(delta);
    }
    for (const cb of this.updateCallbacks) {
      cb(delta);
    }
    this.renderer.render(this.scene, this.camera);
  }

  public addUpdateCallback(fn: (delta: number) => void): void {
    this.updateCallbacks.push(fn);
  }

  public removeUpdateCallback(fn: (delta: number) => void): void {
    const idx = this.updateCallbacks.indexOf(fn);
    if (idx >= 0) {
      this.updateCallbacks.splice(idx, 1);
    }
  }

  public onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setCameraMode(mode: 'orbit' | 'free'): void {
    if (mode === this.cameraMode) return;
    this.cameraMode = mode;
    if (mode === 'orbit') {
      this.freeCamera.deactivate();
      this.controls.enabled = true;
    } else {
      this.controls.enabled = false;
      this.freeCamera.activate();
    }
    this.cameraModeListeners.forEach(cb => cb(mode));
  }

  public getCameraMode(): 'orbit' | 'free' {
    return this.cameraMode;
  }

  public toggleCameraMode(): void {
    this.setCameraMode(this.cameraMode === 'orbit' ? 'free' : 'orbit');
  }

  public onCameraModeChange(cb: (mode: 'orbit' | 'free') => void): void {
    this.cameraModeListeners.push(cb);
  }

  public focusOnObject(object: THREE.Object3D): void {
    if (this.cameraMode === 'free') return;

    const targetPos = object.position.clone();
    const startTarget = this.controls.target.clone();
    const startCamPos = this.camera.position.clone();

    // Compute desired camera position: keep same direction but at distance ~5 from object
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const distance = 5;
    const endCamPos = targetPos.clone().add(direction.multiplyScalar(distance));

    const duration = 0.3; // seconds
    let elapsed = 0;

    const animateCallback = (delta: number) => {
      elapsed += delta;
      const t = Math.min(elapsed / duration, 1);
      // Smooth easing (ease-out quad)
      const ease = t * (2 - t);

      this.controls.target.lerpVectors(startTarget, targetPos, ease);
      this.camera.position.lerpVectors(startCamPos, endCamPos, ease);

      if (t >= 1) {
        this.removeUpdateCallback(animateCallback);
      }
    };

    this.addUpdateCallback(animateCallback);
  }

  public resetCamera(): void {
    if (this.cameraMode === 'free') {
      this.setCameraMode('orbit');
    }
    this.camera.position.set(5, 5, 5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResizeBound);
  }
}
