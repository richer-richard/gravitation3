// Three.js Visualizer for Double Pendulum with multiple pendulum support

class DoublePendulumVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Pendulum visuals array
        this.pendulumVisuals = [];
        
        // Initialize Three.js components
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initObjects();
        
        // Settings
        this.showTrails = true;
        this.showGrid = true;
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
        
        console.log('Visualizer initialized with multiple pendulum support');
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
    }
    
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.width / this.height,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }
    
    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);
        
        const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
        pointLight2.position.set(-5, -5, 5);
        this.scene.add(pointLight2);
    }
    
    initObjects() {
        // Pivot point
        const pivotGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const pivotMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        this.pivot = new THREE.Mesh(pivotGeometry, pivotMaterial);
        this.scene.add(this.pivot);
        
        // Grid
        this.gridHelper = new THREE.GridHelper(6, 20, 0x00d4ff, 0x1a1f3a);
        this.gridHelper.rotation.x = Math.PI / 2;
        this.gridHelper.position.z = -0.3;
        this.scene.add(this.gridHelper);
        
        // Camera controls
        this.cameraDistance = 5;
        this.targetCameraDistance = 5;
        this.minCameraDistance = 2;
        this.maxCameraDistance = 15;
        this.cameraOffset = { x: 0, y: 0 };
        this.targetCameraOffset = { x: 0, y: 0 };
        
        // Gesture tracking
        this.isPanning = false;
        this.lastPanPosition = { x: 0, y: 0 };
        this.touches = [];
        this.lastPinchDistance = 0;
        
        // Keyboard state
        this.keys = {};
        
        this.setupCameraControls();
    }
    
    setupCameraControls() {
        const canvas = this.renderer.domElement;
        
        // Mouse controls
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('mouseleave', () => this.onMouseUp());
        canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        
        // Touch controls
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    onMouseDown(e) {
        this.isPanning = true;
        this.lastPanPosition = { x: e.clientX, y: e.clientY };
    }
    
    onMouseMove(e) {
        if (!this.isPanning) return;
        
        const deltaX = e.clientX - this.lastPanPosition.x;
        const deltaY = e.clientY - this.lastPanPosition.y;
        
        const panSpeed = 0.01;
        this.targetCameraOffset.x -= deltaX * panSpeed * (this.cameraDistance / 5);
        this.targetCameraOffset.y += deltaY * panSpeed * (this.cameraDistance / 5);
        
        this.lastPanPosition = { x: e.clientX, y: e.clientY };
    }
    
    onMouseUp() {
        this.isPanning = false;
    }
    
    onWheel(e) {
        e.preventDefault();
        
        // Get mouse position in normalized device coordinates (-1 to 1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Calculate world position under mouse before zoom (use target values, not lerped)
        const distanceBeforeZoom = this.targetCameraDistance;
        const vFOV = this.camera.fov * Math.PI / 180; // Convert to radians
        const height = 2 * Math.tan(vFOV / 2) * distanceBeforeZoom;
        const width = height * this.camera.aspect;
        
        const worldXBefore = this.targetCameraOffset.x + mouseX * width / 2;
        const worldYBefore = this.targetCameraOffset.y + mouseY * height / 2;
        
        // Apply zoom
        const zoomSpeed = 0.003;
        this.targetCameraDistance = Math.max(
            this.minCameraDistance,
            Math.min(this.maxCameraDistance, this.targetCameraDistance + e.deltaY * zoomSpeed)
        );
        
        // Calculate world position under mouse after zoom
        const distanceAfterZoom = this.targetCameraDistance;
        const heightAfter = 2 * Math.tan(vFOV / 2) * distanceAfterZoom;
        const widthAfter = heightAfter * this.camera.aspect;
        
        const worldXAfter = this.targetCameraOffset.x + mouseX * widthAfter / 2;
        const worldYAfter = this.targetCameraOffset.y + mouseY * heightAfter / 2;
        
        // Adjust camera offset so the world point stays under the mouse
        this.targetCameraOffset.x += worldXBefore - worldXAfter;
        this.targetCameraOffset.y += worldYBefore - worldYAfter;
    }
    
    onTouchStart(e) {
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 2) {
            // Pinch to zoom
            e.preventDefault();
            const dx = this.touches[0].clientX - this.touches[1].clientX;
            const dy = this.touches[0].clientY - this.touches[1].clientY;
            this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
        } else if (this.touches.length === 1) {
            // Pan
            this.isPanning = true;
            this.lastPanPosition = {
                x: this.touches[0].clientX,
                y: this.touches[0].clientY
            };
        }
    }
    
    onTouchMove(e) {
        if (e.touches.length === 2) {
            // Pinch to zoom
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (this.lastPinchDistance > 0) {
                const delta = this.lastPinchDistance - distance;
                const zoomSpeed = 0.05;
                this.targetCameraDistance = Math.max(
                    this.minCameraDistance,
                    Math.min(this.maxCameraDistance, this.targetCameraDistance + delta * zoomSpeed)
                );
            }
            
            this.lastPinchDistance = distance;
            this.touches = Array.from(e.touches);
        } else if (e.touches.length === 1 && this.isPanning) {
            // Pan
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.lastPanPosition.x;
            const deltaY = touch.clientY - this.lastPanPosition.y;
            
            const panSpeed = 0.01;
            this.targetCameraOffset.x -= deltaX * panSpeed * (this.cameraDistance / 5);
            this.targetCameraOffset.y += deltaY * panSpeed * (this.cameraDistance / 5);
            
            this.lastPanPosition = { x: touch.clientX, y: touch.clientY };
        }
    }
    
    onTouchEnd(e) {
        if (e.touches.length < 2) {
            this.lastPinchDistance = 0;
        }
        if (e.touches.length === 0) {
            this.isPanning = false;
        }
        this.touches = Array.from(e.touches);
    }
    
    updateCameraControls() {
        // Keyboard panning
        const panSpeed = 0.05;
        if (this.keys['arrowleft'] || this.keys['a']) {
            this.targetCameraOffset.x -= panSpeed;
        }
        if (this.keys['arrowright'] || this.keys['d']) {
            this.targetCameraOffset.x += panSpeed;
        }
        if (this.keys['arrowup'] || this.keys['w']) {
            this.targetCameraOffset.y += panSpeed;
        }
        if (this.keys['arrowdown'] || this.keys['s']) {
            this.targetCameraOffset.y -= panSpeed;
        }
        
        // Smooth camera transitions
        const smoothness = 0.1;
        this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * smoothness;
        this.cameraOffset.x += (this.targetCameraOffset.x - this.cameraOffset.x) * smoothness;
        this.cameraOffset.y += (this.targetCameraOffset.y - this.cameraOffset.y) * smoothness;
        
        // Update camera position
        this.camera.position.set(this.cameraOffset.x, this.cameraOffset.y, this.cameraDistance);
        this.camera.lookAt(this.cameraOffset.x, this.cameraOffset.y, 0);
    }
    
    createPendulumVisual(pendulum) {
        const visual = {
            id: pendulum.id,
            rod1: null,
            rod2: null,
            bob1: null,
            bob2: null,
            trailLine: null,
            trailGeometry: null,
            trailPositionArray: null,
            color1: pendulum.color1,
            color2: pendulum.color2
        };
        
        // Create bob 1
        const bob1Geometry = new THREE.SphereGeometry(0.12, 32, 32);
        const bob1Material = new THREE.MeshStandardMaterial({
            color: visual.color1,
            emissive: visual.color1,
            emissiveIntensity: 0.3
        });
        visual.bob1 = new THREE.Mesh(bob1Geometry, bob1Material);
        this.scene.add(visual.bob1);
        
        // Create bob 2
        const bob2Geometry = new THREE.SphereGeometry(0.12, 32, 32);
        const bob2Material = new THREE.MeshStandardMaterial({
            color: visual.color2,
            emissive: visual.color2,
            emissiveIntensity: 0.3
        });
        visual.bob2 = new THREE.Mesh(bob2Geometry, bob2Material);
        this.scene.add(visual.bob2);
        
        // Create reusable trail geometry
        const maxTrailLength = 5000;
        const trailGeometry = new THREE.BufferGeometry();
        const positionArray = new Float32Array(maxTrailLength * 3);
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
        trailGeometry.setDrawRange(0, 0); // Start with no points drawn
        
        const trailMaterial = new THREE.LineBasicMaterial({
            color: visual.color2,
            transparent: true,
            opacity: 0.5
        });
        
        visual.trailGeometry = trailGeometry;
        visual.trailPositionArray = positionArray;
        visual.trailLine = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(visual.trailLine);
        
        this.pendulumVisuals.push(visual);
        return visual;
    }
    
    removePendulumVisual(index) {
        if (index >= 0 && index < this.pendulumVisuals.length) {
            const visual = this.pendulumVisuals[index];
            
            if (visual.rod1) this.scene.remove(visual.rod1);
            if (visual.rod2) this.scene.remove(visual.rod2);
            if (visual.bob1) this.scene.remove(visual.bob1);
            if (visual.bob2) this.scene.remove(visual.bob2);
            if (visual.trailLine) this.scene.remove(visual.trailLine);
            
            this.pendulumVisuals.splice(index, 1);
        }
    }
    
    update(simulator) {
        if (!simulator || !simulator.pendulums) return;
        
        // Update camera controls
        this.updateCameraControls();
        
        // Sync visual count with simulator pendulum count
        while (this.pendulumVisuals.length < simulator.pendulums.length) {
            this.createPendulumVisual(simulator.pendulums[this.pendulumVisuals.length]);
        }
        while (this.pendulumVisuals.length > simulator.pendulums.length) {
            this.removePendulumVisual(this.pendulumVisuals.length - 1);
        }
        
        // Update each pendulum
        simulator.pendulums.forEach((pendulum, index) => {
            const visual = this.pendulumVisuals[index];
            if (!visual) return;
            
            const pos = simulator.getPositionsForPendulum(pendulum);
            
            // Update bob positions
            visual.bob1.position.set(pos.x1, pos.y1, 0);
            visual.bob2.position.set(pos.x2, pos.y2, 0);
            
            // Update rod 1 using TubeGeometry for proper connection
            if (visual.rod1) this.scene.remove(visual.rod1);
            const curve1 = new THREE.LineCurve3(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(pos.x1, pos.y1, 0)
            );
            const rod1Geometry = new THREE.TubeGeometry(curve1, 1, 0.015, 8, false);
            const rod1Material = new THREE.MeshStandardMaterial({ 
                color: visual.color1,
                emissive: visual.color1,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.7
            });
            visual.rod1 = new THREE.Mesh(rod1Geometry, rod1Material);
            this.scene.add(visual.rod1);
            
            // Update rod 2 using TubeGeometry for proper connection
            if (visual.rod2) this.scene.remove(visual.rod2);
            const curve2 = new THREE.LineCurve3(
                new THREE.Vector3(pos.x1, pos.y1, 0),
                new THREE.Vector3(pos.x2, pos.y2, 0)
            );
            const rod2Geometry = new THREE.TubeGeometry(curve2, 1, 0.015, 8, false);
            const rod2Material = new THREE.MeshStandardMaterial({ 
                color: visual.color2,
                emissive: visual.color2,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.7
            });
            visual.rod2 = new THREE.Mesh(rod2Geometry, rod2Material);
            this.scene.add(visual.rod2);
            
            // Update trail using buffer optimization
            if (this.showTrails) {
                // Recreate trail line if it was removed
                if (!visual.trailLine) {
                    const trailMaterial = new THREE.LineBasicMaterial({
                        color: visual.color2,
                        transparent: true,
                        opacity: 0.5
                    });
                    visual.trailLine = new THREE.Line(visual.trailGeometry, trailMaterial);
                }
                
                // Add to scene if not already there
                if (!visual.trailLine.parent) {
                    this.scene.add(visual.trailLine);
                }
                
                // Update buffer values instead of recreating geometry
                const positionArray = visual.trailPositionArray;
                for (let j = 0; j < pendulum.trail.length; j++) {
                    const p = pendulum.trail[j];
                    positionArray[j * 3] = p.x;
                    positionArray[j * 3 + 1] = p.y;
                    positionArray[j * 3 + 2] = 0;
                }
                
                // Mark buffer as needing update
                visual.trailGeometry.attributes.position.needsUpdate = true;
                
                // Update draw range to show only active points
                visual.trailGeometry.setDrawRange(0, pendulum.trail.length);
            } else if (!this.showTrails && visual.trailLine && visual.trailLine.parent) {
                this.scene.remove(visual.trailLine);
            }
        });
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }
    
    setShowTrails(show) {
        this.showTrails = show;
        if (!show) {
            this.pendulumVisuals.forEach(visual => {
                if (visual.trailLine) {
                    this.scene.remove(visual.trailLine);
                    visual.trailLine = null;
                }
            });
        }
    }
    
    setShowGrid(show) {
        this.showGrid = show;
        if (this.gridHelper) {
            this.gridHelper.visible = show;
        }
    }
    
    clearTrail() {
        this.pendulumVisuals.forEach(visual => {
            if (visual.trailLine) {
                this.scene.remove(visual.trailLine);
                visual.trailLine = null;
            }
        });
    }
}
