import { Editor, ToolMode } from '../editor/Editor';

export class ToolPanel {
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupToolButtons();
  }

  private setupToolButtons(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('#tool-panel .tool-btn');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool as ToolMode;
        if (tool) {
          // Handle special tools
          if (tool === 'duplicate') {
            this.editor.duplicate();
            return;
          }
          if (tool === 'delete') {
            this.editor.deleteSelected();
            return;
          }
          if (tool === 'extrude') {
            this.editor.extrudeSelected();
            return;
          }

          this.editor.setTool(tool);

          // Update active state
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
  }
}
