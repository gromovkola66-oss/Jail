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
  private enabled: boolean = true;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onClickOutsideBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private openTemplates: (() => void) | null = null;

  constructor(editor: Editor) {
    this.editor = editor;

    this.panel = document.createElement('div');
    this.panel.className = 'quick-actions-panel';
    this.panel.style.display = 'none';
    document.body.appendChild(this.panel);

    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onClickOutsideBound = this.onClickOutside.bind(this);
    this.onContextMenuBound = this.onContextMenu.bind(this);

    // Listen for right-click on the viewport
    const viewportEl = document.getElementById('viewport');
    if (viewportEl) {
      viewportEl.addEventListener('contextmenu', this.onContextMenuBound);
    }

    // Hide panel when mode changes to sculpt
    this.editor.modeManager.onModeChange((mode) => {
      if (mode === 'sculpt') {
        this.hide();
      }
    });
  }

  public setOpenTemplates(fn: () => void): void {
    this.openTemplates = fn;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.hide();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private onContextMenu(e: MouseEvent): void {
    // Never show in sculpt mode
    if (this.editor.modeManager.getMode() === 'sculpt') {
      return;
    }

    // Never show when free camera is active (right-click is used for look)
    if (this.editor.viewport.getCameraMode() === 'free') {
      return;
    }

    // Never show if disabled
    if (!this.enabled) {
      return;
    }

    e.preventDefault();

    const selected = this.editor.selectionManager.getSelected();
    const mode = this.editor.modeManager.getMode();
    const buttons = this.getButtonsForContext(selected, mode);

    this.panel.innerHTML = '';
    for (const btn of buttons) {
      const el = document.createElement('button');
      el.className = 'quick-action-btn';
      el.textContent = btn.label;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        btn.action();
        this.hide();
      });
      this.panel.appendChild(el);
    }

    // Position at mouse cursor
    this.panel.style.position = 'fixed';
    this.panel.style.left = `${e.clientX}px`;
    this.panel.style.top = `${e.clientY}px`;
    this.panel.style.bottom = 'auto';
    this.panel.style.transform = 'none';

    this.show();

    // Clamp panel to viewport bounds so it never renders off-screen
    const margin = 8;
    const rect = this.panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = e.clientX;
    let top = e.clientY;

    if (left + rect.width + margin > vw) {
      left = vw - rect.width - margin;
    }
    if (top + rect.height + margin > vh) {
      top = vh - rect.height - margin;
    }
    if (left < margin) {
      left = margin;
    }
    if (top < margin) {
      top = margin;
    }

    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
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

  private show(): void {
    this.visible = true;
    this.panel.style.display = 'flex';
    document.addEventListener('keydown', this.onKeyDownBound);
    document.addEventListener('mousedown', this.onClickOutsideBound);
  }

  private hide(): void {
    if (!this.visible) return;
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
