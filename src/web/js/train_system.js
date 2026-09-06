/**
 * Miniature 3D Train Entity System for SIH26027.
 * Implements procedural train models (Vande Bharat, Rajdhani/WAP-7, Freight BOXNHL, Track Machines),
 * path kinematics, signal reaction, station dwells, and 3D floating billboarding HUD tags.
 */

class TrainSystem {
  constructor(scene, railwayBuilder) {
    this.scene = scene;
    this.railway = railwayBuilder;
    this.trains = [];
    this.selectedTrain = null;
    this.onTrainSelectedCallback = null;

    this.trainGroup = new THREE.Group();
    this.scene.add(this.trainGroup);

    this.initTrains();
    this.setupRaycasting();
  }

  initTrains() {
    // 1. Train 22436: Vande Bharat Express (Down Line, High Speed)
    const vandeBharat = this.createVandeBharatTrain({
      id: "22436",
      number: "22436",
      name: "Vande Bharat Express (NDLS-BSB)",
      type: "PREMIUM_PASSENGER",
      startX: -280,
      zPos: -4.5,
      direction: 1, // Moving Down Line (towards +X)
      speedKmh: 130,
      status: "ON TIME",
      delayMins: 0,
      etaStation: "Dadri Jn (DER)",
      etaTime: "14:18",
    });
    this.trains.push(vandeBharat);

    // 2. Train 12004: Lucknow Shatabdi Express (Down Line, Express)
    const shatabdi = this.createExpressTrain({
      id: "12004",
      number: "12004",
      name: "Lucknow Swarna Shatabdi",
      type: "MAIL_EXPRESS",
      startX: -140,
      zPos: -4.5,
      direction: 1,
      speedKmh: 110,
      status: "ON TIME",
      delayMins: 0,
      etaStation: "Khurja Jn (KRJ)",
      etaTime: "14:45",
    });
    this.trains.push(shatabdi);

    // 3. Train 12562: Swatantrata Senani Express (Down Line, Target for Delay Demo)
    const express12562 = this.createExpressTrain({
      id: "12562",
      number: "12562",
      name: "Swatantrata Senani Express",
      type: "MAIL_EXPRESS",
      startX: 30, // Just approaching Danwar
      zPos: -4.5,
      direction: 1,
      speedKmh: 95,
      status: "ON TIME",
      delayMins: 0,
      etaStation: "Danwar (DAR)",
      etaTime: "15:10",
    });
    this.trains.push(express12562);

    // 4. Train FRT-BOXN-42: Heavy Coal Freight Rake (Up Line, moving towards -X)
    const freight = this.createFreightTrain({
      id: "FRT-BOXN-42",
      number: "FRT-42",
      name: "Loaded Coal BOXNHL Rake",
      type: "FREIGHT_LOADED",
      startX: 240,
      zPos: 4.5,
      direction: -1, // Moving Up Line (towards -X)
      speedKmh: 65,
      status: "ON TIME",
      delayMins: 0,
      etaStation: "Danwar (DAR)",
      etaTime: "14:35",
    });
    this.trains.push(freight);

    // 5. Machine CSM-912: 09-3X Tamping Machine (Stabled at Khurja Siding)
    const tamper = this.createTrackMachine({
      id: "MCH-CSM-912",
      number: "CSM-912",
      name: "09-3X Continuous Action Tamper",
      type: "TRACK_MACHINE",
      startX: -5,
      zPos: 13.5, // Siding track
      direction: 1,
      speedKmh: 0, // Stabled
      status: "STANDBY AT SIDING",
      delayMins: 0,
      etaStation: "Khurja Depot",
      etaTime: "02:10 (Block Start)",
    });
    this.trains.push(tamper);
  }

  createVandeBharatTrain(config) {
    const group = new THREE.Group();
    group.position.set(config.startX, 0, config.zPos);

    // Aerodynamic Nose Locomotive
    const locoGeo = new THREE.BoxGeometry(11, 2.7, 2.5);
    const locoMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.4,
      roughness: 0.3,
    });
    const loco = new THREE.Mesh(locoGeo, locoMat);
    loco.position.y = 1.9;
    loco.castShadow = true;
    group.add(loco);

    // Vande Bharat Royal Blue Stripe along side
    const stripeGeo = new THREE.BoxGeometry(11.1, 0.5, 2.55);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 1.8;
    group.add(stripe);

    // Pantograph
    const panto = this.createPantograph();
    panto.position.set(-2, 3.2, 0);
    group.add(panto);

    // 3 Articulated Coaches behind
    for (let c = 1; c <= 3; c++) {
      const coach = new THREE.Mesh(
        new THREE.BoxGeometry(9.5, 2.6, 2.4),
        locoMat
      );
      coach.position.set(-c * 11.5, 1.85, 0);
      coach.castShadow = true;
      group.add(coach);

      const cStripe = new THREE.Mesh(
        new THREE.BoxGeometry(9.6, 0.48, 2.45),
        stripeMat
      );
      cStripe.position.set(-c * 11.5, 1.8, 0);
      group.add(cStripe);
    }

    this.trainGroup.add(group);

    return {
      ...config,
      group: group,
      currentX: config.startX,
      targetSpeed: config.speedKmh,
      currentSpeed: config.speedKmh,
      meshForClick: loco,
    };
  }

  createExpressTrain(config) {
    const group = new THREE.Group();
    group.position.set(config.startX, 0, config.zPos);

    // WAP-7 Red/White Electric Locomotive
    const locoMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Indian Railways Red
      metalness: 0.5,
      roughness: 0.4,
    });
    const loco = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.8, 2.5), locoMat);
    loco.position.y = 1.95;
    loco.castShadow = true;
    group.add(loco);

    // Pantograph
    const panto = this.createPantograph();
    panto.position.set(1.5, 3.3, 0);
    group.add(panto);

    // LHB Red/Silver Coaches
    const coachMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      metalness: 0.7,
      roughness: 0.3,
    });
    for (let c = 1; c <= 3; c++) {
      const coach = new THREE.Mesh(
        new THREE.BoxGeometry(9.0, 2.6, 2.4),
        coachMat
      );
      coach.position.set(-c * 10.8, 1.85, 0);
      coach.castShadow = true;
      group.add(coach);
    }

    this.trainGroup.add(group);

    return {
      ...config,
      group: group,
      currentX: config.startX,
      targetSpeed: config.speedKmh,
      currentSpeed: config.speedKmh,
      meshForClick: loco,
    };
  }

  createFreightTrain(config) {
    const group = new THREE.Group();
    group.position.set(config.startX, 0, config.zPos);

    // WAG-9 Freight Locomotive (Green/Yellow)
    const locoMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.5,
    });
    const loco = new THREE.Mesh(new THREE.BoxGeometry(9.0, 2.7, 2.5), locoMat);
    loco.position.y = 1.9;
    loco.castShadow = true;
    group.add(loco);

    // BOXNHL Coal Hopper Wagons (Brown Open Wagons)
    const wagonMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8,
    });
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
    });

    for (let w = 1; w <= 4; w++) {
      const wagon = new THREE.Mesh(
        new THREE.BoxGeometry(7.5, 2.2, 2.4),
        wagonMat
      );
      wagon.position.set(w * 8.8, 1.6, 0); // Reverse direction
      wagon.castShadow = true;
      group.add(wagon);

      // Coal load inside wagon
      const coal = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.7, 2.1), coalMat);
      coal.position.set(w * 8.8, 2.4, 0);
      group.add(coal);
    }

    this.trainGroup.add(group);

    return {
      ...config,
      group: group,
      currentX: config.startX,
      targetSpeed: config.speedKmh,
      currentSpeed: config.speedKmh,
      meshForClick: loco,
    };
  }

  createTrackMachine(config) {
    const group = new THREE.Group();
    group.position.set(config.startX, 0, config.zPos);

    // Yellow CSM-912 Tamping Machine
    const mchMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.4,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(12, 2.8, 2.6), mchMat);
    body.position.y = 1.9;
    body.castShadow = true;
    group.add(body);

    // Cabin Roof & Hazard Beacon
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    beacon.position.set(4, 3.4, 0);
    group.add(beacon);

    this.trainGroup.add(group);

    return {
      ...config,
      group: group,
      currentX: config.startX,
      targetSpeed: 0,
      currentSpeed: 0,
      meshForClick: body,
    };
  }

  createPantograph() {
    const pGroup = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x64748b });

    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), mat);
    arm1.rotation.z = Math.PI / 4;
    arm1.position.set(0.6, 0.8, 0);
    pGroup.add(arm1);

    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), mat);
    arm2.rotation.z = -Math.PI / 4;
    arm2.position.set(-0.6, 0.8, 0);
    pGroup.add(arm2);

    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.6), mat);
    bar.position.set(0, 1.5, 0);
    pGroup.add(bar);

    return pGroup;
  }

  update(delta, activeBlockSection, simSpeed = 1.0) {
    this.trains.forEach((t) => {
      // If speed is 0 (like stabled machine), skip
      if (t.targetSpeed === 0 && t.currentSpeed === 0) return;

      // 1. Check for Active Maintenance Block Ahead
      // Section KRJ-DAR Down Line is from X = 20 to X = 130
      let mustHalt = false;
      if (activeBlockSection === "BLK_KRJ_DAR_DN" && t.zPos === -4.5 && t.direction === 1) {
        // If train is between X = -10 and X = 30, it must halt before the block starter signal!
        if (t.currentX > -10 && t.currentX < 35) {
          mustHalt = true;
        }
      }

      if (mustHalt) {
        // Decelerate smoothly to 0 km/h
        t.currentSpeed = Math.max(0, t.currentSpeed - delta * 25);
      } else {
        // Accelerate smoothly to target speed
        t.currentSpeed = Math.min(t.targetSpeed, t.currentSpeed + delta * 15);
      }

      // 2. Advance train position
      const velocity = (t.currentSpeed / 3.6) * 0.4 * delta * simSpeed;
      t.currentX += velocity * t.direction;

      // Wrap around corridor boundaries (-360 to +360)
      if (t.direction === 1 && t.currentX > 370) {
        t.currentX = -370;
      } else if (t.direction === -1 && t.currentX < -370) {
        t.currentX = 370;
      }

      t.group.position.x = t.currentX;
    });
  }

  setupRaycasting() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener("click", (event) => {
      const container = document.getElementById("canvas3DContainer");
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Check if click was inside 3D canvas
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.scene.camera);
      const meshes = this.trains.map((t) => t.meshForClick);
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const train = this.trains.find(
          (t) => t.meshForClick === clickedMesh || t.group.children.includes(clickedMesh)
        );
        if (train) {
          this.selectedTrain = train;
          if (this.onTrainSelectedCallback) {
            this.onTrainSelectedCallback(train);
          }
        }
      }
    });
  }
}
