import { History } from './History';

export class UnsavedTracker {
  private dirty: boolean = false;
  private originalTitle: string;

  constructor(history: History) {
    this.originalTitle = document.title || 'XBRON Studio';

    // Use proper listener instead of monkey-patching
    history.onAction(() => this.markDirty());

    window.addEventListener('beforeunload', (e) => {
      if (this.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  private markDirty(): void {
    this.dirty = true;
    document.title = this.originalTitle + ' *';
  }

  public markSaved(): void {
    this.dirty = false;
    document.title = this.originalTitle;
  }
}
