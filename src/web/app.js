/**
 * SIH26027 — Frontend Application Script
 * Canvas Time-Distance Train Graph, Leaflet GIS Map, and Dynamic Replanning Sandbox.
 */

let networkData = null;
let currentOptimization = null;
let corridorMap = null;

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSlider();
  fetchInitialData();
  attachEventListeners();
});

// 1. Tab Switching
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = `tab-${btn.dataset.tab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");

      // Invalidate map size if switching to GIS map tab
      if (btn.dataset.tab === "gis-map" && corridorMap) {
        setTimeout(() => corridorMap.invalidateSize(), 200);
      }
    });
  });
}

// 2. Disruption Slider
function initSlider() {
  const slider = document.getElementById("delaySlider");
  const display = document.getElementById("delaySliderVal");
  if (slider && display) {
    slider.addEventListener("input", (e) => {
      display.textContent = `+${e.target.value} mins`;
    });
  }
}

// 3. Fetch Network Data and Initial Plan
async function fetchInitialData() {
  try {
    const netRes = await fetch("/api/network");
    networkData = await netRes.json();

    // Populate Asset Cards in GIS Tab
    populateAssetCards(networkData.assets);

    // Initialize GIS Map
    initLeafletMap(networkData.stations, networkData.assets);

    // Fetch initial optimization plan
    await runOptimization();
  } catch (err) {
    console.error("Failed to load network data:", err);
  }
}

// 4. Attach Event Listeners
function attachEventListeners() {
  document.getElementById("btn-run-optimization")?.addEventListener("click", () => {
    runOptimization();
  });

  document.getElementById("btn-approve-block")?.addEventListener("click", () => {
    approveBlock();
  });

  document.getElementById("btn-inject-delay")?.addEventListener("click", () => {
    injectTrainDelay();
  });

  document.getElementById("btn-inject-fracture")?.addEventListener("click", () => {
    injectEmergencyFracture();
  });

  document.getElementById("btn-run-benchmark")?.addEventListener("click", () => {
    refreshBenchmark();
  });
}

// 5. Run CP-SAT Optimization via API
async function runOptimization() {
  const btn = document.getElementById("btn-run-optimization");
  if (btn) btn.textContent = "⌛ Solving CP-SAT...";

  try {
    const res = await fetch("/api/optimize", { method: "POST" });
    const data = await res.json();
    currentOptimization = data;

    // Update KPIs
    const planA = data.recommended_plan;
    document.getElementById("kpi-availability").textContent = `${planA.net_asset_availability_pct}%`;
    document.getElementById("kpi-latency").textContent = `${planA.execution_time_seconds}s (CP-SAT)`;

    // Update scorecard
    if (planA.assignments && planA.assignments.length > 0) {
      const topBlock = planA.assignments[0];
      const sH = Math.floor(topBlock.start_time_mins / 60);
      const sM = topBlock.start_time_mins % 60;
      const eH = Math.floor(topBlock.end_time_mins / 60);
      const eM = topBlock.end_time_mins % 60;

      document.getElementById("rec-block-window").textContent =
        `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")} – ` +
        `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")} hrs (${topBlock.duration_mins} min)`;

      document.getElementById("rec-block-loc").textContent =
        topBlock.block_section_id.replace("BLK_", "").replace("_DN", " (Down Line)");

      const reasonsList = document.getElementById("xai-reasons-list");
      if (reasonsList && topBlock.xai_rationale) {
        reasonsList.innerHTML = topBlock.xai_rationale.map((r) => `<li>✓ ${r}</li>`).join("");
      }
    }

    // Redraw Canvas Train Graph
    drawTrainGraph(networkData.stations, networkData.trains, planA.assignments);
  } catch (err) {
    console.error("Optimization failed:", err);
  } finally {
    if (btn) btn.textContent = "⚡ Run Optimization";
  }
}

// 6. Draw Sectional Time-Distance Train Graph
function drawTrainGraph(stations, trains, blocks) {
  const canvas = document.getElementById("trainGraphCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // Clear
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, W, H);

  const padLeft = 70;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  // Time Scale (0 to 1440 minutes -> 00:00 to 24:00)
  const timeToX = (mins) => padLeft + (mins / 1440) * chartW;

  // Distance Scale (0 km to 120 km -> Stations GZB to ALJN)
  const maxKm = 120.0;
  const kmToY = (km) => padTop + (km / maxKm) * chartH;

  // Draw Vertical Hour Gridlines
  ctx.lineWidth = 1;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";

  for (let hour = 0; hour <= 24; hour += 2) {
    const x = timeToX(hour * 60);
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, H - padBottom);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.fillText(`${String(hour).padStart(2, "0")}:00`, x, H - padBottom + 15);
  }

  // Draw Horizontal Station Lines
  ctx.textAlign = "right";
  stations.forEach((st) => {
    const y = kmToY(st.km_post);
    ctx.strokeStyle = "#334155";
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(W - padRight, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${st.code} (${st.km_post.toFixed(0)}k)`, padLeft - 8, y + 3);
  });

  // Draw Maintenance Blocks (Translucent Rectangles with Stripes)
  if (blocks) {
    blocks.forEach((b) => {
      // Find station boundaries for this section
      const secParts = b.block_section_id.replace("BLK_", "").replace("_DN", "").split("_");
      const stA = stations.find((s) => s.code === secParts[0]);
      const stB = stations.find((s) => s.code === secParts[1]);

      if (stA && stB) {
        const x1 = timeToX(b.start_time_mins);
        const x2 = timeToX(b.end_time_mins);
        const y1 = kmToY(stA.km_post);
        const y2 = kmToY(stB.km_post);

        const bw = Math.max(12, x2 - x1);
        const bh = Math.abs(y2 - y1);

        // Fill color
        ctx.fillStyle = b.is_shadow_block ? "rgba(236, 72, 153, 0.4)" : "rgba(168, 85, 247, 0.4)";
        ctx.fillRect(x1, y1, bw, bh);

        // Border
        ctx.strokeStyle = b.is_shadow_block ? "#ec4899" : "#a855f7";
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, bw, bh);

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(b.is_shadow_block ? "SHADOW BLOCK" : "BLOCK", x1 + 4, y1 + 14);
      }
    });
  }

  // Draw Train Trajectories (Slanted Lines)
  ctx.lineWidth = 1.5;
  trains.forEach((t) => {
    const xEntry = timeToX(t.expected_entry_mins);
    const xExit = timeToX((t.expected_entry_mins + t.running_time_mins) % 1440);
    const yEntry = kmToY(0);
    const yExit = kmToY(120);

    // Color by train category
    if (t.priority_weight >= 95) {
      ctx.strokeStyle = "#10b981"; // Vande Bharat / Rajdhani
      ctx.lineWidth = 2.2;
    } else if (t.priority_weight >= 60) {
      ctx.strokeStyle = "#3b82f6"; // Express
      ctx.lineWidth = 1.6;
    } else {
      ctx.strokeStyle = "#f59e0b"; // Freight
      ctx.lineWidth = 1.2;
    }

    if (xExit >= xEntry) {
      ctx.beginPath();
      ctx.moveTo(xEntry, yEntry);
      ctx.lineTo(xExit, yExit);
      ctx.stroke();
    } else {
      // Midnight wraparound
      const xMid = timeToX(1440);
      const frac = (1440 - t.expected_entry_mins) / t.running_time_mins;
      const yMid = yEntry + frac * (yExit - yEntry);

      ctx.beginPath();
      ctx.moveTo(xEntry, yEntry);
      ctx.lineTo(xMid, yMid);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padLeft, yMid);
      ctx.lineTo(xExit, yExit);
      ctx.stroke();
    }
  });
}

// 7. Initialize Leaflet GIS Map
function initLeafletMap(stations, assets) {
  const mapElem = document.getElementById("corridorMap");
  if (!mapElem || corridorMap) return;

  // Center on Khurja / central corridor
  corridorMap = L.map("corridorMap").setView([28.3, 77.75], 9);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 14,
  }).addTo(corridorMap);

  // Plot Station Markers and Track Polyline
  const latlngs = [];
  stations.forEach((st) => {
    const pt = [st.latitude, st.longitude];
    latlngs.push(pt);

    L.circleMarker(pt, {
      radius: st.has_siding ? 8 : 5,
      fillColor: st.has_siding ? "#f59e0b" : "#3b82f6",
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    })
      .bindPopup(`<strong>${st.name} (${st.code})</strong><br>Km Post: ${st.km_post} km<br>Siding: ${st.has_siding ? "Yes (Machine Depot)" : "No"}`)
      .addTo(corridorMap);
  });

  // Track Polyline
  L.polyline(latlngs, { color: "#3b82f6", weight: 4, opacity: 0.8 }).addTo(corridorMap);

  // Highlight Defect/Asset on Down Line Km 71.4 (Khurja - Danwar)
  L.circleMarker([28.18, 77.9], {
    radius: 10,
    fillColor: "#ef4444",
    color: "#fee2e2",
    weight: 3,
    fillOpacity: 0.9,
  })
    .bindPopup("<strong>DEFECT LOCATION: Km 71.4</strong><br>Track Geometry Index: 61.2 (Degraded)<br>Action: Urgent Tamping Required!")
    .addTo(corridorMap);
}

// 8. Populate Asset Health Cards in Tab 2
function populateAssetCards(assets) {
  const container = document.getElementById("asset-cards-container");
  if (!container || !assets) return;

  container.innerHTML = assets
    .map((a) => {
      const tierClass = a.criticality_tier.toLowerCase().replace("_", "-");
      const badgeClass = a.criticality_tier.includes("1")
        ? "badge-danger"
        : a.criticality_tier.includes("2")
        ? "badge-warning"
        : "badge-success";

      return `
      <div class="asset-card ${tierClass}">
        <div>
          <div class="asset-title">${a.asset_type}</div>
          <div class="asset-sub">${a.block_section_id} • Km ${a.location_km.toFixed(1)} • ${a.department}</div>
        </div>
        <div style="text-align: right;">
          <span class="badge ${badgeClass}">${a.criticality_tier.split("_")[0]}</span>
          <div style="font-size: 11px; font-weight: 700; margin-top: 4px;">TGI: ${a.tgi_score}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

// 9. Digital Signature & Approval
async function approveBlock() {
  const statusElem = document.getElementById("approval-status");
  try {
    const res = await fetch("/api/approve-block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        block_id: "BLK_GRANT_BUNDLE_001",
        officer_name: "A. K. Sharma, IRTS",
        designation: "Senior Divisional Operations Manager",
        private_number: "PN-" + Math.floor(1000 + Math.random() * 9000),
      }),
    });
    const data = await res.json();
    if (statusElem) {
      statusElem.classList.remove("hidden");
      statusElem.innerHTML = `<strong>AUTHORIZED!</strong> Private Number <code>${data.private_number_exchanged}</code> issued to Station Masters and Traction Power Controller.`;
    }
  } catch (err) {
    console.error("Approval error:", err);
  }
}

// 10. Inject Live Delay in Sandbox
async function injectTrainDelay() {
  const slider = document.getElementById("delaySlider");
  const delay = parseInt(slider ? slider.value : "35", 10);
  const log = document.getElementById("replanLogContent");

  if (log) log.textContent = `[EVENT] Ingesting live GPS delay on Train 12562 (+${delay} mins)...`;

  try {
    const res = await fetch("/api/replan/delay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        train_id: "12562",
        delay_mins: delay,
      }),
    });
    const data = await res.json();

    if (log) {
      log.textContent =
        `[SUCCESS] Re-optimization completed in ${data.solve_latency_seconds}s!\n` +
        `Action: ${data.operational_action}\n` +
        `New Net Asset Availability: ${data.replan_result.net_asset_availability_pct}%\n` +
        `Train 12562 Expected Entry: ${data.trigger_details.new_expected_entry}`;
    }

    // Redraw graph with shifted block
    if (networkData && data.replan_result.assignments) {
      drawTrainGraph(networkData.stations, networkData.trains, data.replan_result.assignments);
    }
  } catch (err) {
    if (log) log.textContent = `[ERROR] Replanning failed: ${err}`;
  }
}

// 11. Inject Emergency Rail Fracture in Sandbox
async function injectEmergencyFracture() {
  const log = document.getElementById("replanLogContent");
  if (log) log.textContent = `[CRITICAL ALERT] Emergency Rail Fracture detected on BLK_KRJ_DAR_DN Km 71.4!`;

  try {
    const res = await fetch("/api/replan/emergency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        block_section_id: "BLK_KRJ_DAR_DN",
        location_km: 71.4,
      }),
    });
    const data = await res.json();

    if (log) {
      log.textContent =
        `[PREEMPTION ACTIVE] Section BLK_KRJ_DAR_DN locked at Danger!\n` +
        `Emergency Block Permit: ${data.emergency_block.block_id}\n` +
        `Resource: ${data.emergency_block.assigned_resource_id}\n` +
        `Instructions: ${data.controller_instruction}`;
    }
  } catch (err) {
    if (log) log.textContent = `[ERROR] Emergency preemption failed: ${err}`;
  }
}

// 12. Refresh Benchmark Results
async function refreshBenchmark() {
  const btn = document.getElementById("btn-run-benchmark");
  if (btn) btn.textContent = "⌛ Simulating...";

  try {
    const res = await fetch("/api/benchmark");
    const data = await res.json();

    const b1 = data.baselines.baseline_1_manual;
    const b2 = data.baselines.baseline_2_rules;
    const b3 = data.baselines.baseline_3_proposed_ai;

    document.getElementById("bm-manual-delay").textContent = `${Math.round(b1.total_train_delay_mins)} mins`;
    document.getElementById("bm-rules-delay").textContent = `${Math.round(b2.total_train_delay_mins)} mins`;
    document.getElementById("bm-ai-delay").textContent = `${Math.round(b3.total_train_delay_mins)} mins`;
    document.getElementById("bm-ai-avail").textContent = `${b3.net_asset_availability_pct}% Net Availability`;

    document.getElementById("bm-conclusion").innerHTML =
      `Our proposed AI CP-SAT engine achieves a <strong>${data.benchmark_summary.delay_reduction_percentage}% reduction in commercial train delays</strong> ` +
      `while servicing 100% of high-risk track maintenance demands without bursting block windows.`;
  } catch (err) {
    console.error("Benchmark error:", err);
  } finally {
    if (btn) btn.textContent = "🔄 Re-run 24h Benchmark";
  }
}
