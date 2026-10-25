import { Player, GameStatus } from '../state/types.js';
import { PeerService } from '../network/PeerService.js';

export class GameController {
  constructor(state, scene, ui, audio, toast) {
    this.state = state;
    this.scene = scene;
    this.ui = ui;
    this.audio = audio;
    this.toast = toast;

    // Multiplayer State
    this.gameMode = 'LOCAL'; // 'LOCAL' | 'ONLINE'
    this.myPlayerRole = null; // Player.PLAYER_1 or Player.PLAYER_2
    this.peerService = new PeerService();

    // Mutex lock to prevent multi-selection race conditions (Section 6)
    this.isProcessingClick = false;

    // Debounce / throttle lock for confirm move button (Section 6)
    this.isConfirming = false;

    this.setupPeerListeners();

    // Subscribe UI and 3D scene to state updates
    this.state.subscribe((snapshot) => {
      this.ui.render(snapshot, {
        gameMode: this.gameMode,
        myPlayerRole: this.myPlayerRole,
      });
      this.scene.updateSticks(snapshot.sticks, snapshot.selected_row);
    });

    // Initialize 3D scene with sticks
    this.scene.buildSticks(this.state.sticks);
    this.ui.render(this.state.getSnapshot(), {
      gameMode: this.gameMode,
      myPlayerRole: this.myPlayerRole,
    });
    this.ui.updateMuteButton(this.audio.isMuted);

    // Auto-check for ?room=XXXX query parameter in URL
    this.checkUrlRoomParam();
  }

  setupPeerListeners() {
    this.peerService.onConnectedCallback = (role) => {
      this.gameMode = 'ONLINE';
      this.myPlayerRole = role === 'HOST' ? Player.PLAYER_1 : Player.PLAYER_2;

      this.audio.playWin();

      if (role === 'HOST') {
        // Send initial handshake with fresh Host's name & avatar
        this.peerService.send({
          type: 'ROOM_INIT',
          hostName: this.state.player_names[Player.PLAYER_1],
          hostAvatar: this.state.player_avatars[Player.PLAYER_1],
        });
        this.toast.show('🎉 Friend joined your game! Ready to play!', 'info', 2500);
      } else {
        // Guest introduces themselves with fresh Guest's name & avatar
        this.peerService.send({
          type: 'GUEST_JOINED',
          guestName: this.state.player_names[Player.PLAYER_2],
          guestAvatar: this.state.player_avatars[Player.PLAYER_2],
        });
        this.toast.show('🎉 Connected to friend! You are Player 2!', 'info', 2500);
      }

      this.ui.notifyPeerConnected(this.myPlayerRole, this.peerService.roomCode);
      this.ui.render(this.state.getSnapshot(), {
        gameMode: this.gameMode,
        myPlayerRole: this.myPlayerRole,
      });
    };

    this.peerService.onDisconnectedCallback = () => {
      this.toast.show('Friend disconnected. Switched back to 1-Phone mode! 📱', 'warning', 3000);
      this.disconnectMultiplayer();
    };

    this.peerService.onErrorCallback = (err) => {
      console.warn('Peer connection error:', err);
      this.toast.show('Could not connect. Please check the code and try again.', 'warning', 3000);
      this.ui.notifyPeerError(err);
    };

    this.peerService.onMessageCallback = (msg) => {
      this.handleIncomingPeerMessage(msg);
    };
  }

  async checkUrlRoomParam() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      this.toast.show(`Connecting to room ${roomCode}... ⏳`, 'info', 3000);
      await this.handleJoinRoom(roomCode);
    }
  }

  async handleCreateRoom() {
    try {
      this.toast.show('Creating 2-player room... ⏳', 'info', 2000);
      // Reset names and board for a clean 2-phone multiplayer game
      this.state.resetForMultiplayer();
      const res = await this.peerService.createRoom();
      return res;
    } catch (err) {
      this.toast.show('Failed to create room. Please try again.', 'warning');
      throw err;
    }
  }

  async handleJoinRoom(code) {
    if (!code || !code.trim()) {
      this.toast.show('Please enter a 4-digit code!', 'warning');
      return;
    }
    try {
      this.toast.show(`Connecting to room ${code}... ⏳`, 'info', 2500);
      // Reset names and board for a clean 2-phone multiplayer game
      this.state.resetForMultiplayer();
      await this.peerService.joinRoom(code.trim());
    } catch (err) {
      this.toast.show('Failed to connect to room. Check code!', 'warning');
      throw err;
    }
  }

  disconnectMultiplayer() {
    this.peerService.cleanup();
    this.gameMode = 'LOCAL';
    this.myPlayerRole = null;
    this.ui.notifyPeerDisconnected();
    this.ui.render(this.state.getSnapshot(), {
      gameMode: this.gameMode,
      myPlayerRole: this.myPlayerRole,
    });
  }

  handleIncomingPeerMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'ROOM_INIT':
        // Guest receives Host's initialization
        this.state.reset();
        if (msg.hostName && msg.hostAvatar) {
          this.state.setPlayerInfo(Player.PLAYER_1, msg.hostName, msg.hostAvatar, false);
        }
        // Guest replies with their name & avatar
        this.peerService.send({
          type: 'GUEST_JOINED',
          guestName: this.state.player_names[Player.PLAYER_2],
          guestAvatar: this.state.player_avatars[Player.PLAYER_2],
        });
        break;

      case 'GUEST_JOINED':
        // Host receives Guest's name & avatar
        if (msg.guestName) {
          this.state.setPlayerInfo(Player.PLAYER_2, msg.guestName, msg.guestAvatar, false);
          this.toast.show(`👋 ${msg.guestAvatar} ${msg.guestName} joined!`, 'info', 2000);
        }
        break;

      case 'NAME_CHANGED':
        // Opponent changed their own name on their device!
        if (msg.player && msg.name) {
          this.state.setPlayerInfo(msg.player, msg.name, msg.avatar, false);
          this.toast.show(`Friend updated profile to ${msg.avatar} ${msg.name}! 🌟`, 'info', 2000);
          this.audio.playTap(0);
        }
        break;

      case 'TOGGLE_STICK':
        if (msg.stickId !== undefined) {
          const stick = this.state.getStick(msg.stickId);
          if (stick) {
            this.scene.triggerStickBounce(msg.stickId);
            const res = this.state.toggleStick(msg.stickId);
            if (res.success) {
              if (res.action === 'SELECTED') {
                this.audio.playTap(stick.row);
              } else if (res.action === 'DESELECTED') {
                this.audio.playDeselect();
              }
            }
          }
        }
        break;

      case 'CLEAR_SELECTION':
        this.audio.playDeselect();
        this.state.clearSelection();
        break;

      case 'CONFIRM_MOVE':
        const confirmRes = this.state.confirmMove();
        if (confirmRes.success) {
          this.audio.playStrike();
          if (confirmRes.confirmedStickIds) {
            this.scene.triggerStrikeEffects(confirmRes.confirmedStickIds);
          }
          if (confirmRes.gameOver) {
            setTimeout(() => {
              this.audio.playWin();
              this.scene.triggerVictoryEffects();
            }, 300);
          } else {
            const nextPlayerName = this.state.player_names[confirmRes.nextTurn] || 'Next Player';
            const nextPlayerAvatar = this.state.player_avatars[confirmRes.nextTurn] || '👉';
            if (this.gameMode === 'ONLINE' && confirmRes.nextTurn === this.myPlayerRole) {
              this.toast.show(`✨ It's YOUR turn now! Tap 1-3 sticks!`, 'info', 2200);
            } else {
              this.toast.show(`👉 ${nextPlayerAvatar} ${nextPlayerName}'s turn!`, 'info', 1600);
            }
          }
        }
        break;

      case 'RESET_GAME':
        this.audio.playReset();
        this.state.reset();
        this.scene.buildSticks(this.state.sticks);
        this.toast.show('🔄 Friend started a New Game!', 'info', 1800);
        break;
    }
  }

  handleStickClick(stickId) {
    if (this.isProcessingClick || this.isConfirming) return;

    // In Online mode: only allow clicking on your turn!
    if (this.gameMode === 'ONLINE' && this.myPlayerRole && this.state.current_turn !== this.myPlayerRole) {
      const activeName = this.state.player_names[this.state.current_turn] || 'friend';
      const activeAvatar = this.state.player_avatars[this.state.current_turn] || '👉';
      this.audio.playError();
      this.toast.show(`⏳ Wait for ${activeAvatar} ${activeName} to make a move!`, 'warning');
      return;
    }

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

        // Send over WebRTC DataChannel
        if (this.gameMode === 'ONLINE') {
          this.peerService.send({
            type: 'TOGGLE_STICK',
            stickId,
          });
        }
      }
    } finally {
      // Release mutex lock
      this.isProcessingClick = false;
    }
  }

  handleClearSelection() {
    if (this.gameMode === 'ONLINE' && this.myPlayerRole && this.state.current_turn !== this.myPlayerRole) {
      return;
    }

    if (this.state.selected_sticks.length > 0) {
      this.audio.playDeselect();
      this.state.clearSelection();

      if (this.gameMode === 'ONLINE') {
        this.peerService.send({ type: 'CLEAR_SELECTION' });
      }
    }
  }

  handleConfirmMove() {
    if (this.isConfirming) return;

    if (this.gameMode === 'ONLINE' && this.myPlayerRole && this.state.current_turn !== this.myPlayerRole) {
      return;
    }

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

      // Send to peer over WebRTC
      if (this.gameMode === 'ONLINE') {
        this.peerService.send({
          type: 'CONFIRM_MOVE',
        });
      }

      if (res.gameOver) {
        setTimeout(() => {
          this.audio.playWin();
          this.scene.triggerVictoryEffects();
        }, 300);
      } else {
        const nextPlayerName = this.state.player_names[res.nextTurn] || 'Next Player';
        const nextPlayerAvatar = this.state.player_avatars[res.nextTurn] || '👉';
        if (this.gameMode === 'ONLINE') {
          this.toast.show(`Sent move! Waiting for ${nextPlayerAvatar} ${nextPlayerName}... ⏳`, 'info', 1800);
        } else {
          this.toast.show(`👉 Pass the phone to ${nextPlayerAvatar} ${nextPlayerName}!`, 'info', 1800);
        }
      }
    } finally {
      // Throttle confirm submissions to prevent accidental double-clicks (350ms)
      setTimeout(() => {
        this.isConfirming = false;
      }, 350);
    }
  }

  // Local Pass & Play Name Update (both players)
  handleSaveNames(p1Name, p1Avatar, p2Name, p2Avatar) {
    this.state.setPlayerInfo(Player.PLAYER_1, p1Name, p1Avatar);
    this.state.setPlayerInfo(Player.PLAYER_2, p2Name, p2Avatar);
    this.audio.playTap(0);
    this.toast.show(`Hi ${p1Avatar} ${p1Name} & ${p2Avatar} ${p2Name}! Let's play! 🎮`, 'info', 2200);
  }

  // 2-Phone Multiplayer: Player ONLY changes their own name & avatar
  handleSaveMyName(playerRole, name, avatar) {
    if (this.gameMode === 'ONLINE' && playerRole !== this.myPlayerRole) {
      return;
    }

    this.state.setPlayerInfo(playerRole, name, avatar, true);
    this.audio.playTap(0);

    if (this.gameMode === 'ONLINE') {
      // Transmit new name to opponent's phone immediately
      this.peerService.send({
        type: 'NAME_CHANGED',
        player: playerRole,
        name,
        avatar,
      });
    }

    this.toast.show('Your profile was updated! 🌟', 'info', 1800);
  }

  // Prevent editing opponent's card in 2-phone mode
  handleOpponentCardClick(role) {
    this.audio.playError();
    this.toast.show("That's your friend's profile! 👤 Tap your own card to change your name.", 'warning', 2400);
  }

  handleResetGame() {
    this.audio.playReset();
    this.state.reset();
    this.scene.buildSticks(this.state.sticks);

    if (this.gameMode === 'ONLINE') {
      this.peerService.send({ type: 'RESET_GAME' });
    }

    const p1Name = this.state.player_names[Player.PLAYER_1] || 'Player 1';
    const p1Avatar = this.state.player_avatars[Player.PLAYER_1] || '🦊';
    this.toast.show(`🔄 New Game! ${p1Avatar} ${p1Name} starts!`, 'info', 1800);
  }

  handleToggleMute() {
    return this.audio.toggleMute();
  }
}
