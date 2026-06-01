import * as THREE from 'three';

export class FreeCamera {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private enabled: boolean = false;

  // Movement state
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;
  private moveDown = false;

  // Look state
  private isLooking = false;
  private euler: THREE.Euler;
  private PI_2 = Math.PI / 2;

  // Speed
  private moveSpeed: number = 5.0;
  private lookSpeed: number = 0.002;

  private direction: THREE.Vector3 = new THREE.Vector3();

  // Bound handlers
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: Event) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onContextMenuBound = (e: Event) => e.preventDefault();
  }

  public activate(): void {
    this.enabled = true;
    this.euler.setFromQuaternion(this.camera.quaternion);

    document.addEventListener('keydown', this.onKeyDownBound);
    document.addEventListener('keyup', this.onKeyUpBound);
    this.domElement.addEventListener('mousedown', this.onMouseDownBound);
    document.addEventListener('mouseup', this.onMouseUpBound);
    document.addEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.addEventListener('wheel', this.onWheelBound);
    this.domElement.addEventListener('contextmenu', this.onContextMenuBound);
  }

  public deactivate(): void {
    this.enabled = false;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.isLooking = false;

    document.removeEventListener('keydown', this.onKeyDownBound);
    document.removeEventListener('keyup', this.onKeyUpBound);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    document.removeEventListener('mouseup', this.onMouseUpBound);
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
  }

  public update(delta: number): void {
    if (!this.enabled) return;

    const speed = this.moveSpeed * delta;

    // Calculate movement direction relative to camera
    this.direction.set(0, 0, 0);

    if (this.moveForward) this.direction.z -= 1;
    if (this.moveBackward) this.direction.z += 1;
    if (this.moveLeft) this.direction.x -= 1;
    if (this.moveRight) this.direction.x += 1;

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
    }

    // Apply camera rotation to direction (only yaw for horizontal movement)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    this.camera.position.addScaledVector(forward, -this.direction.z * speed);
    this.camera.position.addScaledVector(right, this.direction.x * speed);

    // Vertical movement (world Y)
    if (this.moveUp) this.camera.position.y += speed;
    if (this.moveDown) this.camera.position.y -= speed;
  }

  public getMoveSpeed(): number { return this.moveSpeed; }
  public setMoveSpeed(speed: number): void { this.moveSpeed = Math.max(0.5, Math.min(50, speed)); }
  public isEnabled(): boolean { return this.enabled; }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    // Skip if typing in input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    switch (e.key.toLowerCase()) {
      case 'w': this.moveForward = true; break;
      case 's':
        if (!e.ctrlKey && !e.metaKey) this.moveBackward = true;
        break;
      case 'a': this.moveLeft = true; break;
      case 'd': this.moveRight = true; break;
      case ' ': // Space
        e.preventDefault();
        if (e.shiftKey) {
          this.moveDown = true;
        } else {
          this.moveUp = true;
        }
        break;
      case 'q': this.moveDown = true; break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.enabled) return;
    switch (e.key.toLowerCase()) {
      case 'w': this.moveForward = false; break;
      case 's': this.moveBackward = false; break;
      case 'a': this.moveLeft = false; break;
      case 'd': this.moveRight = false; break;
      case ' ':
        this.moveUp = false;
        this.moveDown = false;
        break;
      case 'q': this.moveDown = false; break;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.enabled) return;
    // Right-click to look around
    if (e.button === 2) {
      this.isLooking = true;
      this.domElement.requestPointerLock();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.enabled) return;
    if (e.button === 2) {
      this.isLooking = false;
      document.exitPointerLock();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.enabled || !this.isLooking) return;

    const movementX = e.movementX || 0;
    const movementY = e.movementY || 0;

    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= movementX * this.lookSpeed;
    this.euler.x -= movementY * this.lookSpeed;

    // Clamp vertical rotation
    this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }

  private onWheel(e: WheelEvent): void {
    if (!this.enabled) return;
    e.preventDefault();
    // Adjust speed with scroll
    if (e.deltaY < 0) {
      this.moveSpeed = Math.min(50, this.moveSpeed * 1.1);
    } else {
      this.moveSpeed = Math.max(0.5, this.moveSpeed / 1.1);
    }
  }
}
