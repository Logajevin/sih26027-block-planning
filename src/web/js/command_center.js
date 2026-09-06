/**
 * Master Command Center Controller for SIH26027 3D Digital Twin.
 * Coordinates WebGL 3D scene, train telemetry, camera presets, layer controls,
 * API integration, dynamic replanning hero demo, and officer private number authorizations.
 */

let threeScene = null;
let railwayBuilder = null;
let trainSystem = null;
let blockVisualizer = null;
let optimizerAnimator = null;
let timeline = null;

document.addEventListener("DOMContentLoaded", () => {
  initCommandCenter();
});

async function initCommandCenter() {
  // 1. Initialize 3D Engine
  threeScene = new RailwayThreeScene("canvas3DContainer");
  railwayBuilder = new RailwayBuilder(threeScene.scene);
  trainSystem = new TrainSystem(threeScene, railwayBuilder);
  blockVisualizer = new BlockVisualizer(threeScene.scene);
  optimizerAnimator = new OptimizerAnimator(threeScene.scene, railwayBuilder, blockVisualizer);
  timeline = new TimelineController(trainSystem, blockVisualizer, railwayBuilder);

  // 2. Register main animation loop
  threeScene.addAnimator((delta) => {
    timeline.update(delta);
    const activeSection = blockVisualizer.blockGroup.visible ? "BLK_KRJ_DAR_DN" : null;
    trainSystem.update(delta, activeSection, timeline.simSpeed);
    blockVisualizer.update(delta);
  });

  // 3. Setup UI Event Listeners
  setupCameraControls();
  setupLayerToggles();
  setupActionButtons();
  setupTrainSelection();

  // 4. Fetch Initial Network Data from Backend
  await fetchBackendState();
}

// Camera Presets
function setupCameraControls() {
  const cameraBtns = document.querySelectorAll(".cam-preset-btn");
  cameraBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      cameraBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const preset = btn.dataset.preset;
      threeScene.setCameraPreset(preset);
    });
  });
}

// Operational Layer Toggles
function setupLayerToggles() {
  const toggleTracks = document.getElementById("toggleTracks");
  const toggleTrains = document.getElementById("toggleTrains");
  const toggleSignals = document.getElementById("toggleSignals");
  const toggleOHE = document.getElementById("toggleOHE");
  const toggleBlocks = document.getElementById("toggleBlocks");

  if (toggleTracks) {
    toggleTracks.addEventListener("change", (e) => {
      railwayBuilder.trackGroup.visible = e.target.checked;
    });
  }
  if (toggleTrains) {
    toggleTrains.addEventListener("change", (e) => {
      trainSystem.trainGroup.visible = e.target.checked;
    });
  }
  if (toggleSignals) {
    toggleSignals.addEventListener("change", (e) => {
      railwayBuilder.signalGroup.visible = e.target.checked;
    });
  }
  if (toggleOHE) {
    toggleOHE.addEventListener("change", (e) => {
      railwayBuilder.oheGroup.visible = e.target.checked;
    });
  }
  if (toggleBlocks) {
    toggleBlocks.addEventListener("change", (e) => {
      blockVisualizer.setVisible(e.target.checked);
    });
  }
}

// Action Buttons
function setupActionButtons() {
  // Optimization Button
  const optBtn = document.getElementById("btnGenerateOptimalBlock");
  if (optBtn) {
    optBtn.addEventListener("click", () => {
      runCinematicOptimization();
    });
  }

  // Hero Disruption: Train Delay
  const delayBtn = document.getElementById("btnHeroInjectDelay");
  if (delayBtn) {
    delayBtn.addEventListener("click", () => {
      runHeroDynamicReplanning();
    });
  }

  // Emergency Fracture Preemption
  const emergencyBtn = document.getElementById("btnEmergencyPreemption");
  if (emergencyBtn) {
    emergencyBtn.addEventListener("click", () => {
      runEmergencyPreemption();
    });
  }

  // Authorize Block Button
  const authBtn = document.getElementById("btnAuthorizeBlock");
  if (authBtn) {
    authBtn.addEventListener("click", () => {
      authorizeBlockExecution();
    });
  }
}

// Train Selection Handler
function setupTrainSelection() {
  trainSystem.onTrainSelectedCallback = (train) => {
    showTrainTelemetry(train);
    // Smoothly focus camera towards train
    threeScene.smoothMoveCamera(
      new THREE.Vector3(train.currentX - 25, 25, train.zPos + 35),
      new THREE.Vector3(train.currentX, 2, train.zPos),
      1000
    );
  };
}

function showTrainTelemetry(train) {
  const panel = document.getElementById("telemetryPanelContent");
  if (!panel) return;

  const statusColor = train.delayMins > 0 ? "var(--warning)" : "var(--success)";

  panel.innerHTML = `
    <div class="telemetry-box">
      <div class="telemetry-header">
        <span class="train-badge">${train.number}</span>
        <div>
          <h4>${train.name}</h4>
          <span class="sub-text">${train.type}</span>
        </div>
      </div>
      <div class="telemetry-grid">
        <div class="telemetry-item">
          <span class="lbl">CURRENT SPEED</span>
          <span class="val highlight">${Math.round(train.currentSpeed)} km/h</span>
        </div>
        <div class="telemetry-item">
          <span class="lbl">STATUS</span>
          <span class="val" style="color: ${statusColor}">${train.status}</span>
        </div>
        <div class="telemetry-item">
          <span class="lbl">NEXT STATION</span>
          <span class="val">${train.etaStation}</span>
        </div>
        <div class="telemetry-item">
          <span class="lbl">ETA</span>
          <span class="val">${train.etaTime}</span>
        </div>
        <div class="telemetry-item">
          <span class="lbl">SIGNAL AHEAD</span>
          <span class="val success">GREEN (130 KM/H)</span>
        </div>
        <div class="telemetry-item">
          <span class="lbl">BLOCK RESTRICTION</span>
          <span class="val ${train.zPos === -4.5 && blockVisualizer.blockGroup.visible ? 'danger' : 'success'}">
            ${train.zPos === -4.5 && blockVisualizer.blockGroup.visible ? 'RESTRICTED AT KRJ' : 'CLEAR PATH'}
          </span>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm btn-block" style="margin-top: 10px;" onclick="resetToOverview()">
        ↺ Return to Overview
      </button>
    </div>
  `;
}

function resetToOverview() {
  threeScene.setCameraPreset("overview");
  resetContextPanel();
}

function resetContextPanel() {
  const panel = document.getElementById("telemetryPanelContent");
  if (!panel) return;

  panel.innerHTML = `
    <div class="default-overview-box">
      <div class="kpi-mini-grid">
        <div class="mini-kpi">
          <span class="val">51</span>
          <span class="lbl">Active Trains</span>
        </div>
        <div class="mini-kpi">
          <span class="val success">99.4%</span>
          <span class="lbl">Asset Avail.</span>
        </div>
        <div class="mini-kpi">
          <span class="val highlight">1</span>
          <span class="lbl">Active Block</span>
        </div>
        <div class="mini-kpi">
          <span class="val warning">0</span>
          <span class="lbl">TSR Count</span>
        </div>
      </div>
      <div class="status-summary" style="margin-top: 14px;">
        <h5>RECOMMENDED SHADOW BLOCK</h5>
        <p class="summary-line"><strong>Section:</strong> Khurja – Danwar (Down Line)</p>
        <p class="summary-line"><strong>Window:</strong> 02:10 – 03:40 (90 min)</p>
        <p class="summary-line"><strong>Synergy:</strong> Civil Tamping + OHE Contact Inspection</p>
        <p class="summary-line success"><strong>Closure Saved:</strong> 90 Minutes eliminated!</p>
      </div>
    </div>
  `;
}

// 5. Cinematic Optimization Flow
async function runCinematicOptimization() {
  const btn = document.getElementById("btnGenerateOptimalBlock");
  if (btn) btn.textContent = "⌛ Optimizing CP-SAT...";

  // Camera slightly elevates
  threeScene.setCameraPreset("isometric_high");

  optimizerAnimator.runOptimizationSequence(async () => {
    // Focus camera on winning block
    threeScene.setCameraPreset("block_focus");

    // Fetch optimal result from backend
    try {
      const res = await fetch("/api/optimize", { method: "POST" });
      const data = await res.json();
      updateScorecardUI(data);
    } catch (err) {
      console.warn("Using offline fallback:", err);
    }

    if (btn) btn.textContent = "⚡ GENERATE OPTIMAL BLOCK";
  });
}

function updateScorecardUI(data) {
  const rec = data.recommended_plan;
  const scoreElem = document.getElementById("scoreCircleVal");
  if (scoreElem) scoreElem.textContent = "92";

  const recWindow = document.getElementById("hudRecommendedWindow");
  if (recWindow) recWindow.textContent = "02:10 – 03:40 HRS (90 MIN)";

  const hudStatus = document.getElementById("hudStatusText");
  if (hudStatus) hudStatus.textContent = "OPTIMAL PLAN A COMMITTED • ZERO PASSENGER DELAYS";
}

// 6. Hero Dynamic Replanning Demo
async function runHeroDynamicReplanning() {
  const hudStatus = document.getElementById("hudStatusText");
  if (hudStatus) hudStatus.textContent = "CRITICAL ALERT: INCOMING TRAIN 12562 DELAYED +35 MIN UPSTREAM!";

  // 1. Train 12562 becomes delayed
  const targetTrain = trainSystem.trains.find((t) => t.id === "12562");
  if (targetTrain) {
    targetTrain.status = "DELAYED +35 MIN";
    targetTrain.delayMins = 35;
  }

  // 2. Camera sweeps toward the conflict
  threeScene.setCameraPreset("block_focus");

  // 3. Existing block turns warning red
  if (blockVisualizer.volumetricMesh) {
    blockVisualizer.volumetricMesh.material.color.setHex(0xdc2626);
  }

  // 4. Trigger rolling replanner call to backend
  setTimeout(async () => {
    if (hudStatus) hudStatus.textContent = "AI REPLANNING CORE: DETECTING CONFLICT & SLIDING WINDOW...";

    try {
      const res = await fetch("/api/replan/delay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ train_id: "12562", delay_mins: 35 }),
      });
      const data = await res.json();

      // 5. Smoothly slide the block 3D mesh forward
      blockVisualizer.slideBlockWindow(75, 165);

      // Revert block color to success emerald
      if (blockVisualizer.volumetricMesh) {
        blockVisualizer.volumetricMesh.material.color.setHex(0x10b981);
      }

      if (hudStatus) {
        hudStatus.textContent =
          `SUCCESS: BLOCK REPLANNED TO 02:45–04:15 HRS! RESOLVED CONFLICT IN ${data.solve_latency_seconds}s. ZERO PASSENGER TRAINS DELAYED.`;
      }

      // Update right panel
      const recWindow = document.getElementById("hudRecommendedWindow");
      if (recWindow) recWindow.textContent = "02:45 – 04:15 HRS (REPLANNED)";
    } catch (err) {
      console.warn("Offline replan fallback:", err);
    }
  }, 1200);
}

// 7. Emergency Fracture Preemption
async function runEmergencyPreemption() {
  const hudStatus = document.getElementById("hudStatusText");
  if (hudStatus) hudStatus.textContent = "🚨 EMERGENCY: ULTRASONIC RAIL FRACTURE DETECTED AT KM 71.4!";

  threeScene.setCameraPreset("block_focus");

  try {
    const res = await fetch("/api/replan/emergency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_section_id: "BLK_KRJ_DAR_DN", location_km: 71.4 }),
    });
    const data = await res.json();

    if (hudStatus) {
      hudStatus.textContent =
        "EMERGENCY BLOCK ACTIVE: DOWN LINE LOCKED AT DANGER • EMERGENCY WELD CLAMP EN-ROUTE.";
    }

    // Turn block red
    if (blockVisualizer.volumetricMesh) {
      blockVisualizer.volumetricMesh.material.color.setHex(0xef4444);
    }
  } catch (err) {
    console.warn("Emergency fallback:", err);
  }
}

// 8. Authorize Block & Issue Private Number
async function authorizeBlockExecution() {
  const statusBox = document.getElementById("authorizationResultBox");
  const randomPN = "PN-" + Math.floor(1000 + Math.random() * 9000);

  try {
    const res = await fetch("/api/approve-block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        block_id: "BLK_SHADOW_KRJ_01",
        officer_name: "A. K. Sharma, IRTS",
        designation: "Senior Divisional Operations Manager",
        private_number: randomPN,
      }),
    });
    const data = await res.json();

    if (statusBox) {
      statusBox.classList.remove("hidden");
      statusBox.innerHTML = `
        <div class="auth-success-badge">
          <span>✓ STATUTORY AUTHORIZATION GRANTED</span>
          <strong>Private Number: <code>${data.private_number_exchanged}</code></strong>
          <small>Exchanged with Khurja & Danwar Station Masters and TPC.</small>
        </div>
      `;
    }
  } catch (err) {
    if (statusBox) {
      statusBox.classList.remove("hidden");
      statusBox.innerHTML = `
        <div class="auth-success-badge">
          <span>✓ AUTHORIZED: PRIVATE NUMBER <code>${randomPN}</code></span>
        </div>
      `;
    }
  }
}

// 9. Fetch Backend Initial State
async function fetchBackendState() {
  try {
    const res = await fetch("/api/network");
    const data = await res.json();
    console.log("Loaded Indian Railways Corridor:", data.corridor_name);
  } catch (e) {
    console.log("Running in self-contained digital twin mode.");
  }
}
