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
    this.targetScaleXZ = 1;
    this.targetRotZ = 0;
    this.targetOffsetY = 0;
    this.bounceTimer = 0;
    this.isHovered = false;
    this.isDimmed = false;

    this.createMaterials();
    this.createMeshes();
    this.updateVisualState(this.currentState, false);
  }

  createMaterials() {
    this.materials = {
      // Warm, tactile wooden stick body - inviting & friendly for kids
      active: new THREE.MeshStandardMaterial({
        color: 0x2C3E50, // Dark charcoal as per PRD spec
        roughness: 0.25,
        metalness: 0.15,
      }),
      activeHover: new THREE.MeshStandardMaterial({
        color: 0x3d5a77,
        roughness: 0.2,
        metalness: 0.2,
      }),
      // Dimmed when another row is being selected
      dimmedRow: new THREE.MeshStandardMaterial({
        color: 0x1d2935,
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: 0.55,
      }),
      // Bright, friendly candy-red match head
      matchHead: new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        emissive: 0x991008,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.1,
      }),
      // Selected state: vibrant glowing crimson
      selected: new THREE.MeshStandardMaterial({
        color: COLORS.SELECTED,
        emissive: 0xb71508,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.1,
      }),
      // Crossed Out / Disabled: soft transparent grey
      disabled: new THREE.MeshStandardMaterial({
        color: COLORS.DISABLED,
        transparent: true,
        opacity: 0.22,
        roughness: 0.9,
        metalness: 0.0,
        depthWrite: false,
      }),
      // Bold cartoon comic-style red '✕' Cross Mark
      crossedMark: new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xcc0000,
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.1,
      }),
      // Active base socket
      socketActive: new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.4,
      }),
      socketSelected: new THREE.MeshBasicMaterial({
        color: 0xff3b30,
        transparent: true,
        opacity: 0.7,
      }),
      socketDisabled: new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.12,
      }),
    };
  }

  createMeshes() {
    const stickRadius = 0.16;
    const stickHeight = 2.4;

    // 1. Base Socket Ring on the board
    const socketGeom = new THREE.RingGeometry(0.18, 0.34, 24);
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

    // 3. Candy-red match head cap at the top
    const capGeom = new THREE.SphereGeometry(stickRadius * 1.3, 20, 20);
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

    // 5. Cross Marks (Two chunky intersecting diagonal bars to form a bold '✕' Cross)
    const crossBarRadius = 0.085;
    const crossBarLength = 2.65;
    const crossGeom = new THREE.CylinderGeometry(
      crossBarRadius,
      crossBarRadius,
      crossBarLength,
      16
    );

    // Slash 1: Diagonal \ (40 degrees)
    this.slash1 = new THREE.Mesh(crossGeom, this.materials.crossedMark);
    this.slash1.rotation.z = Math.PI / 4.2;
    this.slash1.position.z = 0.26;
    this.slash1.visible = false;
    this.group.add(this.slash1);

    // Slash 2: Diagonal / (-40 degrees, completes the '✕' cross)
    this.slash2 = new THREE.Mesh(crossGeom, this.materials.crossedMark);
    this.slash2.rotation.z = -Math.PI / 4.2;
    this.slash2.position.z = 0.27;
    this.slash2.visible = false;
    this.group.add(this.slash2);

    // 6. Extra-large invisible touch collider for small children's fingers
    const hitGeom = new THREE.CylinderGeometry(0.55, 0.55, 3.4, 12);
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
    if (this.currentState === StickState.ACTIVE && !this.isDimmed) {
      const mat = hovered ? this.materials.activeHover : this.materials.active;
      this.stickMesh.material = mat;
      this.bottomCap.material = mat;
    }
  }

  setDimmed(dimmed) {
    if (this.currentState !== StickState.ACTIVE) return;
    this.isDimmed = dimmed;
    const mat = dimmed ? this.materials.dimmedRow : this.materials.active;
    this.stickMesh.material = mat;
    this.bottomCap.material = mat;
    this.socketMesh.material = dimmed ? this.materials.socketDisabled : this.materials.socketActive;
  }

  // Playful elastic bounce when tapped
  triggerTapBounce() {
    this.bounceTimer = 1.0;
  }

  updateVisualState(state, animate = true) {
    this.currentState = state;

    if (state === StickState.SELECTED) {
      this.stickMesh.material = this.materials.selected;
      this.topCap.material = this.materials.selected;
      this.bottomCap.material = this.materials.selected;
      this.socketMesh.material = this.materials.socketSelected;

      // Show single diagonal slash while selected
      this.slash1.visible = true;
      this.slash2.visible = false;

      this.targetZ = 0.5;
      this.targetScaleY = 1.1;
      this.targetScaleXZ = 1.08;
      this.targetRotZ = 0.07;
      this.targetOffsetY = 0.15;
    } else if (state === StickState.DISABLED) {
      // CROSSED OUT: Faded grey stick with bold red comic '✕'
      this.stickMesh.material = this.materials.disabled;
      this.topCap.material = this.materials.disabled;
      this.bottomCap.material = this.materials.disabled;
      this.socketMesh.material = this.materials.socketDisabled;

      this.slash1.visible = true;
      this.slash2.visible = true;

      this.targetZ = -0.06;
      this.targetScaleY = 0.94;
      this.targetScaleXZ = 1.0;
      this.targetRotZ = 0;
      this.targetOffsetY = 0;
    } else {
      // ACTIVE / NOT CROSSED
      const bodyMat = this.isDimmed ? this.materials.dimmedRow : (this.isHovered ? this.materials.activeHover : this.materials.active);
      this.stickMesh.material = bodyMat;
      this.topCap.material = this.materials.matchHead; // Bright red candy head
      this.bottomCap.material = bodyMat;
      this.socketMesh.material = this.isDimmed ? this.materials.socketDisabled : this.materials.socketActive;

      this.slash1.visible = false;
      this.slash2.visible = false;

      this.targetZ = 0;
      this.targetScaleY = 1.0;
      this.targetScaleXZ = 1.0;
      this.targetRotZ = 0;
      this.targetOffsetY = 0;
    }

    if (!animate) {
      this.group.position.z = this.targetZ;
      this.group.position.y = this.basePosition.y + this.targetOffsetY;
      this.group.scale.set(this.targetScaleXZ, this.targetScaleY, this.targetScaleXZ);
      this.group.rotation.z = this.targetRotZ;
    }
  }

  update(delta) {
    const lerpFactor = Math.min(1, delta * 14);

    let currentTargetY = this.basePosition.y + this.targetOffsetY;

    // Springy elastic bounce when tapped
    if (this.bounceTimer > 0) {
      this.bounceTimer -= delta * 3.5;
      const bounceOffset = Math.sin((1.0 - this.bounceTimer) * Math.PI) * 0.35;
      currentTargetY += Math.max(0, bounceOffset);
    }

    this.group.position.z += (this.targetZ - this.group.position.z) * lerpFactor;
    this.group.position.y += (currentTargetY - this.group.position.y) * lerpFactor;
    this.group.scale.y += (this.targetScaleY - this.group.scale.y) * lerpFactor;
    this.group.scale.x += (this.targetScaleXZ - this.group.scale.x) * lerpFactor;
    this.group.scale.z += (this.targetScaleXZ - this.group.scale.z) * lerpFactor;
    this.group.rotation.z += (this.targetRotZ - this.group.rotation.z) * lerpFactor;

    // Friendly gentle wiggle when Selected
    if (this.currentState === StickState.SELECTED) {
      const time = performance.now() * 0.006;
      const wobble = 1 + 0.12 * Math.sin(time * 3);
      this.slash1.scale.set(wobble, 1 + 0.05 * Math.sin(time * 3), wobble);
    }
  }
}
