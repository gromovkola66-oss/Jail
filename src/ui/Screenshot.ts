import { Editor } from '../editor/Editor';

export class Screenshot {
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;

    const btn = document.getElementById('btn-screenshot');
    if (btn) {
      btn.addEventListener('click', () => this.takeScreenshot());
    }
  }

  private takeScreenshot(): void {
    const renderer = this.editor.viewport.renderer;
    // Force a render to ensure the latest frame
    renderer.render(this.editor.viewport.scene, this.editor.viewport.camera);

    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'screenshot.png';
    a.click();
  }
}
