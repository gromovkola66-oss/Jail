import { Editor } from '../editor/Editor';
import { Timeline } from '../editor/animation/Timeline';

export class TimelinePanel {
  private editor: Editor;
  private timeline: Timeline;
  private panel: HTMLElement | null = null;
  private timelineBar: HTMLElement | null = null;
  private frameInput: HTMLInputElement | null = null;
  private totalFramesInput: HTMLInputElement | null = null;
  private fpsSelect: HTMLSelectElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;
  private stopBtn: HTMLButtonElement | null = null;

  constructor(editor: Editor, timeline: Timeline) {
    this.editor = editor;
    this.timeline = timeline;
    this.init();
  }

  private init(): void {
    this.panel = document.getElementById('timeline-panel');
    this.timelineBar = document.getElementById('timeline-bar');
    this.frameInput = document.getElementById('timeline-frame') as HTMLInputElement;
    this.totalFramesInput = document.getElementById('timeline-total-frames') as HTMLInputElement;
    this.fpsSelect = document.getElementById('timeline-fps') as HTMLSelectElement;
    this.playBtn = document.getElementById('btn-timeline-play') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('btn-timeline-pause') as HTMLButtonElement;
    this.stopBtn = document.getElementById('btn-timeline-stop') as HTMLButtonElement;

    const addKeyframeBtn = document.getElementById('btn-add-keyframe') as HTMLButtonElement;

    // Playback controls - connected to AnimationPlayer
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => this.editor.playAnimation());
    }
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => this.editor.pauseAnimation());
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => this.editor.stopAnimation());
    }

    // Frame input
    if (this.frameInput) {
      this.frameInput.addEventListener('change', () => {
        const frame = parseInt(this.frameInput!.value, 10);
        if (!isNaN(frame)) {
          this.timeline.setCurrentFrame(frame);
          this.updateTimelineBar();
        }
      });
    }

    // Total frames
    if (this.totalFramesInput) {
      this.totalFramesInput.value = String(this.timeline.getTotalFrames());
      this.totalFramesInput.addEventListener('change', () => {
        const total = parseInt(this.totalFramesInput!.value, 10);
        if (!isNaN(total) && total > 0) {
          this.timeline.setTotalFrames(total);
          this.updateTimelineBar();
        }
      });
    }

    // FPS selector
    if (this.fpsSelect) {
      this.fpsSelect.value = String(this.timeline.getFPS());
      this.fpsSelect.addEventListener('change', () => {
        const fps = parseInt(this.fpsSelect!.value, 10);
        this.timeline.setFPS(fps);
      });
    }

    // Add keyframe button
    if (addKeyframeBtn) {
      addKeyframeBtn.addEventListener('click', () => {
        this.editor.addKeyframe();
      });
    }

    // Timeline bar click - scrubbing
    if (this.timelineBar) {
      this.timelineBar.addEventListener('click', (e) => {
        const rect = this.timelineBar!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = x / rect.width;
        const frame = Math.round(ratio * (this.timeline.getTotalFrames() - 1));
        this.timeline.setCurrentFrame(frame);
        this.updateFrameInput();
        this.updateTimelineBar();
      });
    }

    // Toggle button
    const toggleBtn = document.getElementById('btn-timeline-toggle');
    if (toggleBtn && this.panel) {
      toggleBtn.addEventListener('click', () => {
        if (this.panel) {
          const isHidden = this.panel.style.display === 'none';
          this.panel.style.display = isHidden ? '' : 'none';
          toggleBtn.classList.toggle('active', isHidden);
        }
      });
    }

    // Preset buttons
    const presetIdleBtn = document.getElementById('btn-preset-idle') as HTMLButtonElement;
    const presetWalkBtn = document.getElementById('btn-preset-walk') as HTMLButtonElement;
    const presetAttackBtn = document.getElementById('btn-preset-attack') as HTMLButtonElement;

    if (presetIdleBtn) {
      presetIdleBtn.addEventListener('click', () => this.editor.applyPreset('idle'));
    }
    if (presetWalkBtn) {
      presetWalkBtn.addEventListener('click', () => this.editor.applyPreset('walk'));
    }
    if (presetAttackBtn) {
      presetAttackBtn.addEventListener('click', () => this.editor.applyPreset('attack'));
    }

    // Listen for frame changes (updates frame counter during playback)
    this.timeline.onFrameChange(() => {
      this.updateFrameInput();
      this.updateTimelineBar();
    });

    // Listen for keyframe changes
    this.timeline.onKeyframeChange(() => {
      this.updateTimelineBar();
    });

    // Wire animation player frame updates to the UI
    this.editor.animationPlayer.onFrameUpdate((frame: number) => {
      this.updateFrameInput();
      this.updateTimelineBar();
    });

    this.updateTimelineBar();
  }

  private updateFrameInput(): void {
    if (this.frameInput) {
      this.frameInput.value = String(this.timeline.getCurrentFrame());
    }
  }

  private updateTimelineBar(): void {
    if (!this.timelineBar) return;

    // Clear existing markers
    this.timelineBar.innerHTML = '';

    const totalFrames = this.timeline.getTotalFrames();
    const currentFrame = this.timeline.getCurrentFrame();

    // Create playhead
    const playhead = document.createElement('div');
    playhead.className = 'timeline-playhead';
    playhead.style.left = `${(currentFrame / Math.max(1, totalFrames - 1)) * 100}%`;
    this.timelineBar.appendChild(playhead);

    // Create keyframe dots
    const allKeyframes = this.timeline.getAllKeyframes();
    const framesWithKeyframes = new Set<number>();
    allKeyframes.forEach((boneFrames) => {
      boneFrames.forEach((_, frame) => {
        framesWithKeyframes.add(frame);
      });
    });

    framesWithKeyframes.forEach(frame => {
      const dot = document.createElement('div');
      dot.className = 'timeline-keyframe-dot';
      dot.style.left = `${(frame / Math.max(1, totalFrames - 1)) * 100}%`;
      dot.title = `Кадр ${frame}`;
      this.timelineBar!.appendChild(dot);
    });
  }
}
