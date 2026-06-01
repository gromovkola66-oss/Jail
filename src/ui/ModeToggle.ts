export type EditorMode = 'simple' | 'advanced';

export class ModeToggle {
  private mode: EditorMode;
  private button: HTMLButtonElement;
  private callbacks: Array<(mode: EditorMode) => void> = [];

  constructor() {
    this.mode = this.loadMode();
    this.button = this.createButton();
    this.applyMode();
  }

  private loadMode(): EditorMode {
    const stored = localStorage.getItem('editorMode');
    if (stored === 'advanced') return 'advanced';
    return 'simple';
  }

  private saveMode(): void {
    localStorage.setItem('editorMode', this.mode);
  }

  private createButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'btn-mode-toggle';
    btn.className = 'toolbar-btn toggle-btn';
    btn.title = '\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u0436\u0438\u043C \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430';
    btn.textContent = this.mode === 'simple' ? '\u041F\u0440\u043E\u0441\u0442\u043E\u0439' : '\u041F\u0440\u043E\u0434\u0432\u0438\u043D\u0443\u0442\u044B\u0439';
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  public getButton(): HTMLButtonElement {
    return this.button;
  }

  public isSimpleMode(): boolean {
    return this.mode === 'simple';
  }

  public toggle(): void {
    this.mode = this.mode === 'simple' ? 'advanced' : 'simple';
    this.saveMode();
    this.applyMode();
    this.button.textContent = this.mode === 'simple' ? '\u041F\u0440\u043E\u0441\u0442\u043E\u0439' : '\u041F\u0440\u043E\u0434\u0432\u0438\u043D\u0443\u0442\u044B\u0439';
    this.callbacks.forEach(cb => cb(this.mode));
  }

  public onModeChange(callback: (mode: EditorMode) => void): void {
    this.callbacks.push(callback);
  }

  private applyMode(): void {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('simple-mode', 'advanced-mode');
    app.classList.add(`${this.mode}-mode`);
  }
}
