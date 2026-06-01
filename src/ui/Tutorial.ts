interface TutorialStep {
  text: string;
  targetSelector: string;
}

const STEPS: TutorialStep[] = [
  { text: 'Нажмите "Куб" чтобы создать объект', targetSelector: '#btn-cube' },
  { text: 'Перетащите объект для перемещения', targetSelector: '#viewport' },
  { text: 'Включите режим Скульптинг и потяните грань', targetSelector: '.mode-btn[data-mode="sculpt"]' },
  { text: 'Выберите цвет и покрасьте грань', targetSelector: '#color-palette' },
  { text: 'Нажмите "Экспорт GLB" для сохранения', targetSelector: '#btn-export-glb' },
];

const STORAGE_KEY = 'tutorialCompleted';

export class Tutorial {
  private overlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private currentStep = 0;
  private currentHighlight: Element | null = null;
  private transitioning = false;

  checkFirstLaunch(): void {
    if (localStorage.getItem(STORAGE_KEY)) {
      return;
    }
    this.showPrompt();
  }

  restart(): void {
    this.currentStep = 0;
    this.showStep();
  }

  private showPrompt(): void {
    const prompt = document.createElement('div');
    prompt.className = 'tutorial-prompt';
    prompt.innerHTML = `
      <div class="tutorial-prompt-card">
        <p class="tutorial-prompt-text">Хотите пройти обучение?</p>
        <div class="tutorial-prompt-buttons">
          <button class="tutorial-prompt-btn tutorial-prompt-yes">Да</button>
          <button class="tutorial-prompt-btn tutorial-prompt-no">Нет, спасибо</button>
        </div>
      </div>
    `;
    document.body.appendChild(prompt);

    prompt.querySelector('.tutorial-prompt-yes')!.addEventListener('click', () => {
      prompt.remove();
      this.currentStep = 0;
      this.showStep();
    });

    prompt.querySelector('.tutorial-prompt-no')!.addEventListener('click', () => {
      prompt.remove();
      localStorage.setItem(STORAGE_KEY, 'true');
    });
  }

  private showStep(): void {
    this.transitioning = false;

    if (this.currentStep >= STEPS.length) {
      this.finish();
      return;
    }

    const step = STEPS[this.currentStep];
    const target = document.querySelector(step.targetSelector);

    // Create overlay if not exists
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'tutorial-overlay';
      document.body.appendChild(this.overlay);
    }

    // Remove previous highlight
    if (this.currentHighlight) {
      this.currentHighlight.classList.remove('tutorial-highlight');
    }

    // Highlight target element
    if (target) {
      target.classList.add('tutorial-highlight');
      this.currentHighlight = target;
    }

    // Create or update tooltip
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tutorial-tooltip';
      document.body.appendChild(this.tooltip);
    }

    this.tooltip.innerHTML = `
      <p class="tutorial-tooltip-text">${step.text}</p>
      <div class="tutorial-tooltip-buttons">
        <button class="tutorial-tooltip-btn tutorial-btn-next">Далее</button>
        <button class="tutorial-tooltip-btn tutorial-btn-skip">Пропустить</button>
      </div>
    `;

    this.tooltip.querySelector('.tutorial-btn-next')!.addEventListener('click', () => {
      if (this.transitioning) return;
      this.transitioning = true;
      this.currentStep++;
      this.showStep();
    });

    this.tooltip.querySelector('.tutorial-btn-skip')!.addEventListener('click', () => {
      this.finish();
    });

    // Position tooltip near target
    this.positionTooltip(target);
  }

  private positionTooltip(target: Element | null): void {
    if (!this.tooltip) return;

    if (!target) {
      // Center tooltip if no target found
      this.tooltip.style.top = '50%';
      this.tooltip.style.left = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipHeight = 100;
    const margin = 12;

    // Position below the target by default
    let top = rect.bottom + margin;
    let left = rect.left + rect.width / 2;

    // If tooltip would go below viewport, position above
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - margin;
    }

    // Clamp to viewport
    if (top < margin) top = margin;
    if (left < 150) left = 150;
    if (left > window.innerWidth - 150) left = window.innerWidth - 150;

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.transform = 'translateX(-50%)';
  }

  private finish(): void {
    localStorage.setItem(STORAGE_KEY, 'true');
    this.cleanup();
  }

  private cleanup(): void {
    if (this.currentHighlight) {
      this.currentHighlight.classList.remove('tutorial-highlight');
      this.currentHighlight = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
