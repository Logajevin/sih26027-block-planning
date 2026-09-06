/**
 * 4D Operational Timeline & Simulation Controller for SIH26027.
 * Controls master 24-hour railway operational timeline (00:00 to 24:00),
 * Play/Pause, 1x/2x/5x/10x simulation multipliers, and event synchronization.
 */

class TimelineController {
  constructor(trainSystem, blockVisualizer, railwayBuilder) {
    this.trainSystem = trainSystem;
    this.blockVisualizer = blockVisualizer;
    this.railway = railwayBuilder;

    this.isPlaying = true;
    this.simSpeed = 1.0;
    this.currentMins = 145; // Start at 02:25 AM (inside planned block window)
    this.totalHorizonMins = 1440; // 24 hours

    this.initUI();
  }

  initUI() {
    this.clockDisplay = document.getElementById("timelineClock");
    this.slider = document.getElementById("timelineSlider");
    this.playBtn = document.getElementById("btnPlayPause");
    this.speedBtns = document.querySelectorAll(".speed-btn");

    if (this.slider) {
      this.slider.value = this.currentMins;
      this.slider.addEventListener("input", (e) => {
        this.currentMins = parseFloat(e.target.value);
        this.updateTimeDisplay();
      });
    }

    if (this.playBtn) {
      this.playBtn.addEventListener("click", () => {
        this.isPlaying = !this.isPlaying;
        this.playBtn.textContent = this.isPlaying ? "⏸ PAUSE" : "▶ PLAY";
        this.playBtn.classList.toggle("active", this.isPlaying);
      });
    }

    this.speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.speedBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.simSpeed = parseFloat(btn.dataset.speed || "1.0");
      });
    });

    this.updateTimeDisplay();
  }

  update(delta) {
    if (!this.isPlaying) return;

    // Advance time: 1 real second = 0.5 simulation minutes at 1x
    const timeStep = delta * 0.5 * this.simSpeed;
    this.currentMins = (this.currentMins + timeStep) % this.totalHorizonMins;

    if (this.slider) {
      this.slider.value = this.currentMins;
    }
    this.updateTimeDisplay();

    // Check if within active block window (e.g. 130 to 220 mins -> 02:10 to 03:40)
    const isBlockActive = this.currentMins >= 130 && this.currentMins <= 220;
    if (this.blockVisualizer) {
      this.blockVisualizer.setVisible(isBlockActive);
    }

    // Update signal Starter aspect at Khurja: Red if block active, Green if inactive
    if (this.railway) {
      this.railway.setSignalAspect("SIG_KRJ_STARTER", isBlockActive ? "RED" : "GREEN");
    }
  }

  updateTimeDisplay() {
    const hrs = Math.floor(this.currentMins / 60);
    const mins = Math.floor(this.currentMins % 60);
    const secs = Math.floor((this.currentMins * 60) % 60);

    const formatted = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    if (this.clockDisplay) {
      this.clockDisplay.textContent = formatted;
    }
  }

  setTime(minutes) {
    this.currentMins = minutes;
    if (this.slider) this.slider.value = minutes;
    this.updateTimeDisplay();
  }
}
