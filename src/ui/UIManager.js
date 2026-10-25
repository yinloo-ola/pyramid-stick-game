import { Player, GameStatus } from '../state/types.js';

export class UIManager {
  constructor(handlers) {
    this.handlers = handlers; // { onConfirm, onReset, onToggleMute, onClearSelection, onSaveNames, onOpenMultiplayer, onJoinMultiplayer, onLeaveMultiplayer }
    this.statusBanner = document.getElementById('status-banner');
    this.statusSubtext = document.getElementById('status-subtext');
    this.player1Card = document.getElementById('p1-card');
    this.player2Card = document.getElementById('p2-card');
    this.p1NameDisplay = document.getElementById('p1-name-display');
    this.p2NameDisplay = document.getElementById('p2-name-display');
    this.p1AvatarBadge = document.getElementById('p1-avatar-badge');
    this.p2AvatarBadge = document.getElementById('p2-avatar-badge');

    this.btnConfirm = document.getElementById('btn-confirm');
    this.btnClear = document.getElementById('btn-clear');
    this.btnReset = document.getElementById('btn-reset');
    this.btnMute = document.getElementById('btn-mute');
    this.btnRules = document.getElementById('btn-rules');
    this.btnNames = document.getElementById('btn-names');
    this.btnMode = document.getElementById('btn-mode');
    this.modeBtnText = document.getElementById('mode-btn-text');

    // Online Badge
    this.onlineBadge = document.getElementById('online-badge');
    this.onlineBadgeText = document.getElementById('online-badge-text');
    this.btnLeaveOnline = document.getElementById('btn-leave-online');

    // Multiplayer Modal
    this.multiplayerModal = document.getElementById('multiplayer-modal');
    this.btnCloseMultiplayer = document.getElementById('btn-close-multiplayer');
    this.mpTabHost = document.getElementById('mp-tab-host');
    this.mpTabJoin = document.getElementById('mp-tab-join');
    this.mpPanelHost = document.getElementById('mp-panel-host');
    this.mpPanelJoin = document.getElementById('mp-panel-join');
    this.hostRoomCode = document.getElementById('host-room-code');
    this.qrCodeImg = document.getElementById('qr-code-img');
    this.btnCopyLink = document.getElementById('btn-copy-link');
    this.hostWaitingStatus = document.getElementById('host-waiting-status');
    this.joinForm = document.getElementById('join-form');
    this.inputJoinCode = document.getElementById('input-join-code');

    // Other Modals
    this.rulesModal = document.getElementById('rules-modal');
    this.btnCloseRules = document.getElementById('btn-close-rules');
    this.namesModal = document.getElementById('names-modal');
    this.btnCloseNames = document.getElementById('btn-close-names');
    this.namesForm = document.getElementById('names-form');
    this.inputP1Name = document.getElementById('input-p1-name');
    this.inputP2Name = document.getElementById('input-p2-name');
    this.p1AvatarPicker = document.getElementById('p1-avatar-picker');
    this.p2AvatarPicker = document.getElementById('p2-avatar-picker');

    this.gameOverModal = document.getElementById('game-over-modal');
    this.winnerTitle = document.getElementById('winner-title');
    this.winnerSubtitle = document.getElementById('winner-subtitle');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    this.selectedP1Avatar = '🦊';
    this.selectedP2Avatar = '🐼';
    this.currentShareUrl = '';
    this.latestSnapshot = null;

    this.bindEvents();
    this.setupAvatarPickers();
    this.setupMultiplayerTabs();
  }

  setupAvatarPickers() {
    this.p1AvatarPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.avatar-option');
      if (!btn) return;
      this.p1AvatarPicker.querySelectorAll('.avatar-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      this.selectedP1Avatar = btn.dataset.avatar;
    });

    this.p2AvatarPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.avatar-option');
      if (!btn) return;
      this.p2AvatarPicker.querySelectorAll('.avatar-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      this.selectedP2Avatar = btn.dataset.avatar;
    });
  }

  setupMultiplayerTabs() {
    this.mpTabHost.addEventListener('click', () => {
      this.mpTabHost.classList.add('active');
      this.mpTabJoin.classList.remove('active');
      this.mpPanelHost.classList.add('active');
      this.mpPanelJoin.classList.remove('active');
    });

    this.mpTabJoin.addEventListener('click', () => {
      this.mpTabJoin.classList.add('active');
      this.mpTabHost.classList.remove('active');
      this.mpPanelJoin.classList.add('active');
      this.mpPanelHost.classList.remove('active');
      setTimeout(() => this.inputJoinCode.focus(), 100);
    });
  }

  async openMultiplayerModal() {
    this.multiplayerModal.classList.add('visible');
    // Default to host tab and trigger creation
    this.mpTabHost.click();
    this.hostRoomCode.textContent = '----';
    this.hostWaitingStatus.innerHTML = '<span class="spinner-dot"></span> Generating room code...';

    if (this.handlers.onOpenMultiplayer) {
      try {
        const info = await this.handlers.onOpenMultiplayer();
        if (info) {
          this.hostRoomCode.textContent = info.code;
          this.qrCodeImg.src = info.qrDataUrl;
          this.currentShareUrl = info.shareUrl;
          this.hostWaitingStatus.innerHTML = '<span class="spinner-dot"></span> Waiting for friend to connect...';
        }
      } catch (err) {
        this.hostWaitingStatus.textContent = 'Failed to generate room. Try again.';
      }
    }
  }

  closeMultiplayerModal() {
    this.multiplayerModal.classList.remove('visible');
  }

  notifyPeerConnected(myRole, roomCode) {
    this.closeMultiplayerModal();
    const roleText = myRole === Player.PLAYER_1 ? '🦊 You are Player 1' : '🐼 You are Player 2';
    this.onlineBadgeText.textContent = `Room ${roomCode} • ${roleText}`;
    this.onlineBadge.classList.remove('hidden');
    this.modeBtnText.textContent = 'Connected 🟢';
  }

  notifyPeerDisconnected() {
    this.onlineBadge.classList.add('hidden');
    this.modeBtnText.textContent = '2 Phones';
  }

  notifyPeerError(err) {
    this.hostWaitingStatus.textContent = 'Connection error. Check code and try again.';
  }

  openNamesModal() {
    if (this.latestSnapshot) {
      this.inputP1Name.value = this.latestSnapshot.player_names[Player.PLAYER_1] || 'Player 1';
      this.inputP2Name.value = this.latestSnapshot.player_names[Player.PLAYER_2] || 'Player 2';
      this.selectedP1Avatar = this.latestSnapshot.player_avatars[Player.PLAYER_1] || '🦊';
      this.selectedP2Avatar = this.latestSnapshot.player_avatars[Player.PLAYER_2] || '🐼';

      // Update selected avatar buttons
      this.p1AvatarPicker.querySelectorAll('.avatar-option').forEach((btn) => {
        btn.classList.toggle('selected', btn.dataset.avatar === this.selectedP1Avatar);
      });
      this.p2AvatarPicker.querySelectorAll('.avatar-option').forEach((btn) => {
        btn.classList.toggle('selected', btn.dataset.avatar === this.selectedP2Avatar);
      });
    }
    this.namesModal.classList.add('visible');
    setTimeout(() => this.inputP1Name.focus(), 100);
  }

  closeNamesModal() {
    this.namesModal.classList.remove('visible');
  }

  bindEvents() {
    this.btnConfirm.addEventListener('click', () => {
      this.handlers.onConfirm?.();
    });

    this.btnClear.addEventListener('click', () => {
      this.handlers.onClearSelection?.();
    });

    this.btnReset.addEventListener('click', () => {
      this.handlers.onReset?.();
    });

    this.btnMute.addEventListener('click', () => {
      const isMuted = this.handlers.onToggleMute?.();
      this.updateMuteButton(isMuted);
    });

    this.btnRules.addEventListener('click', () => {
      this.rulesModal.classList.add('visible');
    });

    this.btnCloseRules.addEventListener('click', () => {
      this.rulesModal.classList.remove('visible');
    });

    this.rulesModal.addEventListener('click', (e) => {
      if (e.target === this.rulesModal) {
        this.rulesModal.classList.remove('visible');
      }
    });

    // Multiplayer Buttons
    this.btnMode.addEventListener('click', () => {
      this.openMultiplayerModal();
    });

    this.btnCloseMultiplayer.addEventListener('click', () => {
      this.closeMultiplayerModal();
    });

    this.multiplayerModal.addEventListener('click', (e) => {
      if (e.target === this.multiplayerModal) {
        this.closeMultiplayerModal();
      }
    });

    this.btnCopyLink.addEventListener('click', () => {
      if (this.currentShareUrl && navigator.clipboard) {
        navigator.clipboard.writeText(this.currentShareUrl).then(() => {
          this.btnCopyLink.textContent = '✅ Copied!';
          setTimeout(() => {
            this.btnCopyLink.textContent = '📋 Copy Invite Link';
          }, 2000);
        });
      }
    });

    this.joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = this.inputJoinCode.value.trim();
      if (code) {
        this.handlers.onJoinMultiplayer?.(code);
      }
    });

    this.btnLeaveOnline.addEventListener('click', () => {
      this.handlers.onLeaveMultiplayer?.();
    });

    // Open Names Modal
    this.btnNames.addEventListener('click', () => this.openNamesModal());
    this.player1Card.addEventListener('click', () => this.openNamesModal());
    this.player2Card.addEventListener('click', () => this.openNamesModal());

    this.btnCloseNames.addEventListener('click', () => this.closeNamesModal());
    this.namesModal.addEventListener('click', (e) => {
      if (e.target === this.namesModal) {
        this.closeNamesModal();
      }
    });

    this.namesForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const p1Name = this.inputP1Name.value.trim() || 'Player 1';
      const p2Name = this.inputP2Name.value.trim() || 'Player 2';
      this.handlers.onSaveNames?.(p1Name, this.selectedP1Avatar, p2Name, this.selectedP2Avatar);
      this.closeNamesModal();
    });

    this.btnPlayAgain.addEventListener('click', () => {
      this.gameOverModal.classList.remove('visible');
      this.handlers.onReset?.();
    });
  }

  updateMuteButton(isMuted) {
    this.btnMute.textContent = isMuted ? '🔇' : '🔊';
    this.btnMute.setAttribute('aria-label', isMuted ? 'Unmute Sound' : 'Mute Sound');
  }

  render(snapshot, context = {}) {
    this.latestSnapshot = snapshot;
    const {
      current_turn,
      game_status,
      winner,
      loser,
      selected_sticks,
      board_state,
      selected_row,
      player_names,
      player_avatars,
    } = snapshot;

    const { gameMode = 'LOCAL', myPlayerRole = null } = context;
    const isOnline = gameMode === 'ONLINE';
    const isMyTurn = !isOnline || (myPlayerRole && current_turn === myPlayerRole);

    const p1Name = (player_names && player_names[Player.PLAYER_1]) || 'Player 1';
    const p2Name = (player_names && player_names[Player.PLAYER_2]) || 'Player 2';
    const p1Avatar = (player_avatars && player_avatars[Player.PLAYER_1]) || '🦊';
    const p2Avatar = (player_avatars && player_avatars[Player.PLAYER_2]) || '🐼';

    // 1. Update Player Displays
    this.p1NameDisplay.textContent = p1Name;
    this.p2NameDisplay.textContent = p2Name;
    this.p1AvatarBadge.textContent = p1Avatar;
    this.p2AvatarBadge.textContent = p2Avatar;

    const isP1 = current_turn === Player.PLAYER_1;
    this.player1Card.classList.toggle('active-turn', isP1 && game_status === GameStatus.PLAYING);
    this.player2Card.classList.toggle('active-turn', !isP1 && game_status === GameStatus.PLAYING);

    // 2. Update Row Tracker Chips
    if (board_state) {
      for (let r = 0; r < 4; r++) {
        const chip = document.getElementById(`chip-r${r + 1}`);
        if (chip) {
          const remaining = board_state[r];
          chip.innerHTML = `Row ${r + 1}: <b>${remaining}</b>`;
          chip.classList.toggle('empty', remaining === 0);
          chip.classList.toggle('selected-row', selected_row === r);
        }
      }
    }

    // 3. Update Status Banner & Action Buttons
    if (game_status === GameStatus.PLAYING) {
      this.gameOverModal.classList.remove('visible');
      const activeAvatar = isP1 ? p1Avatar : p2Avatar;
      const activeName = isP1 ? p1Name : p2Name;

      if (isOnline) {
        if (isMyTurn) {
          this.statusBanner.textContent = `✨ YOUR TURN!`;
          this.statusBanner.className = `status-banner ${isP1 ? 'p1-turn' : 'p2-turn'}`;
          this.statusSubtext.textContent = `Tap 1 to 3 sticks in ONE row!`;
        } else {
          this.statusBanner.textContent = `⏳ WAITING FOR ${activeName.toUpperCase()}...`;
          this.statusBanner.className = `status-banner ${isP1 ? 'p1-turn' : 'p2-turn'}`;
          this.statusSubtext.textContent = `${activeAvatar} ${activeName} is picking sticks on their phone`;
        }
      } else {
        this.statusBanner.textContent = `${activeAvatar} ${activeName.toUpperCase()}'S TURN`;
        this.statusBanner.className = `status-banner ${isP1 ? 'p1-turn' : 'p2-turn'}`;

        if (selected_sticks.length === 0) {
          this.statusSubtext.textContent = `👆 ${activeName}, tap 1, 2, or 3 sticks in ONE row`;
        } else {
          const count = selected_sticks.length;
          if (count === 1) {
            this.statusSubtext.textContent = '1 stick picked! Ready to cross or pick more';
          } else if (count === 2) {
            this.statusSubtext.textContent = '2 sticks picked! Ready to cross or pick 1 more';
          } else {
            this.statusSubtext.textContent = '3 sticks picked (Max!) • Tap button to cross!';
          }
        }
      }

      // Kid-friendly dynamic Confirm Button
      if (isOnline && !isMyTurn) {
        this.btnConfirm.disabled = true;
        this.btnConfirm.classList.add('disabled');
        this.btnConfirm.innerHTML = `⏳ Waiting for ${activeName}...`;
        this.btnClear.classList.remove('visible');
      } else if (selected_sticks.length > 0) {
        this.btnConfirm.disabled = false;
        this.btnConfirm.classList.remove('disabled');
        const count = selected_sticks.length;
        this.btnConfirm.innerHTML = `✅ Cross Out ${count} Stick${count > 1 ? 's' : ''}!`;
        this.btnClear.classList.add('visible');
      } else {
        this.btnConfirm.disabled = true;
        this.btnConfirm.classList.add('disabled');
        this.btnConfirm.innerHTML = `👆 Pick 1 to 3 sticks`;
        this.btnClear.classList.remove('visible');
      }
    } else if (game_status === GameStatus.GAME_OVER) {
      const winnerName = (player_names && player_names[winner]) || (winner === Player.PLAYER_1 ? 'Player 1' : 'Player 2');
      const loserName = (player_names && player_names[loser]) || (loser === Player.PLAYER_1 ? 'Player 1' : 'Player 2');
      const winnerAvatar = (player_avatars && player_avatars[winner]) || (winner === Player.PLAYER_1 ? '🦊' : '🐼');
      const loserAvatar = (player_avatars && player_avatars[loser]) || (loser === Player.PLAYER_1 ? '🦊' : '🐼');

      const isMeWinner = isOnline && myPlayerRole === winner;

      if (isOnline) {
        this.statusBanner.textContent = isMeWinner ? `🏆 YOU WON!` : `🏆 ${winnerName.toUpperCase()} WINS!`;
      } else {
        this.statusBanner.textContent = `${winnerAvatar} ${winnerName.toUpperCase()} WINS!`;
      }

      this.statusBanner.className = `status-banner winner-announced`;
      this.statusSubtext.textContent = `${loserName} is left with the final stick.`;

      // Freeze button
      this.btnConfirm.disabled = true;
      this.btnConfirm.classList.add('disabled');
      this.btnConfirm.innerHTML = `🏆 MATCH OVER`;
      this.btnClear.classList.remove('visible');

      // Show Kid-Friendly Game Over Modal
      this.winnerTitle.textContent = isOnline && isMeWinner
        ? `🎉 You Won!`
        : `🎉 ${winnerAvatar} ${winnerName} Wins!`;
      this.winnerSubtitle.textContent = `Uh-oh! ${loserAvatar} ${loserName} is left with the final stick! 🪤`;
      this.gameOverModal.classList.add('visible');
    }
  }
}
