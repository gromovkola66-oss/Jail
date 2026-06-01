import { Editor } from '../editor/Editor';
import { EditMode } from '../editor/modes/ModeManager';
import { StatusBar } from './StatusBar';

interface ButtonRule {
  el: HTMLElement;
  requiresSelection: boolean;
  requiresMode?: EditMode;
  disabledReason: string;
}

export class DisabledButtons {
  private editor: Editor;
  private statusBar: StatusBar;
  private rules: ButtonRule[] = [];

  constructor(editor: Editor, statusBar: StatusBar) {
    this.editor = editor;
    this.statusBar = statusBar;

    this.buildRules();
    this.attachClickInterceptors();

    editor.selectionManager.onSelectionChange(() => this.evaluate());
    editor.modeManager.onModeChange(() => this.evaluate());

    // Initial evaluation
    this.evaluate();
  }

  private buildRules(): void {
    const selectionButtons: { id: string; reason: string }[] = [
      { id: 'btn-subdivide', reason: '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442' },
      { id: 'btn-decimate', reason: '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442' },
      { id: 'btn-mirror-apply', reason: '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442' },
      { id: 'btn-bool-union', reason: '\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 2 \u043E\u0431\u044A\u0435\u043A\u0442\u0430' },
      { id: 'btn-bool-subtract', reason: '\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 2 \u043E\u0431\u044A\u0435\u043A\u0442\u0430' },
      { id: 'btn-bool-intersect', reason: '\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 2 \u043E\u0431\u044A\u0435\u043A\u0442\u0430' },
      { id: 'btn-add-bone', reason: '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442' },
      { id: 'btn-remove-bone', reason: '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442' },
    ];

    for (const { id, reason } of selectionButtons) {
      const el = document.getElementById(id);
      if (el) {
        this.rules.push({ el, requiresSelection: true, disabledReason: reason });
      }
    }

    // Tool buttons requiring selection
    const toolBtnSelectors = ['duplicate', 'delete', 'extrude'];
    for (const tool of toolBtnSelectors) {
      const el = document.querySelector<HTMLElement>(`.tool-btn[data-tool="${tool}"]`);
      if (el) {
        this.rules.push({
          el,
          requiresSelection: true,
          disabledReason: '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442',
        });
      }
    }

    // Loop cut requires selected object
    const loopCutEl = document.getElementById('btn-loopcut');
    if (loopCutEl) {
      this.rules.push({
        el: loopCutEl,
        requiresSelection: true,
        disabledReason: '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442',
      });
    }

    // Merge vertices requires vertex mode
    const mergeEl = document.getElementById('btn-merge-vertices');
    if (mergeEl) {
      this.rules.push({
        el: mergeEl,
        requiresSelection: true,
        requiresMode: 'vertex',
        disabledReason: '\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0440\u0435\u0436\u0438\u043C \u0432\u0435\u0440\u0448\u0438\u043D',
      });
    }
  }

  private evaluate(): void {
    const hasSelection = this.editor.selectionManager.getSelected() !== null;
    const currentMode = this.editor.modeManager.getMode();

    for (const rule of this.rules) {
      let disabled = false;

      if (rule.requiresSelection && !hasSelection) {
        disabled = true;
      }

      if (!disabled && rule.requiresMode && currentMode !== rule.requiresMode) {
        disabled = true;
      }

      if (disabled) {
        rule.el.classList.add('disabled-btn');
        rule.el.setAttribute('title', rule.disabledReason);
      } else {
        rule.el.classList.remove('disabled-btn');
        rule.el.removeAttribute('title');
      }
    }
  }

  private attachClickInterceptors(): void {
    for (const rule of this.rules) {
      rule.el.addEventListener('click', (e) => {
        if (rule.el.classList.contains('disabled-btn')) {
          e.stopImmediatePropagation();
          e.preventDefault();
          this.statusBar.setHint(rule.disabledReason);
          // Reset hint after 2 seconds
          setTimeout(() => {
            const mode = this.editor.modeManager.getMode();
            const modeHints: Record<EditMode, string> = {
              object: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C | G=\u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u0435 | R=\u0432\u0440\u0430\u0449\u0435\u043D\u0438\u0435 | S=\u043C\u0430\u0441\u0448\u0442\u0430\u0431',
              vertex: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0432\u0435\u0440\u0448\u0438\u043D\u0443 | \u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u044F',
              edge: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0440\u0435\u0431\u0440\u043E',
              face: '\u041A\u043B\u0438\u043A=\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0433\u0440\u0430\u043D\u044C | E=\u044D\u043A\u0441\u0442\u0440\u0443\u0437\u0438\u044F',
              weightpaint: '',
              sculpt: '\u041B\u041A\u041C=\u043A\u0438\u0441\u0442\u044C | Shift=\u0441\u0433\u043B\u0430\u0436\u0438\u0432\u0430\u043D\u0438\u0435 | Ctrl=\u0438\u043D\u0432\u0435\u0440\u0441\u0438\u044F | Alt+\u041B\u041A\u041C=\u043A\u0430\u043C\u0435\u0440\u0430',
            };
            this.statusBar.setHint(modeHints[mode] || '');
          }, 2000);
        }
      }, { capture: true });
    }
  }
}
