export type WorkspaceTab = 'modeling' | 'animation';

export class WorkspaceTabs {
  private activeTab: WorkspaceTab = 'modeling';
  private container: HTMLDivElement;
  private modelingBtn: HTMLButtonElement;
  private animationBtn: HTMLButtonElement;

  constructor() {
    this.container = this.createTabs();
    this.injectIntoDOM();
    this.applyTab();
  }

  private createTabs(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'workspace-tabs';

    this.modelingBtn = document.createElement('button');
    this.modelingBtn.className = 'workspace-tab active';
    this.modelingBtn.textContent = '\u041C\u043E\u0434\u0435\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435';
    this.modelingBtn.addEventListener('click', () => this.setTab('modeling'));

    this.animationBtn = document.createElement('button');
    this.animationBtn.className = 'workspace-tab';
    this.animationBtn.textContent = '\u0410\u043D\u0438\u043C\u0430\u0446\u0438\u044F';
    this.animationBtn.addEventListener('click', () => this.setTab('animation'));

    div.appendChild(this.modelingBtn);
    div.appendChild(this.animationBtn);

    return div;
  }

  private injectIntoDOM(): void {
    const app = document.getElementById('app');
    if (!app) return;
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      app.insertBefore(this.container, toolbar);
    } else {
      app.prepend(this.container);
    }
  }

  private setTab(tab: WorkspaceTab): void {
    this.activeTab = tab;
    this.modelingBtn.classList.toggle('active', tab === 'modeling');
    this.animationBtn.classList.toggle('active', tab === 'animation');
    this.applyTab();
  }

  private applyTab(): void {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('tab-modeling', 'tab-animation');
    app.classList.add(`tab-${this.activeTab}`);
  }

  public getActiveTab(): WorkspaceTab {
    return this.activeTab;
  }
}
