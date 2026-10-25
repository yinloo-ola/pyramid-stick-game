import { Peer } from 'peerjs';
import QRCode from 'qrcode';

const ROOM_PREFIX = 'pyramid-stick-';

export class PeerService {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.role = null; // 'HOST' | 'GUEST'
    this.roomCode = null;

    this.onConnectedCallback = null;
    this.onDisconnectedCallback = null;
    this.onMessageCallback = null;
    this.onErrorCallback = null;
  }

  generateRoomCode() {
    // Generate simple 4-digit code (e.g. 4821)
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  getShareUrl(code) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    return url.toString();
  }

  async createRoom(code = this.generateRoomCode()) {
    this.cleanup();
    this.role = 'HOST';
    this.roomCode = code;

    const peerId = `${ROOM_PREFIX}${code}`;
    const shareUrl = this.getShareUrl(code);
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        resolve({ code, shareUrl, qrDataUrl });
      });

      this.peer.on('connection', (conn) => {
        // If an old connection exists, replace or close
        if (this.connection) {
          this.connection.close();
        }
        this.connection = conn;
        this.setupConnectionEvents(conn);
      });

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // If collision occurs, retry with a fresh code
          this.createRoom().then(resolve).catch(reject);
          return;
        }
        this.onErrorCallback?.(err);
        reject(err);
      });
    });
  }

  joinRoom(code) {
    this.cleanup();
    this.role = 'GUEST';
    this.roomCode = code;

    const targetPeerId = `${ROOM_PREFIX}${code}`;

    return new Promise((resolve, reject) => {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        const conn = this.peer.connect(targetPeerId, {
          reliable: true,
        });
        this.connection = conn;
        this.setupConnectionEvents(conn);
        resolve(conn);
      });

      this.peer.on('error', (err) => {
        this.onErrorCallback?.(err);
        reject(err);
      });
    });
  }

  setupConnectionEvents(conn) {
    conn.on('open', () => {
      this.onConnectedCallback?.(this.role);
    });

    conn.on('data', (data) => {
      this.onMessageCallback?.(data);
    });

    conn.on('close', () => {
      this.onDisconnectedCallback?.();
    });

    conn.on('error', (err) => {
      this.onErrorCallback?.(err);
    });
  }

  send(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    }
  }

  cleanup() {
    if (this.connection) {
      try {
        this.connection.close();
      } catch (_) {}
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.role = null;
    this.roomCode = null;
  }
}
