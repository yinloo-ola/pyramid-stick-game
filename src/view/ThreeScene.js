import * as THREE from 'three';
import { StickMesh } from './StickMesh.js';
import { ParticleSystem } from './ParticleSystem.js';

export class ThreeScene {
  constructor(canvasContainer, onStickClick) {
    this.container = canvasContainer;
    this.onStickClick = onStickClick;
    this.stickMeshes = new Map(); // id -> StickMesh
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.hoveredStickId = null;

    this.initScene();
    this.createLights();
    this.createBackdrop();
    this.particleSystem = new ParticleSystem(this.scene);
    this.setupEvents();
    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
    this.updateCamera();
  }

  createLights() {
    // Warm ambient light
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 1.2);
    this.scene.add(ambientLight);

    // Front-top Key directional light for clear shadows and specular definition
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(4, 10, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Fill light from lower angle
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    fillLight.position.set(-6, -6, 8);
    this.scene.add(fillLight);

    // Top-back Rim Light to create crisp outlines around charcoal sticks
    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 1.6);
    rimLight.position.set(0, 6, -4);
    this.scene.add(rimLight);
  }

  createBackdrop() {
    // Elegant game mat surface with high contrast
    const boardGeom = new THREE.PlaneGeometry(13.5, 14.8);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x141e2c, // Rich dark navy backdrop
      roughness: 0.8,
      metalness: 0.15,
    });
    const board = new THREE.Mesh(boardGeom, boardMat);
    board.position.set(0, 0, -0.6);
    board.receiveShadow = true;
    this.scene.add(board);

    // Subtle horizontal lane trays for each row (Row 1 to Row 4)
    const rowSpacingY = 3.1;
    const startY = 4.65;
    const trayWidths = [3.2, 6.0, 9.0, 11.8];

    for (let r = 0; r < 4; r++) {
      const y = startY - r * rowSpacingY;
      const trayGeom = new THREE.PlaneGeometry(trayWidths[r], 2.85);
      const trayMat = new THREE.MeshStandardMaterial({
        color: 0x1a2638,
        roughness: 0.85,
        metalness: 0.1,
      });
      const tray = new THREE.Mesh(trayGeom, trayMat);
      tray.position.set(0, y, -0.58);
      tray.receiveShadow = true;
      this.scene.add(tray);

      // Delicate lane border
      const edgeGeom = new THREE.PlaneGeometry(trayWidths[r], 0.05);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: 0x2e4460,
        transparent: true,
        opacity: 0.5,
      });
      const topEdge = new THREE.Mesh(edgeGeom, edgeMat);
      topEdge.position.set(0, y + 1.42, -0.57);
      this.scene.add(topEdge);

      const bottomEdge = new THREE.Mesh(edgeGeom, edgeMat);
      bottomEdge.position.set(0, y - 1.42, -0.57);
      this.scene.add(bottomEdge);
    }
  }

  buildSticks(sticksData) {
    // Clear old sticks if any
    for (const stickMesh of this.stickMeshes.values()) {
      this.scene.remove(stickMesh.group);
    }
    this.stickMeshes.clear();

    const rowSpacingY = 3.1;
    const stickSpacingX = 1.45;
    const startY = 4.65; // Row 0 top Y

    sticksData.forEach((data) => {
      const y = startY - data.row * rowSpacingY;
      const x = (data.col - (data.totalInRow - 1) / 2) * stickSpacingX;
      const basePos = new THREE.Vector3(x, y, 0);

      const stickMesh = new StickMesh(data, basePos);
      this.stickMeshes.set(data.id, stickMesh);
      this.scene.add(stickMesh.group);
    });
  }

  updateSticks(sticksData) {
    sticksData.forEach((data) => {
      const stickMesh = this.stickMeshes.get(data.id);
      if (stickMesh) {
        stickMesh.updateVisualState(data.state, true);
      }
    });
  }

  triggerStrikeEffects(confirmedStickIds) {
    confirmedStickIds.forEach((id) => {
      const stickMesh = this.stickMeshes.get(id);
      if (stickMesh) {
        this.particleSystem.createStrikeBurst(stickMesh.group.position);
      }
    });
  }

  triggerVictoryEffects() {
    this.particleSystem.createVictoryBurst(0, 0);
  }

  updateCamera() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    // Symmetrical responsive calculation to fit pyramid comfortably
    const vFovRad = (this.camera.fov * Math.PI) / 180;
    const targetHeight = 14.5;
    const targetWidth = 12.0;

    const distForHeight = (targetHeight / 2) / Math.tan(vFovRad / 2);
    const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
    const distForWidth = (targetWidth / 2) / Math.tan(hFovRad / 2);

    const dist = Math.max(distForHeight, distForWidth) * 1.12;
    this.camera.position.set(0, 0, Math.max(16, dist));
    this.camera.lookAt(0, 0, 0);

    this.renderer.setSize(width, height);
  }

  getIntersectedStick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const clientX = event.clientX ?? (event.touches && event.touches[0]?.clientX);
    const clientY = event.clientY ?? (event.touches && event.touches[0]?.clientY);

    if (clientX === undefined || clientY === undefined) return null;

    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hitObjects = [];
    for (const stickMesh of this.stickMeshes.values()) {
      hitObjects.push(stickMesh.hitMesh);
    }

    const intersects = this.raycaster.intersectObjects(hitObjects, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      return hit.userData.stickId;
    }
    return null;
  }

  setupEvents() {
    const dom = this.renderer.domElement;

    const handlePointerDown = (e) => {
      const stickId = this.getIntersectedStick(e);
      if (stickId !== null && this.onStickClick) {
        this.onStickClick(stickId);
      }
    };

    dom.addEventListener('pointerdown', handlePointerDown);

    // Hover effect for mouse/desktop
    dom.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const stickId = this.getIntersectedStick(e);
      if (stickId !== this.hoveredStickId) {
        if (this.hoveredStickId !== null) {
          this.stickMeshes.get(this.hoveredStickId)?.setHovered(false);
        }
        this.hoveredStickId = stickId;
        if (stickId !== null) {
          this.stickMeshes.get(stickId)?.setHovered(true);
          dom.style.cursor = 'pointer';
        } else {
          dom.style.cursor = 'default';
        }
      }
    });

    window.addEventListener('resize', () => {
      this.updateCamera();
    });
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    for (const stickMesh of this.stickMeshes.values()) {
      stickMesh.update(delta);
    }
    this.particleSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
  }
}
