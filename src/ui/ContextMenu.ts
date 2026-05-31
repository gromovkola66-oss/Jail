import * as THREE from 'three';
import { Editor } from '../editor/Editor';

export class ContextMenu {
  private editor: Editor;
  private menuEl: HTMLDivElement;
  private targetMesh: THREE.Mesh | null = null;

  constructor(editor: Editor) {
    this.editor = editor;

    this.menuEl = document.createElement('div');
    this.menuEl.className = 'context-menu';
    this.menuEl.style.display = 'none';
    document.body.appendChild(this.menuEl);

    const container = document.getElementById('viewport');
    if (container) {
      container.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    }

    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#viewport')) {
        this.hide();
      }
    });
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();

    const container = document.getElementById('viewport');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.editor.viewport.camera);

    const meshes: THREE.Mesh[] = [];
    this.editor.viewport.scene.children.forEach((obj) => {
      if (obj instanceof THREE.Mesh && !obj.name.startsWith('__') && !obj.userData.isEditorInternal) {
        meshes.push(obj);
      }
    });

    const intersects = raycaster.intersectObjects(meshes, false);
    this.targetMesh = intersects.length > 0 ? (intersects[0].object as THREE.Mesh) : null;

    this.show(e.clientX, e.clientY);
  }

  private show(x: number, y: number): void {
    this.menuEl.innerHTML = '';

    const items = [
      { label: 'Дублировать', action: () => this.duplicateTarget() },
      { label: 'Удалить', action: () => this.deleteTarget() },
      { label: 'Переименовать', action: () => this.renameTarget() },
      { label: 'Скрыть', action: () => this.hideTarget() },
      { label: 'Выделить все', action: () => this.selectAll() },
    ];

    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'context-menu-item';
      el.textContent = item.label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action();
        this.hide();
      });
      this.menuEl.appendChild(el);
    });

    this.menuEl.style.left = x + 'px';
    this.menuEl.style.top = y + 'px';
    this.menuEl.style.display = 'block';
  }

  private hide(): void {
    this.menuEl.style.display = 'none';
  }

  private duplicateTarget(): void {
    if (!this.targetMesh) return;
    this.editor.selectionManager.select(this.targetMesh);
    this.editor.duplicate();
  }

  private deleteTarget(): void {
    if (!this.targetMesh) return;
    this.editor.selectionManager.select(this.targetMesh);
    this.editor.deleteSelected();
  }

  private renameTarget(): void {
    if (!this.targetMesh) return;
    const newName = prompt('Новое имя:');
    if (newName !== null && newName.trim() !== '') {
      this.targetMesh.name = newName.trim();
      this.editor.notifyStatsChange();
    }
  }

  private hideTarget(): void {
    if (!this.targetMesh) return;
    this.targetMesh.visible = false;
    this.editor.notifyStatsChange();
  }

  private selectAll(): void {
    const meshes: THREE.Mesh[] = [];
    this.editor.viewport.scene.children.forEach((obj) => {
      if (obj instanceof THREE.Mesh && !obj.name.startsWith('__') && !obj.userData.isEditorInternal) {
        meshes.push(obj);
      }
    });
    if (meshes.length > 0) {
      this.editor.selectionManager.select(meshes[0]);
    }
  }
}
