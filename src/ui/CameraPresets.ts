import { Editor } from '../editor/Editor';

interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export class CameraPresets {
  private editor: Editor;
  private distance: number = 10;

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupButtons();
  }

  private setupButtons(): void {
    const presets: { id: string; position: [number, number, number] }[] = [
      { id: 'btn-cam-front', position: [0, 0, this.distance] },
      { id: 'btn-cam-back', position: [0, 0, -this.distance] },
      { id: 'btn-cam-left', position: [-this.distance, 0, 0] },
      { id: 'btn-cam-right', position: [this.distance, 0, 0] },
      { id: 'btn-cam-top', position: [0, this.distance, 0.001] },
      { id: 'btn-cam-bottom', position: [0, -this.distance, 0.001] },
    ];

    presets.forEach((preset) => {
      const btn = document.getElementById(preset.id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.setCameraPosition(preset.position[0], preset.position[1], preset.position[2]);
        });
      }
    });

    // Save/Load camera
    const saveBtn = document.getElementById('btn-cam-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveCamera());
    }

    const loadBtn = document.getElementById('btn-cam-load');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadCamera());
    }
  }

  private setCameraPosition(x: number, y: number, z: number): void {
    const camera = this.editor.viewport.camera;
    const controls = this.editor.viewport.controls;

    camera.position.set(x, y, z);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  private saveCamera(): void {
    const camera = this.editor.viewport.camera;
    const controls = this.editor.viewport.controls;

    const state: CameraState = {
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
    };

    localStorage.setItem('cameraState', JSON.stringify(state));
  }

  private loadCamera(): void {
    const saved = localStorage.getItem('cameraState');
    if (!saved) return;

    try {
      const state: CameraState = JSON.parse(saved);
      const camera = this.editor.viewport.camera;
      const controls = this.editor.viewport.controls;

      camera.position.set(state.position.x, state.position.y, state.position.z);
      controls.target.set(state.target.x, state.target.y, state.target.z);
      controls.update();
    } catch (err) {
      console.error('Failed to load camera state:', err);
    }
  }
}
