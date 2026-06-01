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
import { TimelinePanel } from './ui/TimelinePanel';
import { WelcomeScreen } from './ui/WelcomeScreen';
import { WorkspaceTabs } from './ui/WorkspaceTabs';
import { TemplatesPanel } from './ui/TemplatesPanel';
import { QuickActions } from './ui/QuickActions';
import { Tutorial } from './ui/Tutorial';
import { SculptPanel } from './ui/SculptPanel';
import { DisabledButtons } from './ui/DisabledButtons';

function startEditor(): void {
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
  const statusBar = new StatusBar(editor);
  new Outliner(editor);

  // New features
  new ThemeToggle(editor);
  new ContextMenu(editor);
  new CameraPresets(editor);
  new Screenshot(editor);
  new LightManager(editor);
  new SkyboxManager(editor);

  // Workspace tabs
  const workspaceTabs = new WorkspaceTabs();

  // Subscribe to workspace tab changes
  workspaceTabs.onTabChange((tab, _prevTab) => {
    if (tab === 'texturing') {
      editor.setMode('face');
      editor.setTool('paint');
      // Update mode buttons UI
      modeButtons.forEach(b => b.classList.remove('active'));
      const faceBtn = document.querySelector<HTMLButtonElement>('.mode-btn[data-mode="face"]');
      if (faceBtn) faceBtn.classList.add('active');
      const modeDisplay = document.getElementById('mode-display');
      if (modeDisplay) modeDisplay.textContent = '\u0420\u0435\u0436\u0438\u043C: \u0413\u0440\u0430\u043D\u0438';
      statusBar.setHint('\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0446\u0432\u0435\u0442 \u2192 \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0433\u0440\u0430\u043D\u044C | Alt+\u041A\u043B\u0438\u043A=\u043F\u0438\u043F\u0435\u0442\u043A\u0430 | Shift+\u041A\u043B\u0438\u043A=\u0437\u0430\u043B\u0438\u0432\u043A\u0430');
    } else {
      editor.setMode('object');
      editor.setTool('select');
      modeButtons.forEach(b => b.classList.remove('active'));
      const objBtn = document.querySelector<HTMLButtonElement>('.mode-btn[data-mode="object"]');
      if (objBtn) objBtn.classList.add('active');
      const modeDisplay = document.getElementById('mode-display');
      if (modeDisplay) modeDisplay.textContent = '\u0420\u0435\u0436\u0438\u043C: \u041E\u0431\u044A\u0435\u043A\u0442';
    }
  });

  // Project serialization
  const projectSerializer = new ProjectSerializer(editor);

  // Timeline panel
  new TimelinePanel(editor, editor.timeline);

  // Templates panel
  const templatesPanel = new TemplatesPanel(editor);
  const templatesBtnEl = document.getElementById('btn-templates');
  if (templatesBtnEl) {
    templatesBtnEl.addEventListener('click', () => {
      templatesPanel.open();
    });
  }

  // Quick actions
  const quickActions = new QuickActions(editor);
  quickActions.setOpenTemplates(() => templatesPanel.open());

  const quickActionsToggleBtn = document.getElementById('btn-quick-actions-toggle');
  if (quickActionsToggleBtn) {
    quickActionsToggleBtn.addEventListener('click', () => {
      const newState = !quickActions.isEnabled();
      quickActions.setEnabled(newState);
      quickActionsToggleBtn.classList.toggle('active', newState);
    });
  }

  const hotkeys = new Hotkeys(editor);

  // Sculpt panel
  new SculptPanel(editor);

  // Disabled buttons feedback
  new DisabledButtons(editor, statusBar);

  // Camera mode toggle
  const cameraModeBtn = document.getElementById('btn-camera-mode');
  if (cameraModeBtn) {
    cameraModeBtn.addEventListener('click', () => {
      editor.viewport.toggleCameraMode();
    });
    editor.viewport.onCameraModeChange((mode) => {
      cameraModeBtn.textContent = mode === 'orbit' ? '\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u0430\u044F \u043A\u0430\u043C\u0435\u0440\u0430' : '\u041E\u0440\u0431\u0438\u0442\u0430\u043B\u044C\u043D\u0430\u044F \u043A\u0430\u043C\u0435\u0440\u0430';
      cameraModeBtn.classList.toggle('active', mode === 'free');
    });
  }

  // Camera mode in status bar
  const cameraModeDisplay = document.getElementById('camera-mode-display');
  if (cameraModeDisplay) {
    editor.viewport.onCameraModeChange((mode) => {
      cameraModeDisplay.textContent = mode === 'orbit' ? '\u041A\u0430\u043C\u0435\u0440\u0430: \u041E\u0440\u0431\u0438\u0442\u0430' : '\u041A\u0430\u043C\u0435\u0440\u0430: \u0421\u0432\u043E\u0431\u043E\u0434\u043D\u0430\u044F';
    });
  }

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
            object: '\u041E\u0431\u044A\u0435\u043A\u0442',
            vertex: '\u0412\u0435\u0440\u0448\u0438\u043D\u044B',
            edge: '\u0420\u0451\u0431\u0440\u0430',
            face: '\u0413\u0440\u0430\u043D\u0438',
            weightpaint: '\u0412\u0435\u0441\u0430',
            sculpt: '\u0421\u043A\u0443\u043B\u044C\u043F\u0442\u0438\u043D\u0433',
          };
          modeDisplay.textContent = `\u0420\u0435\u0436\u0438\u043C: ${modeNames[mode]}`;
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
      shadingBtn.textContent = editor.shadingManager.isFlatShading() ? '\u041F\u043B\u043E\u0441\u043A\u043E\u0435' : '\u0413\u043B\u0430\u0434\u043A\u043E\u0435';
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

  // Bone buttons
  const addBoneBtn = document.getElementById('btn-add-bone');
  if (addBoneBtn) {
    addBoneBtn.addEventListener('click', () => {
      editor.addBoneToSelected();
    });
  }

  const removeBoneBtn = document.getElementById('btn-remove-bone');
  if (removeBoneBtn) {
    removeBoneBtn.addEventListener('click', () => {
      editor.removeBoneFromSelected();
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

function init(): void {
  const tutorial = new Tutorial();

  const welcome = new WelcomeScreen();
  welcome.onClose(() => {
    startEditor();
    tutorial.checkFirstLaunch();
  });

  const helpBtn = document.getElementById('btn-tutorial-help');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      tutorial.restart();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
