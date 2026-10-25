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
      this.scene.updateSticks(snapshot.sticks, snapshot.selected_row);
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
        if (check.type === 'ROW_RESTRICTION') {
          this.toast.show('⚠️ Pick from the same row! ➡️', 'warning');
        } else if (check.type === 'MAX_LIMIT') {
          this.toast.show('🖐️ You can only take 1 to 3 sticks!', 'warning');
        } else {
          this.toast.show(check.reason, 'warning');
        }
        return;
      }

      this.scene.triggerStickBounce(stickId);

      const res = this.state.toggleStick(stickId);
      if (res.success) {
        if (res.action === 'SELECTED') {
          this.audio.playTap(stick.row);
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
        this.toast.show('👆 Tap 1, 2, or 3 sticks first!', 'info');
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
      } else {
        const nextPlayerName = this.state.player_names[res.nextTurn] || 'Next Player';
        const nextPlayerAvatar = this.state.player_avatars[res.nextTurn] || '👉';
        this.toast.show(`👉 Pass the phone to ${nextPlayerAvatar} ${nextPlayerName}!`, 'info', 1800);
      }
    } finally {
      // Throttle confirm submissions to prevent accidental double-clicks (350ms)
      setTimeout(() => {
        this.isConfirming = false;
      }, 350);
    }
  }

  handleSaveNames(p1Name, p1Avatar, p2Name, p2Avatar) {
    this.state.setPlayerInfo('PLAYER_1', p1Name, p1Avatar);
    this.state.setPlayerInfo('PLAYER_2', p2Name, p2Avatar);
    this.audio.playTap(0);
    this.toast.show(`Hi ${p1Avatar} ${p1Name} & ${p2Avatar} ${p2Name}! Let's play! 🎮`, 'info', 2200);
  }

  handleResetGame() {
    this.audio.playReset();
    this.state.reset();
    this.scene.buildSticks(this.state.sticks);
    const p1Name = this.state.player_names['PLAYER_1'] || 'Player 1';
    const p1Avatar = this.state.player_avatars['PLAYER_1'] || '🦊';
    this.toast.show(`🔄 New Game! ${p1Avatar} ${p1Name} starts!`, 'info', 1800);
  }

  handleToggleMute() {
    return this.audio.toggleMute();
  }
}
