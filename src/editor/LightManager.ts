import * as THREE from 'three';
import { Editor } from './Editor';
import { Action } from './History';

interface LightEntry {
  id: string;
  type: 'point' | 'spot' | 'directional';
  light: THREE.Light;
  helper: THREE.Object3D | null;
}

export class LightManager {
  private editor: Editor;
  private lights: LightEntry[] = [];
  private container: HTMLElement | null;
  private nextId: number = 1;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = document.getElementById('lights-section');
    this.buildUI();
  }

  private buildUI(): void {
    if (!this.container) return;
    this.renderList();
  }

  public addLight(type: 'point' | 'spot' | 'directional'): void {
    let light: THREE.Light;
    let helper: THREE.Object3D | null = null;

    switch (type) {
      case 'point':
        light = new THREE.PointLight(0xffffff, 1, 50);
        light.position.set(2, 3, 2);
        break;
      case 'spot':
        light = new THREE.SpotLight(0xffffff, 1);
        light.position.set(3, 5, 3);
        break;
      case 'directional':
        light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(5, 10, 5);
        break;
    }

    const id = '__light_' + this.nextId++;
    light.name = id;
    light.userData.isEditorInternal = true;

    const entry: LightEntry = { id, type, light, helper };
    const scene = this.editor.viewport.scene;

    const action: Action = {
      description: `Добавить свет (${type})`,
      execute: () => {
        scene.add(light);
        this.lights.push(entry);
        this.renderList();
      },
      undo: () => {
        scene.remove(light);
        this.lights = this.lights.filter((l) => l.id !== id);
        this.renderList();
      },
    };

    this.editor.history.push(action);
  }

  public removeLight(id: string): void {
    const entry = this.lights.find((l) => l.id === id);
    if (!entry) return;

    const scene = this.editor.viewport.scene;

    const action: Action = {
      description: 'Удалить свет',
      execute: () => {
        scene.remove(entry.light);
        this.lights = this.lights.filter((l) => l.id !== id);
        this.renderList();
      },
      undo: () => {
        scene.add(entry.light);
        this.lights.push(entry);
        this.renderList();
      },
    };

    this.editor.history.push(action);
  }

  public updateLight(id: string, props: { x?: number; y?: number; z?: number; color?: string; intensity?: number }): void {
    const entry = this.lights.find((l) => l.id === id);
    if (!entry) return;

    if (props.x !== undefined) entry.light.position.x = props.x;
    if (props.y !== undefined) entry.light.position.y = props.y;
    if (props.z !== undefined) entry.light.position.z = props.z;
    if (props.color !== undefined) (entry.light as THREE.PointLight).color.set(props.color);
    if (props.intensity !== undefined) entry.light.intensity = props.intensity;
  }

  private renderList(): void {
    if (!this.container) return;
    this.container.innerHTML = '';

    const title = document.createElement('h3');
    title.className = 'panel-title';
    title.textContent = 'Источники света';
    this.container.appendChild(title);

    this.lights.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'light-item';

      const label = document.createElement('span');
      label.className = 'light-label';
      const typeNames: Record<string, string> = { point: 'Точечный', spot: 'Прожектор', directional: 'Направленный' };
      label.textContent = typeNames[entry.type] || entry.type;
      row.appendChild(label);

      // Position inputs
      const posDiv = document.createElement('div');
      posDiv.className = 'property-row';
      ['x', 'y', 'z'].forEach((axis) => {
        const lbl = document.createElement('label');
        lbl.textContent = axis.toUpperCase();
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.5';
        input.value = entry.light.position[axis as 'x' | 'y' | 'z'].toFixed(1);
        input.addEventListener('change', () => {
          this.updateLight(entry.id, { [axis]: parseFloat(input.value) });
        });
        lbl.appendChild(input);
        posDiv.appendChild(lbl);
      });
      row.appendChild(posDiv);

      // Color
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = '#' + (entry.light as THREE.PointLight).color.getHexString();
      colorInput.addEventListener('input', () => {
        this.updateLight(entry.id, { color: colorInput.value });
      });
      row.appendChild(colorInput);

      // Intensity
      const intInput = document.createElement('input');
      intInput.type = 'number';
      intInput.step = '0.1';
      intInput.min = '0';
      intInput.value = entry.light.intensity.toFixed(1);
      intInput.addEventListener('change', () => {
        this.updateLight(entry.id, { intensity: parseFloat(intInput.value) });
      });
      row.appendChild(intInput);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'toolbar-btn';
      removeBtn.textContent = 'X';
      removeBtn.addEventListener('click', () => this.removeLight(entry.id));
      row.appendChild(removeBtn);

      this.container!.appendChild(row);
    });

    // Add light button group
    const addGroup = document.createElement('div');
    addGroup.className = 'light-add-group';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'light-type-select';
    const types: { value: 'point' | 'spot' | 'directional'; label: string }[] = [
      { value: 'point', label: 'Точечный' },
      { value: 'spot', label: 'Прожектор' },
      { value: 'directional', label: 'Направленный' },
    ];
    types.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = t.label;
      typeSelect.appendChild(opt);
    });
    addGroup.appendChild(typeSelect);

    const addBtn = document.createElement('button');
    addBtn.className = 'toolbar-btn';
    addBtn.textContent = 'Добавить свет';
    addBtn.addEventListener('click', () => {
      this.addLight(typeSelect.value as 'point' | 'spot' | 'directional');
    });
    addGroup.appendChild(addBtn);

    this.container.appendChild(addGroup);
  }
}
