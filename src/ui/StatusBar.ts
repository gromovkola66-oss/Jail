import { Editor, SceneStats } from '../editor/Editor';

export class StatusBar {
  private vertexCountEl: HTMLElement;
  private faceCountEl: HTMLElement;

  constructor(editor: Editor) {
    this.vertexCountEl = document.getElementById('vertex-count')!;
    this.faceCountEl = document.getElementById('face-count')!;

    editor.onStatsChange((stats: SceneStats) => {
      this.update(stats);
    });
  }

  private update(stats: SceneStats): void {
    this.vertexCountEl.textContent = `Вершины: ${stats.vertices}`;
    this.faceCountEl.textContent = `Грани: ${stats.faces}`;
  }
}
