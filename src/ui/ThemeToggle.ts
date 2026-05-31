import { Editor } from '../editor/Editor';

export class ThemeToggle {
  private editor: Editor;
  private button: HTMLButtonElement;
  private isLight: boolean = false;

  constructor(editor: Editor) {
    this.editor = editor;

    const btn = document.getElementById('btn-theme') as HTMLButtonElement | null;
    if (!btn) {
      throw new Error('Theme toggle button #btn-theme not found');
    }
    this.button = btn;
    this.button.addEventListener('click', () => this.toggle());
  }

  private toggle(): void {
    this.isLight = !this.isLight;
    document.body.classList.toggle('light-theme', this.isLight);
    this.button.classList.toggle('active', this.isLight);
  }
}
