/**
 * 3D Restricted Maintenance Block Zone Visualizer for SIH26027.
 * Renders volumetric restriction envelopes, hazard fencing, physical on-track machinery
 * (tampers, tower wagons), work crews with reflective safety vests, and G&SR protection markers.
 */

class BlockVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.blockGroup = new THREE.Group();
    this.scene.add(this.blockGroup);

    this.activeBlock = null;
    this.pulseTime = 0;
    this.volumetricMesh = null;
    this.hazardFences = [];
    this.onSiteMachines = [];

    // Pre-build the block model on Section KRJ-DAR Down Line (X: 45 to 135, Z: -4.5)
    this.buildBlockZone();
  }

  buildBlockZone() {
    const startX = 45;
    const endX = 135;
    const length = endX - startX;
    const centerX = (startX + endX) / 2;
    const zPos = -4.5;

    // 1. Volumetric Translucent Restriction Envelope (Pulsing Magenta/Yellow)
    const envGeo = new THREE.BoxGeometry(length, 7.5, 6.5);
    const envMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.18,
      wireframe: false,
    });
    this.volumetricMesh = new THREE.Mesh(envGeo, envMat);
    this.volumetricMesh.position.set(centerX, 3.75, zPos);
    this.blockGroup.add(this.volumetricMesh);

    // Wireframe Cage Outline
    const wireGeo = new THREE.BoxGeometry(length + 0.2, 7.7, 6.7);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    this.wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.wireMesh.position.set(centerX, 3.75, zPos);
    this.blockGroup.add(this.wireMesh);

    // 2. Holographic Hazard Laser Fence Lines (Flashing Warning Stripes)
    [-3.2, 3.2].forEach((zOff) => {
      const fenceGeo = new THREE.BoxGeometry(length, 1.2, 0.15);
      const fenceMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const fence = new THREE.Mesh(fenceGeo, fenceMat);
      fence.position.set(centerX, 0.8, zPos + zOff);
      this.hazardFences.push(fence);
      this.blockGroup.add(fence);
    });

    // 3. Physical Track Machine Deployed inside Block (Yellow Tamper)
    const tamperGeo = new THREE.BoxGeometry(14, 2.9, 2.5);
    const tamperMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.4,
      roughness: 0.3,
    });
    const tamper = new THREE.Mesh(tamperGeo, tamperMat);
    tamper.position.set(centerX - 10, 1.95, zPos);
    tamper.castShadow = true;
    this.blockGroup.add(tamper);

    // Tamping Bank Toolheads under machine
    const toolsGeo = new THREE.BoxGeometry(4.0, 1.0, 2.3);
    const toolsMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const tools = new THREE.Mesh(toolsGeo, toolsMat);
    tools.position.set(centerX - 10, 0.6, zPos);
    this.blockGroup.add(tools);

    // 4. Electrical OHE Tower Wagon (Elevated Inspection Scaffolding)
    const twGeo = new THREE.BoxGeometry(8.5, 2.6, 2.4);
    const twMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const tw = new THREE.Mesh(twGeo, twMat);
    tw.position.set(centerX + 18, 1.8, zPos);
    this.blockGroup.add(tw);

    // Raised Hydraulic Scaffolding reaching 25 kV wire
    const towerGeo = new THREE.BoxGeometry(2.2, 4.2, 2.0);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
    });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(centerX + 18, 4.5, zPos);
    this.blockGroup.add(tower);

    // 5. Miniature Maintenance Crew Figures in Orange Reflective Vests
    const workerMat = new THREE.MeshStandardMaterial({ color: 0xea580c }); // Safety Orange
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 }); // Yellow Hardhat

    [-4, 0, 4, 8].forEach((wx) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(centerX + wx, 0.4, zPos + 1.8);

      // Body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2), workerMat);
      body.position.y = 0.6;
      wGroup.add(body);

      // Head with Hardhat
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), helmetMat);
      head.position.y = 1.35;
      wGroup.add(head);

      this.blockGroup.add(wGroup);
    });

    // 6. G&SR Statutory Protection Warning Markers
    // Red Banner Flag at 600m (represented at X: 40)
    const flagGeo = new THREE.BoxGeometry(0.1, 1.4, 2.2);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const banner = new THREE.Mesh(flagGeo, flagMat);
    banner.position.set(startX - 5, 2.0, zPos);
    this.blockGroup.add(banner);

    // 7. 3D Billboard Callout Badge
    const badge = this.createBlockHUD(
      "SHADOW BLOCK ACTIVE",
      "02:10 – 03:40 HRS",
      "KRJ-DAR (DOWN LINE) • 25kV OHE ISOLATED"
    );
    badge.position.set(centerX, 8.8, zPos);
    this.blockGroup.add(badge);

    // Default visible
    this.blockGroup.visible = true;
  }

  createBlockHUD(title, timeRange, sub) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");

    // Dark crimson control box
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 154);

    // Title
    ctx.fillStyle = "#f43f5e";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`⛔ ${title}`, 256, 45);

    // Time
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px monospace";
    ctx.fillText(timeRange, 256, 95);

    // Subtitle
    ctx.fillStyle = "#38bdf8";
    ctx.font = "22px sans-serif";
    ctx.fillText(sub, 256, 135);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 5), mat);
    mesh.rotation.y = 0;
    return mesh;
  }

  update(delta) {
    if (!this.blockGroup.visible) return;

    this.pulseTime += delta * 3.0;

    // Subtle pulsing of volumetric barrier
    if (this.volumetricMesh) {
      const pulseOpacity = 0.16 + Math.sin(this.pulseTime) * 0.08;
      this.volumetricMesh.material.opacity = pulseOpacity;
    }

    // Hazard fences flash
    this.hazardFences.forEach((fence, i) => {
      const col = Math.sin(this.pulseTime + i) > 0 ? 0xf59e0b : 0xdc2626;
      fence.material.color.setHex(col);
    });
  }

  slideBlockWindow(newStartX, newEndX) {
    const length = newEndX - newStartX;
    const centerX = (newStartX + newEndX) / 2;
    this.blockGroup.position.x = centerX - 90; // Smooth offset
  }

  setVisible(visible) {
    this.blockGroup.visible = visible;
  }
}
