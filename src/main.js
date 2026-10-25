import { GameState } from './state/GameState.js';
import { AudioManager } from './view/AudioManager.js';
import { ThreeScene } from './view/ThreeScene.js';
import { UIManager } from './ui/UIManager.js';
import { Toast } from './ui/Toast.js';
import { GameController } from './controller/GameController.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const toastContainer = document.getElementById('toast-container');

  const toast = new Toast(toastContainer);
  const audio = new AudioManager();
  const state = new GameState();

  let controller = null;

  const ui = new UIManager({
    onConfirm: () => controller?.handleConfirmMove(),
    onReset: () => controller?.handleResetGame(),
    onToggleMute: () => controller?.handleToggleMute(),
    onClearSelection: () => controller?.handleClearSelection(),
    onSaveNames: (p1Name, p1Avatar, p2Name, p2Avatar) =>
      controller?.handleSaveNames(p1Name, p1Avatar, p2Name, p2Avatar),
  });

  const scene = new ThreeScene(canvasContainer, (stickId) => {
    controller?.handleStickClick(stickId);
  });

  controller = new GameController(state, scene, ui, audio, toast);

  // Resume audio on first user touch anywhere
  const unlockAudio = () => {
    audio.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // Expose controller for debugging / testing in console if needed
  window.__PYRAMID_GAME__ = {
    state,
    controller,
    scene,
  };
});
