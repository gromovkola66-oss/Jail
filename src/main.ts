import { Editor } from './editor/Editor';
import { Toolbar } from './ui/Toolbar';
import { ToolPanel } from './ui/ToolPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { StatusBar } from './ui/StatusBar';

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
}

document.addEventListener('DOMContentLoaded', init);
