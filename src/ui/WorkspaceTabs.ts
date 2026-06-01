export type WorkspaceTab = 'modeling' | 'texturing' | 'animation';
export type TabChangeCallback = (tab: WorkspaceTab, prevTab: WorkspaceTab) => void;

export class WorkspaceTabs {
  private activeTab: WorkspaceTab = 'modeling';
  private container: HTMLDivElement;
  private modelingBtn: HTMLButtonElement;
  private texturingBtn: HTMLButtonElement;
  private animationBtn: HTMLButtonElement;
  private listeners: TabChangeCallback[] = [];

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

    this.texturingBtn = document.createElement('button');
    this.texturingBtn.className = 'workspace-tab';
    this.texturingBtn.textContent = '\u0422\u0435\u043A\u0441\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435';
    this.texturingBtn.addEventListener('click', () => this.setTab('texturing'));

    this.animationBtn = document.createElement('button');
    this.animationBtn.className = 'workspace-tab';
    this.animationBtn.textContent = '\u0410\u043D\u0438\u043C\u0430\u0446\u0438\u044F';
    this.animationBtn.addEventListener('click', () => this.setTab('animation'));

    div.appendChild(this.modelingBtn);
    div.appendChild(this.texturingBtn);
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
    if (tab === this.activeTab) return;
    const prevTab = this.activeTab;
    this.activeTab = tab;
    this.modelingBtn.classList.toggle('active', tab === 'modeling');
    this.texturingBtn.classList.toggle('active', tab === 'texturing');
    this.animationBtn.classList.toggle('active', tab === 'animation');
    this.applyTab();
    this.listeners.forEach(cb => cb(tab, prevTab));
  }

  private applyTab(): void {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('tab-modeling', 'tab-texturing', 'tab-animation');
    app.classList.add(`tab-${this.activeTab}`);
  }

  public onTabChange(callback: TabChangeCallback): void {
    this.listeners.push(callback);
  }

  public getActiveTab(): WorkspaceTab {
    return this.activeTab;
  }
}
