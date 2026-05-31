import * as THREE from 'three';
import { Editor } from '../editor/Editor';

export class Outliner {
  private editor: Editor;
  private container: HTMLElement;
  private listEl: HTMLElement;

  constructor(editor: Editor) {
    this.editor = editor;

    const container = document.getElementById('outliner-list');
    if (!container) {
      throw new Error('Outliner container #outliner-list not found');
    }
    this.container = container;
    this.listEl = container;

    // Update on scene changes (objects added/removed)
    this.editor.onStatsChange(() => this.refresh());

    // Update highlight on selection change
    this.editor.selectionManager.onSelectionChange(() => this.updateSelection());

    // Initial render
    this.refresh();
  }

  private getSceneMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.editor.viewport.scene.children.forEach((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshes.push(obj);
      }
    });
    return meshes;
  }

  public refresh(): void {
    const meshes = this.getSceneMeshes();
    this.listEl.innerHTML = '';

    meshes.forEach((mesh) => {
      const item = document.createElement('div');
      item.className = 'outliner-item';

      // Check if this is the selected object
      if (this.editor.selectionManager.isSelected(mesh)) {
        item.classList.add('selected');
      }

      // Name label
      const nameSpan = document.createElement('span');
      nameSpan.className = 'outliner-item-name';
      nameSpan.textContent = mesh.name || 'Объект';
      item.appendChild(nameSpan);

      // Eye icon button for visibility
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'outliner-eye-btn';
      eyeBtn.title = mesh.visible ? 'Скрыть' : 'Показать';
      eyeBtn.innerHTML = mesh.visible ? '&#128065;' : '&#128064;';
      eyeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mesh.visible = !mesh.visible;
        eyeBtn.innerHTML = mesh.visible ? '&#128065;' : '&#128064;';
        eyeBtn.title = mesh.visible ? 'Скрыть' : 'Показать';
        if (!mesh.visible) {
          item.classList.add('hidden-object');
        } else {
          item.classList.remove('hidden-object');
        }
      });
      item.appendChild(eyeBtn);

      // Click to select
      item.addEventListener('click', () => {
        this.editor.selectionManager.select(mesh);
      });

      if (!mesh.visible) {
        item.classList.add('hidden-object');
      }

      this.listEl.appendChild(item);
    });
  }

  private updateSelection(): void {
    const items = this.listEl.querySelectorAll('.outliner-item');
    const meshes = this.getSceneMeshes();

    items.forEach((item, index) => {
      if (index < meshes.length && this.editor.selectionManager.isSelected(meshes[index])) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }
}
