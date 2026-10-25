import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/state/GameState.js';
import { Player, GameStatus, StickState } from '../src/state/types.js';

test('Initial Game State conforms to PRD specifications', () => {
  const state = new GameState();
  const snap = state.getSnapshot();

  assert.deepEqual(snap.board_state, [1, 3, 5, 7]);
  assert.equal(snap.current_turn, Player.PLAYER_1);
  assert.equal(snap.game_status, GameStatus.PLAYING);
  assert.equal(snap.winner, 'NONE');
  assert.equal(snap.totalActive, 16);
  assert.equal(snap.sticks.length, 16);
  assert.equal(snap.selected_sticks.length, 0);
  assert.equal(snap.selected_row, null);

  // Check row distribution
  assert.equal(snap.sticks.filter((s) => s.row === 0).length, 1);
  assert.equal(snap.sticks.filter((s) => s.row === 1).length, 3);
  assert.equal(snap.sticks.filter((s) => s.row === 2).length, 5);
  assert.equal(snap.sticks.filter((s) => s.row === 3).length, 7);
});

test('AC 1.1: Clicking an Active stick marks it Selected; clicking again toggles to Active', () => {
  const state = new GameState();
  const stickId = 0; // Row 0 stick

  // Select
  const selResult = state.toggleStick(stickId);
  assert.equal(selResult.success, true);
  assert.equal(selResult.action, 'SELECTED');
  assert.equal(state.getStick(stickId).state, StickState.SELECTED);
  assert.deepEqual(state.selected_sticks, [stickId]);
  assert.equal(state.selected_row, 0);

  // Deselect
  const deselResult = state.toggleStick(stickId);
  assert.equal(deselResult.success, true);
  assert.equal(deselResult.action, 'DESELECTED');
  assert.equal(state.getStick(stickId).state, StickState.ACTIVE);
  assert.deepEqual(state.selected_sticks, []);
  assert.equal(state.selected_row, null);
});

test('AC 1.2: Cross-row selection is blocked and returns ROW_RESTRICTION reason', () => {
  const state = new GameState();

  // Stick 1 is in Row 1 (sticks 1, 2, 3)
  state.toggleStick(1);
  assert.equal(state.selected_row, 1);

  // Stick 4 is in Row 2
  const check = state.canSelectStick(4);
  assert.equal(check.valid, false);
  assert.equal(check.type, 'ROW_RESTRICTION');
  assert.equal(check.reason, 'Moves must be restricted to a single row!');

  const toggleRes = state.toggleStick(4);
  assert.equal(toggleRes.success, false);
  assert.equal(toggleRes.reason, 'Moves must be restricted to a single row!');
  assert.equal(state.selected_sticks.length, 1);
});

test('AC 1.3: Maximum 3 selected sticks per turn constraint', () => {
  const state = new GameState();

  // Row 3 has 7 sticks (id 8..14)
  const row3Sticks = state.sticks.filter((s) => s.row === 3);
  assert.equal(row3Sticks.length, 7);

  // Select 3 sticks
  assert.equal(state.toggleStick(row3Sticks[0].id).success, true);
  assert.equal(state.toggleStick(row3Sticks[1].id).success, true);
  assert.equal(state.toggleStick(row3Sticks[2].id).success, true);
  assert.equal(state.selected_sticks.length, 3);

  // Attempting to select 4th stick must fail
  const check4th = state.canSelectStick(row3Sticks[3].id);
  assert.equal(check4th.valid, false);
  assert.equal(check4th.type, 'MAX_LIMIT');
  assert.equal(check4th.reason, 'Maximum 3 sticks can be selected per turn!');

  const toggle4th = state.toggleStick(row3Sticks[3].id);
  assert.equal(toggle4th.success, false);
  assert.equal(state.selected_sticks.length, 3);
});

test('AC 2.1 & 2.2: Confirm Move lifecycle and turn switching', () => {
  const state = new GameState();

  // AC 2.1: Cannot confirm with 0 sticks selected
  const emptyConfirm = state.confirmMove();
  assert.equal(emptyConfirm.success, false);
  assert.equal(emptyConfirm.reason, 'Select at least 1 stick to confirm your move.');

  // Select 2 sticks in row 2 (sticks 4, 5)
  state.toggleStick(4);
  state.toggleStick(5);
  assert.equal(state.current_turn, Player.PLAYER_1);

  // Confirm move
  const confirmRes = state.confirmMove();
  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.gameOver, false);
  assert.equal(confirmRes.nextTurn, Player.PLAYER_2);
  assert.equal(state.current_turn, Player.PLAYER_2);

  // Sticks 4 and 5 must now be DISABLED
  assert.equal(state.getStick(4).state, StickState.DISABLED);
  assert.equal(state.getStick(5).state, StickState.DISABLED);
  assert.deepEqual(state.board_state, [1, 3, 3, 7]); // row 2 was 5, now 3
  assert.equal(state.getTotalActiveSticks(), 14);
  assert.deepEqual(state.selected_sticks, []);
  assert.equal(state.selected_row, null);

  // Cannot select already disabled stick
  const reSelect = state.canSelectStick(4);
  assert.equal(reSelect.valid, false);
  assert.equal(reSelect.reason, 'Stick is already crossed out.');
});

test('AC 3.1: Misère Win Condition when exactly 1 stick remains', () => {
  const state = new GameState();

  // Simulate board where only 3 sticks remain in row 1, and 0 everywhere else
  // Let's set up state: Player 1 crosses sticks leaving exactly 1 stick on board
  state.board_state = [0, 3, 0, 0];
  state.sticks.forEach((s) => {
    s.state = StickState.DISABLED;
  });
  // Enable 3 sticks in row 1: id 1, 2, 3
  [1, 2, 3].forEach((id) => {
    state.getStick(id).state = StickState.ACTIVE;
  });

  assert.equal(state.getTotalActiveSticks(), 3);
  assert.equal(state.current_turn, Player.PLAYER_1);

  // Player 1 takes 2 sticks, leaving exactly 1 stick
  state.toggleStick(1);
  state.toggleStick(2);
  const result = state.confirmMove();

  assert.equal(result.success, true);
  assert.equal(result.gameOver, true);
  assert.equal(result.winner, Player.PLAYER_1);
  assert.equal(result.loser, Player.PLAYER_2);
  assert.equal(result.remainingTotal, 1);
  assert.equal(state.game_status, GameStatus.GAME_OVER);
  assert.equal(state.winner, Player.PLAYER_1);
});

test('Misère Loss Condition if a player takes the final stick leaving 0', () => {
  const state = new GameState();

  // 2 sticks left in row 1
  state.board_state = [0, 2, 0, 0];
  state.sticks.forEach((s) => {
    s.state = StickState.DISABLED;
  });
  [1, 2].forEach((id) => {
    state.getStick(id).state = StickState.ACTIVE;
  });

  // Player 1 takes both remaining sticks (leaving 0)
  state.toggleStick(1);
  state.toggleStick(2);
  const result = state.confirmMove();

  assert.equal(result.success, true);
  assert.equal(result.gameOver, true);
  // Under Misère rule, Player 1 took the last stick, so Player 1 loses and Player 2 wins
  assert.equal(result.winner, Player.PLAYER_2);
  assert.equal(result.loser, Player.PLAYER_1);
  assert.equal(state.winner, Player.PLAYER_2);
});

test('Reset Game restores full initial state', () => {
  const state = new GameState();
  state.toggleStick(0);
  state.confirmMove();
  assert.equal(state.current_turn, Player.PLAYER_2);

  state.reset();
  assert.deepEqual(state.board_state, [1, 3, 5, 7]);
  assert.equal(state.current_turn, Player.PLAYER_1);
  assert.equal(state.game_status, GameStatus.PLAYING);
  assert.equal(state.sticks.every((s) => s.state === StickState.ACTIVE), true);
});
