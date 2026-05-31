import { Editor } from './editor/Editor';
import { Toolbar } from './ui/Toolbar';
import { ToolPanel } from './ui/ToolPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { StatusBar } from './ui/StatusBar';
import { ColorPalette } from './ui/ColorPalette';
import { Outliner } from './ui/Outliner';
import { Hotkeys } from './editor/Hotkeys';
import { EditMode } from './editor/modes/ModeManager';

function init(): void {
  const viewport = document.getElementById('viewport');
  if (!viewport) {
    console.error('Viewport container not found');
    return;
  }

  const editor = new Editor(viewport);

  // Initialize UI
  new Toolbar(editor);
  new ToolPanel(editor);
  new PropertiesPanel(editor);
  new StatusBar(editor);
  new Outliner(editor);
  new Hotkeys(editor);

  // Color palette
  const colorPalette = new ColorPalette();
  colorPalette.onColorChange((color) => {
    editor.faceMode.setPaintColor(color);
  });

  // Mode buttons
  const modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode as EditMode;
      if (mode) {
        editor.setMode(mode);
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Update status bar
        const modeDisplay = document.getElementById('mode-display');
        if (modeDisplay) {
          const modeNames: Record<EditMode, string> = {
            object: 'Объект',
            vertex: 'Вершины',
            edge: 'Рёбра',
            face: 'Грани',
          };
          modeDisplay.textContent = `Режим: ${modeNames[mode]}`;
        }
      }
    });
  });

  // Grid snap toggle
  const gridSnapBtn = document.getElementById('btn-grid-snap');
  if (gridSnapBtn) {
    gridSnapBtn.addEventListener('click', () => {
      editor.gridSnap.toggle();
      gridSnapBtn.classList.toggle('active', editor.gridSnap.isEnabled());
    });
  }

  // Shading toggle
  const shadingBtn = document.getElementById('btn-shading');
  if (shadingBtn) {
    shadingBtn.addEventListener('click', () => {
      editor.toggleShading();
      shadingBtn.textContent = editor.shadingManager.isFlatShading() ? 'Плоское' : 'Гладкое';
      shadingBtn.classList.toggle('active', !editor.shadingManager.isFlatShading());
    });
  }

  // Export buttons
  const exportGlbBtn = document.getElementById('btn-export-glb');
  if (exportGlbBtn) {
    exportGlbBtn.addEventListener('click', () => editor.exportGLTF());
  }

  const exportObjBtn = document.getElementById('btn-export-obj');
  if (exportObjBtn) {
    exportObjBtn.addEventListener('click', () => editor.exportOBJ());
  }

  // Mirror buttons
  const mirrorBtn = document.getElementById('btn-mirror');
  if (mirrorBtn) {
    mirrorBtn.addEventListener('click', () => {
      editor.toggleMirror();
      mirrorBtn.classList.toggle('active', editor.mirrorTool.isEnabled());
    });
  }

  const mirrorAxisBtns = document.querySelectorAll<HTMLButtonElement>('.mirror-axis-btn');
  const mirrorAxes: Record<string, 'x' | 'y' | 'z'> = {
    'btn-mirror-x': 'x',
    'btn-mirror-y': 'y',
    'btn-mirror-z': 'z',
  };
  mirrorAxisBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const axis = mirrorAxes[btn.id];
      if (axis) {
        editor.mirrorTool.setAxis(axis, editor.viewport.scene);
        mirrorAxisBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  const mirrorApplyBtn = document.getElementById('btn-mirror-apply');
  if (mirrorApplyBtn) {
    mirrorApplyBtn.addEventListener('click', () => {
      editor.applyMirror();
    });
  }

  // Subdivide button
  const subdivideBtn = document.getElementById('btn-subdivide');
  if (subdivideBtn) {
    subdivideBtn.addEventListener('click', () => {
      editor.subdivideSelected();
    });
  }

  // Decimate button
  const decimateBtn = document.getElementById('btn-decimate');
  if (decimateBtn) {
    decimateBtn.addEventListener('click', () => {
      editor.decimateSelected();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
