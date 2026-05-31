import * as THREE from 'three';
import { Editor } from '../editor/Editor';

export class PropertiesPanel {
  private editor: Editor;
  private posX!: HTMLInputElement;
  private posY!: HTMLInputElement;
  private posZ!: HTMLInputElement;
  private rotX!: HTMLInputElement;
  private rotY!: HTMLInputElement;
  private rotZ!: HTMLInputElement;
  private scaleX!: HTMLInputElement;
  private scaleY!: HTMLInputElement;
  private scaleZ!: HTMLInputElement;
  private colorInput!: HTMLInputElement;
  private rafId: number | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.cacheElements();
    this.setupListeners();
    this.setupColorPicker();

    // Listen for selection changes
    this.editor.selectionManager.onSelectionChange((obj) => {
      this.updateDisplay(obj);
      if (obj) {
        this.startLiveUpdate();
      } else {
        this.stopLiveUpdate();
      }
    });
  }

  private startLiveUpdate(): void {
    if (this.rafId !== null) return;
    const loop = () => {
      const selected = this.editor.selectionManager.getSelected();
      if (selected) {
        this.updateDisplay(selected);
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopLiveUpdate(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private cacheElements(): void {
    this.posX = document.getElementById('pos-x') as HTMLInputElement;
    this.posY = document.getElementById('pos-y') as HTMLInputElement;
    this.posZ = document.getElementById('pos-z') as HTMLInputElement;
    this.rotX = document.getElementById('rot-x') as HTMLInputElement;
    this.rotY = document.getElementById('rot-y') as HTMLInputElement;
    this.rotZ = document.getElementById('rot-z') as HTMLInputElement;
    this.scaleX = document.getElementById('scale-x') as HTMLInputElement;
    this.scaleY = document.getElementById('scale-y') as HTMLInputElement;
    this.scaleZ = document.getElementById('scale-z') as HTMLInputElement;
    this.colorInput = document.getElementById('object-color') as HTMLInputElement;
  }

  private setupListeners(): void {
    const inputs = [
      { el: this.posX, prop: 'position', axis: 'x' },
      { el: this.posY, prop: 'position', axis: 'y' },
      { el: this.posZ, prop: 'position', axis: 'z' },
      { el: this.rotX, prop: 'rotation', axis: 'x' },
      { el: this.rotY, prop: 'rotation', axis: 'y' },
      { el: this.rotZ, prop: 'rotation', axis: 'z' },
      { el: this.scaleX, prop: 'scale', axis: 'x' },
      { el: this.scaleY, prop: 'scale', axis: 'y' },
      { el: this.scaleZ, prop: 'scale', axis: 'z' },
    ];

    inputs.forEach(({ el, prop, axis }) => {
      if (el) {
        el.addEventListener('change', () => {
          const selected = this.editor.selectionManager.getSelected();
          if (selected) {
            const value = parseFloat(el.value);
            if (prop === 'rotation') {
              // Convert degrees to radians
              (selected.rotation as unknown as Record<string, number>)[axis] =
                THREE.MathUtils.degToRad(value);
            } else {
              (selected[prop as keyof THREE.Mesh] as THREE.Vector3)[axis as 'x' | 'y' | 'z'] = value;
            }
          }
        });
      }
    });
  }

  private setupColorPicker(): void {
    if (this.colorInput) {
      this.colorInput.addEventListener('input', () => {
        const selected = this.editor.selectionManager.getSelected();
        if (selected) {
          const material = selected.material as THREE.MeshStandardMaterial;
          material.color.set(this.colorInput.value);
        }
      });
    }
  }

  private updateDisplay(object: THREE.Mesh | null): void {
    if (!object) {
      this.posX.value = '0';
      this.posY.value = '0';
      this.posZ.value = '0';
      this.rotX.value = '0';
      this.rotY.value = '0';
      this.rotZ.value = '0';
      this.scaleX.value = '1';
      this.scaleY.value = '1';
      this.scaleZ.value = '1';
      return;
    }

    this.posX.value = object.position.x.toFixed(2);
    this.posY.value = object.position.y.toFixed(2);
    this.posZ.value = object.position.z.toFixed(2);
    this.rotX.value = THREE.MathUtils.radToDeg(object.rotation.x).toFixed(1);
    this.rotY.value = THREE.MathUtils.radToDeg(object.rotation.y).toFixed(1);
    this.rotZ.value = THREE.MathUtils.radToDeg(object.rotation.z).toFixed(1);
    this.scaleX.value = object.scale.x.toFixed(2);
    this.scaleY.value = object.scale.y.toFixed(2);
    this.scaleZ.value = object.scale.z.toFixed(2);

    // Update color picker
    const material = object.material as THREE.MeshStandardMaterial;
    this.colorInput.value = '#' + material.color.getHexString();
  }
}
