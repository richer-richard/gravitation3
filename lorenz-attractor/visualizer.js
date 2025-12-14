/**
 * Lorenz Attractor 3D Visualizer
 * Uses Three.js for rendering
 */

class LorenzVisualizer {
    constructor(container) {
        this.container = container;
        this.trajectories = [];
        this.trailLength = 2000;
        this.showTrails = true;
        this.autoRotate = true;
        
        // FPS tracking
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        
        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
        // Remove fog to keep stars visible

        // Camera setup - angled view to see butterfly shape clearly
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        // Position camera at an angle to see both wings perpendicular to view
        this.camera.position.set(0, -80, 40);
        this.camera.lookAt(0, 0, 25);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 0, 25);
        this.controls.autoRotate = this.autoRotate;
        this.controls.autoRotateSpeed = -0.5;
        this.controls.minDistance = 30;
        this.controls.maxDistance = 150;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0x00d4ff, 1, 100);
        pointLight1.position.set(20, 20, 40);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xec4899, 1, 100);
        pointLight2.position.set(-20, -20, 10);
        this.scene.add(pointLight2);

        // Add coordinate axes (optional, can be toggled)
        this.axes = new THREE.Group();
        this.createAxes();
        this.scene.add(this.axes);
        this.axes.visible = false;

        // Add star field
        this.createStarField();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Keyboard controls for camera panning
        this.panSpeed = 2;
        this.setupKeyboardControls();
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Only pan when Shift is held
            if (!e.shiftKey) return;
            
            let panX = 0;
            let panY = 0;
            
            // WASD keys
            if (e.key === 'w' || e.key === 'W') {
                panY = this.panSpeed;
                e.preventDefault();
            }
            if (e.key === 's' || e.key === 'S') {
                panY = -this.panSpeed;
                e.preventDefault();
            }
            if (e.key === 'a' || e.key === 'A') {
                panX = -this.panSpeed;
                e.preventDefault();
            }
            if (e.key === 'd' || e.key === 'D') {
                panX = this.panSpeed;
                e.preventDefault();
            }
            
            // Arrow keys
            if (e.key === 'ArrowUp') {
                panY = this.panSpeed;
                e.preventDefault();
            }
            if (e.key === 'ArrowDown') {
                panY = -this.panSpeed;
                e.preventDefault();
            }
            if (e.key === 'ArrowLeft') {
                panX = -this.panSpeed;
                e.preventDefault();
            }
            if (e.key === 'ArrowRight') {
                panX = this.panSpeed;
                e.preventDefault();
            }
            
            // Apply panning
            if (panX !== 0 || panY !== 0) {
                this.panCamera(panX, panY);
            }
        });
    }

    panCamera(deltaX, deltaY) {
        // Get camera's right and up vectors
        const camera = this.camera;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        
        // Calculate right vector (perpendicular to camera direction and up)
        right.crossVectors(camera.getWorldDirection(new THREE.Vector3()), up).normalize();
        
        // Create pan offset
        const offset = new THREE.Vector3();
        offset.addScaledVector(right, deltaX);
        offset.addScaledVector(up, deltaY);
        
        // Move both camera and controls target
        camera.position.add(offset);
        this.controls.target.add(offset);
        this.controls.update();
    }

    createStarField() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = [];
        
        for (let i = 0; i < starCount; i++) {
            // Create stars in a sphere around the scene
            const x = THREE.MathUtils.randFloatSpread(100);
            const y = THREE.MathUtils.randFloatSpread(100);
            const z = THREE.MathUtils.randFloatSpread(100);
            positions.push(x, y, z);
        }
        
        starGeometry.setAttribute('position', 
            new THREE.Float32BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }

    createAxes() {
        const axisLength = 30;
        const axisColors = [0xff0000, 0x00ff00, 0x0000ff];
        const axisLabels = ['X', 'Y', 'Z'];
        
        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            positions[i * 2 + i] = axisLength;
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const material = new THREE.LineBasicMaterial({ 
                color: axisColors[i],
                opacity: 0.5,
                transparent: true
            });
            const axis = new THREE.Line(geometry, material);
            this.axes.add(axis);
        }
    }

    createTrajectories(trajectories) {
        // Clear existing trajectories
        this.clearTrajectories();
        
        // Create new trajectory visualizations
        this.trajectories = trajectories.map(traj => {
            const trajectory = {
                state: traj.state,
                color: traj.color,
                name: traj.name,
                trail: [],
                mesh: null,
                line: null
            };
            
            // Create sphere for trajectory point
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshStandardMaterial({
                color: traj.color,
                emissive: traj.color,
                emissiveIntensity: 0.5,
                roughness: 0.3,
                metalness: 0.7
            });
            trajectory.mesh = new THREE.Mesh(geometry, material);
            trajectory.mesh.position.set(traj.state.x, traj.state.y, traj.state.z);
            this.scene.add(trajectory.mesh);
            
            // Create trail line
            const lineGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(this.trailLength * 3);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            lineGeometry.setDrawRange(0, 0);
            
            const lineMaterial = new THREE.LineBasicMaterial({
                color: traj.color,
                transparent: true,
                opacity: 0.7,
                linewidth: 2
            });
            
            trajectory.line = new THREE.Line(lineGeometry, lineMaterial);
            this.scene.add(trajectory.line);
            
            return trajectory;
        });
    }

    updateTrajectories(trajectories) {
        if (this.trajectories.length !== trajectories.length) {
            this.createTrajectories(trajectories);
            return;
        }
        
        for (let i = 0; i < trajectories.length; i++) {
            const simTraj = trajectories[i];
            const visTraj = this.trajectories[i];
            
            // Update position
            visTraj.state = simTraj.state;
            visTraj.mesh.position.set(simTraj.state.x, simTraj.state.y, simTraj.state.z);
            
            // Update trail
            if (this.showTrails) {
                visTraj.trail.push({
                    x: simTraj.state.x,
                    y: simTraj.state.y,
                    z: simTraj.state.z
                });
                
                if (visTraj.trail.length > this.trailLength) {
                    visTraj.trail.shift();
                }
                
                // Update line geometry
                const positions = visTraj.line.geometry.attributes.position.array;
                for (let j = 0; j < visTraj.trail.length; j++) {
                    const point = visTraj.trail[j];
                    positions[j * 3] = point.x;
                    positions[j * 3 + 1] = point.y;
                    positions[j * 3 + 2] = point.z;
                }
                visTraj.line.geometry.attributes.position.needsUpdate = true;
                visTraj.line.geometry.setDrawRange(0, visTraj.trail.length);
            }
        }
    }

    clearTrajectories() {
        for (const trajectory of this.trajectories) {
            this.scene.remove(trajectory.mesh);
            this.scene.remove(trajectory.line);
            trajectory.mesh.geometry.dispose();
            trajectory.mesh.material.dispose();
            trajectory.line.geometry.dispose();
            trajectory.line.material.dispose();
        }
        this.trajectories = [];
    }

    clearTrails() {
        for (const trajectory of this.trajectories) {
            trajectory.trail = [];
            if (trajectory.line) {
                trajectory.line.geometry.setDrawRange(0, 0);
            }
        }
    }

    setTrailLength(length) {
        this.trailLength = length;
        // Recreate lines with new buffer size
        for (const trajectory of this.trajectories) {
            if (trajectory.line) {
                this.scene.remove(trajectory.line);
                trajectory.line.geometry.dispose();
                
                const lineGeometry = new THREE.BufferGeometry();
                const positions = new Float32Array(length * 3);
                lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                lineGeometry.setDrawRange(0, 0);
                
                trajectory.line = new THREE.Line(lineGeometry, trajectory.line.material);
                this.scene.add(trajectory.line);
                trajectory.trail = [];
            }
        }
    }

    setShowTrails(show) {
        this.showTrails = show;
        for (const trajectory of this.trajectories) {
            if (trajectory.line) {
                trajectory.line.visible = show;
            }
        }
    }

    setAutoRotate(enabled) {
        this.autoRotate = enabled;
        this.controls.autoRotate = enabled;
    }

    setShowAxes(show) {
        this.axes.visible = show;
    }

    resetCamera() {
        this.camera.position.set(0, -80, 40);
        this.camera.lookAt(0, 0, 25);
        this.controls.target.set(0, 0, 25);
        this.controls.update();
    }

    render() {
        this.frameCount++;
        
        // Update FPS every 30 frames
        if (this.frameCount % 30 === 0) {
            const now = performance.now();
            const delta = now - this.lastTime;
            this.fps = Math.round((30 * 1000) / delta);
            this.lastTime = now;
        }
        
        // Slowly rotate starfield
        if (this.stars) {
            this.stars.rotation.y += 0.0001;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    getFPS() {
        return this.fps;
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    dispose() {
        this.clearTrajectories();
        this.renderer.dispose();
        this.controls.dispose();
        window.removeEventListener('resize', () => this.onWindowResize());
    }
}
