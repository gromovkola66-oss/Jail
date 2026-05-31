import { Editor, SceneStats } from '../editor/Editor';

export class StatusBar {
  private vertexCountEl: HTMLElement;
  private faceCountEl: HTMLElement;
  private selectionCountEl: HTMLElement | null;
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.vertexCountEl = document.getElementById('vertex-count')!;
    this.faceCountEl = document.getElementById('face-count')!;
    this.selectionCountEl = document.getElementById('selection-count');

    editor.onStatsChange((stats: SceneStats) => {
      this.update(stats);
    });

    editor.selectionManager.onSelectionChange(() => {
      this.updateSelectionCount();
    });
  }

  private update(stats: SceneStats): void {
    this.vertexCountEl.textContent = `Вершины: ${stats.vertices}`;
    this.faceCountEl.textContent = `Грани: ${stats.faces}`;
  }

  private updateSelectionCount(): void {
    if (!this.selectionCountEl) return;
    const count = this.editor.selectionManager.getSelectedAll().length;
    if (count > 1) {
      this.selectionCountEl.textContent = `Выделено: ${count} объектов`;
    } else {
      this.selectionCountEl.textContent = '';
    }
  }
}
