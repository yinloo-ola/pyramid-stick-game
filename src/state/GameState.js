import { Player, GameStatus, StickState, INITIAL_BOARD } from './types.js';

export class GameState {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }

  reset() {
    this.board_state = [...INITIAL_BOARD];
    this.current_turn = Player.PLAYER_1;
    this.game_status = GameStatus.PLAYING;
    this.winner = 'NONE';
    this.loser = 'NONE';
    this.selected_sticks = [];
    this.selected_row = null;

    // Build the 15 sticks
    this.sticks = [];
    let stickId = 0;
    for (let row = 0; row < INITIAL_BOARD.length; row++) {
      const count = INITIAL_BOARD[row];
      for (let col = 0; col < count; col++) {
        this.sticks.push({
          id: stickId++,
          row,
          col,
          totalInRow: count,
          state: StickState.ACTIVE,
        });
      }
    }

    this.notify();
  }

  getStick(id) {
    return this.sticks.find((s) => s.id === id);
  }

  getTotalActiveSticks() {
    return this.board_state.reduce((sum, count) => sum + count, 0);
  }

  getOpponent(player = this.current_turn) {
    return player === Player.PLAYER_1 ? Player.PLAYER_2 : Player.PLAYER_1;
  }

  canSelectStick(stickId) {
    if (this.game_status !== GameStatus.PLAYING) {
      return { valid: false, reason: 'Game is not in active play.' };
    }

    const stick = this.getStick(stickId);
    if (!stick) {
      return { valid: false, reason: 'Stick not found.' };
    }

    if (stick.state === StickState.DISABLED) {
      return { valid: false, reason: 'Stick is already crossed out.' };
    }

    if (stick.state === StickState.SELECTED) {
      // Deselecting is always allowed
      return { valid: true, isDeselect: true };
    }

    // Checking row constraint (AC 1.2)
    if (this.selected_row !== null && stick.row !== this.selected_row) {
      return {
        valid: false,
        reason: 'Moves must be restricted to a single row!',
        type: 'ROW_RESTRICTION',
      };
    }

    // Checking max 3 sticks constraint (AC 1.3)
    if (this.selected_sticks.length >= 3) {
      return {
        valid: false,
        reason: 'Maximum 3 sticks can be selected per turn!',
        type: 'MAX_LIMIT',
      };
    }

    return { valid: true, isDeselect: false };
  }

  toggleStick(stickId) {
    const check = this.canSelectStick(stickId);
    if (!check.valid) {
      return { success: false, ...check };
    }

    const stick = this.getStick(stickId);

    if (check.isDeselect) {
      stick.state = StickState.ACTIVE;
      this.selected_sticks = this.selected_sticks.filter((id) => id !== stickId);
      if (this.selected_sticks.length === 0) {
        this.selected_row = null;
      }
      this.notify();
      return { success: true, action: 'DESELECTED', stick };
    }

    // Select stick
    stick.state = StickState.SELECTED;
    this.selected_sticks.push(stickId);
    this.selected_row = stick.row;
    this.notify();
    return { success: true, action: 'SELECTED', stick };
  }

  clearSelection() {
    if (this.selected_sticks.length === 0) return;
    for (const stickId of this.selected_sticks) {
      const stick = this.getStick(stickId);
      if (stick) stick.state = StickState.ACTIVE;
    }
    this.selected_sticks = [];
    this.selected_row = null;
    this.notify();
  }

  confirmMove() {
    if (this.game_status !== GameStatus.PLAYING) {
      return { success: false, reason: 'Game is not playing.' };
    }

    if (this.selected_sticks.length === 0) {
      return {
        success: false,
        reason: 'Select at least 1 stick to confirm your move.',
      };
    }

    const selectedCount = this.selected_sticks.length;
    const row = this.selected_row;
    const playerWhoMoved = this.current_turn;
    const opponent = this.getOpponent(playerWhoMoved);

    // Turn selected sticks to disabled
    const confirmedStickIds = [...this.selected_sticks];
    for (const stickId of confirmedStickIds) {
      const stick = this.getStick(stickId);
      if (stick) {
        stick.state = StickState.DISABLED;
      }
    }

    // Update board_state count for that row
    this.board_state[row] = Math.max(0, this.board_state[row] - selectedCount);

    // Reset current selection
    this.selected_sticks = [];
    this.selected_row = null;

    // Check Win/Loss conditions (AC 3.1 & Misère rules)
    const remainingTotal = this.getTotalActiveSticks();

    if (remainingTotal === 1) {
      // Player who just moved left exactly 1 stick for the opponent
      // Under Misère rule, the player whose turn it currently is (opponent) automatically loses!
      this.game_status = GameStatus.GAME_OVER;
      this.winner = playerWhoMoved;
      this.loser = opponent;
      this.notify();
      return {
        success: true,
        gameOver: true,
        winner: this.winner,
        loser: this.loser,
        remainingTotal: 1,
        reason: 'OPPONENT_LEFT_WITH_FINAL_STICK',
        confirmedStickIds,
      };
    } else if (remainingTotal === 0) {
      // The player took all remaining sticks including the final stick, so they lose!
      this.game_status = GameStatus.GAME_OVER;
      this.winner = opponent;
      this.loser = playerWhoMoved;
      this.notify();
      return {
        success: true,
        gameOver: true,
        winner: this.winner,
        loser: this.loser,
        remainingTotal: 0,
        reason: 'TOOK_FINAL_STICK',
        confirmedStickIds,
      };
    } else {
      // Sticks remaining > 1, switch turn to opponent
      this.current_turn = opponent;
      this.notify();
      return {
        success: true,
        gameOver: false,
        nextTurn: this.current_turn,
        confirmedStickIds,
      };
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  getSnapshot() {
    return {
      board_state: [...this.board_state],
      current_turn: this.current_turn,
      game_status: this.game_status,
      winner: this.winner,
      loser: this.loser,
      selected_sticks: [...this.selected_sticks],
      selected_row: this.selected_row,
      sticks: this.sticks.map((s) => ({ ...s })),
      totalActive: this.getTotalActiveSticks(),
    };
  }
}
