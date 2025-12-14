/**
 * Three.js Visualizer for Malkus Waterwheel
 * Visualizes a rotating waterwheel with water-filled buckets
 */

class MalkusWheelVisualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Visual elements
        this.wheel = null;
        this.buckets = [];
        this.waterMeshes = [];
        this.waterDroplets = [];
        this.centerOfMass = null;
        this.comTrail = [];
        this.comTrailLine = null;
        this.maxTrailLength = 500;
        
        // Settings
        this.autoRotate = false;
        this.showWater = true;
        this.trackBucket = false;
        this.trackedBucketIndex = 0;
        this.showCenterOfMass = true;
        this.showComTrail = true;
        
        // Animation
        this.frameCount = 0;
        this.fps = 60;
        this.lastFrameTime = Date.now();
        
        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
        this.scene.fog = new THREE.FogExp2(0x0a0e27, 0.02);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
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
        this.controls.minDistance = 4;
        this.controls.maxDistance = 15;
        this.controls.enablePan = true;
        this.controls.autoRotate = this.autoRotate;
        this.controls.autoRotateSpeed = 0.5;
        
        // Mouse tracking for wheel zoom to cursor
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0x00d4ff, 1.5, 50);
        pointLight1.position.set(5, 5, 5);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xec4899, 1, 50);
        pointLight2.position.set(-5, -5, 5);
        this.scene.add(pointLight2);

        // Create water drip source indicator at top
        const dripGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const dripMaterial = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.8
        });
        const dripIndicator = new THREE.Mesh(dripGeometry, dripMaterial);
        dripIndicator.position.set(0, 2.5, 0);
        this.scene.add(dripIndicator);

        // Add a subtle grid
        const gridHelper = new THREE.GridHelper(10, 20, 0x1e3a5f, 0x0f1d3a);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.2;
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.z = -1;
        this.scene.add(gridHelper);

        // Keyboard controls for camera panning
        this.keyState = {};
        this.panSpeed = 0.3;
        
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onKeyDown(event) {
        this.keyState[event.key.toLowerCase()] = true;
        this.keyState.shift = event.shiftKey;
    }

    onKeyUp(event) {
        this.keyState[event.key.toLowerCase()] = false;
        this.keyState.shift = event.shiftKey;
    }

    handleKeyboardPanning() {
        // Only allow panning when Shift is held to avoid conflicts with shortcuts
        if (!this.keyState.shift) return;
        
        const panVector = new THREE.Vector3();
        
        // Calculate pan direction based on camera orientation
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Get right vector (perpendicular to camera direction)
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDirection, this.camera.up).normalize();
        
        // Get up vector relative to camera
        const cameraUp = new THREE.Vector3();
        cameraUp.crossVectors(cameraRight, cameraDirection).normalize();
        
        // Arrow keys and WASD (only when Shift is held)
        // Left arrow or A key - pan left
        if (this.keyState['arrowleft'] || this.keyState['a']) {
            panVector.add(cameraRight.clone().multiplyScalar(-this.panSpeed));
        }
        // Right arrow or D key - pan right
        if (this.keyState['arrowright'] || this.keyState['d']) {
            panVector.add(cameraRight.clone().multiplyScalar(this.panSpeed));
        }
        // Up arrow or W key - pan up
        if (this.keyState['arrowup'] || this.keyState['w']) {
            panVector.add(cameraUp.clone().multiplyScalar(this.panSpeed));
        }
        // Down arrow or S key - pan down
        if (this.keyState['arrowdown'] || this.keyState['s']) {
            panVector.add(cameraUp.clone().multiplyScalar(-this.panSpeed));
        }
        
        // Apply panning to both camera and controls target
        if (panVector.length() > 0) {
            this.camera.position.add(panVector);
            this.controls.target.add(panVector);
        }
    }

    createWheel(numBuckets, radius) {
        // Clear existing wheel if any
        if (this.wheel) {
            this.scene.remove(this.wheel);
            this.wheel.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        // Remove all existing buckets from scene
        this.buckets.forEach(bucket => {
            this.scene.remove(bucket);
            bucket.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        
        // Clear water droplets when recreating wheel
        this.waterDroplets.forEach(droplet => {
            this.scene.remove(droplet);
            droplet.geometry.dispose();
            droplet.material.dispose();
        });
        this.waterDroplets = [];
        
        this.buckets = [];
        this.waterMeshes = [];

        this.wheel = new THREE.Group();

        // Create main wheel structure (spokes)
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5568,
            metalness: 0.6,
            roughness: 0.4
        });

        // Central hub - just a small dot marker
        const hubGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const hubMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a5568,
            transparent: true,
            opacity: 0.6
        });
        const hub = new THREE.Mesh(hubGeometry, hubMaterial);
        hub.renderOrder = -10; // Render behind everything else
        this.wheel.add(hub);

        // Outer rim - render behind buckets so it shows in gaps only
        const rimGeometry = new THREE.TorusGeometry(radius, 0.05, 16, 64);
        const rim = new THREE.Mesh(rimGeometry, wheelMaterial);
        rim.renderOrder = -1; // Render behind other objects
        this.wheel.add(rim);

        // Create spokes and buckets
        this.buckets = [];
        this.waterMeshes = [];

        for (let i = 0; i < numBuckets; i++) {
            const angle = (2 * Math.PI * i) / numBuckets;
            
            // Spokes removed - only hub and rim remain

            // Bucket at end of spoke - IMPORTANT: buckets are NOT added to wheel group
            // They will be positioned and oriented separately to stay upright
            const bucketGroup = new THREE.Group();
            
            // Add connecting rod from bucket to spoke (stays with bucket, not wheel)
            // This creates the visual connection between rotating spoke and upright bucket
            const connectorGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
            const connectorMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a5568,
                metalness: 0.6,
                roughness: 0.4
            });
            const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
            // Connector extends backward from bucket toward wheel center
            connector.rotation.x = Math.PI / 2;
            connector.position.z = -0.3; // Behind the bucket
            bucketGroup.add(connector);
            
            // Create bucket with open top using multiple parts
            const bucketMaterial = new THREE.MeshStandardMaterial({
                color: 0x64748b,
                metalness: 0.3,
                roughness: 0.6,
                side: THREE.DoubleSide
            });

            // Bucket bottom (slightly larger for stability)
            const bottomGeometry = new THREE.BoxGeometry(0.34, 0.03, 0.34);
            const bottom = new THREE.Mesh(bottomGeometry, bucketMaterial);
            bottom.position.y = -0.14;
            bucketGroup.add(bottom);

            // Bucket walls
            const wallHeight = 0.28;
            const wallThickness = 0.03;
            
            // Back wall (solid) - this is where spoke connects
            const backWallGeometry = new THREE.BoxGeometry(0.34, wallHeight, wallThickness);
            const backWall = new THREE.Mesh(backWallGeometry, bucketMaterial);
            backWall.position.z = -0.165;
            backWall.position.y = 0;
            bucketGroup.add(backWall);
            
            // Left wall (solid)
            const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 0.33);
            const leftWall = new THREE.Mesh(leftWallGeometry, bucketMaterial);
            leftWall.position.x = -0.165;
            leftWall.position.y = 0;
            bucketGroup.add(leftWall);
            
            // Right wall (solid)
            const rightWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 0.33);
            const rightWall = new THREE.Mesh(rightWallGeometry, bucketMaterial);
            rightWall.position.x = 0.165;
            rightWall.position.y = 0;
            bucketGroup.add(rightWall);
            
            // Front wall (very transparent so we can see water accumulating)
            const transparentMaterial = new THREE.MeshStandardMaterial({
                color: 0x8891a0,
                metalness: 0.5,
                roughness: 0.3,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            });
            const frontWallGeometry = new THREE.BoxGeometry(0.34, wallHeight, wallThickness);
            const frontWall = new THREE.Mesh(frontWallGeometry, transparentMaterial);
            frontWall.position.z = 0.165;
            frontWall.position.y = 0;
            bucketGroup.add(frontWall);

            // Water inside bucket - positioned to start from bottom and fill up
            const waterGeometry = new THREE.BoxGeometry(0.3, 0.25, 0.3);
            const waterMaterial = new THREE.MeshStandardMaterial({
                color: 0x4cc9f0,
                metalness: 0.2,
                roughness: 0.1,
                transparent: true,
                opacity: 0.85,
                emissive: 0x1a8fb5,
                emissiveIntensity: 0.1
            });
            const water = new THREE.Mesh(waterGeometry, waterMaterial);
            water.scale.y = 0; // Start empty
            water.position.y = -0.14; // Start at bottom
            water.userData.bucketIndex = i; // Store bucket index in water mesh
            bucketGroup.add(water);

            // Store initial angle for this bucket
            bucketGroup.userData.initialAngle = angle;
            bucketGroup.userData.bucketIndex = i;
            
            // IMPORTANT: Store water mesh reference in bucket for correct indexing
            bucketGroup.userData.waterMesh = water;
            this.waterMeshes[i] = water;
            
            // Add bucket to scene directly (not to wheel) so it can maintain its orientation
            this.scene.add(bucketGroup);
            this.buckets.push(bucketGroup);
        }

        this.scene.add(this.wheel);
    }

    updateWheel(simulator) {
        if (!this.wheel) {
            this.createWheel(simulator.numBuckets, simulator.radius * 2);
        }

        const radius = simulator.radius * 2;

        // Rotate wheel based on current angle (same direction as buckets)
        this.wheel.rotation.z = simulator.theta;

        // Update bucket positions to follow wheel rotation while staying upright
        for (let i = 0; i < simulator.numBuckets; i++) {
            if (this.buckets[i]) {
                const bucket = this.buckets[i];
                // The simulator uses: angle = theta + (2π * i / n)
                // Water flows where cos(angle) > threshold, which is near angle ≈ 0 (rightmost position)
                // We need to rotate this 90° counterclockwise so water comes from top visually
                // So we add π/2 to the angle
                const bucketAngle = -simulator.theta - (2 * Math.PI * i) / simulator.numBuckets + Math.PI / 2;
                
                // Position bucket at this angle
                bucket.position.x = Math.cos(bucketAngle) * radius;
                bucket.position.y = Math.sin(bucketAngle) * radius;
                
                // Keep bucket upright (no rotation)
                bucket.rotation.z = 0;
                
                // Set render order so buckets appear in front of rim
                bucket.renderOrder = 1;
            }

            // Update water levels in buckets - water fills from bottom up
            if (this.buckets[i] && this.buckets[i].userData.waterMesh) {
                const waterMesh = this.buckets[i].userData.waterMesh;
                const mass = simulator.bucketMasses[i];
                const maxMass = 2.5; // Maximum expected mass for scaling
                const waterLevel = Math.min(mass / maxMass, 1.0);
                
                // Scale water height based on amount
                waterMesh.scale.y = waterLevel;
                
                // Position water to rise from bottom
                const waterHeight = 0.25 * waterLevel;
                waterMesh.position.y = -0.14 + (waterHeight / 2);
                
                // Only show water if there's a meaningful amount
                waterMesh.visible = this.showWater && waterLevel > 0.02;
            }
        }

        // Calculate and update center of mass
        this.updateCenterOfMass(simulator);
        
        // Create realistic water droplets falling from the top
        if (!simulator.isPaused && Math.random() < 0.4 && this.waterDroplets.length < 50) {
            this.createWaterDroplet();
        }

        // Update existing droplets with realistic physics
        this.waterDroplets = this.waterDroplets.filter(droplet => {
            // Gravity effect - accelerate downward
            droplet.userData.velocity += 0.003; // acceleration
            droplet.position.y -= droplet.userData.velocity;
            
            // Fade out as it falls
            droplet.material.opacity *= 0.98;
            
            // Check if droplet hit a bucket
            let hitBucket = false;
            for (let i = 0; i < this.buckets.length; i++) {
                const bucket = this.buckets[i];
                const dx = droplet.position.x - bucket.position.x;
                const dy = droplet.position.y - bucket.position.y;
                const dz = droplet.position.z - bucket.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                // If droplet is close to bucket, make it disappear (absorbed)
                if (distance < 0.3 && dy < 0.2 && dy > -0.2) {
                    hitBucket = true;
                    break;
                }
            }
            
            // Remove droplet if it hit a bucket, went too far down, or faded out
            if (hitBucket || droplet.position.y < -3 || droplet.material.opacity < 0.1) {
                this.scene.remove(droplet);
                droplet.geometry.dispose();
                droplet.material.dispose();
                return false;
            }
            return true;
        });
    }

    createWaterDroplet() {
        const geometry = new THREE.SphereGeometry(0.04, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x4cc9f0,
            metalness: 0.3,
            roughness: 0.1,
            transparent: true,
            opacity: 0.9,
            emissive: 0x4cc9f0,
            emissiveIntensity: 0.2
        });
        const droplet = new THREE.Mesh(geometry, material);
        
        // Start from a point slightly offset from center
        droplet.position.set(
            (Math.random() - 0.5) * 0.15,
            2.5,
            (Math.random() - 0.5) * 0.15
        );
        
        // Initialize velocity
        droplet.userData.velocity = 0;
        
        this.scene.add(droplet);
        this.waterDroplets.push(droplet);
    }

    setShowWater(show) {
        this.showWater = show;
        this.waterMeshes.forEach(water => {
            water.visible = show;
        });
    }

    setAutoRotate(rotate) {
        this.autoRotate = rotate;
        this.controls.autoRotate = rotate;
        // Disable bucket tracking if auto-rotate is enabled
        if (rotate) {
            this.trackBucket = false;
        }
    }

    setTrackBucket(track, bucketIndex = 0) {
        this.trackBucket = track;
        this.trackedBucketIndex = bucketIndex;
        // Disable auto-rotate if tracking is enabled
        if (track) {
            this.autoRotate = false;
            this.controls.autoRotate = false;
        }
    }

    updateCenterOfMass(simulator) {
        // Calculate center of mass of water in the system
        let totalMass = 0;
        let comX = 0;
        let comY = 0;
        
        const radius = simulator.radius * 2;
        
        for (let i = 0; i < simulator.numBuckets; i++) {
            const mass = simulator.bucketMasses[i];
            if (mass > 0 && this.buckets[i]) {
                totalMass += mass;
                comX += this.buckets[i].position.x * mass;
                comY += this.buckets[i].position.y * mass;
            }
        }
        
        if (totalMass > 0) {
            comX /= totalMass;
            comY /= totalMass;
            
            // Create or update center of mass indicator
            if (!this.centerOfMass) {
                const comGeometry = new THREE.SphereGeometry(0.08, 16, 16);
                const comMaterial = new THREE.MeshBasicMaterial({
                    color: 0xec4899,
                    transparent: true,
                    opacity: 0.9,
                    emissive: 0xec4899,
                    emissiveIntensity: 0.5
                });
                this.centerOfMass = new THREE.Mesh(comGeometry, comMaterial);
                this.scene.add(this.centerOfMass);
            }
            
            this.centerOfMass.position.set(comX, comY, 0);
            this.centerOfMass.visible = this.showCenterOfMass;
            this.centerOfMass.renderOrder = 10; // Render in front of everything
            
            // Add to trail
            if (this.showComTrail) {
                this.comTrail.push(new THREE.Vector3(comX, comY, 0));
                if (this.comTrail.length > this.maxTrailLength) {
                    this.comTrail.shift();
                }
                
                // Update trail line
                if (this.comTrail.length > 2) {
                    if (this.comTrailLine) {
                        this.scene.remove(this.comTrailLine);
                        this.comTrailLine.geometry.dispose();
                    }
                    
                    const trailGeometry = new THREE.BufferGeometry().setFromPoints(this.comTrail);
                    const trailMaterial = new THREE.LineBasicMaterial({
                        color: 0xec4899,
                        transparent: true,
                        opacity: 0.6,
                        linewidth: 2
                    });
                    this.comTrailLine = new THREE.Line(trailGeometry, trailMaterial);
                    this.scene.add(this.comTrailLine);
                }
            }
        } else {
            if (this.centerOfMass) {
                this.centerOfMass.visible = false;
            }
        }
    }

    setShowCenterOfMass(show) {
        this.showCenterOfMass = show;
        if (this.centerOfMass) {
            this.centerOfMass.visible = show;
        }
    }

    setShowComTrail(show) {
        this.showComTrail = show;
        if (!show && this.comTrailLine) {
            this.scene.remove(this.comTrailLine);
            this.comTrailLine.geometry.dispose();
            this.comTrailLine = null;
            this.comTrail = [];
        }
    }

    clearComTrail() {
        if (this.comTrailLine) {
            this.scene.remove(this.comTrailLine);
            this.comTrailLine.geometry.dispose();
            this.comTrailLine = null;
        }
        this.comTrail = [];
    }

    onMouseMove(event) {
        // Update mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onMouseWheel(event) {
        event.preventDefault();
        
        // Calculate world position under mouse before zoom
        const zoomSpeed = 0.003;
        const distanceBefore = this.camera.position.length();
        
        // Get world point under mouse before zoom using raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const worldPosBefore = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, worldPosBefore);
        
        // Apply zoom
        const newDistance = Math.max(4, Math.min(15, distanceBefore + event.deltaY * zoomSpeed));
        const zoomRatio = newDistance / distanceBefore;
        
        // Update camera distance
        const direction = this.camera.position.clone().normalize();
        this.camera.position.copy(direction.multiplyScalar(newDistance));
        
        // Update controls target distance
        const targetDistance = this.controls.target.clone().length();
        const newTargetDistance = Math.max(4, Math.min(15, targetDistance + event.deltaY * zoomSpeed));
        const targetZoomRatio = newTargetDistance / targetDistance;
        this.controls.target.multiplyScalar(targetZoomRatio);
        
        // Calculate world position under mouse after zoom
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const worldPosAfter = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, worldPosAfter);
        
        // Adjust camera target to keep world point under cursor
        const diff = worldPosBefore.clone().sub(worldPosAfter);
        this.camera.position.add(diff);
        this.controls.target.add(diff);
        
        this.controls.update();
    }

    resetCamera() {
        this.camera.position.set(0, 0, 8);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    render() {
        // Handle keyboard panning (only when not tracking bucket)
        if (!this.trackBucket) {
            this.handleKeyboardPanning();
        }
        
        // Bucket tracking - follow a specific bucket
        if (this.trackBucket && this.buckets.length > 0 && this.buckets[this.trackedBucketIndex]) {
            const bucket = this.buckets[this.trackedBucketIndex];
            // Smoothly move camera to follow the bucket
            const targetPos = bucket.position.clone();
            
            // Camera follows from a offset position
            const offset = new THREE.Vector3(0, 0, 5);
            const cameraTarget = targetPos.clone().add(offset);
            
            // Smooth camera transition
            this.camera.position.lerp(cameraTarget, 0.05);
            this.controls.target.lerp(targetPos, 0.05);
        }
        
        // Update controls
        this.controls.update();

        // Calculate FPS
        const currentTime = Date.now();
        this.frameCount++;
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }

        // Render scene
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

    dispose() {
        // Clean up resources
        if (this.wheel) {
            this.scene.remove(this.wheel);
        }

        this.buckets.forEach(bucket => {
            bucket.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });

        this.waterDroplets.forEach(droplet => {
            this.scene.remove(droplet);
            droplet.geometry.dispose();
            droplet.material.dispose();
        });

        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
