export class GameController {
  constructor(state, scene, ui, audio, toast) {
    this.state = state;
    this.scene = scene;
    this.ui = ui;
    this.audio = audio;
    this.toast = toast;

    // Mutex lock to prevent multi-selection race conditions (Section 6)
    this.isProcessingClick = false;

    // Debounce / throttle lock for confirm move button (Section 6)
    this.isConfirming = false;

    // Subscribe UI and 3D scene to state updates
    this.state.subscribe((snapshot) => {
      this.ui.render(snapshot);
      this.scene.updateSticks(snapshot.sticks);
    });

    // Initialize 3D scene with sticks
    this.scene.buildSticks(this.state.sticks);
    this.ui.render(this.state.getSnapshot());
    this.ui.updateMuteButton(this.audio.isMuted);
  }

  handleStickClick(stickId) {
    if (this.isProcessingClick || this.isConfirming) return;
    this.isProcessingClick = true;

    try {
      const stick = this.state.getStick(stickId);
      if (!stick) return;

      const check = this.state.canSelectStick(stickId);
      if (!check.valid) {
        this.audio.playError();
        this.toast.show(check.reason, 'warning');
        return;
      }

      const res = this.state.toggleStick(stickId);
      if (res.success) {
        if (res.action === 'SELECTED') {
          this.audio.playTap();
        } else if (res.action === 'DESELECTED') {
          this.audio.playDeselect();
        }
      }
    } finally {
      // Release mutex lock
      this.isProcessingClick = false;
    }
  }

  handleClearSelection() {
    if (this.state.selected_sticks.length > 0) {
      this.audio.playDeselect();
      this.state.clearSelection();
    }
  }

  handleConfirmMove() {
    if (this.isConfirming) return;
    this.isConfirming = true;

    try {
      if (this.state.selected_sticks.length === 0) {
        this.toast.show('Select at least 1 stick to confirm your move.', 'info');
        return;
      }

      const res = this.state.confirmMove();
      if (!res.success) {
        this.toast.show(res.reason, 'warning');
        return;
      }

      this.audio.playStrike();
      if (res.confirmedStickIds) {
        this.scene.triggerStrikeEffects(res.confirmedStickIds);
      }

      if (res.gameOver) {
        setTimeout(() => {
          this.audio.playWin();
          this.scene.triggerVictoryEffects();
        }, 300);
      }
    } finally {
      // Throttle confirm submissions to prevent accidental double-clicks (350ms)
      setTimeout(() => {
        this.isConfirming = false;
      }, 350);
    }
  }

  handleResetGame() {
    this.audio.playReset();
    this.state.reset();
    this.scene.buildSticks(this.state.sticks);
    this.toast.show('Game reset! Player 1 begins.', 'info', 1800);
  }

  handleToggleMute() {
    return this.audio.toggleMute();
  }
}
