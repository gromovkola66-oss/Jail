export type ColorChangeCallback = (color: string) => void;

export class ColorPalette {
  private currentColor: string = '#ff0000';
  private listeners: ColorChangeCallback[] = [];
  private recentColors: string[] = [];
  private recentContainer: HTMLElement | null = null;

  private readonly presetColors: string[] = [
    '#ff0000', '#ff6600', '#ffcc00', '#33cc33',
    '#0099ff', '#6633cc', '#ff33cc', '#ffffff',
    '#cccccc', '#666666', '#333333', '#000000',
    '#8B4513', '#FFD700', '#00CED1', '#FF69B4',
  ];

  constructor() {
    this.recentColors = JSON.parse(localStorage.getItem('xbron_recent_colors') || '[]');
    this.setupSwatches();
    this.setupColorPicker();
  }

  public getColor(): string {
    return this.currentColor;
  }

  public onColorChange(callback: ColorChangeCallback): void {
    this.listeners.push(callback);
  }

  private setupSwatches(): void {
    const palette = document.getElementById('color-palette');
    if (!palette) return;

    // Recent colors section
    const recentSection = document.createElement('div');
    recentSection.className = 'recent-colors-section';
    const recentLabel = document.createElement('div');
    recentLabel.className = 'recent-colors-label';
    recentLabel.textContent = '\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435:';
    recentSection.appendChild(recentLabel);
    this.recentContainer = document.createElement('div');
    this.recentContainer.className = 'recent-colors-swatches';
    recentSection.appendChild(this.recentContainer);
    palette.appendChild(recentSection);
    this.updateRecentSwatches();

    // Main swatches
    const swatchContainer = document.createElement('div');
    swatchContainer.className = 'color-swatches';

    this.presetColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        this.setColor(color);
      });
      swatchContainer.appendChild(swatch);
    });

    palette.appendChild(swatchContainer);
  }

  private updateRecentSwatches(): void {
    if (!this.recentContainer) return;
    this.recentContainer.innerHTML = '';
    this.recentColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch recent-color-swatch';
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        this.setColor(color);
      });
      this.recentContainer!.appendChild(swatch);
    });
  }

  private setupColorPicker(): void {
    const colorInput = document.getElementById('object-color') as HTMLInputElement;
    if (colorInput) {
      colorInput.addEventListener('input', () => {
        this.setColor(colorInput.value);
      });
    }
  }

  public setColor(color: string): void {
    this.currentColor = color;
    const colorInput = document.getElementById('object-color') as HTMLInputElement;
    if (colorInput) {
      colorInput.value = color;
    }

    // Update recent colors
    this.addToRecent(color);

    this.listeners.forEach(cb => cb(color));
  }

  private addToRecent(color: string): void {
    const normalized = color.toLowerCase();
    this.recentColors = this.recentColors.filter(c => c.toLowerCase() !== normalized);
    this.recentColors.unshift(color);
    if (this.recentColors.length > 5) {
      this.recentColors = this.recentColors.slice(0, 5);
    }
    localStorage.setItem('xbron_recent_colors', JSON.stringify(this.recentColors));
    this.updateRecentSwatches();
  }
}
