import { Editor, SceneStats } from '../editor/Editor';
import { EditMode } from '../editor/modes/ModeManager';

export class StatusBar {
  private vertexCountEl: HTMLElement;
  private faceCountEl: HTMLElement;
  private selectionCountEl: HTMLElement | null;
  private hintEl: HTMLElement | null;
  private editor: Editor;

  private modeHints: Record<EditMode, string> = {
    object: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C | G=\u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u0435 | R=\u0432\u0440\u0430\u0449\u0435\u043D\u0438\u0435 | S=\u043C\u0430\u0441\u0448\u0442\u0430\u0431',
    vertex: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0432\u0435\u0440\u0448\u0438\u043D\u0443 | \u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u044F',
    edge: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0440\u0435\u0431\u0440\u043E',
    face: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0433\u0440\u0430\u043D\u044C | E=\u044D\u043A\u0441\u0442\u0440\u0443\u0437\u0438\u044F',
    weightpaint: '',
    sculpt: '\u041B\u041A\u041C=\u043A\u0438\u0441\u0442\u044C | Shift=\u0441\u0433\u043B\u0430\u0436\u0438\u0432\u0430\u043D\u0438\u0435 | Ctrl=\u0438\u043D\u0432\u0435\u0440\u0441\u0438\u044F | Alt+\u041B\u041A\u041C=\u043A\u0430\u043C\u0435\u0440\u0430',
  };

  constructor(editor: Editor) {
    this.editor = editor;
    this.vertexCountEl = document.getElementById('vertex-count')!;
    this.faceCountEl = document.getElementById('face-count')!;
    this.selectionCountEl = document.getElementById('selection-count');
    this.hintEl = document.getElementById('status-hint');

    editor.onStatsChange((stats: SceneStats) => {
      this.update(stats);
    });

    editor.selectionManager.onSelectionChange(() => {
      this.updateSelectionCount();
    });

    editor.modeManager.onModeChange((mode: EditMode) => {
      this.updateModeHint(mode);
    });

    // Set initial hint
    this.updateModeHint(editor.modeManager.getMode());
  }

  private update(stats: SceneStats): void {
    this.vertexCountEl.textContent = `\u0412\u0435\u0440\u0448\u0438\u043D\u044B: ${stats.vertices}`;
    this.faceCountEl.textContent = `\u0413\u0440\u0430\u043D\u0438: ${stats.faces}`;
  }

  private updateSelectionCount(): void {
    if (!this.selectionCountEl) return;
    const count = this.editor.selectionManager.getSelectedAll().length;
    if (count > 1) {
      this.selectionCountEl.textContent = `\u0412\u044B\u0434\u0435\u043B\u0435\u043D\u043E: ${count} \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432`;
    } else {
      this.selectionCountEl.textContent = '';
    }
  }

  private updateModeHint(mode: EditMode): void {
    if (!this.hintEl) return;
    const hint = this.modeHints[mode] || '';
    this.hintEl.textContent = hint;
  }

  public setHint(text: string): void {
    if (!this.hintEl) return;
    this.hintEl.textContent = text;
  }

  /** Re-apply the current mode hint (useful after temporary hint messages). */
  public refreshHint(): void {
    this.updateModeHint(this.editor.modeManager.getMode());
  }
}
