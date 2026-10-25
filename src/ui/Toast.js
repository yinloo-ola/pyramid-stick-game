export class Toast {
  constructor(container) {
    this.container = container;
    this.element = document.createElement('div');
    this.element.className = 'game-toast';
    this.element.setAttribute('role', 'alert');
    this.container.appendChild(this.element);
    this.timeoutId = null;
  }

  show(message, type = 'warning', duration = 2400) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.element.textContent = message;
    this.element.className = `game-toast show ${type}`;

    this.timeoutId = setTimeout(() => {
      this.element.className = 'game-toast';
      this.timeoutId = null;
    }, duration);
  }

  hide() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.element.className = 'game-toast';
  }
}
