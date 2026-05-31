export type ColorChangeCallback = (color: string) => void;

export class ColorPalette {
  private currentColor: string = '#ff0000';
  private listeners: ColorChangeCallback[] = [];

  private readonly presetColors: string[] = [
    '#ff0000', '#ff6600', '#ffcc00', '#33cc33',
    '#0099ff', '#6633cc', '#ff33cc', '#ffffff',
    '#cccccc', '#666666', '#333333', '#000000',
    '#8B4513', '#FFD700', '#00CED1', '#FF69B4',
  ];

  constructor() {
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
    this.listeners.forEach(cb => cb(color));
  }
}
