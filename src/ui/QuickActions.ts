import * as THREE from 'three';
import { Editor } from '../editor/Editor';
import { EditMode } from '../editor/modes/ModeManager';

interface QuickActionButton {
  label: string;
  action: () => void;
}

export class QuickActions {
  private editor: Editor;
  private panel: HTMLDivElement;
  private visible: boolean = false;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onClickOutsideBound: (e: MouseEvent) => void;
  private openTemplates: (() => void) | null = null;

  constructor(editor: Editor) {
    this.editor = editor;

    this.panel = document.createElement('div');
    this.panel.className = 'quick-actions-panel';
    this.panel.style.display = 'none';
    document.body.appendChild(this.panel);

    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onClickOutsideBound = this.onClickOutside.bind(this);

    // Listen for selection changes
    this.editor.selectionManager.onSelectionChange(() => this.update());
    this.editor.modeManager.onModeChange(() => this.update());

    // Update position each frame
    this.editor.viewport.addUpdateCallback(() => this.updatePosition());
  }

  public setOpenTemplates(fn: () => void): void {
    this.openTemplates = fn;
  }

  private update(): void {
    const selected = this.editor.selectionManager.getSelected();
    const mode = this.editor.modeManager.getMode();
    const buttons = this.getButtonsForContext(selected, mode);

    this.panel.innerHTML = '';
    for (const btn of buttons) {
      const el = document.createElement('button');
      el.className = 'quick-action-btn';
      el.textContent = btn.label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.action();
        this.update();
      });
      this.panel.appendChild(el);
    }

    this.show();
    this.updatePosition();
  }

  private getButtonsForContext(selected: THREE.Mesh | null, mode: EditMode): QuickActionButton[] {
    if (!selected) {
      // Nothing selected
      return [
        { label: '\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u0443\u0431', action: () => this.editor.addPrimitive('cube') },
        { label: '\u0428\u0430\u0431\u043B\u043E\u043D\u044B', action: () => { if (this.openTemplates) this.openTemplates(); } },
        { label: '\u0418\u043C\u043F\u043E\u0440\u0442', action: () => { const inp = document.getElementById('file-import') as HTMLInputElement | null; if (inp) inp.click(); } },
      ];
    }

    if (mode === 'face') {
      return [
        { label: '\u0412\u044B\u0442\u044F\u043D\u0443\u0442\u044C', action: () => this.editor.extrudeSelected() },
        { label: '\u0426\u0432\u0435\u0442', action: () => { const cp = document.getElementById('object-color') as HTMLInputElement | null; if (cp) cp.click(); } },
        { label: '\u0423\u0434\u0430\u043B\u0438\u0442\u044C', action: () => this.editor.deleteSelected() },
      ];
    }

    // Object mode (default for selected object)
    return [
      { label: '\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C', action: () => this.editor.duplicate() },
      { label: '\u0423\u0434\u0430\u043B\u0438\u0442\u044C', action: () => this.editor.deleteSelected() },
      { label: '\u041F\u043E\u043A\u0440\u0430\u0441\u0438\u0442\u044C', action: () => { const cp = document.getElementById('object-color') as HTMLInputElement | null; if (cp) cp.click(); } },
      { label: '\u0412\u044B\u0442\u044F\u043D\u0443\u0442\u044C \u0433\u0440\u0430\u043D\u044C', action: () => { this.editor.setMode('face'); } },
    ];
  }

  private updatePosition(): void {
    if (!this.visible) return;

    const selected = this.editor.selectionManager.getSelected();
    if (!selected) {
      // Place in center-bottom area when nothing selected
      this.panel.style.left = '50%';
      this.panel.style.top = 'auto';
      this.panel.style.bottom = '80px';
      this.panel.style.transform = 'translateX(-50%)';
      return;
    }

    // Project 3D center to 2D
    const center = new THREE.Vector3();
    selected.getWorldPosition(center);

    const camera = this.editor.viewport.camera;
    const renderer = this.editor.viewport.renderer;

    const projected = center.clone().project(camera);
    const halfWidth = renderer.domElement.clientWidth / 2;
    const halfHeight = renderer.domElement.clientHeight / 2;

    const screenX = (projected.x * halfWidth) + halfWidth;
    const screenY = -(projected.y * halfHeight) + halfHeight;

    // Get viewport offset on page
    const rect = renderer.domElement.getBoundingClientRect();

    this.panel.style.left = `${rect.left + screenX}px`;
    this.panel.style.top = `${rect.top + screenY - 50}px`;
    this.panel.style.bottom = 'auto';
    this.panel.style.transform = 'translateX(-50%)';
  }

  private show(): void {
    this.visible = true;
    this.panel.style.display = 'flex';
    document.addEventListener('keydown', this.onKeyDownBound);
    document.addEventListener('mousedown', this.onClickOutsideBound);
  }

  private hide(): void {
    this.visible = false;
    this.panel.style.display = 'none';
    document.removeEventListener('keydown', this.onKeyDownBound);
    document.removeEventListener('mousedown', this.onClickOutsideBound);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.hide();
    }
  }

  private onClickOutside(e: MouseEvent): void {
    if (!this.panel.contains(e.target as Node)) {
      this.hide();
    }
  }
}
