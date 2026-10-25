# Pyramid Game (Nim Variant) 🔺

A tactile 2-player turn-based strategy game built with **Three.js** and vanilla ES modules. Designed specifically for pass-and-play on a single mobile phone or desktop browser with zero backend or login required.

🎮 **[Play Live on GitHub Pages](https://yinloo-ola.github.io/pyramid-stick-game/)**

---

## 🎮 Game Rules (Misère Nim)

The board is arranged in a pyramid of 4 rows:
- **Row 1:** 1 stick
- **Row 2:** 3 sticks
- **Row 3:** 5 sticks
- **Row 4:** 7 sticks

### Turn Rules
1. On each turn, the active player can cross out **1, 2, or 3 sticks**.
2. **Single Row Constraint:** All sticks selected in a single turn **must belong to the exact same horizontal row**.
3. Players cannot pass without taking at least 1 stick.

### Misère Winning Condition
- The player who is forced to take the **final remaining stick loses**!
- If a player completes their turn and leaves exactly **1 stick** remaining on the entire board, that player immediately wins (as the opponent is left forced to take it).

---

## 🏗️ Architecture (State-View-Controller)

The codebase strictly adheres to the State-View-Controller design pattern:

```
src/
├── state/
│   ├── types.js            # Enums (Player, GameStatus, StickState, Colors)
│   └── GameState.js        # Model: board state, stick data, win/loss logic, event subscription
├── view/
│   ├── ThreeScene.js       # 3D Scene: camera auto-framing, lights, raycasting
│   ├── StickMesh.js        # 3D Stick representation, materials, animations, strike slash
│   ├── ParticleSystem.js   # 3D Particle bursts for moves and victory celebration
│   └── AudioManager.js     # Web Audio API sound effects (tap, error, strike, fanfare)
├── controller/
│   └── GameController.js   # Controller: input coordination, mutex locks, submission debounce
├── ui/
│   ├── UIManager.js        # HUD: player cards, status banner, confirm button, modals
│   └── Toast.js            # Visual warning toasts (row restrictions, max 3 limit)
├── style.css               # Responsive mobile-first CSS with safe-area support
└── main.js                 # App bootstrapper
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your mobile browser or desktop.

### Run Unit Tests
```bash
npm test
```
Runs the automated test suite testing all User Stories, Acceptance Criteria, and edge cases.

### Build Production Bundle
```bash
npm run build
```
Generates production-ready static assets in the `dist/` directory.

---

## 📱 Mobile Features
- **Pass-and-Play HUD:** Distinct glowing badges and banners clearly show whose turn it is.
- **Large Touch Hitboxes:** Sticks have enlarged invisible cylindrical colliders so taps on small phone touchscreens never miss.
- **Adaptive 3D Camera:** The Three.js perspective camera automatically calculates distances to keep the entire pyramid centered across all viewport aspect ratios.
- **Haptic-like Audio Feedback:** Synthesized via Web Audio API with an instant mute toggle.
