export class Toast {
  public static show(message: string, duration: number = 3000): void {
    const el = document.createElement('div');
    el.className = 'toast-notification';
    el.textContent = message;
    document.body.appendChild(el);

    // Trigger reflow for animation
    el.offsetHeight;
    el.classList.add('toast-visible');

    setTimeout(() => {
      el.classList.add('toast-hiding');
      setTimeout(() => {
        el.remove();
      }, 300);
    }, duration);
  }
}
