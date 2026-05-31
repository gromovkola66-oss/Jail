import { Editor, ToolMode } from './Editor';
import { EditMode } from './modes/ModeManager';

export class Hotkeys {
  private editor: Editor;
  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(editor: Editor) {
    this.editor = editor;
    this.onKeyDownBound = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDownBound);
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Do not fire hotkeys when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key.toLowerCase();

    // Ctrl+Shift+Z - redo
    if (ctrl && shift && key === 'z') {
      e.preventDefault();
      this.editor.redo();
      return;
    }

    // Ctrl+Z - undo
    if (ctrl && key === 'z') {
      e.preventDefault();
      this.editor.undo();
      return;
    }

    // Do not process other hotkeys if ctrl is held
    if (ctrl) return;

    switch (key) {
      case 'g':
        this.setTool('move');
        break;
      case 'r':
        this.setTool('rotate');
        break;
      case 's':
        e.preventDefault();
        this.setTool('scale');
        break;
      case 'e':
        this.editor.extrudeSelected();
        break;
      case 'x':
      case 'delete':
        this.editor.deleteSelected();
        break;
      case 'd':
        this.editor.duplicate();
        break;
      case 'p':
        this.setTool('paint');
        break;
      case '1':
        this.setMode('object');
        break;
      case '2':
        this.setMode('vertex');
        break;
      case '3':
        this.setMode('edge');
        break;
      case '4':
        this.setMode('face');
        break;
    }
  }

  private setTool(tool: ToolMode): void {
    this.editor.setTool(tool);
    // Update tool panel buttons
    const toolBtns = document.querySelectorAll<HTMLButtonElement>('.tool-btn');
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  private setMode(mode: EditMode): void {
    this.editor.setMode(mode);
    // Update mode buttons
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');
    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    // Update status bar
    const modeDisplay = document.getElementById('mode-display');
    if (modeDisplay) {
      const modeNames: Record<EditMode, string> = {
        object: 'Объект',
        vertex: 'Вершины',
        edge: 'Рёбра',
        face: 'Грани',
      };
      modeDisplay.textContent = `Режим: ${modeNames[mode]}`;
    }
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
  }
}
