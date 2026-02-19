/**
 * Main Application Controller for Rössler Attractor
 * Connects the UI, simulator, and visualizer
 */

class RosslerApp {
    constructor() {
        this.simulator = new RosslerSimulator(0.2, 0.2, 5.7, 0.005);
        this.visualizer = null;
        this.isRunning = false;
        this.currentPreset = 'classic';
        this.simulationSpeed = 1.0;
        this.stepsPerFrame = 5; // Slow and natural flow
        
        // FPS control
        this.targetFPS = 120;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = performance.now();
        
        // Data sender for real-time API access
        this.dataSender = null;
        
        this.elements = {};
        this.init();
    }

    init() {
        const container = document.getElementById('canvas-container');
        this.visualizer = new RosslerVisualizer(container);
        this.cacheElements();
        this.loadPreset(this.currentPreset);
        this.setupEventListeners();
        
        // Initialize data sender
        if (window.DataSender) {
            this.dataSender = new DataSender({
                simulationName: 'Rössler Attractor',
                enabled: true
            });
            this.dataSender.start(this.simulator);
            console.log('📡 Data sender initialized for Rössler Attractor');
        }
        
        this.animate();
        this.updateUI();
    }

    cacheElements() {
        this.elements.playBtn = document.getElementById('play-btn');
        this.elements.pauseBtn = document.getElementById('pause-btn');
        this.elements.resetBtn = document.getElementById('reset-btn');
        this.elements.exportBtn = document.getElementById('export-btn');
        this.elements.importBtn = document.getElementById('import-btn');
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.screenshotBtn = document.getElementById('screenshot-btn');
        
        this.elements.aSlider = document.getElementById('a-slider');
        this.elements.aValue = document.getElementById('a-value');
        this.elements.bSlider = document.getElementById('b-slider');
        this.elements.bValue = document.getElementById('b-value');
        this.elements.cSlider = document.getElementById('c-slider');
        this.elements.cValue = document.getElementById('c-value');
        
        this.elements.trajectoryCountSlider = document.getElementById('trajectory-count-slider');
        this.elements.trajectoryCountValue = document.getElementById('trajectory-count-value');
        this.elements.speedSlider = document.getElementById('speed-slider');
        this.elements.speedValue = document.getElementById('speed-value');
        this.elements.trailLengthSlider = document.getElementById('trail-length-slider');
        this.elements.trailLengthValue = document.getElementById('trail-length-value');
        this.elements.timestepSlider = document.getElementById('timestep-slider');
        this.elements.timestepValue = document.getElementById('timestep-value');
        
        this.elements.showTrails = document.getElementById('show-trails');
        this.elements.autoRotate = document.getElementById('auto-rotate');
        
        this.elements.timeDisplay = document.getElementById('time-display');
        this.elements.energyDisplay = document.getElementById('energy-display');
        this.elements.fpsDisplay = document.getElementById('fps-display');
        this.elements.entropyDisplay = document.getElementById('entropy-display');
        this.elements.stepsDisplay = document.getElementById('steps-display');
        this.elements.maxDistDisplay = document.getElementById('max-dist-display');
        this.elements.avgVelDisplay = document.getElementById('avg-vel-display');
        
        this.elements.trajectoryConfigs = document.getElementById('trajectory-configs');
        this.elements.presetBtns = document.querySelectorAll('.preset-btn');
    }

    setupEventListeners() {
        this.elements.playBtn.addEventListener('click', () => this.play());
        this.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.presetBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPreset(e.target.dataset.preset);
            });
        });
        
        this.elements.aSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.aValue.textContent = value.toFixed(2);
            this.simulator.a = value;
        });
        
        this.elements.bSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.bValue.textContent = value.toFixed(2);
            this.simulator.b = value;
        });
        
        this.elements.cSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.cValue.textContent = value.toFixed(2);
            this.simulator.c = value;
        });
        
        this.elements.trajectoryCountSlider.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            this.elements.trajectoryCountValue.textContent = count;
            this.updateTrajectoryCount(count);
        });
        
        this.elements.speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            this.elements.speedValue.textContent = this.simulationSpeed.toFixed(1) + 'x';
            this.stepsPerFrame = Math.max(1, Math.floor(5 * this.simulationSpeed));
        });
        
        this.elements.trailLengthSlider.addEventListener('input', (e) => {
            const length = parseInt(e.target.value);
            this.elements.trailLengthValue.textContent = length;
            this.visualizer.setTrailLength(length);
        });
        
        this.elements.timestepSlider.addEventListener('input', (e) => {
            this.simulator.dt = parseFloat(e.target.value);
            this.elements.timestepValue.textContent = this.simulator.dt.toFixed(4);
        });
        
        this.elements.showTrails.addEventListener('change', (e) => {
            this.visualizer.setShowTrails(e.target.checked);
        });
        
        this.elements.autoRotate.addEventListener('change', (e) => {
            this.visualizer.setAutoRotate(e.target.checked);
        });
        
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.importBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.importData(e));
        this.elements.screenshotBtn.addEventListener('click', () => this.takeScreenshot());
        
        document.addEventListener('keydown', (e) => {
            // Don't handle shortcuts when typing in input fields
            if (document.activeElement && 
                (document.activeElement.tagName === 'INPUT' ||
                 document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            
            if (e.code === 'Space') {
                e.preventDefault();
                this.isRunning ? this.pause() : this.play();
            } else if (e.code === 'KeyR') {
                this.reset();
            } else if (e.code === 'KeyS') {
                this.takeScreenshot();
            }
        });
    }

    loadPreset(presetName) {
        this.currentPreset = presetName;
        const preset = PRESETS[presetName];
        if (!preset) return;
        
        this.pause();
        this.simulator.setParameters(preset.a, preset.b, preset.c);
        this.elements.aSlider.value = preset.a;
        this.elements.aValue.textContent = preset.a.toFixed(2);
        this.elements.bSlider.value = preset.b;
        this.elements.bValue.textContent = preset.b.toFixed(2);
        this.elements.cSlider.value = preset.c;
        this.elements.cValue.textContent = preset.c.toFixed(2);
        
        this.simulator.setInitialConditions(preset.trajectories);
        this.visualizer.createTrajectories(preset.trajectories);
        this.visualizer.clearTrails();
        this.updateTrajectoryConfigsUI(preset.trajectories);
        this.updateUI();
    }

    updateTrajectoryConfigsUI(trajectories) {
        this.elements.trajectoryConfigs.innerHTML = '';
        trajectories.forEach((traj, index) => {
            const config = document.createElement('div');
            config.className = 'body-config';
            const colorHex = '#' + traj.color.toString(16).padStart(6, '0');
            config.innerHTML = `
                <div class="body-header">
                    <div>
                        <div class="body-name">${traj.name}</div>
                        <div class="color-indicator" style="background: ${colorHex};"></div>
                    </div>
                </div>
                <div class="body-controls">
                    <div class="input-group">
                        <label>Initial X:</label>
                        <input type="number" class="init-x-input" data-index="${index}" value="${traj.state.x.toFixed(3)}" step="0.1">
                    </div>
                    <div class="input-group">
                        <label>Initial Y:</label>
                        <input type="number" class="init-y-input" data-index="${index}" value="${traj.state.y.toFixed(3)}" step="0.1">
                    </div>
                    <div class="input-group">
                        <label>Initial Z:</label>
                        <input type="number" class="init-z-input" data-index="${index}" value="${traj.state.z.toFixed(3)}" step="0.1">
                    </div>
                </div>
            `;
            this.elements.trajectoryConfigs.appendChild(config);
        });
        
        document.querySelectorAll('.init-x-input, .init-y-input, .init-z-input').forEach(input => {
            input.addEventListener('change', (e) => this.updateInitialCondition(e));
        });
    }

    updateInitialCondition(event) {
        const index = parseInt(event.target.dataset.index);
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            const axis = event.target.className.includes('x') ? 'x' : 
                        event.target.className.includes('y') ? 'y' : 'z';
            this.simulator.trajectories[index].state[axis] = value;
            this.simulator.initialTrajectories[index].state[axis] = value;
            this.visualizer.clearTrails();
        }
    }

    updateTrajectoryCount(targetCount) {
        this.pause();
        const colors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0x800080, 0xff8800, 0xffc0cb, 0x00ffff, 0xff00ff, 0x8b4513];
        const trajectories = [];
        for (let i = 0; i < targetCount; i++) {
            const offset = i * 0.1;
            trajectories.push(new Trajectory(1 + offset, 1 + offset * 0.5, 1 + offset * 0.3, colors[i % colors.length], `Trajectory ${i + 1}`));
        }
        this.simulator.setInitialConditions(trajectories);
        this.visualizer.createTrajectories(trajectories);
        this.visualizer.clearTrails();
        this.updateTrajectoryConfigsUI(trajectories);
        this.updateUI();
    }

    play() {
        this.isRunning = true;
        this.elements.playBtn.disabled = true;
        this.elements.pauseBtn.disabled = false;
    }

    pause() {
        this.isRunning = false;
        this.elements.playBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
    }

    reset() {
        this.pause();
        this.simulator.reset();
        this.visualizer.clearTrails();
        this.updateUI();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Control frame rate to target FPS
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        if (elapsed >= this.frameInterval) {
            // Adjust for time drift
            this.lastFrameTime = now - (elapsed % this.frameInterval);
            
            // Step simulation if running
            if (this.isRunning) {
                this.simulator.step(this.stepsPerFrame);
            }
            
            // Update visualization
            this.visualizer.updateTrajectories(this.simulator.trajectories);
            this.visualizer.render();
            
            // Update UI periodically (every 5 frames to reduce overhead)
            if (this.visualizer.frameCount % 5 === 0) {
                this.updateUI();
            }
        }
    }

    updateUI() {
        this.elements.timeDisplay.textContent = this.simulator.time.toFixed(3) + 's';
        this.elements.energyDisplay.textContent = this.simulator.calculateTotalEnergy().toFixed(3);
        this.elements.fpsDisplay.textContent = this.visualizer.getFPS();
        this.elements.entropyDisplay.textContent = this.simulator.calculateEntropy().toFixed(3);
        this.elements.stepsDisplay.textContent = this.simulator.steps.toLocaleString();
        this.elements.maxDistDisplay.textContent = this.simulator.getMaxDistance().toFixed(3);
        this.elements.avgVelDisplay.textContent = this.simulator.getAverageVelocity().toFixed(3);
    }

    exportData() {
        const data = this.simulator.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rossler_attractor_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.pause();
                this.simulator.importData(JSON.parse(e.target.result));
                this.visualizer.createTrajectories(this.simulator.trajectories);
                this.visualizer.clearTrails();
                this.updateTrajectoryConfigsUI(this.simulator.trajectories);
                this.updateUI();
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    takeScreenshot() {
        const dataUrl = this.visualizer.takeScreenshot();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `rossler_attractor_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new RosslerApp();
    window.simulator = window.app.simulator; // Expose for AI chatbot
    console.log('Gravitation³ - Rössler Attractor Simulator initialized');
});
