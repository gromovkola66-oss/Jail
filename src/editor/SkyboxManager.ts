import * as THREE from 'three';
import { Editor } from './Editor';

type BackgroundMode = 'solid' | 'gradient' | 'preset';

interface Preset {
  name: string;
  color: string;
}

export class SkyboxManager {
  private editor: Editor;
  private container: HTMLElement | null;
  private mode: BackgroundMode = 'solid';
  private solidColor: string = '#1a1a2e';
  private gradientTop: string = '#87ceeb';
  private gradientBottom: string = '#f0f0f0';

  private presets: Preset[] = [
    { name: 'Голубое небо', color: '#87ceeb' },
    { name: 'Закат', color: '#ff6b35' },
    { name: 'Пасмурно', color: '#708090' },
    { name: 'Ночь', color: '#1a1a2e' },
  ];

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = document.getElementById('skybox-section');
    this.buildUI();
  }

  private buildUI(): void {
    if (!this.container) return;
    this.container.innerHTML = '';

    const title = document.createElement('h3');
    title.className = 'panel-title';
    title.textContent = 'Фон сцены';
    this.container.appendChild(title);

    // Solid color picker
    const solidGroup = document.createElement('div');
    solidGroup.className = 'property-group';

    const solidLabel = document.createElement('label');
    solidLabel.className = 'property-label';
    solidLabel.textContent = 'Цвет фона';
    solidGroup.appendChild(solidLabel);

    const solidInput = document.createElement('input');
    solidInput.type = 'color';
    solidInput.value = this.solidColor;
    solidInput.addEventListener('input', () => {
      this.solidColor = solidInput.value;
      this.applySolidColor(this.solidColor);
    });
    solidGroup.appendChild(solidInput);
    this.container.appendChild(solidGroup);

    // Gradient section
    const gradGroup = document.createElement('div');
    gradGroup.className = 'property-group';

    const gradLabel = document.createElement('label');
    gradLabel.className = 'property-label';
    gradLabel.textContent = 'Градиент (верх/низ)';
    gradGroup.appendChild(gradLabel);

    const gradRow = document.createElement('div');
    gradRow.className = 'property-row';

    const topInput = document.createElement('input');
    topInput.type = 'color';
    topInput.value = this.gradientTop;
    topInput.addEventListener('input', () => {
      this.gradientTop = topInput.value;
      this.applyGradient();
    });

    const bottomInput = document.createElement('input');
    bottomInput.type = 'color';
    bottomInput.value = this.gradientBottom;
    bottomInput.addEventListener('input', () => {
      this.gradientBottom = bottomInput.value;
      this.applyGradient();
    });

    gradRow.appendChild(topInput);
    gradRow.appendChild(bottomInput);
    gradGroup.appendChild(gradRow);

    const gradBtn = document.createElement('button');
    gradBtn.className = 'toolbar-btn';
    gradBtn.textContent = 'Применить градиент';
    gradBtn.addEventListener('click', () => this.applyGradient());
    gradGroup.appendChild(gradBtn);

    this.container.appendChild(gradGroup);

    // Presets
    const presetGroup = document.createElement('div');
    presetGroup.className = 'property-group';

    const presetLabel = document.createElement('label');
    presetLabel.className = 'property-label';
    presetLabel.textContent = 'Пресеты';
    presetGroup.appendChild(presetLabel);

    const presetRow = document.createElement('div');
    presetRow.className = 'skybox-presets';

    this.presets.forEach((preset) => {
      const btn = document.createElement('button');
      btn.className = 'toolbar-btn';
      btn.textContent = preset.name;
      btn.addEventListener('click', () => {
        this.applySolidColor(preset.color);
        solidInput.value = preset.color;
      });
      presetRow.appendChild(btn);
    });

    presetGroup.appendChild(presetRow);
    this.container.appendChild(presetGroup);
  }

  private applySolidColor(color: string): void {
    this.mode = 'solid';
    this.editor.viewport.scene.background = new THREE.Color(color);
    // Remove gradient from viewport
    const viewport = document.getElementById('viewport');
    if (viewport) {
      viewport.style.background = '';
    }
  }

  private applyGradient(): void {
    this.mode = 'gradient';
    // Use CSS gradient on viewport as visual effect
    const viewport = document.getElementById('viewport');
    if (viewport) {
      viewport.style.background = `linear-gradient(to bottom, ${this.gradientTop}, ${this.gradientBottom})`;
    }
    // Set scene background to null so CSS shows through
    this.editor.viewport.scene.background = null;
  }
}
