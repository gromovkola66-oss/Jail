export class WelcomeScreen {
  private overlay: HTMLDivElement;
  private onDismiss: (() => void) | null = null;

  constructor() {
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'welcome-screen';

    const container = document.createElement('div');
    container.className = 'welcome-content';

    // Logo
    const logo = document.createElement('div');
    logo.className = 'welcome-logo';

    const letters = [
      { text: 'X', className: 'logo-letter logo-x' },
      { text: 'B', className: 'logo-letter logo-bron' },
      { text: 'R', className: 'logo-letter logo-bron' },
      { text: 'O', className: 'logo-letter logo-bron' },
      { text: 'N', className: 'logo-letter logo-bron' },
    ];

    letters.forEach((letter, index) => {
      const span = document.createElement('span');
      span.className = letter.className;
      span.textContent = letter.text;
      span.style.animationDelay = `${index * 0.1}s`;
      logo.appendChild(span);
    });

    const studio = document.createElement('div');
    studio.className = 'welcome-studio';
    studio.textContent = 'Studio';

    const buttons = document.createElement('div');
    buttons.className = 'welcome-buttons';

    const startBtn = document.createElement('button');
    startBtn.className = 'welcome-btn welcome-btn-primary';
    startBtn.textContent = '\u041D\u0430\u0447\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443';
    startBtn.addEventListener('click', () => this.dismiss());

    const newProjectBtn = document.createElement('button');
    newProjectBtn.className = 'welcome-btn welcome-btn-secondary';
    newProjectBtn.textContent = '\u041D\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0435\u043A\u0442';
    newProjectBtn.addEventListener('click', () => this.dismiss());

    buttons.appendChild(startBtn);
    buttons.appendChild(newProjectBtn);

    container.appendChild(logo);
    container.appendChild(studio);
    container.appendChild(buttons);
    overlay.appendChild(container);

    return overlay;
  }

  private dismiss(): void {
    this.overlay.classList.add('welcome-hiding');
    setTimeout(() => {
      this.overlay.remove();
      if (this.onDismiss) {
        this.onDismiss();
      }
    }, 300);
  }

  public onClose(callback: () => void): void {
    this.onDismiss = callback;
  }
}
