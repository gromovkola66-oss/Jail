import { Editor } from './editor/Editor';
import { Toolbar } from './ui/Toolbar';
import { ToolPanel } from './ui/ToolPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { StatusBar } from './ui/StatusBar';
import { ColorPalette } from './ui/ColorPalette';
import { Outliner } from './ui/Outliner';
import { Hotkeys } from './editor/Hotkeys';
import { EditMode } from './editor/modes/ModeManager';
import { ThemeToggle } from './ui/ThemeToggle';
import { ContextMenu } from './ui/ContextMenu';
import { CameraPresets } from './ui/CameraPresets';
import { Screenshot } from './ui/Screenshot';
import { ProjectSerializer } from './editor/ProjectSerializer';
import { LightManager } from './editor/LightManager';
import { SkyboxManager } from './editor/SkyboxManager';

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

  // New features
  new ThemeToggle(editor);
  new ContextMenu(editor);
  new CameraPresets(editor);
  new Screenshot(editor);
  new LightManager(editor);
  new SkyboxManager(editor);

  // Project serialization
  const projectSerializer = new ProjectSerializer(editor);

  const hotkeys = new Hotkeys(editor);

  // Wire save/load hotkeys
  const fileProject = document.getElementById('file-project') as HTMLInputElement | null;

  hotkeys.onSave = () => {
    projectSerializer.saveProject();
  };

  hotkeys.onOpen = () => {
    if (fileProject) {
      fileProject.click();
    }
  };

  if (fileProject) {
    fileProject.addEventListener('change', () => {
      const file = fileProject.files?.[0];
      if (file) {
        projectSerializer.loadProject(file);
        fileProject.value = '';
      }
    });
  }

  // Color palette
  const colorPalette = new ColorPalette();
  colorPalette.onColorChange((color) => {
    editor.faceMode.setPaintColor(color);
  });

  // Eyedropper: pick color from face
  editor.faceMode.onColorPick((color) => {
    colorPalette.setColor(color);
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

  // Loop cut button
  const loopCutBtn = document.getElementById('btn-loopcut');
  if (loopCutBtn) {
    loopCutBtn.addEventListener('click', () => {
      editor.activateLoopCut();
    });
  }

  // Merge vertices button
  const mergeVerticesBtn = document.getElementById('btn-merge-vertices');
  if (mergeVerticesBtn) {
    mergeVerticesBtn.addEventListener('click', () => {
      editor.mergeVertices();
    });
  }

  // Boolean operation buttons
  const boolUnionBtn = document.getElementById('btn-bool-union');
  if (boolUnionBtn) {
    boolUnionBtn.addEventListener('click', () => {
      editor.booleanUnion();
    });
  }

  const boolSubtractBtn = document.getElementById('btn-bool-subtract');
  if (boolSubtractBtn) {
    boolSubtractBtn.addEventListener('click', () => {
      editor.booleanSubtract();
    });
  }

  const boolIntersectBtn = document.getElementById('btn-bool-intersect');
  if (boolIntersectBtn) {
    boolIntersectBtn.addEventListener('click', () => {
      editor.booleanIntersect();
    });
  }

  // Primitive Library buttons
  const libTreeBtn = document.getElementById('btn-lib-tree');
  if (libTreeBtn) {
    libTreeBtn.addEventListener('click', () => {
      editor.primitiveLibrary.addTree();
      editor.notifyStatsChange();
    });
  }

  const libRockBtn = document.getElementById('btn-lib-rock');
  if (libRockBtn) {
    libRockBtn.addEventListener('click', () => {
      editor.primitiveLibrary.addRock();
      editor.notifyStatsChange();
    });
  }

  const libHouseBtn = document.getElementById('btn-lib-house');
  if (libHouseBtn) {
    libHouseBtn.addEventListener('click', () => {
      editor.primitiveLibrary.addHouse();
      editor.notifyStatsChange();
    });
  }

  const libCharacterBtn = document.getElementById('btn-lib-character');
  if (libCharacterBtn) {
    libCharacterBtn.addEventListener('click', () => {
      editor.primitiveLibrary.addCharacter();
      editor.notifyStatsChange();
    });
  }

  const libSwordBtn = document.getElementById('btn-lib-sword');
  if (libSwordBtn) {
    libSwordBtn.addEventListener('click', () => {
      editor.primitiveLibrary.addSword();
      editor.notifyStatsChange();
    });
  }

  const libShieldBtn = document.getElementById('btn-lib-shield');
  if (libShieldBtn) {
    libShieldBtn.addEventListener('click', () => {
      editor.primitiveLibrary.addShield();
      editor.notifyStatsChange();
    });
  }

  // Import button
  const importBtn = document.getElementById('btn-import');
  const fileImport = document.getElementById('file-import') as HTMLInputElement | null;
  if (importBtn && fileImport) {
    importBtn.addEventListener('click', () => {
      fileImport.click();
    });
    fileImport.addEventListener('change', () => {
      const file = fileImport.files?.[0];
      if (file) {
        editor.importModel(file).catch(err => console.error('Import failed:', err));
        fileImport.value = '';
      }
    });
  }

  // Drag and drop on viewport
  const supportedExtensions = ['obj', 'glb', 'gltf'];
  viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    viewport.classList.add('drag-over');
  });
  viewport.addEventListener('dragleave', () => {
    viewport.classList.remove('drag-over');
  });
  viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    viewport.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (supportedExtensions.includes(ext)) {
          editor.importModel(file).catch(err => console.error('Import failed:', err));
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
