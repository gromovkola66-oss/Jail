import * as THREE from 'three';
import { Editor } from '../editor/Editor';

export class Outliner {
  private editor: Editor;
  private container: HTMLElement;
  private listEl: HTMLElement;
  private dragSourceIndex: number = -1;

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
      if (obj instanceof THREE.Mesh && !obj.name.startsWith('__') && !obj.userData.isEditorInternal) {
        meshes.push(obj);
      }
    });
    return meshes;
  }

  public refresh(): void {
    const meshes = this.getSceneMeshes();
    this.listEl.innerHTML = '';

    meshes.forEach((mesh, index) => {
      const item = document.createElement('div');
      item.className = 'outliner-item';
      item.draggable = true;
      item.dataset.index = String(index);

      // Check if this is the selected object
      if (this.editor.selectionManager.isSelected(mesh)) {
        item.classList.add('selected');
      }

      // Name label
      const nameSpan = document.createElement('span');
      nameSpan.className = 'outliner-item-name';
      nameSpan.textContent = mesh.name || 'Объект';
      item.appendChild(nameSpan);

      // Double-click to rename
      nameSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startRename(nameSpan, mesh);
      });

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

      // Drag and drop handlers
      item.addEventListener('dragstart', (e) => {
        this.dragSourceIndex = index;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
        }
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
        item.classList.add('drag-over-item');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over-item');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over-item');
        const targetIndex = index;
        if (this.dragSourceIndex >= 0 && this.dragSourceIndex !== targetIndex) {
          this.reorderSceneChildren(this.dragSourceIndex, targetIndex);
        }
        this.dragSourceIndex = -1;
      });

      this.listEl.appendChild(item);
    });
  }

  private startRename(nameSpan: HTMLSpanElement, mesh: THREE.Mesh): void {
    const currentName = mesh.name || 'Объект';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'outliner-rename-input';
    input.value = currentName;

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishRename = () => {
      const newName = input.value.trim() || 'Объект';
      mesh.name = newName;
      this.refresh();
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = currentName;
        input.blur();
      }
    });
  }

  private reorderSceneChildren(fromIndex: number, toIndex: number): void {
    const meshes = this.getSceneMeshes();
    if (fromIndex < 0 || fromIndex >= meshes.length || toIndex < 0 || toIndex >= meshes.length) return;

    const scene = this.editor.viewport.scene;
    const meshToMove = meshes[fromIndex];

    // Remove and re-add at correct position relative to other meshes
    scene.remove(meshToMove);

    // Get the index in scene.children where the target mesh is
    const targetMesh = meshes[toIndex > fromIndex ? toIndex : toIndex];
    const sceneIdx = scene.children.indexOf(targetMesh);

    // Re-add the mesh
    scene.add(meshToMove);

    // Move it in children array to the right position
    const currentIdx = scene.children.indexOf(meshToMove);
    scene.children.splice(currentIdx, 1);
    const newSceneIdx = scene.children.indexOf(targetMesh);
    if (toIndex > fromIndex) {
      scene.children.splice(newSceneIdx + 1, 0, meshToMove);
    } else {
      scene.children.splice(newSceneIdx, 0, meshToMove);
    }

    this.refresh();
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
