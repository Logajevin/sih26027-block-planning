/**
 * Procedural 3D Railway Infrastructure Builder for SIH26027.
 * Generates twin rails, sleepers, ballast beds, OHE catenary masts, station structures,
 * platforms, crossovers, and dynamic 4-aspect signal posts.
 */

class RailwayBuilder {
  constructor(scene) {
    this.scene = scene;
    this.trackGroup = new THREE.Group();
    this.stationGroup = new THREE.Group();
    this.signalGroup = new THREE.Group();
    this.oheGroup = new THREE.Group();

    this.scene.add(this.trackGroup);
    this.scene.add(this.stationGroup);
    this.scene.add(this.signalGroup);
    this.scene.add(this.oheGroup);

    // Track line coordinates along Z-axis
    // Down Line: Z = -4.5, Up Line: Z = +4.5, Siding: Z = +14.0
    this.trackLines = {
      DN: { z: -4.5, name: "Down Main Line (GZB -> ALJN)" },
      UP: { z: 4.5, name: "Up Main Line (ALJN -> GZB)" },
      SIDING_KRJ: { z: 13.5, startX: -60, endX: 40, name: "Khurja Machine Siding" },
      SIDING_DER: { z: -13.5, startX: -200, endX: -100, name: "Dadri Container Siding" },
    };

    // 5 Major physical station complexes
    this.stations = [
      { code: "GZB", name: "Ghaziabad Jn", x: -300, km: 0.0, isJunction: true },
      { code: "DER", name: "Dadri Jn", x: -150, km: 17.2, isJunction: true },
      { code: "KRJ", name: "Khurja Jn", x: 0, km: 63.5, isJunction: true },
      { code: "DAR", name: "Danwar", x: 150, km: 79.2, isJunction: false },
      { code: "ALJN", name: "Aligarh Jn", x: 300, km: 120.0, isJunction: true },
    ];

    this.signals = [];

    this.buildInfrastructure();
  }

  buildInfrastructure() {
    this.buildTracks();
    this.buildOHECatenary();
    this.buildStations();
    this.buildSignals();
  }

  buildTracks() {
    const trackStartX = -380;
    const trackEndX = 380;
    const length = trackEndX - trackStartX;

    // Materials
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
    });
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.8,
    });
    const ballastMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.95,
    });

    // 1. Build Ballast Berms for Main Lines
    [-4.5, 4.5].forEach((zPos) => {
      const ballastGeo = new THREE.BoxGeometry(length, 0.6, 6.0);
      const ballast = new THREE.Mesh(ballastGeo, ballastMat);
      ballast.position.set(0, -0.15, zPos);
      ballast.receiveShadow = true;
      this.trackGroup.add(ballast);

      // Steel Twin Rails
      [-1.0, 1.0].forEach((railOffset) => {
        const railGeo = new THREE.BoxGeometry(length, 0.4, 0.18);
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(0, 0.35, zPos + railOffset);
        rail.castShadow = true;
        this.trackGroup.add(rail);
      });

      // Concrete Sleepers / Ties (Instanced or looped)
      const sleeperGeo = new THREE.BoxGeometry(0.5, 0.25, 3.2);
      const sleeperSpacing = 1.4;
      const numSleepers = Math.floor(length / sleeperSpacing);

      for (let i = 0; i < numSleepers; i++) {
        const xPos = trackStartX + i * sleeperSpacing;
        const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
        sleeper.position.set(xPos, 0.1, zPos);
        sleeper.castShadow = true;
        sleeper.receiveShadow = true;
        this.trackGroup.add(sleeper);
      }
    });

    // 2. Build Siding Track at Khurja
    const sidingLength = 100;
    const sidingBallast = new THREE.Mesh(
      new THREE.BoxGeometry(sidingLength, 0.5, 4.5),
      ballastMat
    );
    sidingBallast.position.set(-10, -0.15, 13.5);
    this.trackGroup.add(sidingBallast);

    [-1.0, 1.0].forEach((rOffset) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(sidingLength, 0.35, 0.16),
        railMat
      );
      rail.position.set(-10, 0.3, 13.5 + rOffset);
      this.trackGroup.add(rail);
    });
  }

  buildOHECatenary() {
    const mastMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.6,
      roughness: 0.4,
    });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const mastSpacing = 35;
    const numMasts = Math.floor(700 / mastSpacing);

    for (let i = 0; i < numMasts; i++) {
      const x = -350 + i * mastSpacing;

      // Vertical Steel Portal Mast Left & Right
      [-9.0, 9.0].forEach((z) => {
        const mastGeo = new THREE.BoxGeometry(0.5, 9.0, 0.5);
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(x, 4.5, z);
        mast.castShadow = true;
        this.oheGroup.add(mast);
      });

      // Horizontal Cross-Beam connecting portal
      const beamGeo = new THREE.BoxGeometry(0.4, 0.4, 18.5);
      const beam = new THREE.Mesh(beamGeo, mastMat);
      beam.position.set(x, 8.8, 0);
      beam.castShadow = true;
      this.oheGroup.add(beam);

      // Cantilever drop arms above each track
      [-4.5, 4.5].forEach((z) => {
        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8);
        const arm = new THREE.Mesh(armGeo, mastMat);
        arm.position.set(x, 7.8, z);
        this.oheGroup.add(arm);
      });
    }

    // Overhead 25 kV AC Contact Wires (continuous lines)
    [-4.5, 4.5].forEach((z) => {
      const wireGeo = new THREE.CylinderGeometry(0.04, 0.04, 760);
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.rotation.z = Math.PI / 2;
      wire.position.set(0, 6.9, z);
      this.oheGroup.add(wire);
    });
  }

  buildStations() {
    this.stations.forEach((st) => {
      const group = new THREE.Group();
      group.position.set(st.x, 0, 0);

      // 1. Island Platform between Down and Up line, and outer platforms
      const platformMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.7,
      });
      const platformGeo = new THREE.BoxGeometry(70, 1.2, 3.8);
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.set(0, 0.6, 0);
      platform.castShadow = true;
      platform.receiveShadow = true;
      group.add(platform);

      // Platform Yellow Safety Line
      [-1.7, 1.7].forEach((zOffset) => {
        const lineGeo = new THREE.BoxGeometry(68, 0.02, 0.15);
        const line = new THREE.Mesh(
          lineGeo,
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        line.position.set(0, 1.21, zOffset);
        group.add(line);
      });

      // 2. Station Canopy Roof
      const canopyMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.3,
        metalness: 0.5,
      });
      const canopyGeo = new THREE.BoxGeometry(50, 0.4, 4.2);
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 4.2, 0);
      canopy.castShadow = true;
      group.add(canopy);

      // Canopy Pillars
      [-18, -6, 6, 18].forEach((px) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 3.0),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
        );
        pillar.position.set(px, 2.7, 0);
        group.add(pillar);
      });

      // 3. Station Building (Main Terminal Entrance)
      const buildingMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
      });
      const buildingGeo = new THREE.BoxGeometry(32, 7.5, 12);
      const building = new THREE.Mesh(buildingGeo, buildingMat);
      building.position.set(0, 3.75, -15);
      building.castShadow = true;
      group.add(building);

      // Warm interior window glow
      const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const win = new THREE.Mesh(new THREE.BoxGeometry(26, 2.5, 0.2), windowMat);
      win.position.set(0, 4.5, -8.9);
      group.add(win);

      // 4. Station Nameboard (Yellow background, bold black text)
      const board = this.createStationNameboard(st.code, st.name);
      board.position.set(0, 3.2, 2.8);
      group.add(board);

      this.stationGroup.add(group);
    });
  }

  createStationNameboard(code, name) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#facc15"; // Indian Railways standard station yellow
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = "#000";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${code} | ${name.toUpperCase()}`, 256, 82);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 0.3), mat);
    return mesh;
  }

  buildSignals() {
    // Deploy 4-Aspect Signals along Down and Up Lines
    const signalPositions = [
      { id: "SIG_GZB_DN", x: -260, z: -7.5, line: "DN", aspect: "GREEN" },
      { id: "SIG_DER_DN", x: -110, z: -7.5, line: "DN", aspect: "GREEN" },
      { id: "SIG_KRJ_HOME", x: -40, z: -7.5, line: "DN", aspect: "YELLOW" },
      { id: "SIG_KRJ_STARTER", x: 40, z: -7.5, line: "DN", aspect: "RED" }, // Red at blocked section!
      { id: "SIG_DAR_DN", x: 190, z: -7.5, line: "DN", aspect: "GREEN" },
      { id: "SIG_ALJN_DN", x: 260, z: -7.5, line: "DN", aspect: "GREEN" },
    ];

    signalPositions.forEach((pos) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      // Signal Mast Post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 6.0),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 })
      );
      post.position.y = 3.0;
      post.castShadow = true;
      group.add(post);

      // 4-Aspect Signal Head Box
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 2.6, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      box.position.y = 5.2;
      group.add(box);

      // LED Lenses (Red, Yellow, Green, Yellow)
      const redLED = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 16),
        new THREE.MeshBasicMaterial({ color: pos.aspect === "RED" ? 0xef4444 : 0x331010 })
      );
      redLED.position.set(0.41, 6.0, 0);
      redLED.rotation.y = Math.PI / 2;
      group.add(redLED);

      const yellowLED = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 16),
        new THREE.MeshBasicMaterial({ color: pos.aspect === "YELLOW" ? 0xf59e0b : 0x332510 })
      );
      yellowLED.position.set(0.41, 5.4, 0);
      yellowLED.rotation.y = Math.PI / 2;
      group.add(yellowLED);

      const greenLED = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 16),
        new THREE.MeshBasicMaterial({ color: pos.aspect === "GREEN" ? 0x10b981 : 0x0f3310 })
      );
      greenLED.position.set(0.41, 4.8, 0);
      greenLED.rotation.y = Math.PI / 2;
      group.add(greenLED);

      // Store references for dynamic state updating
      this.signals.push({
        id: pos.id,
        group: group,
        redLED: redLED,
        yellowLED: yellowLED,
        greenLED: greenLED,
        setAspect: (aspect) => {
          redLED.material.color.setHex(aspect === "RED" ? 0xef4444 : 0x2b0e0e);
          yellowLED.material.color.setHex(aspect === "YELLOW" ? 0xf59e0b : 0x2b1e0e);
          greenLED.material.color.setHex(aspect === "GREEN" ? 0x10b981 : 0x0e2b12);
        },
      });

      this.signalGroup.add(group);
    });
  }

  setSignalAspect(signalId, aspect) {
    const sig = this.signals.find((s) => s.id === signalId);
    if (sig) sig.setAspect(aspect);
  }
}
