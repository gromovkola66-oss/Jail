import * as THREE from 'three';
import { Editor } from '../editor/Editor';

export class Outliner {
  private editor: Editor;
  private container: HTMLElement;
  private listEl: HTMLElement;
  private dragSourceIndex: number = -1;
  private refreshScheduled: boolean = false;
  private currentMeshUUIDs: string[] = [];

  constructor(editor: Editor) {
    this.editor = editor;

    const container = document.getElementById('outliner-list');
    if (!container) {
      throw new Error('Outliner container #outliner-list not found');
    }
    this.container = container;
    this.listEl = container;

    // Update on scene changes (objects added/removed)
    this.editor.onStatsChange(() => this.scheduleRefresh());

    // Update highlight on selection change
    this.editor.selectionManager.onSelectionChange(() => this.updateSelection());

    // Initial render
    this.refresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshScheduled) return;
    this.refreshScheduled = true;
    requestAnimationFrame(() => {
      this.refreshScheduled = false;
      this.refresh();
    });
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
    const newUUIDs = meshes.map(m => m.uuid);

    // If mesh list hasn't changed, just do a lightweight update
    if (this.arraysEqual(newUUIDs, this.currentMeshUUIDs)) {
      this.updateExistingItems(meshes);
      return;
    }

    // Full rebuild needed (meshes added/removed)
    this.currentMeshUUIDs = newUUIDs;
    this.fullRebuild(meshes);
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private updateExistingItems(meshes: THREE.Mesh[]): void {
    const items = this.listEl.querySelectorAll('.outliner-item');
    items.forEach((item, index) => {
      if (index >= meshes.length) return;
      const mesh = meshes[index];
      const nameSpan = item.querySelector('.outliner-item-name');
      if (nameSpan) {
        nameSpan.textContent = mesh.name || '\u041E\u0431\u044A\u0435\u043A\u0442';
      }
      if (this.editor.selectionManager.isSelected(mesh)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
      if (mesh.visible) {
        item.classList.remove('hidden-object');
      } else {
        item.classList.add('hidden-object');
      }
    });
  }

  private fullRebuild(meshes: THREE.Mesh[]): void {
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
      nameSpan.textContent = mesh.name || '\u041E\u0431\u044A\u0435\u043A\u0442';
      item.appendChild(nameSpan);

      // Double-click to rename
      nameSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startRename(nameSpan, mesh);
      });

      // Eye icon button for visibility
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'outliner-eye-btn';
      eyeBtn.title = mesh.visible ? '\u0421\u043A\u0440\u044B\u0442\u044C' : '\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C';
      eyeBtn.innerHTML = mesh.visible ? '&#128065;' : '&#128064;';
      eyeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mesh.visible = !mesh.visible;
        eyeBtn.innerHTML = mesh.visible ? '&#128065;' : '&#128064;';
        eyeBtn.title = mesh.visible ? '\u0421\u043A\u0440\u044B\u0442\u044C' : '\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C';
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

      // Double-click to focus camera on object
      item.addEventListener('dblclick', () => {
        this.editor.viewport.focusOnObject(mesh);
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
    const currentName = mesh.name || '\u041E\u0431\u044A\u0435\u043A\u0442';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'outliner-rename-input';
    input.value = currentName;

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishRename = () => {
      const newName = input.value.trim() || '\u041E\u0431\u044A\u0435\u043A\u0442';
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

    // Remove all user meshes from scene
    for (const mesh of meshes) {
      scene.remove(mesh);
    }

    // Reorder the array: move item from fromIndex to toIndex
    const [moved] = meshes.splice(fromIndex, 1);
    meshes.splice(toIndex, 0, moved);

    // Re-add all meshes in new order
    for (const mesh of meshes) {
      scene.add(mesh);
    }

    // Force full rebuild since order changed
    this.currentMeshUUIDs = [];
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
