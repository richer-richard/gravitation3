/**
 * Main Application for Double-Gyre Flow
 * Connects simulator and visualizer
 */

class DoubleGyreApp {
    constructor() {
        this.simulator = null;
        this.visualizer = null;
        this.animationFrameId = null;
        this.simulationSpeed = 1;
        
        this.init();
    }

    init() {
        // Initialize simulator
        this.simulator = new DoubleGyreSimulator(0.1, 0.25, 0.5, 0.01);
        
        // Initialize visualizer
        const container = document.getElementById('canvas-container');
        const canvas = document.getElementById('main-canvas');
        this.visualizer = new DoubleGyreVisualizer(
            'main-canvas',
            container.clientWidth,
            container.clientHeight
        );
        
        // Load default preset
        this.loadPreset('standard');
        
        // Setup UI
        this.setupUI();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }

    setupUI() {
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPreset(e.target.dataset.preset);
            });
        });

        // Play/Pause
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        playBtn.addEventListener('click', () => {
            this.simulator.play();
            playBtn.disabled = true;
            pauseBtn.disabled = false;
        });
        
        pauseBtn.addEventListener('click', () => {
            this.simulator.pause();
            playBtn.disabled = false;
            pauseBtn.disabled = true;
        });

        // Reset
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.simulator.reset();
        });

        // Clear
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.simulator.clearParticles();
        });

        // Amplitude slider
        const amplitudeSlider = document.getElementById('amplitude-slider');
        const amplitudeValue = document.getElementById('amplitude-value');
        amplitudeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.simulator.A = value;
            this.simulator.updateFlowField();
            amplitudeValue.textContent = value.toFixed(2);
        });

        // Frequency slider
        const frequencySlider = document.getElementById('frequency-slider');
        const frequencyValue = document.getElementById('frequency-value');
        frequencySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.simulator.omega = value;
            this.simulator.updateFlowField();
            frequencyValue.textContent = value.toFixed(2);
        });

        // Epsilon slider
        const epsilonSlider = document.getElementById('epsilon-slider');
        const epsilonValue = document.getElementById('epsilon-value');
        epsilonSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.simulator.epsilon = value;
            this.simulator.updateFlowField();
            epsilonValue.textContent = value.toFixed(2);
        });

        // Particle number slider
        const particleNumSlider = document.getElementById('particle-num-slider');
        const particleNumValue = document.getElementById('particle-num-value');
        particleNumSlider.addEventListener('input', (e) => {
            const numParticles = parseInt(e.target.value);
            particleNumValue.textContent = numParticles;
            this.simulator.seedParticles(numParticles);
        });

        // Particle size slider
        const particleSizeSlider = document.getElementById('particle-size-slider');
        const particleSizeValue = document.getElementById('particle-size-value');
        particleSizeSlider.addEventListener('input', (e) => {
            const size = parseFloat(e.target.value);
            this.visualizer.setParticleSize(size);
            particleSizeValue.textContent = size.toFixed(1);
        });

        // Speed slider
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.simulationSpeed.toFixed(1) + 'x';
        });

        // Display options checkboxes
        document.getElementById('show-flow-field').addEventListener('change', (e) => {
            this.visualizer.setShowFlowField(e.target.checked);
        });

        document.getElementById('show-streamlines').addEventListener('change', (e) => {
            this.visualizer.setShowStreamlines(e.target.checked);
        });

        document.getElementById('show-particles').addEventListener('change', (e) => {
            this.visualizer.setShowParticles(e.target.checked);
        });

        document.getElementById('show-vorticity').addEventListener('change', (e) => {
            this.visualizer.setShowVorticity(e.target.checked);
        });

        // Seed particles button
        document.getElementById('seed-particles-btn').addEventListener('click', () => {
            const numParticles = parseInt(document.getElementById('particle-num-slider').value);
            this.simulator.seedParticles(numParticles);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't handle shortcuts when typing in input fields
            if (document.activeElement && 
                (document.activeElement.tagName === 'INPUT' ||
                 document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            
            const playBtn = document.getElementById('play-btn');
            const pauseBtn = document.getElementById('pause-btn');
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.simulator.isPaused) {
                    this.simulator.play();
                    playBtn.disabled = true;
                    pauseBtn.disabled = false;
                } else {
                    this.simulator.pause();
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                }
            } else if (e.code === 'KeyR') {
                this.simulator.reset();
            } else if (e.code === 'KeyC') {
                this.simulator.clearParticles();
            } else if (e.code === 'KeyS') {
                const numParticles = parseInt(document.getElementById('particle-num-slider').value);
                this.simulator.seedParticles(numParticles);
            }
        });
    }

    loadPreset(presetName) {
        const preset = DOUBLEGYRE_PRESETS[presetName];
        if (!preset) return;

        // Clear existing particles
        this.simulator.clearParticles();
        
        // Set parameters
        this.simulator.setParameters(preset.A, preset.epsilon, preset.omega);
        
        // Update parameter inputs
        document.getElementById('amplitude-slider').value = preset.A;
        document.getElementById('amplitude-value').textContent = preset.A.toFixed(2);
        
        document.getElementById('epsilon-slider').value = preset.epsilon;
        document.getElementById('epsilon-value').textContent = preset.epsilon.toFixed(2);
        
        document.getElementById('frequency-slider').value = preset.omega;
        document.getElementById('frequency-value').textContent = preset.omega.toFixed(2);
        
        // Seed particles
        this.simulator.seedParticles(preset.particles);
        
        // Update particle count slider
        document.getElementById('particle-num-slider').value = preset.particles;
        document.getElementById('particle-num-value').textContent = preset.particles;
        
        // Reset simulation
        this.simulator.time = 0;
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // Update simulation
        const stepsPerFrame = Math.ceil(this.simulationSpeed);
        this.simulator.step(stepsPerFrame);
        
        // Update visualizer
        this.visualizer.render(this.simulator);
        
        // Update UI
        this.updateUI();
    }

    updateUI() {
        // Update time display
        document.getElementById('time-display').textContent = this.simulator.time.toFixed(2);
        
        // Update FPS display
        document.getElementById('fps-display').textContent = this.visualizer.getFPS();
        
        // Update particle count
        document.getElementById('particle-count').textContent = this.simulator.particles.length;
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.visualizer.resize(container.clientWidth, container.clientHeight);
    }

    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.visualizer) {
            this.visualizer.dispose();
        }
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DoubleGyreApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.dispose();
    }
});
