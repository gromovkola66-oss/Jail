import { Editor, PrimitiveType } from '../editor/Editor';

export class Toolbar {
  private editor: Editor;
  private detailLevel: number = 4;

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupPrimitiveButtons();
    this.setupUndoRedo();
    this.setupDetailSlider();
  }

  private setupPrimitiveButtons(): void {
    const primitives: { id: string; type: PrimitiveType }[] = [
      { id: 'btn-cube', type: 'cube' },
      { id: 'btn-sphere', type: 'sphere' },
      { id: 'btn-cylinder', type: 'cylinder' },
      { id: 'btn-plane', type: 'plane' },
      { id: 'btn-cone', type: 'cone' },
    ];

    primitives.forEach(({ id, type }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.editor.addPrimitive(type, this.detailLevel);
        });
      }
    });
  }

  private setupUndoRedo(): void {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');

    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.editor.undo());
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.editor.redo());
    }
  }

  private setupDetailSlider(): void {
    const slider = document.getElementById('detail-slider') as HTMLInputElement;
    const valueDisplay = document.getElementById('detail-value');

    if (slider) {
      slider.addEventListener('input', () => {
        this.detailLevel = parseInt(slider.value, 10);
        if (valueDisplay) {
          valueDisplay.textContent = slider.value;
        }
      });
    }
  }
}
