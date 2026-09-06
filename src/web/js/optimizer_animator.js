/**
 * Cinematic AI Optimization & Particle Scanning Animator for SIH26027.
 * Implements data stream particle scanning along railway tracks, progressive candidate
 * evaluation, conflict elimination in red, and optimal window illumination in emerald green.
 */

class OptimizerAnimator {
  constructor(scene, railwayBuilder, blockVisualizer) {
    this.scene = scene;
    this.railway = railwayBuilder;
    this.blockVisualizer = blockVisualizer;

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.isOptimizing = false;
    this.particles = null;
    this.particlePositions = [];
    this.candidateBoxes = [];

    this.initParticleSystem();
  }

  initParticleSystem() {
    const count = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Scatter along tracks
      positions[i * 3] = (Math.random() - 0.5) * 700; // X: -350 to +350
      positions[i * 3 + 1] = 0.5 + Math.random() * 4.0; // Y
      positions[i * 3 + 2] = (Math.random() > 0.5 ? -4.5 : 4.5) + (Math.random() - 0.5) * 4.0; // Z

      // Cyan data stream colors
      colors[i * 3] = 0.2;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.0, // Hidden by default until optimization runs
    });

    this.particles = new THREE.Points(geometry, material);
    this.particleGroup.add(this.particles);
  }

  runOptimizationSequence(onComplete) {
    if (this.isOptimizing) return;
    this.isOptimizing = true;

    // 1. Reveal streaming data particles
    this.particles.material.opacity = 0.85;

    // Sound/Haptic visual prompt
    const hudStatus = document.getElementById("hudStatusText");
    if (hudStatus) hudStatus.textContent = "AI OPTIMIZER ACTIVE: SCANNING 60 TRAIN PATHS...";

    const startTime = performance.now();
    const durationMs = 2800;

    // 2. Animate Candidate Window Projections along corridor
    this.spawnCandidateHolograms();

    const animateSweep = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);

      // Fast stream particle motion
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += 4.5;
        if (pos[i * 3] > 350) pos[i * 3] = -350;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;

      // Progressive conflict rejection animation
      if (progress > 0.4 && this.candidateBoxes[0]) {
        this.candidateBoxes[0].material.color.setHex(0xef4444); // Red: Train Conflict
        if (hudStatus) hudStatus.textContent = "DETECTING CONFLICTS: ELIMINATING CLASHES...";
      }
      if (progress > 0.7 && this.candidateBoxes[1]) {
        this.candidateBoxes[1].material.color.setHex(0xef4444); // Red: Resource Clashing
        if (hudStatus) hudStatus.textContent = "CHECKING SHADOW BUNDLING SYNERGIES...";
      }

      if (progress < 1.0) {
        requestAnimationFrame(animateSweep);
      } else {
        // Optimization Complete!
        this.particles.material.opacity = 0.0; // Hide particles
        this.cleanupCandidates();

        // Illuminate winning block
        if (this.blockVisualizer) {
          this.blockVisualizer.setVisible(true);
        }

        if (hudStatus) hudStatus.textContent = "OPTIMAL PARETO BLOCK SELECTED (SCORE: 92/100)";
        this.isOptimizing = false;

        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateSweep);
  }

  spawnCandidateHolograms() {
    this.cleanupCandidates();

    // Candidate 1 at Dadri (X: -150)
    const box1 = new THREE.Mesh(
      new THREE.BoxGeometry(60, 5, 5),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    );
    box1.position.set(-150, 2.5, -4.5);
    this.candidateBoxes.push(box1);
    this.particleGroup.add(box1);

    // Candidate 2 at Somna (X: 200)
    const box2 = new THREE.Mesh(
      new THREE.BoxGeometry(60, 5, 5),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    );
    box2.position.set(200, 2.5, -4.5);
    this.candidateBoxes.push(box2);
    this.particleGroup.add(box2);
  }

  cleanupCandidates() {
    this.candidateBoxes.forEach((b) => this.particleGroup.remove(b));
    this.candidateBoxes = [];
  }
}
