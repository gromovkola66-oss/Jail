import { Editor } from '../editor/Editor';
import { BrushType, FalloffType } from '../editor/modes/SculptMode';

export class SculptPanel {
  private editor: Editor;
  private container: HTMLElement;
  private radiusLabel: HTMLElement | null = null;
  private strengthLabel: HTMLElement | null = null;
  private radiusSlider: HTMLInputElement | null = null;
  private strengthSlider: HTMLInputElement | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = this.createPanel();
    const toolPanel = document.getElementById('tool-panel');
    if (toolPanel) {
      toolPanel.appendChild(this.container);
    }
    this.container.style.display = 'none';

    // Listen for mode changes
    editor.modeManager.onModeChange((mode) => {
      if (mode === 'sculpt') {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'sculpt-panel';

    // Brush type title
    const brushTitle = document.createElement('div');
    brushTitle.className = 'panel-title';
    brushTitle.textContent = '\u041A\u0438\u0441\u0442\u0438';
    panel.appendChild(brushTitle);

    // Brush buttons
    const brushes: { type: BrushType; label: string }[] = [
      { type: 'push_pull', label: '\u0412\u044B\u0442\u044F\u043D\u0443\u0442\u044C' },
      { type: 'smooth', label: '\u0421\u0433\u043B\u0430\u0434\u0438\u0442\u044C' },
      { type: 'flatten', label: '\u0412\u044B\u0440\u043E\u0432\u043D\u044F\u0442\u044C' },
      { type: 'inflate', label: '\u0420\u0430\u0437\u0434\u0443\u0442\u044C' },
    ];

    const brushBtns: HTMLButtonElement[] = [];
    for (const brush of brushes) {
      const btn = document.createElement('button');
      btn.className = 'sculpt-brush-btn';
      btn.textContent = brush.label;
      btn.dataset.brushType = brush.type;
      if (brush.type === this.editor.sculptMode.getBrushType()) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        this.editor.sculptMode.setBrushType(brush.type);
        brushBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      brushBtns.push(btn);
      panel.appendChild(btn);
    }

    // Settings title
    const settingsTitle = document.createElement('div');
    settingsTitle.className = 'panel-title';
    settingsTitle.textContent = '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438';
    panel.appendChild(settingsTitle);

    // Radius slider
    const radiusGroup = document.createElement('div');
    radiusGroup.className = 'sculpt-slider-group';
    const radiusLabelEl = document.createElement('div');
    radiusLabelEl.className = 'sculpt-slider-label';
    const radiusText = document.createElement('span');
    radiusText.textContent = '\u0420\u0430\u0434\u0438\u0443\u0441';
    const radiusValue = document.createElement('span');
    radiusValue.textContent = this.editor.sculptMode.getRadius().toFixed(1);
    this.radiusLabel = radiusValue;
    radiusLabelEl.appendChild(radiusText);
    radiusLabelEl.appendChild(radiusValue);
    const radiusSlider = document.createElement('input');
    radiusSlider.type = 'range';
    radiusSlider.className = 'sculpt-slider';
    radiusSlider.min = '0.1';
    radiusSlider.max = '5.0';
    radiusSlider.step = '0.1';
    radiusSlider.value = this.editor.sculptMode.getRadius().toString();
    this.radiusSlider = radiusSlider;
    radiusSlider.addEventListener('input', () => {
      const val = parseFloat(radiusSlider.value);
      this.editor.sculptMode.setRadius(val);
      radiusValue.textContent = val.toFixed(1);
    });
    radiusGroup.appendChild(radiusLabelEl);
    radiusGroup.appendChild(radiusSlider);
    panel.appendChild(radiusGroup);

    // Strength slider
    const strengthGroup = document.createElement('div');
    strengthGroup.className = 'sculpt-slider-group';
    const strengthLabelEl = document.createElement('div');
    strengthLabelEl.className = 'sculpt-slider-label';
    const strengthText = document.createElement('span');
    strengthText.textContent = '\u0421\u0438\u043B\u0430';
    const strengthValue = document.createElement('span');
    strengthValue.textContent = this.editor.sculptMode.getStrength().toFixed(2);
    this.strengthLabel = strengthValue;
    strengthLabelEl.appendChild(strengthText);
    strengthLabelEl.appendChild(strengthValue);
    const strengthSlider = document.createElement('input');
    strengthSlider.type = 'range';
    strengthSlider.className = 'sculpt-slider';
    strengthSlider.min = '0.01';
    strengthSlider.max = '1.0';
    strengthSlider.step = '0.01';
    strengthSlider.value = this.editor.sculptMode.getStrength().toString();
    this.strengthSlider = strengthSlider;
    strengthSlider.addEventListener('input', () => {
      const val = parseFloat(strengthSlider.value);
      this.editor.sculptMode.setStrength(val);
      strengthValue.textContent = val.toFixed(2);
    });
    strengthGroup.appendChild(strengthLabelEl);
    strengthGroup.appendChild(strengthSlider);
    panel.appendChild(strengthGroup);

    // Falloff buttons
    const falloffLabelEl = document.createElement('div');
    falloffLabelEl.className = 'sculpt-slider-label';
    const falloffText = document.createElement('span');
    falloffText.textContent = '\u0421\u043F\u0430\u0434';
    falloffLabelEl.appendChild(falloffText);
    panel.appendChild(falloffLabelEl);

    const falloffGroup = document.createElement('div');
    falloffGroup.className = 'sculpt-falloff-group';

    const falloffs: { type: FalloffType; label: string }[] = [
      { type: 'sharp', label: '\u0420\u0435\u0437\u043A\u0438\u0439' },
      { type: 'smooth', label: '\u041F\u043B\u0430\u0432\u043D\u044B\u0439' },
      { type: 'constant', label: '\u0420\u0430\u0432\u043D\u043E\u043C\u0435\u0440\u043D\u044B\u0439' },
    ];

    const falloffBtns: HTMLButtonElement[] = [];
    for (const f of falloffs) {
      const btn = document.createElement('button');
      btn.className = 'sculpt-falloff-btn';
      btn.textContent = f.label;
      if (f.type === this.editor.sculptMode.getFalloff()) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        this.editor.sculptMode.setFalloff(f.type);
        falloffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      falloffBtns.push(btn);
      falloffGroup.appendChild(btn);
    }
    panel.appendChild(falloffGroup);

    return panel;
  }

  private show(): void {
    this.container.style.display = 'flex';
    // Hide regular tool buttons
    const toolPanel = document.getElementById('tool-panel');
    if (toolPanel) {
      const elements = toolPanel.querySelectorAll<HTMLElement>('.tool-btn, .tool-separator, .panel-title');
      elements.forEach(el => {
        if (!this.container.contains(el)) {
          el.style.display = 'none';
        }
      });
    }
    // Sync slider values
    if (this.radiusSlider) {
      this.radiusSlider.value = this.editor.sculptMode.getRadius().toString();
    }
    if (this.strengthSlider) {
      this.strengthSlider.value = this.editor.sculptMode.getStrength().toString();
    }
    if (this.radiusLabel) {
      this.radiusLabel.textContent = this.editor.sculptMode.getRadius().toFixed(1);
    }
    if (this.strengthLabel) {
      this.strengthLabel.textContent = this.editor.sculptMode.getStrength().toFixed(2);
    }
  }

  private hide(): void {
    this.container.style.display = 'none';
    // Restore regular tool buttons
    const toolPanel = document.getElementById('tool-panel');
    if (toolPanel) {
      const elements = toolPanel.querySelectorAll<HTMLElement>('.tool-btn, .tool-separator, .panel-title');
      elements.forEach(el => {
        if (!this.container.contains(el)) {
          el.style.display = '';
        }
      });
    }
  }

  public updateRadiusDisplay(): void {
    if (this.radiusSlider) {
      this.radiusSlider.value = this.editor.sculptMode.getRadius().toString();
    }
    if (this.radiusLabel) {
      this.radiusLabel.textContent = this.editor.sculptMode.getRadius().toFixed(1);
    }
  }
}
