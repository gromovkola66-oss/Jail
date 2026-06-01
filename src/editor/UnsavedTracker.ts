import { History } from './History';

export class UnsavedTracker {
  private dirty: boolean = false;
  private history: History;
  private originalTitle: string;

  constructor(history: History) {
    this.history = history;
    this.originalTitle = document.title || 'XBRON Studio';

    // Monkey-patch history to detect changes
    const originalPush = history.push.bind(history);
    const originalRecord = history.record.bind(history);

    history.push = (action) => {
      originalPush(action);
      this.markDirty();
    };

    history.record = (action) => {
      originalRecord(action);
      this.markDirty();
    };

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
