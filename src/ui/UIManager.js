import { Player, GameStatus } from '../state/types.js';

export class UIManager {
  constructor(handlers) {
    this.handlers = handlers; // { onConfirm, onReset, onToggleMute, onClearSelection }
    this.statusBanner = document.getElementById('status-banner');
    this.statusSubtext = document.getElementById('status-subtext');
    this.player1Card = document.getElementById('p1-card');
    this.player2Card = document.getElementById('p2-card');
    this.btnConfirm = document.getElementById('btn-confirm');
    this.btnClear = document.getElementById('btn-clear');
    this.btnReset = document.getElementById('btn-reset');
    this.btnMute = document.getElementById('btn-mute');
    this.btnRules = document.getElementById('btn-rules');
    this.rulesModal = document.getElementById('rules-modal');
    this.btnCloseRules = document.getElementById('btn-close-rules');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.winnerTitle = document.getElementById('winner-title');
    this.winnerSubtitle = document.getElementById('winner-subtitle');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    this.bindEvents();
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

    this.btnPlayAgain.addEventListener('click', () => {
      this.gameOverModal.classList.remove('visible');
      this.handlers.onReset?.();
    });
  }

  updateMuteButton(isMuted) {
    this.btnMute.textContent = isMuted ? '🔇' : '🔊';
    this.btnMute.setAttribute('aria-label', isMuted ? 'Unmute Sound' : 'Mute Sound');
  }

  render(snapshot) {
    const { current_turn, game_status, winner, loser, selected_sticks } = snapshot;

    // 1. Update Player Badges
    const isP1 = current_turn === Player.PLAYER_1;
    this.player1Card.classList.toggle('active-turn', isP1 && game_status === GameStatus.PLAYING);
    this.player2Card.classList.toggle('active-turn', !isP1 && game_status === GameStatus.PLAYING);

    // 2. Update Status Banner
    if (game_status === GameStatus.PLAYING) {
      this.gameOverModal.classList.remove('visible');
      const playerLabel = current_turn === Player.PLAYER_1 ? 'Player 1' : 'Player 2';
      this.statusBanner.textContent = `${playerLabel.toUpperCase()}'S TURN`;
      this.statusBanner.className = `status-banner ${isP1 ? 'p1-turn' : 'p2-turn'}`;

      if (selected_sticks.length === 0) {
        this.statusSubtext.textContent = 'Tap 1 to 3 sticks in a single row';
      } else {
        const count = selected_sticks.length;
        this.statusSubtext.textContent = `Selected ${count} stick${count > 1 ? 's' : ''}`;
      }

      // Confirm button state
      if (selected_sticks.length > 0) {
        this.btnConfirm.disabled = false;
        this.btnConfirm.classList.remove('disabled');
        const count = selected_sticks.length;
        this.btnConfirm.innerHTML = `CONFIRM MOVE <span class="badge-count">(${count})</span>`;
        this.btnClear.classList.add('visible');
      } else {
        this.btnConfirm.disabled = true;
        this.btnConfirm.classList.add('disabled');
        this.btnConfirm.innerHTML = `CONFIRM MOVE`;
        this.btnClear.classList.remove('visible');
      }
    } else if (game_status === GameStatus.GAME_OVER) {
      const winnerLabel = winner === Player.PLAYER_1 ? 'Player 1' : 'Player 2';
      const loserLabel = loser === Player.PLAYER_1 ? 'Player 1' : 'Player 2';

      // AC 3.1: "Player [X] Wins! Player [Y] is left with the final stick."
      this.statusBanner.textContent = `${winnerLabel.toUpperCase()} WINS!`;
      this.statusBanner.className = `status-banner winner-announced`;
      this.statusSubtext.textContent = `${loserLabel} is left with the final stick.`;

      // Freeze button
      this.btnConfirm.disabled = true;
      this.btnConfirm.classList.add('disabled');
      this.btnConfirm.innerHTML = `GAME OVER`;
      this.btnClear.classList.remove('visible');

      // Show Game Over Modal
      this.winnerTitle.textContent = `🎉 ${winnerLabel} Wins!`;
      this.winnerSubtitle.textContent = `${loserLabel} was forced with the final stick. Misère rules win!`;
      this.gameOverModal.classList.add('visible');
    }
  }
}
