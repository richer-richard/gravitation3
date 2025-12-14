/**
 * Main Application for Malkus Waterwheel
 * Connects simulator and visualizer - Multi-Wheel Version
 */

class MalkusWheelApp {
    constructor() {
        this.simulators = [];
        this.visualizers = [];
        this.numWheels = 2;
        this.animationFrameId = null;
        this.simulationSpeed = 1;
        
        this.init();
    }

    init() {
        // Initialize multiple wheels
        this.initializeWheels(this.numWheels);
        
        // Load default preset for all wheels
        this.loadPreset('chaotic');
        
        // Setup UI
        this.setupUI();
        
        // Start animation loop
        this.animate();
    }

    initializeWheels(count) {
        // Clean up existing wheels
        this.simulators.forEach((sim, i) => {
            if (this.visualizers[i]) {
                this.visualizers[i].dispose();
            }
        });
        
        this.simulators = [];
        this.visualizers = [];
        
        // Create new wheels
        for (let i = 0; i < count; i++) {
            const wheelNum = i + 1;
            
            // Initialize simulator
            const simulator = new MalkusWheelSimulator(20, 2.5, 0.1, 1.0, 0.01);
            this.simulators.push(simulator);
            
            // Initialize visualizer
            const container = document.getElementById(`canvas-container-${wheelNum}`);
            const visualizer = new MalkusWheelVisualizer(container);
            this.visualizers.push(visualizer);
        }
    }

    setupUI() {
        // Number of wheels slider
        const numWheelsSlider = document.getElementById('num-wheels-slider');
        const numWheelsValue = document.getElementById('num-wheels-value');
        numWheelsSlider.addEventListener('input', (e) => {
            const num = parseInt(e.target.value);
            this.setNumWheels(num);
            numWheelsValue.textContent = num;
        });

        // Preset buttons (all wheels)
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPreset(e.target.dataset.preset);
            });
        });

        // Individual wheel preset buttons
        document.querySelectorAll('.wheel-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wheelIndex = parseInt(e.target.dataset.wheel) - 1;
                const presetName = e.target.dataset.preset;
                this.loadPresetForWheel(presetName, wheelIndex);
                // Update the wheel parameter inputs
                this.updateWheelInputs(wheelIndex);
            });
        });

        // Individual wheel play/pause buttons
        document.querySelectorAll('.wheel-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wheelNum = parseInt(e.target.dataset.wheel);
                const wheelIndex = wheelNum - 1;
                if (wheelIndex < this.simulators.length) {
                    this.simulators[wheelIndex].play();
                    e.target.disabled = true;
                    const pauseBtn = document.querySelector(`.wheel-pause-btn[data-wheel="${wheelNum}"]`);
                    if (pauseBtn) pauseBtn.disabled = false;
                }
            });
        });

        document.querySelectorAll('.wheel-pause-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wheelNum = parseInt(e.target.dataset.wheel);
                const wheelIndex = wheelNum - 1;
                if (wheelIndex < this.simulators.length) {
                    this.simulators[wheelIndex].pause();
                    e.target.disabled = true;
                    const playBtn = document.querySelector(`.wheel-play-btn[data-wheel="${wheelNum}"]`);
                    if (playBtn) playBtn.disabled = false;
                }
            });
        });

        // Play/Pause
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        playBtn.addEventListener('click', () => {
            this.simulators.forEach(sim => sim.play());
            playBtn.disabled = true;
            pauseBtn.disabled = false;
        });
        
        pauseBtn.addEventListener('click', () => {
            this.simulators.forEach(sim => sim.pause());
            playBtn.disabled = false;
            pauseBtn.disabled = true;
        });

        // Reset
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.simulators.forEach(sim => sim.reset());
            this.visualizers.forEach(vis => vis.clearComTrail());
        });

        // Speed slider
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.simulationSpeed.toFixed(1) + 'x';
        });

        // Individual wheel parameter sliders (for buckets)
        document.querySelectorAll('.wheel-param[data-param="buckets"]').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const wheel = e.target.dataset.wheel;
                const value = e.target.value;
                const display = document.querySelector(`.wheel-buckets-display[data-wheel="${wheel}"]`);
                if (display) {
                    display.textContent = value;
                }
            });
        });

        // Individual wheel apply buttons
        document.querySelectorAll('.apply-wheel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wheelNum = parseInt(e.target.dataset.wheel);
                const wheelIndex = wheelNum - 1;
                
                if (wheelIndex >= this.simulators.length) return;
                
                // Get all parameters for this wheel
                const qInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="q"]`);
                const kInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="k"]`);
                const nuInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="nu"]`);
                const bucketsInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="buckets"]`);
                
                if (qInput && kInput && nuInput && bucketsInput) {
                    const Q = parseFloat(qInput.value);
                    const K = parseFloat(kInput.value);
                    const nu = parseFloat(nuInput.value);
                    const buckets = parseInt(bucketsInput.value);
                    
                    if (!isNaN(Q) && !isNaN(K) && !isNaN(nu) && !isNaN(buckets)) {
                        const sim = this.simulators[wheelIndex];
                        sim.setParameters(Q, K, nu);
                        sim.setNumBuckets(buckets);
                        sim.reset();
                        
                        this.visualizers[wheelIndex].createWheel(buckets, sim.radius * 2);
                        this.visualizers[wheelIndex].clearComTrail();
                    }
                }
            });
        });

        // Show water checkbox
        document.getElementById('show-water').addEventListener('change', (e) => {
            this.visualizers.forEach(vis => vis.setShowWater(e.target.checked));
        });

        // Show COM checkbox
        const showComCheckbox = document.getElementById('show-com');
        if (showComCheckbox) {
            showComCheckbox.addEventListener('change', (e) => {
                this.visualizers.forEach(vis => vis.setShowCenterOfMass(e.target.checked));
            });
        }

        // Show COM trail checkbox
        const showComTrailCheckbox = document.getElementById('show-com-trail');
        if (showComTrailCheckbox) {
            showComTrailCheckbox.addEventListener('change', (e) => {
                this.visualizers.forEach(vis => vis.setShowComTrail(e.target.checked));
            });
        }

        // Clear COM trail button
        const clearComTrailBtn = document.getElementById('clear-com-trail-btn');
        if (clearComTrailBtn) {
            clearComTrailBtn.addEventListener('click', () => {
                this.visualizers.forEach(vis => vis.clearComTrail());
            });
        }

        // Auto rotate checkbox
        document.getElementById('auto-rotate').addEventListener('change', (e) => {
            this.visualizers.forEach(vis => vis.setAutoRotate(e.target.checked));
            // Update track bucket checkbox state
            if (e.target.checked) {
                const trackCheckbox = document.getElementById('track-bucket');
                if (trackCheckbox) trackCheckbox.checked = false;
            }
        });

        // Track bucket checkbox
        const trackBucketCheckbox = document.getElementById('track-bucket');
        if (trackBucketCheckbox) {
            trackBucketCheckbox.addEventListener('change', (e) => {
                this.visualizers.forEach(vis => vis.setTrackBucket(e.target.checked, 0));
                // Update auto-rotate checkbox state
                if (e.target.checked) {
                    const autoRotateCheckbox = document.getElementById('auto-rotate');
                    if (autoRotateCheckbox) autoRotateCheckbox.checked = false;
                }
            });
        }

        // Initial conditions inputs
        const initialOmegaInput = document.getElementById('initial-omega');
        const initialThetaInput = document.getElementById('initial-theta');
        if (initialOmegaInput && initialThetaInput) {
            const applyInitialBtn = document.getElementById('apply-initial-btn');
            if (applyInitialBtn) {
                applyInitialBtn.addEventListener('click', () => {
                    const omega = parseFloat(initialOmegaInput.value);
                    const theta = parseFloat(initialThetaInput.value);
                    if (!isNaN(omega) && !isNaN(theta)) {
                        this.simulators.forEach(sim => sim.setInitialConditions(omega, theta));
                        this.visualizers.forEach(vis => vis.clearComTrail());
                    }
                });
            }
        }

        // Reset camera
        document.getElementById('reset-camera-btn').addEventListener('click', () => {
            this.visualizers.forEach(vis => vis.resetCamera());
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't process shortcuts if any input field is focused
            if (document.activeElement && 
                (document.activeElement.tagName === 'INPUT' ||
                 document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            
            const playBtn = document.getElementById('play-btn');
            const pauseBtn = document.getElementById('pause-btn');
            
            if (e.code === 'Space') {
                e.preventDefault();
                const isPaused = this.simulators[0].isPaused;
                if (isPaused) {
                    this.simulators.forEach(sim => sim.play());
                    playBtn.disabled = true;
                    pauseBtn.disabled = false;
                } else {
                    this.simulators.forEach(sim => sim.pause());
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                }
            } else if (e.code === 'KeyR') {
                this.simulators.forEach(sim => sim.reset());
            }
        });
    }

    setNumWheels(count) {
        this.numWheels = count;
        
        // Update UI visibility
        const container = document.getElementById('multi-wheel-container');
        container.className = `multi-wheel-container wheels-${count}`;
        
        // Show/hide containers
        for (let i = 1; i <= 3; i++) {
            const containerEl = document.getElementById(`canvas-container-${i}`);
            if (i <= count) {
                containerEl.style.display = '';
            } else {
                containerEl.style.display = 'none';
            }
        }
        
        // Show/hide wheel 3 presets and params
        const wheel3Presets = document.getElementById('wheel-3-presets');
        if (wheel3Presets) {
            wheel3Presets.style.display = count >= 3 ? '' : 'none';
        }
        
        const wheel3Params = document.getElementById('wheel-3-params');
        if (wheel3Params) {
            wheel3Params.style.display = count >= 3 ? '' : 'none';
        }
        
        // Re-initialize wheels if needed
        if (count > this.simulators.length) {
            this.initializeWheels(count);
            // Apply current preset to new wheels
            this.loadPreset('chaotic');
        }
    }

    loadPreset(presetName) {
        const preset = MALKUS_PRESETS[presetName];
        if (!preset) return;

        // Apply to all wheels
        this.simulators.forEach((sim, i) => {
            sim.setParameters(preset.Q, preset.K, preset.nu);
            sim.setNumBuckets(preset.numBuckets);
            sim.reset();
        });
        
        // Update parameter inputs if they exist
        const qInput = document.getElementById('q-input');
        const kInput = document.getElementById('k-input');
        const nuInput = document.getElementById('nu-input');
        const bucketsSlider = document.getElementById('buckets-slider');
        const bucketsValue = document.getElementById('buckets-value');
        
        if (qInput) qInput.value = preset.Q.toFixed(2);
        if (kInput) kInput.value = preset.K.toFixed(2);
        if (nuInput) nuInput.value = preset.nu.toFixed(2);
        if (bucketsSlider) bucketsSlider.value = preset.numBuckets;
        if (bucketsValue) bucketsValue.textContent = preset.numBuckets;
        
        // Recreate wheels
        this.visualizers.forEach((vis, i) => {
            vis.createWheel(preset.numBuckets, this.simulators[i].radius * 2);
        });
    }

    loadPresetForWheel(presetName, wheelIndex) {
        const preset = MALKUS_PRESETS[presetName];
        if (!preset || wheelIndex >= this.simulators.length) return;

        // Apply to specific wheel
        const sim = this.simulators[wheelIndex];
        sim.setParameters(preset.Q, preset.K, preset.nu);
        sim.setNumBuckets(preset.numBuckets);
        sim.reset();
        
        // Recreate wheel
        this.visualizers[wheelIndex].createWheel(preset.numBuckets, sim.radius * 2);
        this.visualizers[wheelIndex].clearComTrail();
    }

    updateWheelInputs(wheelIndex) {
        const sim = this.simulators[wheelIndex];
        const wheelNum = wheelIndex + 1;
        
        const qInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="q"]`);
        const kInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="k"]`);
        const nuInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="nu"]`);
        const bucketsInput = document.querySelector(`.wheel-param[data-wheel="${wheelNum}"][data-param="buckets"]`);
        const bucketsDisplay = document.querySelector(`.wheel-buckets-display[data-wheel="${wheelNum}"]`);
        
        if (qInput) qInput.value = sim.Q.toFixed(2);
        if (kInput) kInput.value = sim.K.toFixed(2);
        if (nuInput) nuInput.value = sim.nu.toFixed(2);
        if (bucketsInput) bucketsInput.value = sim.numBuckets;
        if (bucketsDisplay) bucketsDisplay.textContent = sim.numBuckets;
    }


    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // Update all simulations
        const stepsPerFrame = Math.ceil(this.simulationSpeed);
        this.simulators.forEach(sim => sim.step(stepsPerFrame));
        
        // Update all visualizers
        this.simulators.forEach((sim, i) => {
            if (i < this.numWheels) {
                this.visualizers[i].updateWheel(sim);
                this.visualizers[i].render();
            }
        });
        
        // Update UI (use first wheel for display)
        this.updateUI();
    }

    updateUI() {
        // Update time display (use first wheel)
        document.getElementById('time-display').textContent = this.simulators[0].time.toFixed(2);
        
        // Update FPS display (use first wheel)
        document.getElementById('fps-display').textContent = this.visualizers[0].getFPS();
        
        // Update angular velocity display (average of all wheels)
        const avgOmega = this.simulators.reduce((sum, sim) => sum + sim.omega, 0) / this.simulators.length;
        document.getElementById('omega-display').textContent = avgOmega.toFixed(3);
        
        // Update total water mass (sum of all wheels)
        const totalMass = this.simulators.reduce((sum, sim) => {
            return sum + sim.bucketMasses.reduce((s, m) => s + m, 0);
        }, 0);
        document.getElementById('mass-display').textContent = totalMass.toFixed(2);
    }

    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.visualizers.forEach(vis => {
            if (vis) vis.dispose();
        });
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MalkusWheelApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.dispose();
    }
});
