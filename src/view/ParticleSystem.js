import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];

    // Pre-create reusable geometry for particle bursts
    this.particleCount = 60;
  }

  createStrikeBurst(position) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const velocities = [];

    const baseColor = new THREE.Color(0xE74C3C);
    const altColor = new THREE.Color(0xF39C12);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + 0.2;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      velocities.push(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.2) * 2.5
      );

      const c = Math.random() > 0.5 ? baseColor : altColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.bursts.push({
      points,
      velocities,
      positions,
      life: 1.0,
      decay: 2.2, // ~0.45s life
    });
  }

  createVictoryBurst(originX = 0, originY = 0) {
    for (let b = 0; b < 4; b++) {
      setTimeout(() => {
        const x = originX + (Math.random() - 0.5) * 4;
        const y = originY + (Math.random() - 0.5) * 4;
        this.createStrikeBurst(new THREE.Vector3(x, y, 0.5));
      }, b * 160);
    }
  }

  update(delta) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life -= delta * burst.decay;

      if (burst.life <= 0) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }

      const posAttr = burst.points.geometry.attributes.position;
      const count = burst.velocities.length / 3;

      for (let j = 0; j < count; j++) {
        burst.positions[j * 3] += burst.velocities[j * 3] * delta;
        burst.positions[j * 3 + 1] += burst.velocities[j * 3 + 1] * delta;
        burst.positions[j * 3 + 2] += burst.velocities[j * 3 + 2] * delta;

        // gravity
        burst.velocities[j * 3 + 1] -= 9.8 * delta * 0.4;
      }

      posAttr.needsUpdate = true;
      burst.points.material.opacity = Math.max(0, burst.life);
    }
  }
}
