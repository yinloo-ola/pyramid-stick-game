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
      active: new THREE.MeshStandardMaterial({
        color: COLORS.ACTIVE,
        roughness: 0.35,
        metalness: 0.1,
      }),
      activeHover: new THREE.MeshStandardMaterial({
        color: 0x3e5871,
        roughness: 0.3,
        metalness: 0.15,
      }),
      selected: new THREE.MeshStandardMaterial({
        color: COLORS.SELECTED,
        emissive: 0x6e140d,
        roughness: 0.25,
        metalness: 0.1,
      }),
      disabled: new THREE.MeshStandardMaterial({
        color: COLORS.DISABLED,
        transparent: true,
        opacity: 0.2,
        roughness: 0.8,
        metalness: 0.05,
      }),
      matchHead: new THREE.MeshStandardMaterial({
        color: 0xC0392B,
        roughness: 0.4,
        metalness: 0.1,
      }),
      strike: new THREE.MeshStandardMaterial({
        color: COLORS.SELECTED,
        emissive: 0xff3b30,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      }),
    };
  }

  createMeshes() {
    const stickRadius = 0.14;
    const stickHeight = 2.4;

    // Main stick body (cylinder)
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

    // Rounded caps / head for polished tactile feel
    const capGeom = new THREE.SphereGeometry(stickRadius * 1.15, 16, 16);
    this.topCap = new THREE.Mesh(capGeom, this.materials.active);
    this.topCap.position.y = stickHeight / 2;
    this.topCap.castShadow = true;
    this.group.add(this.topCap);

    const bottomCapGeom = new THREE.SphereGeometry(stickRadius, 16, 16);
    this.bottomCap = new THREE.Mesh(bottomCapGeom, this.materials.active);
    this.bottomCap.position.y = -stickHeight / 2;
    this.bottomCap.castShadow = true;
    this.group.add(this.bottomCap);

    // Diagonal Strike-Through Mark (visible when SELECTED)
    const strikeGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.7, 16);
    this.strikeMesh = new THREE.Mesh(strikeGeom, this.materials.strike);
    this.strikeMesh.rotation.z = Math.PI / 4; // 45 degree strike-through slash
    this.strikeMesh.position.z = 0.22;
    this.strikeMesh.visible = false;
    this.group.add(this.strikeMesh);

    // Large invisible collider for effortless mobile finger tapping
    const hitGeom = new THREE.CylinderGeometry(0.42, 0.42, 3.0, 12);
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
      this.topCap.material = mat;
      this.bottomCap.material = mat;
    }
  }

  updateVisualState(state, animate = true) {
    this.currentState = state;

    let targetMat = this.materials.active;
    let showStrike = false;

    if (state === StickState.SELECTED) {
      targetMat = this.materials.selected;
      showStrike = true;
      this.targetZ = 0.35;
      this.targetScaleY = 1.05;
      this.targetRotZ = 0.05;
    } else if (state === StickState.DISABLED) {
      targetMat = this.materials.disabled;
      showStrike = false;
      this.targetZ = -0.08;
      this.targetScaleY = 0.95;
      this.targetRotZ = 0;
    } else {
      // ACTIVE
      targetMat = this.isHovered ? this.materials.activeHover : this.materials.active;
      showStrike = false;
      this.targetZ = 0;
      this.targetScaleY = 1.0;
      this.targetRotZ = 0;
    }

    this.stickMesh.material = targetMat;
    this.topCap.material = targetMat;
    this.bottomCap.material = targetMat;
    this.strikeMesh.visible = showStrike;

    if (!animate) {
      this.group.position.z = this.targetZ;
      this.group.scale.y = this.targetScaleY;
      this.group.rotation.z = this.targetRotZ;
    }
  }

  update(delta) {
    // Smooth lerping for responsive feel
    const lerpFactor = Math.min(1, delta * 14);
    this.group.position.z += (this.targetZ - this.group.position.z) * lerpFactor;
    this.group.scale.y += (this.targetScaleY - this.group.scale.y) * lerpFactor;
    this.group.rotation.z += (this.targetRotZ - this.group.rotation.z) * lerpFactor;

    // Slight pulse when selected
    if (this.currentState === StickState.SELECTED) {
      const time = performance.now() * 0.004;
      this.strikeMesh.scale.x = 1 + 0.1 * Math.sin(time * 3);
      this.strikeMesh.scale.y = 1 + 0.05 * Math.sin(time * 3);
    }
  }
}
