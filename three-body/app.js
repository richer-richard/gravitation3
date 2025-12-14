/**
 * Main Application Controller
 * Connects the UI, simulator, and visualizer
 */

class ThreeBodyApp {
    constructor() {
        // Core components
        this.simulator = new ThreeBodySimulator(1.0, 0.001);
        this.visualizer = null;
        
        // State
        this.isRunning = false;
        this.currentPreset = 'figure8';
        this.simulationSpeed = 1.0;
        this.stepsPerFrame = 10;
        
        // Video recording
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        
        // UI elements
        this.elements = {};
        
        this.init();
    }

    init() {
        // Initialize visualizer
        const container = document.getElementById('canvas-container');
        this.visualizer = new ThreeBodyVisualizer(container);
        
        // Set up collision callback
        this.simulator.onCollision = (collisionData) => {
            this.visualizer.createExplosion(collisionData);
        };
        
        // Set up body removal callback
        this.simulator.onBodyRemoved = (index) => {
            this.visualizer.removeBody(index);
        };
        
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
        this.elements.recordBtn = document.getElementById('record-btn');
        this.elements.addStarBtn = document.getElementById('add-star-btn');
        this.elements.exportBtn = document.getElementById('export-btn');
        this.elements.importBtn = document.getElementById('import-btn');
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.screenshotBtn = document.getElementById('screenshot-btn');
        
        // Sliders
        this.elements.bodyCountSlider = document.getElementById('body-count-slider');
        this.elements.bodyCountValue = document.getElementById('body-count-value');
        this.elements.speedSlider = document.getElementById('speed-slider');
        this.elements.speedValue = document.getElementById('speed-value');
        this.elements.timestepSlider = document.getElementById('timestep-slider');
        this.elements.timestepValue = document.getElementById('timestep-value');
        
        // Checkboxes
        this.elements.showTrails = document.getElementById('show-trails');
        this.elements.retainTrails = document.getElementById('retain-trails');
        this.elements.showVelocities = document.getElementById('show-velocities');
        this.elements.centerOfMass = document.getElementById('center-of-mass');
        
        // Display elements
        this.elements.timeDisplay = document.getElementById('time-display');
        this.elements.energyDisplay = document.getElementById('energy-display');
        this.elements.fpsDisplay = document.getElementById('fps-display');
        this.elements.entropyDisplay = document.getElementById('entropy-display');
        this.elements.stepsDisplay = document.getElementById('steps-display');
        this.elements.driftDisplay = document.getElementById('drift-display');
        this.elements.minDistDisplay = document.getElementById('min-dist-display');
        
        // Body configs container
        this.elements.bodyConfigs = document.getElementById('body-configs');
        
        // Preset buttons
        this.elements.presetBtns = document.querySelectorAll('.preset-btn');
    }

    setupKeyboardShortcuts() {
        if (typeof KeyboardShortcuts === 'undefined') {
            console.warn('KeyboardShortcuts class not found. Skipping keyboard shortcut setup.');
            return;
        }

        this.keyboardShortcuts = new KeyboardShortcuts({
            shortcuts: this.getKeyboardShortcutsConfig(),
            onShortcut: (id, event) => {
                switch (id) {
                    case 'help':
                        // Help modal is shown automatically by KeyboardShortcuts
                        break;
                    case 'pause':
                        event.preventDefault();
                        if (this.isRunning) {
                            this.pause();
                        } else {
                            this.play();
                        }
                        break;
                    case 'reset':
                        event.preventDefault();
                        this.reset();
                        break;
                    case 'trails':
                        event.preventDefault();
                        const showTrails = !this.elements.showTrails.checked;
                        this.elements.showTrails.checked = showTrails;
                        this.visualizer.setShowTrails(showTrails);
                        break;
                    case 'clearTrails':
                        event.preventDefault();
                        this.visualizer.clearTrails();
                        break;
                    case 'velocities':
                        event.preventDefault();
                        const showVels = !this.elements.showVelocities.checked;
                        this.elements.showVelocities.checked = showVels;
                        this.visualizer.setShowVelocities(showVels);
                        break;
                    case 'screenshot':
                        event.preventDefault();
                        this.takeScreenshot();
                        break;
                    case 'export':
                        event.preventDefault();
                        this.exportData();
                        break;
                    default:
                        break;
                }
            }
        });
    }

    getKeyboardShortcutsConfig() {
        const platform = typeof navigator !== 'undefined' && navigator.platform
            ? navigator.platform.toUpperCase()
            : '';
        const isMac = platform.includes('MAC');
        const modifierKey = isMac ? 'cmd' : 'ctrl';

        return {
            help: {
                keys: ['?', 'h'],
                modifiers: [],
                description: 'Show keyboard shortcuts',
                category: 'General'
            },
            pause: {
                keys: ['Space'],
                modifiers: [],
                description: 'Play/Pause simulation',
                category: 'Simulation'
            },
            reset: {
                keys: ['r'],
                modifiers: [],
                description: 'Reset to preset',
                category: 'Simulation'
            },
            trails: {
                keys: ['t'],
                modifiers: [],
                description: 'Toggle trails',
                category: 'View'
            },
            clearTrails: {
                keys: ['c'],
                modifiers: [],
                description: 'Clear trails',
                category: 'View'
            },
            velocities: {
                keys: ['v'],
                modifiers: [],
                description: 'Toggle velocity arrows',
                category: 'View'
            },
            screenshot: {
                keys: ['s'],
                modifiers: [modifierKey],
                description: 'Save a screenshot',
                category: 'Actions'
            },
            export: {
                keys: ['e'],
                modifiers: [modifierKey],
                description: 'Export simulation data',
                category: 'Actions'
            }
        };
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
        
        // Body count slider
        this.elements.bodyCountSlider.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            this.elements.bodyCountValue.textContent = count;
            this.updateBodyCount(count);
        });
        this.elements.bodyCountSlider.addEventListener('mouseup', (e) => e.target.blur());
        this.elements.bodyCountSlider.addEventListener('touchend', (e) => e.target.blur());
        
        // Speed slider
        this.elements.speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            this.elements.speedValue.textContent = this.simulationSpeed.toFixed(1) + 'x';
            this.stepsPerFrame = Math.max(1, Math.floor(10 * this.simulationSpeed));
        });
        this.elements.speedSlider.addEventListener('mouseup', (e) => e.target.blur());
        this.elements.speedSlider.addEventListener('touchend', (e) => e.target.blur());
        
        // Timestep slider
        this.elements.timestepSlider.addEventListener('input', (e) => {
            this.simulator.dt = parseFloat(e.target.value);
            this.elements.timestepValue.textContent = this.simulator.dt.toFixed(4);
        });
        this.elements.timestepSlider.addEventListener('mouseup', (e) => e.target.blur());
        this.elements.timestepSlider.addEventListener('touchend', (e) => e.target.blur());
        
        // Checkboxes
        this.elements.showTrails.addEventListener('change', (e) => {
            this.visualizer.setShowTrails(e.target.checked);
        });
        
        this.elements.retainTrails.addEventListener('change', (e) => {
            this.visualizer.setRetainTrails(e.target.checked);
        });
        
        this.elements.showVelocities.addEventListener('change', (e) => {
            this.visualizer.setShowVelocities(e.target.checked);
        });
        
        this.elements.centerOfMass.addEventListener('change', (e) => {
            this.visualizer.setCenterOnMass(e.target.checked);
        });
        
        // Recording button
        if (this.elements.recordBtn) {
            this.elements.recordBtn.addEventListener('click', () => {
                if (!this.isRecording) {
                    this.startRecording();
                } else {
                    this.stopRecording();
                }
            });
        }
        
        // Add Star button
        if (this.elements.addStarBtn) {
            this.elements.addStarBtn.addEventListener('click', () => this.addStar());
        }
        
        // Data management
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.importBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        this.elements.fileInput.addEventListener('change', (e) => this.importData(e));
        this.elements.screenshotBtn.addEventListener('click', () => this.takeScreenshot());
        
        // Setup keyboard shortcuts manager
        this.setupKeyboardShortcuts();
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
        
        // Disable any active dragging
        if (this.visualizer.isDragging) {
            this.visualizer.disableDragging();
        }
        
        // Load preset into simulator
        this.simulator.setInitialConditions(preset.bodies);
        
        // Create bodies in visualizer
        this.visualizer.createBodies(preset.bodies);
        this.visualizer.clearTrails();
        
        // Update body configs UI
        this.updateBodyConfigsUI(preset.bodies);
        
        // Update displays
        this.updateUI();
    }

    updateBodyConfigsUI(bodies) {
        this.elements.bodyConfigs.innerHTML = '';
        
        bodies.forEach((body, index) => {
            const config = document.createElement('div');
            config.className = 'body-config';
            
            const colorHex = '#' + body.color.toString(16).padStart(6, '0');
            
            config.innerHTML = `
                <div class="body-header">
                    <div>
                        <div class="body-name">${body.name}</div>
                        <div class="color-indicator" style="background: ${colorHex};"></div>
                    </div>
                    <button class="drag-toggle-btn" data-index="${index}" title="Enable dragging">
                        <span class="icon">✋</span>
                    </button>
                </div>
                <div class="body-controls">
                    <div class="input-group">
                        <label>Mass:</label>
                        <input type="number" class="mass-input" data-index="${index}" 
                               value="${body.mass.toFixed(2)}" min="0.1" max="10" step="0.1">
                    </div>
                    <div class="input-group">
                        <label>Position <strong>r</strong> = (<span class="coord-label">x</span>, <span class="coord-label">y</span>, <span class="coord-label">z</span>):</label>
                        <div class="coord-inputs">
                            <input type="number" class="pos-input" data-index="${index}" data-axis="x" 
                                   value="${body.position.x.toFixed(3)}" step="0.1" placeholder="x">
                            <input type="number" class="pos-input" data-index="${index}" data-axis="y" 
                                   value="${body.position.y.toFixed(3)}" step="0.1" placeholder="y">
                            <input type="number" class="pos-input" data-index="${index}" data-axis="z" 
                                   value="${body.position.z.toFixed(3)}" step="0.1" placeholder="z">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Velocity <strong>v</strong> = (<span class="coord-label">v<sub>x</sub></span>, <span class="coord-label">v<sub>y</sub></span>, <span class="coord-label">v<sub>z</sub></span>):</label>
                        <div class="coord-inputs">
                            <input type="number" class="vel-input" data-index="${index}" data-axis="x" 
                                   value="${body.velocity.x.toFixed(3)}" step="0.01" placeholder="vx">
                            <input type="number" class="vel-input" data-index="${index}" data-axis="y" 
                                   value="${body.velocity.y.toFixed(3)}" step="0.01" placeholder="vy">
                            <input type="number" class="vel-input" data-index="${index}" data-axis="z" 
                                   value="${body.velocity.z.toFixed(3)}" step="0.01" placeholder="vz">
                        </div>
                    </div>
                </div>
            `;
            
            this.elements.bodyConfigs.appendChild(config);
        });
        
        // Add event listeners for inputs
        document.querySelectorAll('.mass-input').forEach(input => {
            input.addEventListener('change', (e) => this.updateBodyMass(e));
        });
        
        document.querySelectorAll('.pos-input').forEach(input => {
            input.addEventListener('change', (e) => this.updateBodyPosition(e));
        });
        
        document.querySelectorAll('.vel-input').forEach(input => {
            input.addEventListener('change', (e) => this.updateBodyVelocity(e));
        });
        
        document.querySelectorAll('.drag-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleDragMode(e));
        });
    }

    updateBodyMass(event) {
        const index = parseInt(event.target.dataset.index);
        const newMass = parseFloat(event.target.value);
        
        if (newMass > 0 && !isNaN(newMass)) {
            this.simulator.bodies[index].mass = newMass;
            this.simulator.initialBodies[index].mass = newMass;
            console.log(`Updated Body ${index + 1} mass to ${newMass}`);
        }
    }

    updateBodyPosition(event) {
        const index = parseInt(event.target.dataset.index);
        const axis = event.target.dataset.axis;
        const value = parseFloat(event.target.value);
        
        if (!isNaN(value)) {
            this.simulator.bodies[index].position[axis] = value;
            this.simulator.initialBodies[index].position[axis] = value;
            this.visualizer.clearTrails();
            console.log(`Updated Body ${index + 1} position ${axis} to ${value}`);
        }
    }

    updateBodyVelocity(event) {
        const index = parseInt(event.target.dataset.index);
        const axis = event.target.dataset.axis;
        const value = parseFloat(event.target.value);
        
        if (!isNaN(value)) {
            this.simulator.bodies[index].velocity[axis] = value;
            this.simulator.initialBodies[index].velocity[axis] = value;
            this.visualizer.clearTrails();
            console.log(`Updated Body ${index + 1} velocity v${axis} to ${value}`);
        }
    }

    toggleDragMode(event) {
        const btn = event.currentTarget;
        const index = parseInt(btn.dataset.index);
        
        if (this.visualizer.isDragging && this.visualizer.dragBodyIndex === index) {
            // Disable dragging
            this.visualizer.disableDragging();
            btn.classList.remove('active');
            btn.innerHTML = '<span class="icon">✋</span>';
        } else {
            // Enable dragging for this body
            document.querySelectorAll('.drag-toggle-btn').forEach(b => {
                b.classList.remove('active');
                b.innerHTML = '<span class="icon">✋</span>';
            });
            this.visualizer.enableDragging(index);
            btn.classList.add('active');
            btn.innerHTML = '<span class="icon">🖐️</span>';
            this.pause(); // Auto-pause when dragging
        }
    }

    updateBodyCount(targetCount) {
        // Pause simulation
        this.pause();
        
        // Disable any active dragging
        if (this.visualizer.isDragging) {
            this.visualizer.disableDragging();
        }
        
        // Generate bodies with specified count
        const colors = [
            0xff0000,  // Red
            0x0000ff,  // Blue
            0x00ff00,  // Green
            0xffff00,  // Yellow
            0x800080,  // Purple
            0xff8800,  // Orange
            0xffc0cb,  // Pink
            0x00ffff,  // Cyan
            0xff00ff,  // Magenta
            0x8b4513   // Brown
        ];
        
        const bodies = [];
        const minDistance = 0.8; // Minimum distance between bodies
        
        for (let i = 0; i < targetCount; i++) {
            let validPosition = false;
            let attempts = 0;
            let pos, vel;
            
            while (!validPosition && attempts < 100) {
                // Generate position in circular arrangement with some randomness
                const angle = (i / targetCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
                const radius = 1.0 + Math.random() * 0.5;
                const zOffset = (Math.random() - 0.5) * 0.3;
                
                pos = new Vector3D(
                    radius * Math.cos(angle),
                    radius * Math.sin(angle),
                    zOffset
                );
                
                // Velocity with both tangential and strong outward radial components
                const velAngle = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
                const tangentialSpeed = 0.4 + Math.random() * 0.2;
                const radialSpeed = 0.25 + Math.random() * 0.15; // Stronger outward component
                
                vel = new Vector3D(
                    tangentialSpeed * Math.cos(velAngle) + radialSpeed * Math.cos(angle),
                    tangentialSpeed * Math.sin(velAngle) + radialSpeed * Math.sin(angle),
                    (Math.random() - 0.5) * 0.15
                );
                
                // Check distance from existing bodies
                validPosition = true;
                for (const body of bodies) {
                    const dist = pos.subtract(body.position).magnitude();
                    if (dist < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            // Use fallback if no valid position found
            if (!validPosition) {
                const fallbackAngle = (i / targetCount) * 2 * Math.PI;
                const fallbackRadius = 1.2 + i * 0.2;
                pos = new Vector3D(
                    fallbackRadius * Math.cos(fallbackAngle),
                    fallbackRadius * Math.sin(fallbackAngle),
                    0
                );
                vel = new Vector3D(
                    -0.4 * Math.sin(fallbackAngle),
                    0.4 * Math.cos(fallbackAngle),
                    0
                );
            }
            
            bodies.push(new Body(
                pos,
                vel,
                1.0,
                colors[i % colors.length],
                `Body ${i + 1}`
            ));
        }
        
        // Update simulator
        this.simulator.setInitialConditions(bodies);
        
        // Update visualizer
        this.visualizer.createBodies(bodies);
        this.visualizer.clearTrails();
        
        // Update UI
        this.updateBodyConfigsUI(bodies);
        this.updateUI();
        
        console.log(`Updated to ${targetCount} bodies`);
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

    addStar() {
        const randomUnitVector = () => {
            const z = Math.random() * 2 - 1;
            const theta = Math.random() * 2 * Math.PI;
            const radius = Math.sqrt(1 - z * z);
            return new Vector3D(
                radius * Math.cos(theta),
                radius * Math.sin(theta),
                z
            );
        };

        // Generate a random color for the new star
        const colors = [
            0xff0000,  // Red
            0x0000ff,  // Blue
            0x00ff00,  // Green
            0xffff00,  // Yellow
            0x800080,  // Purple
            0xff8800,  // Orange
            0xffc0cb,  // Pink
            0x00ffff,  // Cyan
            0xff00ff,  // Magenta
            0x8b4513   // Brown
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        const normalizeVector = (vector) => {
            const magnitude = vector.magnitude();
            if (magnitude === 0) {
                return new Vector3D(1, 0, 0);
            }
            return vector.multiply(1 / magnitude);
        };
        
        const perpendicularVector = (vector) => {
            let perp = new Vector3D(-vector.y, vector.x, 0);
            if (perp.magnitude() < 1e-3) {
                perp = new Vector3D(0, -vector.z || 1, vector.y);
            }
            return normalizeVector(perp);
        };
        
        if (!this.simulator.bodies.length) return;
        
        const totalMass = this.simulator.bodies.reduce((sum, body) => sum + body.mass, 0) || 1;
        const centerAccumulator = this.simulator.bodies.reduce((acc, body) => {
            return acc.add(body.position.multiply(body.mass));
        }, new Vector3D());
        const centerOfMass = centerAccumulator.multiply(1 / totalMass);
        
        const minSpawnDistance = 2.5;
        const maxAttempts = 12;
        let newBody = null;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const spawnRadius = 6.0 + Math.random() * 4.0; // 6-10 units
            const radialDirection = randomUnitVector();
            const position = centerOfMass.add(radialDirection.multiply(spawnRadius));
            
            const isSafe = this.simulator.bodies.every(body => {
                return body.position.subtract(position).magnitude() > minSpawnDistance;
            });
            if (!isSafe) continue;
            
            const radial = normalizeVector(radialDirection);
            const tangent = perpendicularVector(radial);
            const bitangent = normalizeVector(new Vector3D(
                radial.y * tangent.z - radial.z * tangent.y,
                radial.z * tangent.x - radial.x * tangent.z,
                radial.x * tangent.y - radial.y * tangent.x
            ));
            
            const orbitalSpeed = Math.sqrt(this.simulator.G * totalMass / spawnRadius);
            const tangentialSpeed = orbitalSpeed * (0.85 + Math.random() * 0.3);
            const radialSpeed = (Math.random() - 0.5) * 0.15 * orbitalSpeed;
            const verticalSpeed = (Math.random() - 0.5) * 0.15 * orbitalSpeed;
            
            const velocity = tangent.multiply(tangentialSpeed)
                .add(radial.multiply(radialSpeed))
                .add(bitangent.multiply(verticalSpeed));
            
            newBody = new Body(
                position,
                velocity,
                1.0,
                randomColor,
                `Body ${this.simulator.bodies.length + 1}`
            );
            break;
        }
        
        if (!newBody) {
            console.warn('Add Star: Unable to find safe spawn location');
            return;
        }
        
        this.simulator.bodies.push(newBody);
        this.simulator.initialBodies = this.simulator.bodies.map(body => body.copy());
        
        this.visualizer.createBodies(this.simulator.bodies);
        this.updateBodyConfigsUI(this.simulator.bodies);
        this.updateUI();
        
        console.log(`Added new star in stable orbit (r ≈ ${newBody.position.magnitude().toFixed(2)})`);
    }

    reset() {
        this.pause();
        this.simulator.reset();
        this.visualizer.clearTrails();
        this.updateUI();
    }

    recoverFromError() {
        this.pause();
        const lastValidState = this.simulator.errorHandler.getLastValidState();
        if (lastValidState) {
            this.simulator.restoreState(lastValidState);
            this.visualizer.clearTrails();
            this.updateUI();
            console.log('Recovered to last valid state');
        } else {
            console.log('No valid state to recover to, resetting simulation');
            this.reset();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Step simulation if running
        if (this.isRunning) {
            this.simulator.step(this.stepsPerFrame);
        }
        
        // Update visualization
        this.visualizer.updateBodies(this.simulator.bodies);
        this.visualizer.render();
        
        // Update UI periodically (every 5 frames to reduce overhead)
        if (this.visualizer.frameCount % 5 === 0) {
            this.updateUI();
        }
    }

    updateUI() {
        // Time (3 decimals)
        this.elements.timeDisplay.textContent = this.simulator.time.toFixed(3) + 's';
        
        // Energy (3 decimals)
        const energy = this.simulator.calculateTotalEnergy();
        this.elements.energyDisplay.textContent = energy.toFixed(3);
        
        // FPS (whole number)
        this.elements.fpsDisplay.textContent = this.visualizer.getFPS();
        
        // Entropy (3 decimals)
        const entropy = this.simulator.calculateEntropy ? this.simulator.calculateEntropy() : 0;
        this.elements.entropyDisplay.textContent = entropy.toFixed(3);
        
        // Steps
        this.elements.stepsDisplay.textContent = this.simulator.steps.toLocaleString();
        
        // Energy drift
        const drift = this.simulator.getEnergyDrift();
        this.elements.driftDisplay.textContent = drift.toFixed(6) + '%';
        
        // Min distance
        const minDist = this.simulator.getMinDistance();
        this.elements.minDistDisplay.textContent = minDist === Infinity ? '∞' : minDist.toFixed(3);
    }

    exportData() {
        const data = this.simulator.exportData();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `three_body_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
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
                
                const isSchemaFormat = data && data.schemaVersion && data.state && Array.isArray(data.state.entities);
                const isLegacyFormat = data && data.positions && data.masses && data.velocities;
                
                if (!isSchemaFormat && !isLegacyFormat) {
                    throw new Error('Invalid data format');
                }
                
                // Stop simulation
                this.pause();
                
                // Import data
                this.simulator.importData(data);
                
                // Update visualizer
                this.visualizer.createBodies(this.simulator.bodies);
                this.visualizer.clearTrails();
                
                // Update UI
                this.updateBodyConfigsUI(this.simulator.bodies);
                this.updateUI();
                
                // Switch to custom preset
                this.elements.presetBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.preset === 'custom') {
                        btn.classList.add('active');
                    }
                });
                
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
        a.download = `gravitation3_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('Screenshot saved');
    }

    startRecording() {
        try {
            const canvas = this.visualizer.renderer.domElement;
            const videoStream = canvas.captureStream(60); // 60 FPS at current resolution
            
            // Get background music audio stream
            const audioElement = document.getElementById('bg-music');
            let combinedStream = videoStream;
            
            if (audioElement && !audioElement.muted && audioElement.volume > 0) {
                // Try to capture audio
                try {
                    // Check if audio context already exists
                    if (!window.gravitation3AudioContext) {
                        window.gravitation3AudioContext = new (window.AudioContext || window.webkitAudioContext)();
                        window.gravitation3AudioSource = window.gravitation3AudioContext.createMediaElementSource(audioElement);
                    }
                    
                    const audioDestination = window.gravitation3AudioContext.createMediaStreamDestination();
                    
                    // Connect audio source to destination
                    window.gravitation3AudioSource.connect(audioDestination);
                    window.gravitation3AudioSource.connect(window.gravitation3AudioContext.destination);
                    
                    // Combine video and audio streams
                    combinedStream = new MediaStream([
                        ...videoStream.getVideoTracks(),
                        ...audioDestination.stream.getAudioTracks()
                    ]);
                    console.log('Recording with audio');
                } catch (audioError) {
                    console.warn('Could not capture audio, recording video only:', audioError);
                    combinedStream = videoStream;
                }
            }
            
            // Try MP4 first, fallback to WebM if not supported
            let options;
            let mimeType;
            let fileExtension;
            
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                options = {
                    mimeType: 'video/mp4',
                    videoBitsPerSecond: 50000000
                };
                mimeType = 'video/mp4';
                fileExtension = 'mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                options = {
                    mimeType: 'video/webm;codecs=h264',
                    videoBitsPerSecond: 50000000
                };
                mimeType = 'video/webm';
                fileExtension = 'mp4'; // Save as mp4 even if codec is in webm container
            } else {
                options = {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 50000000
                };
                mimeType = 'video/webm';
                fileExtension = 'webm';
            }
            
            this.recordedChunks = [];
            this.recordingMimeType = mimeType;
            this.recordingExtension = fileExtension;
            
            this.mediaRecorder = new MediaRecorder(combinedStream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: this.recordingMimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `three-body-${Date.now()}.${this.recordingExtension}`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.elements.recordBtn.innerHTML = '<span class="icon">🎬</span> Start Recording';
                this.elements.recordBtn.classList.remove('active');
                this.isRecording = false;
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.elements.recordBtn.innerHTML = '<span class="icon">⏹</span> Stop Recording';
            this.elements.recordBtn.classList.add('active');
            
            console.log('Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Video recording is not supported in your browser.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            console.log('Recording stopped');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ThreeBodyApp();
    console.log('Gravitation³ - Three-Body Simulator initialized');
});
