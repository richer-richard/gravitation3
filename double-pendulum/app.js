// Main application - connects UI, simulator, and visualizer with all features

// Initialize simulator and visualizer
const simulator = new DoublePendulumSimulator();
const visualizer = new DoublePendulumVisualizer('canvas-container');

// UI Elements
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const exportBtn = document.getElementById('export-btn');
const timeDisplay = document.getElementById('time-display');
const energyDisplay = document.getElementById('energy-display');
const fpsDisplay = document.getElementById('fps-display');
const entropyDisplay = document.getElementById('entropy-display');
const presetButtons = document.querySelectorAll('.preset-button');

// Sliders
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
const dtSlider = document.getElementById('dt-slider');
const dtValue = document.getElementById('dt-value');

// Checkboxes
const showTrailsCheckbox = document.getElementById('show-trails');
const showGridCheckbox = document.getElementById('show-grid');

// Multiple pendulum controls
const addPendulumBtn = document.getElementById('add-pendulum');
const removePendulumBtn = document.getElementById('remove-pendulum');
const pendulumCountDisplay = document.getElementById('pendulum-count');

// Current state
let currentPreset = 'default';
let speedMultiplier = 1.0;

// FPS tracking
let lastFrameTime = performance.now();
let fps = 120; // Default to high refresh rate
let fpsFrames = [];

// Video recording
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// Event Listeners
playBtn.addEventListener('click', () => {
    simulator.play();
    playBtn.classList.add('active');
    pauseBtn.classList.remove('active');
});

pauseBtn.addEventListener('click', () => {
    simulator.pause();
    pauseBtn.classList.add('active');
    playBtn.classList.remove('active');
});

resetBtn.addEventListener('click', () => {
    simulator.reset(currentPreset);
    visualizer.clearTrail();
    updateDisplay();
});

// Export video button
exportBtn.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

// Video recording functions
let recordingMimeType;
let recordingExtension;

function startRecording() {
    try {
        const canvas = visualizer.renderer.domElement;
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
        
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            options = {
                mimeType: 'video/mp4',
                videoBitsPerSecond: 50000000
            };
            recordingMimeType = 'video/mp4';
            recordingExtension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
            options = {
                mimeType: 'video/webm;codecs=h264',
                videoBitsPerSecond: 50000000
            };
            recordingMimeType = 'video/webm';
            recordingExtension = 'mp4'; // Save as mp4 even if codec is in webm container
        } else {
            options = {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 50000000
            };
            recordingMimeType = 'video/webm';
            recordingExtension = 'webm';
        }
        
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(combinedStream, options);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: recordingMimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `double-pendulum-${Date.now()}.${recordingExtension}`;
            a.click();
            URL.revokeObjectURL(url);
            
            exportBtn.textContent = '🎬 Start Recording';
            exportBtn.classList.remove('active');
            isRecording = false;
        };
        
        mediaRecorder.start();
        isRecording = true;
        exportBtn.textContent = '⏹ Stop Recording';
        exportBtn.classList.add('active');
        
        console.log('Recording started');
    } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Video recording is not supported in your browser.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        console.log('Recording stopped');
    }
}

presetButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Update active state
        presetButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Reset with new preset
        currentPreset = button.dataset.preset;
        simulator.reset(currentPreset);
        visualizer.clearTrail();
        updateDisplay();
    });
});

// Speed slider
speedSlider.addEventListener('input', (e) => {
    speedMultiplier = parseFloat(e.target.value);
    speedValue.textContent = speedMultiplier.toFixed(1) + 'x';
});
speedSlider.addEventListener('mouseup', (e) => e.target.blur());
speedSlider.addEventListener('touchend', (e) => e.target.blur());

// Time step slider
dtSlider.addEventListener('input', (e) => {
    const dt = parseFloat(e.target.value);
    dtValue.textContent = dt.toFixed(3);
    simulator.setTimeStep(dt);
});
dtSlider.addEventListener('mouseup', (e) => e.target.blur());
dtSlider.addEventListener('touchend', (e) => e.target.blur());

// Trails checkbox
showTrailsCheckbox.addEventListener('change', (e) => {
    visualizer.setShowTrails(e.target.checked);
});

// Grid checkbox
showGridCheckbox.addEventListener('change', (e) => {
    visualizer.setShowGrid(e.target.checked);
});

// Multiple pendulum controls
addPendulumBtn.addEventListener('click', () => {
    simulator.addPendulum();
    updatePendulumCount();
});

removePendulumBtn.addEventListener('click', () => {
    const count = simulator.getPendulumCount();
    if (count > 1) {
        simulator.removePendulum(count - 1);
        updatePendulumCount();
    }
});

function updatePendulumCount() {
    const count = simulator.getPendulumCount();
    pendulumCountDisplay.textContent = count;
    
    // Disable buttons at limits
    addPendulumBtn.disabled = count >= 10;
    removePendulumBtn.disabled = count <= 1;
    
    // Visual feedback
    if (count >= 10) {
        addPendulumBtn.style.opacity = '0.5';
        addPendulumBtn.style.cursor = 'not-allowed';
    } else {
        addPendulumBtn.style.opacity = '1';
        addPendulumBtn.style.cursor = 'pointer';
    }
    
    if (count <= 1) {
        removePendulumBtn.style.opacity = '0.5';
        removePendulumBtn.style.cursor = 'not-allowed';
    } else {
        removePendulumBtn.style.opacity = '1';
        removePendulumBtn.style.cursor = 'pointer';
    }
}

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
        if (simulator.isRunning) {
            simulator.pause();
            pauseBtn.classList.add('active');
            playBtn.classList.remove('active');
        } else {
            simulator.play();
            playBtn.classList.add('active');
            pauseBtn.classList.remove('active');
        }
    } else if (e.code === 'KeyR') {
        simulator.reset(currentPreset);
        visualizer.clearTrail();
        updateDisplay();
    }
});

// Update display
function updateDisplay() {
    timeDisplay.textContent = simulator.time.toFixed(3) + 's';
    energyDisplay.textContent = simulator.calculateEnergy().toFixed(3);
    fpsDisplay.textContent = Math.round(fps);
    entropyDisplay.textContent = simulator.calculateEntropy().toFixed(3);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Calculate FPS
    const now = performance.now();
    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;
    
    // Smooth FPS over last 30 frames
    fpsFrames.push(1000 / deltaTime);
    if (fpsFrames.length > 30) {
        fpsFrames.shift();
    }
    fps = fpsFrames.reduce((a, b) => a + b, 0) / fpsFrames.length;
    
    // Step simulation multiple times based on speed multiplier
    const stepsPerFrame = Math.max(1, Math.floor(speedMultiplier));
    for (let i = 0; i < stepsPerFrame; i++) {
        simulator.step();
    }
    
    // Update visualization
    visualizer.update(simulator);
    visualizer.render();
    
    // Update UI
    updateDisplay();
}

// Start animation loop
animate();

// Initial state
updateDisplay();
updatePendulumCount();
// Don't auto-start - wait for user to click play

console.log('Application started');
console.log('Keyboard shortcuts: Space = Play/Pause, R = Reset');
console.log('Multiple pendulum mode enabled (up to 10)');
