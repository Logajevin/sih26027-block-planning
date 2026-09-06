/**
 * Three.js Scene Setup, Cinematic Camera Director, and Lighting for SIH26027.
 */

class RailwayThreeScene {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animators = [];
    this.targetCameraPos = null;
    this.targetLookAt = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a12);
    this.scene.fog = new THREE.FogExp2(0x060a12, 0.0018);

    // 2. Camera (Elevated Isometric Perspective)
    this.camera = new THREE.PerspectiveCamera(42, width / height, 1, 3000);
    this.camera.position.set(-120, 160, 220);

    // 3. Renderer with antialiasing & shadow mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls with smooth damping
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below ground
    this.controls.minDistance = 30;
    this.controls.maxDistance = 800;
    this.controls.target.set(0, 0, 0);

    // 5. Lighting
    this.setupLighting();

    // 6. Ground & Industrial Terrain Grid
    this.setupGround();

    // Handle Window Resize
    window.addEventListener("resize", () => this.onResize());

    // Start Render Loop
    this.render();
  }

  setupLighting() {
    // Ambient light with cool control-room slate tone
    const ambientLight = new THREE.AmbientLight(0x334155, 1.2);
    this.scene.add(ambientLight);

    // Main directional sunlight (dramatic industrial shadows)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(-150, 250, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 700;
    const d = 250;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Blue fill light for futuristic digital-twin sheen
    const blueFill = new THREE.DirectionalLight(0x0284c7, 0.6);
    blueFill.position.set(150, 100, -150);
    this.scene.add(blueFill);
  }

  setupGround() {
    // Dark terrain ground plane
    const groundGeo = new THREE.PlaneGeometry(1200, 800);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090e17,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Technical grid overlay (50m railway surveying grid)
    const grid = new THREE.GridHelper(1200, 60, 0x1e293b, 0x0f172a);
    grid.position.y = -0.55;
    this.scene.add(grid);
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setCameraPreset(presetName) {
    if (presetName === "overview") {
      this.smoothMoveCamera(new THREE.Vector3(-120, 160, 220), new THREE.Vector3(0, 0, 0));
    } else if (presetName === "station_focus") {
      // Focus on Khurja Junction
      this.smoothMoveCamera(new THREE.Vector3(-10, 45, 60), new THREE.Vector3(0, 5, 0));
    } else if (presetName === "block_focus") {
      // Focus on Section KRJ-DAR Block Zone
      this.smoothMoveCamera(new THREE.Vector3(90, 40, 50), new THREE.Vector3(120, 0, 0));
    } else if (presetName === "isometric_high") {
      this.smoothMoveCamera(new THREE.Vector3(-200, 260, 200), new THREE.Vector3(40, 0, 0));
    }
  }

  smoothMoveCamera(targetPos, targetLookAt, durationMs = 1200) {
    const startPos = this.camera.position.clone();
    const startLookAt = this.controls.target.clone();
    const startTime = performance.now();

    const animateTransition = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);
      // Smooth easeInOutCubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startLookAt, targetLookAt, ease);
      this.controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(animateTransition);
      }
    };

    requestAnimationFrame(animateTransition);
  }

  addAnimator(fn) {
    this.animators.push(fn);
  }

  render() {
    requestAnimationFrame(() => this.render());

    this.controls.update();

    // Run registered sub-animators
    const delta = 0.016; // ~60fps step
    for (const anim of this.animators) {
      anim(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
