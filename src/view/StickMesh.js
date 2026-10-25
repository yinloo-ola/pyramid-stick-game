import * as THREE from 'three';
import { StickState, COLORS } from '../state/types.js';

export class StickMesh {
  constructor(stickData, basePosition) {
    this.stickData = stickData;
    this.basePosition = basePosition.clone();
    this.group = new THREE.Group();
    this.group.position.copy(this.basePosition);
    this.group.userData = { stickId: stickData.id, stickMesh: this };

    this.currentState = stickData.state;
    this.targetZ = 0;
    this.targetScaleY = 1;
    this.targetRotZ = 0;
    this.isHovered = false;

    this.createMaterials();
    this.createMeshes();
    this.updateVisualState(this.currentState, false);
  }

  createMaterials() {
    this.materials = {
      // Uncrossed / Active: Solid Charcoal body with subtle metallic sheen
      active: new THREE.MeshStandardMaterial({
        color: COLORS.ACTIVE,
        roughness: 0.25,
        metalness: 0.2,
      }),
      // Active Hover state
      activeHover: new THREE.MeshStandardMaterial({
        color: 0x415b76,
        roughness: 0.2,
        metalness: 0.3,
      }),
      // Match head tip: vibrant crimson/orange tip for authentic matchstick look
      matchHead: new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0x801005,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.1,
      }),
      // Selected state (Current Turn): Bright Crimson with intense glow
      selected: new THREE.MeshStandardMaterial({
        color: COLORS.SELECTED,
        emissive: 0x99180c,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.1,
      }),
      // Crossed Out / Disabled: Soft opacity drop (20%), Light Grey
      disabled: new THREE.MeshStandardMaterial({
        color: COLORS.DISABLED,
        transparent: true,
        opacity: 0.22,
        roughness: 0.9,
        metalness: 0.0,
        depthWrite: false,
      }),
      // Bold Red Cross / Strike Slash for Crossed sticks
      strikeSlash: new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0xff2a1b,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.1,
      }),
      // Permanent Crossed-out 'X' material
      crossedMark: new THREE.MeshStandardMaterial({
        color: 0xeb4d4b,
        emissive: 0xb33939,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.1,
      }),
      // Base pedestal socket
      socketActive: new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
      }),
      socketDisabled: new THREE.MeshBasicMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.15,
      }),
    };
  }

  createMeshes() {
    const stickRadius = 0.16;
    const stickHeight = 2.4;

    // 1. Base Socket Ring on the board
    const socketGeom = new THREE.RingGeometry(0.18, 0.32, 24);
    this.socketMesh = new THREE.Mesh(socketGeom, this.materials.socketActive);
    this.socketMesh.position.set(0, -stickHeight / 2 - 0.05, 0.01);
    this.group.add(this.socketMesh);

    // 2. Main stick body (cylinder)
    const stickGeom = new THREE.CylinderGeometry(
      stickRadius,
      stickRadius,
      stickHeight,
      24
    );
    this.stickMesh = new THREE.Mesh(stickGeom, this.materials.active);
    this.stickMesh.castShadow = true;
    this.stickMesh.receiveShadow = true;
    this.group.add(this.stickMesh);

    // 3. Vibrant match head cap at the top
    const capGeom = new THREE.SphereGeometry(stickRadius * 1.25, 20, 20);
    this.topCap = new THREE.Mesh(capGeom, this.materials.matchHead);
    this.topCap.position.y = stickHeight / 2;
    this.topCap.castShadow = true;
    this.group.add(this.topCap);

    // 4. Rounded bottom cap
    const bottomCapGeom = new THREE.SphereGeometry(stickRadius, 16, 16);
    this.bottomCap = new THREE.Mesh(bottomCapGeom, this.materials.active);
    this.bottomCap.position.y = -stickHeight / 2;
    this.bottomCap.castShadow = true;
    this.group.add(this.bottomCap);

    // 5. Cross Marks (Two intersecting diagonal bars to form a bold '✕' Cross)
    const crossBarRadius = 0.075;
    const crossBarLength = 2.6;
    const crossGeom = new THREE.CylinderGeometry(
      crossBarRadius,
      crossBarRadius,
      crossBarLength,
      16
    );

    // Slash 1: Diagonal \ (40 degrees)
    this.slash1 = new THREE.Mesh(crossGeom, this.materials.strikeSlash);
    this.slash1.rotation.z = Math.PI / 4.2;
    this.slash1.position.z = 0.24;
    this.slash1.visible = false;
    this.group.add(this.slash1);

    // Slash 2: Diagonal / (-40 degrees, completes the '✕' cross)
    this.slash2 = new THREE.Mesh(crossGeom, this.materials.crossedMark);
    this.slash2.rotation.z = -Math.PI / 4.2;
    this.slash2.position.z = 0.25;
    this.slash2.visible = false;
    this.group.add(this.slash2);

    // 6. Large invisible touch collider for mobile tapping
    const hitGeom = new THREE.CylinderGeometry(0.48, 0.48, 3.2, 12);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
      transparent: true,
      opacity: 0,
    });
    this.hitMesh = new THREE.Mesh(hitGeom, hitMat);
    this.hitMesh.userData = { stickId: this.stickData.id, stickMesh: this };
    this.group.add(this.hitMesh);
  }

  setHovered(hovered) {
    if (this.isHovered === hovered) return;
    this.isHovered = hovered;
    if (this.currentState === StickState.ACTIVE) {
      const mat = hovered ? this.materials.activeHover : this.materials.active;
      this.stickMesh.material = mat;
      this.bottomCap.material = mat;
    }
  }

  updateVisualState(state, animate = true) {
    this.currentState = state;

    if (state === StickState.SELECTED) {
      // SELECTED: Glowing Crimson, lifted towards user, with active diagonal strike slash
      this.stickMesh.material = this.materials.selected;
      this.topCap.material = this.materials.selected;
      this.bottomCap.material = this.materials.selected;
      this.socketMesh.material = this.materials.socketActive;

      this.slash1.visible = true;
      this.slash1.material = this.materials.strikeSlash;
      this.slash2.visible = false;

      this.targetZ = 0.45;
      this.targetScaleY = 1.08;
      this.targetRotZ = 0.06;
    } else if (state === StickState.DISABLED) {
      // CROSSED OUT: Soft 20% opacity light grey body WITH A BOLD PERMANENT '✕' CROSS!
      this.stickMesh.material = this.materials.disabled;
      this.topCap.material = this.materials.disabled;
      this.bottomCap.material = this.materials.disabled;
      this.socketMesh.material = this.materials.socketDisabled;

      // Make both slashes visible to form an unmistakable bold red '✕' cross!
      this.slash1.visible = true;
      this.slash1.material = this.materials.crossedMark;
      this.slash2.visible = true;
      this.slash2.material = this.materials.crossedMark;

      this.targetZ = -0.06;
      this.targetScaleY = 0.94;
      this.targetRotZ = 0;
    } else {
      // ACTIVE / NOT CROSSED: Crisp Dark Charcoal body + Vibrant Red Match Head + Active Socket
      const bodyMat = this.isHovered ? this.materials.activeHover : this.materials.active;
      this.stickMesh.material = bodyMat;
      this.topCap.material = this.materials.matchHead; // Red match head
      this.bottomCap.material = bodyMat;
      this.socketMesh.material = this.materials.socketActive;

      // No cross marks on active sticks!
      this.slash1.visible = false;
      this.slash2.visible = false;

      this.targetZ = 0;
      this.targetScaleY = 1.0;
      this.targetRotZ = 0;
    }

    if (!animate) {
      this.group.position.z = this.targetZ;
      this.group.scale.y = this.targetScaleY;
      this.group.rotation.z = this.targetRotZ;
    }
  }

  update(delta) {
    const lerpFactor = Math.min(1, delta * 15);
    this.group.position.z += (this.targetZ - this.group.position.z) * lerpFactor;
    this.group.scale.y += (this.targetScaleY - this.group.scale.y) * lerpFactor;
    this.group.rotation.z += (this.targetRotZ - this.group.rotation.z) * lerpFactor;

    // Pulsing animation when Selected
    if (this.currentState === StickState.SELECTED) {
      const time = performance.now() * 0.005;
      const pulse = 1 + 0.12 * Math.sin(time * 3);
      this.slash1.scale.set(pulse, 1 + 0.06 * Math.sin(time * 3), pulse);
    }
  }
}
