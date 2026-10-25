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
    const { current_turn, game_status, winner, loser, selected_sticks, board_state, selected_row } = snapshot;

    // 1. Update Player Badges with fun animal avatars
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
      const avatar = isP1 ? '🦊' : '🐼';
      const playerLabel = isP1 ? 'Player 1' : 'Player 2';
      this.statusBanner.textContent = `${avatar} ${playerLabel.toUpperCase()}'S TURN`;
      this.statusBanner.className = `status-banner ${isP1 ? 'p1-turn' : 'p2-turn'}`;

      if (selected_sticks.length === 0) {
        this.statusSubtext.textContent = '👆 Tap 1, 2, or 3 sticks in ONE row';
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

      // Kid-friendly dynamic Confirm Button
      if (selected_sticks.length > 0) {
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
      const winnerLabel = winner === Player.PLAYER_1 ? 'Player 1' : 'Player 2';
      const loserLabel = loser === Player.PLAYER_1 ? 'Player 1' : 'Player 2';
      const winnerAvatar = winner === Player.PLAYER_1 ? '🦊' : '🐼';
      const loserAvatar = loser === Player.PLAYER_1 ? '🦊' : '🐼';

      // AC 3.1: "Player [X] Wins! Player [Y] is left with the final stick."
      this.statusBanner.textContent = `${winnerAvatar} ${winnerLabel.toUpperCase()} WINS!`;
      this.statusBanner.className = `status-banner winner-announced`;
      this.statusSubtext.textContent = `${loserLabel} is left with the final stick.`;

      // Freeze button
      this.btnConfirm.disabled = true;
      this.btnConfirm.classList.add('disabled');
      this.btnConfirm.innerHTML = `🏆 MATCH OVER`;
      this.btnClear.classList.remove('visible');

      // Show Kid-Friendly Game Over Modal
      this.winnerTitle.textContent = `🎉 ${winnerAvatar} ${winnerLabel} Wins!`;
      this.winnerSubtitle.textContent = `Uh-oh! ${loserAvatar} ${loserLabel} is left with the final stick! 🪤`;
      this.gameOverModal.classList.add('visible');
    }
  }
}
