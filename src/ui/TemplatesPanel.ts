import { Editor } from '../editor/Editor';

interface TemplateItem {
  label: string;
  icon: string;
  action: () => void;
}

export class TemplatesPanel {
  private editor: Editor;
  private modal: HTMLDivElement | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  public open(): void {
    if (this.modal) return;

    this.modal = document.createElement('div');
    this.modal.id = 'templates-modal';
    this.modal.innerHTML = `
      <div class="templates-backdrop"></div>
      <div class="templates-card">
        <div class="templates-header">
          <h2 class="templates-title">\u0428\u0430\u0431\u043B\u043E\u043D\u044B</h2>
          <button class="templates-close-btn">\u2715</button>
        </div>
        <div class="templates-grid"></div>
      </div>
    `;

    const templates: TemplateItem[] = [
      { label: '\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436', icon: '\uD83E\uDDCD', action: () => this.editor.primitiveLibrary.addCharacter() },
      { label: '\u041C\u0435\u0447', icon: '\u2694\uFE0F', action: () => this.editor.primitiveLibrary.addSword() },
      { label: '\u0414\u0435\u0440\u0435\u0432\u043E', icon: '\uD83C\uDF33', action: () => this.editor.primitiveLibrary.addTree() },
      { label: '\u0417\u0434\u0430\u043D\u0438\u0435', icon: '\uD83C\uDFE0', action: () => this.editor.primitiveLibrary.addHouse() },
      { label: '\u0416\u0438\u0432\u043E\u0442\u043D\u043E\u0435', icon: '\uD83D\uDC3E', action: () => this.editor.primitiveLibrary.addAnimal() },
    ];

    const grid = this.modal.querySelector('.templates-grid') as HTMLDivElement;
    for (const tpl of templates) {
      const card = document.createElement('button');
      card.className = 'template-card';
      card.innerHTML = `<span class="template-icon">${tpl.icon}</span><span class="template-label">${tpl.label}</span>`;
      card.addEventListener('click', () => {
        tpl.action();
        this.editor.notifyStatsChange();
        this.close();
      });
      grid.appendChild(card);
    }

    // Close on backdrop click
    const backdrop = this.modal.querySelector('.templates-backdrop') as HTMLDivElement;
    backdrop.addEventListener('click', () => this.close());

    // Close button
    const closeBtn = this.modal.querySelector('.templates-close-btn') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.close());

    // Close on Escape
    this.onKeyDown = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.onKeyDown);

    document.body.appendChild(this.modal);
  }

  public close(): void {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
      document.removeEventListener('keydown', this.onKeyDown);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    }
  }
}
