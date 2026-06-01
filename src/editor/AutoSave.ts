import { ProjectSerializer } from './ProjectSerializer';

export class AutoSave {
  private serializer: ProjectSerializer;
  private intervalId: number | null = null;
  private static STORAGE_KEY = 'xbron_autosave';
  private static TIME_KEY = 'xbron_autosave_time';

  constructor(serializer: ProjectSerializer) {
    this.serializer = serializer;
    this.start();

    window.addEventListener('beforeunload', () => {
      this.save();
    });
  }

  private start(): void {
    this.intervalId = window.setInterval(() => {
      this.save();
    }, 60000); // 60 seconds
  }

  public save(): void {
    try {
      const json = this.serializer.serializeScene();
      localStorage.setItem(AutoSave.STORAGE_KEY, json);
      localStorage.setItem(AutoSave.TIME_KEY, String(Date.now()));
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  }

  public static hasAutoSave(): boolean {
    return localStorage.getItem(AutoSave.STORAGE_KEY) !== null;
  }

  public static getAutoSaveData(): string | null {
    return localStorage.getItem(AutoSave.STORAGE_KEY);
  }

  public static getAutoSaveTime(): number | null {
    const t = localStorage.getItem(AutoSave.TIME_KEY);
    return t ? parseInt(t, 10) : null;
  }

  public static clearAutoSave(): void {
    localStorage.removeItem(AutoSave.STORAGE_KEY);
    localStorage.removeItem(AutoSave.TIME_KEY);
  }

  public dispose(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }
}
