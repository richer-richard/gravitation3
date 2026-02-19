/**
 * Main Application Controller for Lorenz Attractor
 * Connects the UI, simulator, and visualizer
 */

class LorenzApp {
    constructor() {
        // Core components
        this.simulator = new LorenzSimulator(10, 28, 8/3, 0.001);
        this.visualizer = null;
        
        // State
        this.isRunning = false;
        this.currentPreset = 'single';
        this.simulationSpeed = 1.0;
        this.stepsPerFrame = 5; // Slow and natural flow
        
        // FPS control
        this.targetFPS = 120;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = performance.now();
        
        // UI elements
        this.elements = {};
        
        this.init();
    }

    init() {
        // Initialize visualizer
        const container = document.getElementById('canvas-container');
        this.visualizer = new LorenzVisualizer(container);
        
        // Cache UI elements
        this.cacheElements();
        
        // Load default preset
        this.loadPreset(this.currentPreset);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
        
        // Update UI
        this.updateUI();
    }

    cacheElements() {
        // Control buttons
        this.elements.playBtn = document.getElementById('play-btn');
        this.elements.pauseBtn = document.getElementById('pause-btn');
        this.elements.resetBtn = document.getElementById('reset-btn');
        this.elements.exportBtn = document.getElementById('export-btn');
        this.elements.importBtn = document.getElementById('import-btn');
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.screenshotBtn = document.getElementById('screenshot-btn');
        
        // Parameter sliders
        this.elements.sigmaSlider = document.getElementById('sigma-slider');
        this.elements.sigmaValue = document.getElementById('sigma-value');
        this.elements.rhoSlider = document.getElementById('rho-slider');
        this.elements.rhoValue = document.getElementById('rho-value');
        this.elements.betaSlider = document.getElementById('beta-slider');
        this.elements.betaValue = document.getElementById('beta-value');
        
        // Simulation sliders
        this.elements.trajectoryCountSlider = document.getElementById('trajectory-count-slider');
        this.elements.trajectoryCountValue = document.getElementById('trajectory-count-value');
        this.elements.speedSlider = document.getElementById('speed-slider');
        this.elements.speedValue = document.getElementById('speed-value');
        this.elements.trailLengthSlider = document.getElementById('trail-length-slider');
        this.elements.trailLengthValue = document.getElementById('trail-length-value');
        this.elements.timestepSlider = document.getElementById('timestep-slider');
        this.elements.timestepValue = document.getElementById('timestep-value');
        
        // Checkboxes
        this.elements.showTrails = document.getElementById('show-trails');
        this.elements.autoRotate = document.getElementById('auto-rotate');
        
        // Display elements
        this.elements.timeDisplay = document.getElementById('time-display');
        this.elements.energyDisplay = document.getElementById('energy-display');
        this.elements.fpsDisplay = document.getElementById('fps-display');
        this.elements.entropyDisplay = document.getElementById('entropy-display');
        this.elements.stepsDisplay = document.getElementById('steps-display');
        this.elements.maxDistDisplay = document.getElementById('max-dist-display');
        this.elements.avgVelDisplay = document.getElementById('avg-vel-display');
        
        // Trajectory configs container
        this.elements.trajectoryConfigs = document.getElementById('trajectory-configs');
        
        // Preset buttons
        this.elements.presetBtns = document.querySelectorAll('.preset-btn');
    }

    setupEventListeners() {
        // Play/Pause/Reset
        this.elements.playBtn.addEventListener('click', () => this.play());
        this.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        
        // Preset buttons
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.presetBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPreset(e.target.dataset.preset);
            });
        });
        
        // Parameter sliders
        this.elements.sigmaSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.sigmaValue.textContent = value.toFixed(2);
            this.simulator.sigma = value;
        });
        
        this.elements.rhoSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.rhoValue.textContent = value.toFixed(2);
            this.simulator.rho = value;
        });
        
        this.elements.betaSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.betaValue.textContent = value.toFixed(2);
            this.simulator.beta = value;
        });
        
        // Trajectory count slider
        this.elements.trajectoryCountSlider.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            this.elements.trajectoryCountValue.textContent = count;
            this.updateTrajectoryCount(count);
        });
        
        // Speed slider
        this.elements.speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            this.elements.speedValue.textContent = this.simulationSpeed.toFixed(1) + 'x';
            this.stepsPerFrame = Math.max(1, Math.floor(5 * this.simulationSpeed));
        });
        
        // Trail length slider
        this.elements.trailLengthSlider.addEventListener('input', (e) => {
            const length = parseInt(e.target.value);
            this.elements.trailLengthValue.textContent = length;
            this.visualizer.setTrailLength(length);
        });
        
        // Timestep slider
        this.elements.timestepSlider.addEventListener('input', (e) => {
            this.simulator.dt = parseFloat(e.target.value);
            this.elements.timestepValue.textContent = this.simulator.dt.toFixed(4);
        });
        
        // Checkboxes
        this.elements.showTrails.addEventListener('change', (e) => {
            this.visualizer.setShowTrails(e.target.checked);
        });
        
        this.elements.autoRotate.addEventListener('change', (e) => {
            this.visualizer.setAutoRotate(e.target.checked);
        });
        
        // Data management
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.importBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        this.elements.fileInput.addEventListener('change', (e) => this.importData(e));
        this.elements.screenshotBtn.addEventListener('click', () => this.takeScreenshot());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't handle shortcuts when typing in input fields
            if (document.activeElement && 
                (document.activeElement.tagName === 'INPUT' ||
                 document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.play();
                }
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
        
        if (!preset) {
            console.error('Preset not found:', presetName);
            return;
        }
        
        // Stop simulation
        this.pause();
        
        // Load preset parameters
        this.simulator.setParameters(preset.sigma, preset.rho, preset.beta);
        
        // Update parameter UI
        this.elements.sigmaSlider.value = preset.sigma;
        this.elements.sigmaValue.textContent = preset.sigma.toFixed(2);
        this.elements.rhoSlider.value = preset.rho;
        this.elements.rhoValue.textContent = preset.rho.toFixed(2);
        this.elements.betaSlider.value = preset.beta;
        this.elements.betaValue.textContent = preset.beta.toFixed(2);
        
        // Load trajectories
        this.simulator.setInitialConditions(preset.trajectories);
        
        // Create trajectories in visualizer
        this.visualizer.createTrajectories(preset.trajectories);
        this.visualizer.clearTrails();
        
        // Update trajectory configs UI
        this.updateTrajectoryConfigsUI(preset.trajectories);
        
        // Update displays
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
                        <input type="number" class="init-x-input" data-index="${index}" 
                               value="${traj.state.x.toFixed(3)}" step="0.1">
                    </div>
                    <div class="input-group">
                        <label>Initial Y:</label>
                        <input type="number" class="init-y-input" data-index="${index}" 
                               value="${traj.state.y.toFixed(3)}" step="0.1">
                    </div>
                    <div class="input-group">
                        <label>Initial Z:</label>
                        <input type="number" class="init-z-input" data-index="${index}" 
                               value="${traj.state.z.toFixed(3)}" step="0.1">
                    </div>
                </div>
            `;
            
            this.elements.trajectoryConfigs.appendChild(config);
        });
        
        // Add event listeners for inputs
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
            console.log(`Updated Trajectory ${index + 1} initial ${axis} to ${value}`);
        }
    }

    updateTrajectoryCount(targetCount) {
        // Pause simulation
        this.pause();
        
        // Generate trajectories with specified count
        const colors = [
            0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0x800080,
            0xff8800, 0xffc0cb, 0x00ffff, 0xff00ff, 0x8b4513
        ];
        
        const trajectories = [];
        
        for (let i = 0; i < targetCount; i++) {
            const offset = i * 0.1;
            trajectories.push(new Trajectory(
                1 + offset,
                1 + offset * 0.5,
                1 + offset * 0.3,
                colors[i % colors.length],
                `Trajectory ${i + 1}`
            ));
        }
        
        // Update simulator
        this.simulator.setInitialConditions(trajectories);
        
        // Update visualizer
        this.visualizer.createTrajectories(trajectories);
        this.visualizer.clearTrails();
        
        // Update UI
        this.updateTrajectoryConfigsUI(trajectories);
        this.updateUI();
        
        console.log(`Updated to ${targetCount} trajectories`);
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
        // Time (3 decimals)
        this.elements.timeDisplay.textContent = this.simulator.time.toFixed(3) + 's';
        
        // Energy (3 decimals)
        const energy = this.simulator.calculateTotalEnergy();
        this.elements.energyDisplay.textContent = energy.toFixed(3);
        
        // FPS from visualizer
        this.elements.fpsDisplay.textContent = this.visualizer.getFPS();
        
        // Entropy (3 decimals)
        const entropy = this.simulator.calculateEntropy();
        this.elements.entropyDisplay.textContent = entropy.toFixed(3);
        
        // Steps
        this.elements.stepsDisplay.textContent = this.simulator.steps.toLocaleString();
        
        // Max distance
        const maxDist = this.simulator.getMaxDistance();
        this.elements.maxDistDisplay.textContent = maxDist.toFixed(3);
        
        // Average velocity
        const avgVel = this.simulator.getAverageVelocity();
        this.elements.avgVelDisplay.textContent = avgVel.toFixed(3);
    }

    exportData() {
        const data = this.simulator.exportData();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `lorenz_attractor_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Data exported successfully');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Stop simulation
                this.pause();
                
                // Import data
                this.simulator.importData(data);
                
                // Update visualizer
                this.visualizer.createTrajectories(this.simulator.trajectories);
                this.visualizer.clearTrails();
                
                // Update UI
                this.updateTrajectoryConfigsUI(this.simulator.trajectories);
                this.updateUI();
                
                console.log('Data imported successfully');
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    takeScreenshot() {
        const dataUrl = this.visualizer.takeScreenshot();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `lorenz_attractor_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('Screenshot saved');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LorenzApp();
    window.simulator = window.app.simulator; // Expose for AI chatbot + data sender
    console.log('Gravitation³ - Lorenz Attractor Simulator initialized');
});
