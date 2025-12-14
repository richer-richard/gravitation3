/**
 * Three.js Visualizer for Three-Body Simulation
 * Professional 3D rendering with trails and effects
 */

class ThreeBodyVisualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Visual elements
        this.bodyMeshes = [];
        this.trails = [];
        this.velocityArrows = [];
        this.gridHelper = null;
        this.stars = null;
        
        // Settings
        this.trailLength = 2000;
        this.showTrails = true;
        this.retainTrails = true;
        this.showVelocities = false;
        this.centerOnMass = false;
        
        // Animation
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.fps = 60;
        
        // Dragging
        this.isDragging = false;
        this.dragBodyIndex = -1;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        
        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
        // Remove fog to keep objects visible when zoomed out

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 3, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // keep frame pixels for screenshots
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 50;
        this.controls.enablePan = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0xffffff, 1, 100);
        pointLight1.position.set(10, 10, 10);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x4488ff, 0.5, 100);
        pointLight2.position.set(-10, -10, -10);
        this.scene.add(pointLight2);

        // Grid helper
        this.gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.gridHelper.material.opacity = 0.2;
        this.gridHelper.material.transparent = true;
        this.scene.add(this.gridHelper);

        // Starfield background
        this.createStarfield();

        // Keyboard controls for camera panning
        this.keyState = {};
        this.panSpeed = 0.05;
        
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

    createStarfield() {
        if (this.stars) {
            this.scene.remove(this.stars);
        }

        const layers = [
            { count: 1200, minRadius: 200, maxRadius: 400 },
            { count: 1500, minRadius: 400, maxRadius: 800 },
            { count: 2000, minRadius: 800, maxRadius: 1400 }
        ];

        const starsVertices = [];
        layers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                const direction = new THREE.Vector3(
                    THREE.MathUtils.randFloatSpread(2),
                    THREE.MathUtils.randFloatSpread(2),
                    THREE.MathUtils.randFloatSpread(2)
                ).normalize();

                const radius = THREE.MathUtils.randFloat(layer.minRadius, layer.maxRadius);
                starsVertices.push(
                    direction.x * radius,
                    direction.y * radius,
                    direction.z * radius
                );
            }
        });

        const starsGeometry = new THREE.BufferGeometry();
        starsGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(starsVertices, 3)
        );
        starsGeometry.computeBoundingSphere();

        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.12,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });

        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }

    createBodies(bodies) {
        // Remove existing bodies
        this.bodyMeshes.forEach(mesh => this.scene.remove(mesh));
        this.bodyMeshes = [];
        this.trails = [];
        this.velocityArrows = [];

        // Create new bodies
        bodies.forEach((body, index) => {
            // Body sphere with glow effect
            const geometry = new THREE.SphereGeometry(0.15, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: body.color,
                emissive: body.color,
                emissiveIntensity: 0.5,
                shininess: 100,
                specular: 0xffffff
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // Add outer glow
            const glowGeometry = new THREE.SphereGeometry(0.25, 32, 32);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: body.color,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            mesh.add(glow);
            
            this.scene.add(mesh);
            this.bodyMeshes.push(mesh);

            // Create trail with reusable buffer geometry
            const trailGeometry = new THREE.BufferGeometry();
            const positionArray = new Float32Array(this.trailLength * 3);
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
            trailGeometry.setDrawRange(0, 0); // Start with no points drawn
            
            const trail = {
                positions: [],
                maxLength: this.trailLength,
                line: null,
                geometry: trailGeometry,
                positionArray: positionArray,
                material: new THREE.LineBasicMaterial({
                    color: body.color,
                    transparent: true,
                    opacity: 0.6,
                    linewidth: 2,
                    blending: THREE.AdditiveBlending
                }),
                initialized: false
            };
            
            // Create the line mesh once
            trail.line = new THREE.Line(trail.geometry, trail.material);
            this.scene.add(trail.line);
            
            this.trails.push(trail);

            // Create velocity arrow
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, 0, 0),
                1,
                body.color,
                0.2,
                0.1
            );
            arrow.visible = this.showVelocities;
            this.scene.add(arrow);
            this.velocityArrows.push(arrow);
        });
    }

    updateBodies(bodies) {
        bodies.forEach((body, index) => {
            const mesh = this.bodyMeshes[index];
            if (!mesh) return;

            // Update position
            mesh.position.set(body.position.x, body.position.y, body.position.z);

            // Update trail
            const trail = this.trails[index];
            
            // Only add positions if we're retaining trails
            if (this.retainTrails) {
                trail.positions.push(body.position.copy());
                
                // Limit trail length
                if (trail.positions.length > trail.maxLength) {
                    trail.positions.shift();
                }
            }

            // Update trail line using buffer optimization
            if (this.showTrails && this.retainTrails && trail.positions.length > 0) {
                if (trail.line && !trail.line.parent) {
                    this.scene.add(trail.line);
                }
                
                // Update buffer values instead of recreating geometry
                const positionArray = trail.positionArray;
                for (let j = 0; j < trail.positions.length; j++) {
                    const point = trail.positions[j];
                    positionArray[j * 3] = point.x;
                    positionArray[j * 3 + 1] = point.y;
                    positionArray[j * 3 + 2] = point.z;
                }
                
                // Mark buffer as needing update
                trail.geometry.attributes.position.needsUpdate = true;
                
                // Update draw range to show only active points
                trail.geometry.setDrawRange(0, trail.positions.length);
            } else if (trail.line && trail.line.parent) {
                this.scene.remove(trail.line);
            }

            // Update velocity arrow
            const arrow = this.velocityArrows[index];
            if (arrow && this.showVelocities) {
                const vel = body.velocity;
                const speed = vel.magnitude();
                if (speed > 0.001) {
                    const dir = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
                    arrow.setDirection(dir);
                    arrow.setLength(speed * 0.5, 0.2, 0.1);
                    arrow.position.copy(mesh.position);
                    arrow.visible = true;
                } else {
                    arrow.visible = false;
                }
            } else if (arrow) {
                arrow.visible = false;
            }
        });

        // Center camera on center of mass if enabled
        if (this.centerOnMass && bodies.length > 0) {
            let totalMass = 0;
            let com = new Vector3D();
            bodies.forEach(body => {
                com = com.add(body.position.multiply(body.mass));
                totalMass += body.mass;
            });
            com = com.multiply(1 / totalMass);
            
            this.controls.target.set(com.x, com.y, com.z);
        }
    }

    clearTrails() {
        this.trails.forEach(trail => {
            trail.positions = [];
            if (trail.geometry && trail.geometry.attributes && trail.geometry.attributes.position) {
                const positionAttr = trail.geometry.attributes.position;
                if (positionAttr.array && positionAttr.array.fill) {
                    positionAttr.array.fill(0);
                }
                positionAttr.needsUpdate = true;
                trail.geometry.setDrawRange(0, 0);
            }
        });
    }

    setTrailLength(length) {
        this.trailLength = length;
        this.trails.forEach(trail => {
            trail.maxLength = length;
            if (trail.positions.length > length) {
                trail.positions = trail.positions.slice(-length);
            }
        });
    }

    setShowTrails(show) {
        this.showTrails = show;
        this.trails.forEach(trail => {
            if (show) {
                if (!trail.line && trail.geometry && trail.material) {
                    trail.line = new THREE.Line(trail.geometry, trail.material);
                }
                if (trail.line && !trail.line.parent) {
                    this.scene.add(trail.line);
                }
                if (trail.geometry && trail.geometry.attributes && trail.geometry.attributes.position) {
                    trail.geometry.setDrawRange(0, trail.positions.length);
                    trail.geometry.attributes.position.needsUpdate = true;
                }
            } else if (trail.line && trail.line.parent) {
                this.scene.remove(trail.line);
            }
        });
    }

    setShowVelocities(show) {
        this.showVelocities = show;
        this.velocityArrows.forEach(arrow => {
            arrow.visible = show;
        });
    }

    setCenterOnMass(center) {
        this.centerOnMass = center;
        if (!center) {
            this.controls.target.set(0, 0, 0);
        }
    }

    setRetainTrails(retain) {
        this.retainTrails = retain;
        
        // If not retaining trails, clear them completely and remove from scene
        if (!retain) {
            this.trails.forEach(trail => {
                trail.positions = [];
                // Remove trail line from scene
                if (trail.line && trail.line.parent) {
                    this.scene.remove(trail.line);
                }
                // Reset geometry completely
                if (trail.geometry && trail.geometry.attributes && trail.geometry.attributes.position) {
                    const positionAttr = trail.geometry.attributes.position;
                    if (positionAttr.array && positionAttr.array.fill) {
                        positionAttr.array.fill(0);
                    }
                    positionAttr.needsUpdate = true;
                    trail.geometry.setDrawRange(0, 0);
                }
            });
        }
    }

    render() {
        // Handle keyboard panning
        this.handleKeyboardPanning();
        
        // Update controls
        this.controls.update();

        // Slowly rotate starfield
        if (this.stars) {
            this.stars.rotation.y += 0.0001;
        }

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

    takeScreenshot() {
        // Render a fresh frame so the buffer contains the latest state
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    enableDragging(bodyIndex) {
        this.isDragging = true;
        this.dragBodyIndex = bodyIndex;
        this.controls.enabled = false;
        
        // Highlight the draggable body
        if (this.bodyMeshes[bodyIndex]) {
            this.bodyMeshes[bodyIndex].material.emissiveIntensity = 1.0;
        }
        
        // Bind event handlers
        this.onMouseMoveBound = (e) => this.onMouseMove(e);
        this.onMouseUpBound = () => this.disableDragging();
        
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMoveBound);
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUpBound);
        this.renderer.domElement.style.cursor = 'move';
    }

    disableDragging() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Reset highlight
        if (this.dragBodyIndex >= 0 && this.bodyMeshes[this.dragBodyIndex]) {
            this.bodyMeshes[this.dragBodyIndex].material.emissiveIntensity = 0.5;
        }
        
        this.dragBodyIndex = -1;
        this.controls.enabled = true;
        
        // Remove event listeners
        if (this.onMouseMoveBound) {
            this.renderer.domElement.removeEventListener('mousemove', this.onMouseMoveBound);
        }
        if (this.onMouseUpBound) {
            this.renderer.domElement.removeEventListener('mouseup', this.onMouseUpBound);
        }
        
        this.renderer.domElement.style.cursor = 'default';
    }

    onMouseMove(event) {
        if (!this.isDragging || this.dragBodyIndex < 0) return;
        
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate intersection with drag plane
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        
        // Update body mesh position
        if (this.bodyMeshes[this.dragBodyIndex]) {
            this.bodyMeshes[this.dragBodyIndex].position.copy(intersection);
            
            // Update simulator body position if app is available
            if (window.app && window.app.simulator.bodies[this.dragBodyIndex]) {
                window.app.simulator.bodies[this.dragBodyIndex].position.x = intersection.x;
                window.app.simulator.bodies[this.dragBodyIndex].position.y = intersection.y;
                window.app.simulator.bodies[this.dragBodyIndex].position.z = intersection.z;
                
                window.app.simulator.initialBodies[this.dragBodyIndex].position.x = intersection.x;
                window.app.simulator.initialBodies[this.dragBodyIndex].position.y = intersection.y;
                window.app.simulator.initialBodies[this.dragBodyIndex].position.z = intersection.z;
                
                // Update position inputs
                const inputs = document.querySelectorAll(`.pos-input[data-index="${this.dragBodyIndex}"]`);
                inputs.forEach(input => {
                    const axis = input.dataset.axis;
                    input.value = intersection[axis].toFixed(3);
                });
            }
        }
    }

    removeBody(index) {
        // Remove mesh
        if (this.bodyMeshes[index]) {
            const mesh = this.bodyMeshes[index];
            mesh.geometry.dispose();
            mesh.material.dispose();
            // Also dispose of glow
            if (mesh.children[0]) {
                mesh.children[0].geometry.dispose();
                mesh.children[0].material.dispose();
            }
            this.scene.remove(mesh);
            this.bodyMeshes.splice(index, 1);
        }
        
        // Remove trail - completely clean it up
        if (this.trails[index]) {
            const trail = this.trails[index];
            // Clear trail positions
            trail.positions = [];
            // Remove line from scene if it exists
            if (trail.line && trail.line.parent) {
                this.scene.remove(trail.line);
            }
            // Dispose of geometry
            if (trail.geometry) {
                trail.geometry.dispose();
            }
            // Dispose of material
            if (trail.material) {
                trail.material.dispose();
            }
            // Clear reference
            trail.line = null;
            this.trails.splice(index, 1);
        }
        
        // Remove velocity arrow
        if (this.velocityArrows[index]) {
            this.scene.remove(this.velocityArrows[index]);
            this.velocityArrows.splice(index, 1);
        }
    }

    createExplosion(collisionData) {
        const { position, body1, body2, combinedMass } = collisionData;
        
        // Create particle explosion effect
        const particleCount = 50;
        const particles = new THREE.Group();
        
        // Mix colors of colliding bodies
        const color1 = new THREE.Color(body1.color);
        const color2 = new THREE.Color(body2.color);
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
            
            // Blend colors for variety
            const t = Math.random();
            const particleColor = new THREE.Color().lerpColors(color1, color2, t);
            
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position at collision point
            particle.position.set(position.x, position.y, position.z);
            
            // Random velocity for explosion effect
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 0.5 + Math.random() * 1.5;
            
            particle.userData.velocity = {
                x: speed * Math.sin(phi) * Math.cos(theta),
                y: speed * Math.sin(phi) * Math.sin(theta),
                z: speed * Math.cos(phi)
            };
            
            particle.userData.lifetime = 0;
            particle.userData.maxLifetime = 60; // frames
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Animate explosion particles
        const animateExplosion = () => {
            let allDead = true;
            
            particles.children.forEach(particle => {
                if (particle.userData.lifetime < particle.userData.maxLifetime) {
                    allDead = false;
                    
                    // Update position
                    particle.position.x += particle.userData.velocity.x * 0.02;
                    particle.position.y += particle.userData.velocity.y * 0.02;
                    particle.position.z += particle.userData.velocity.z * 0.02;
                    
                    // Apply gravity/drag
                    particle.userData.velocity.y -= 0.005;
                    particle.userData.velocity.x *= 0.98;
                    particle.userData.velocity.y *= 0.98;
                    particle.userData.velocity.z *= 0.98;
                    
                    // Fade out
                    const lifeRatio = particle.userData.lifetime / particle.userData.maxLifetime;
                    particle.material.opacity = 1.0 - lifeRatio;
                    particle.scale.setScalar(1.0 - lifeRatio * 0.5);
                    
                    particle.userData.lifetime++;
                }
            });
            
            if (allDead) {
                // Clean up
                particles.children.forEach(particle => {
                    particle.geometry.dispose();
                    particle.material.dispose();
                });
                this.scene.remove(particles);
            } else {
                requestAnimationFrame(animateExplosion);
            }
        };
        
        animateExplosion();
        
        // Create burst ring effect
        const ringGeometry = new THREE.RingGeometry(0.1, 0.15, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(position.x, position.y, position.z);
        ring.lookAt(this.camera.position);
        this.scene.add(ring);
        
        // Animate ring expansion
        let ringLife = 0;
        const maxRingLife = 30;
        const animateRing = () => {
            if (ringLife < maxRingLife) {
                ringLife++;
                const progress = ringLife / maxRingLife;
                
                // Expand ring
                ring.scale.setScalar(1 + progress * 3);
                
                // Fade out
                ring.material.opacity = 0.8 * (1 - progress);
                
                requestAnimationFrame(animateRing);
            } else {
                // Clean up ring
                ring.geometry.dispose();
                ring.material.dispose();
                this.scene.remove(ring);
            }
        };
        
        animateRing();
        
        console.log(`💥 Collision! ${body1.name} + ${body2.name} merged (total mass: ${combinedMass.toFixed(2)})`);
    }

    dispose() {
        // Clean up resources
        this.disableDragging();
        
        this.bodyMeshes.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.scene.remove(mesh);
        });

        this.trails.forEach(trail => {
            if (trail.line) {
                trail.geometry.dispose();
                trail.material.dispose();
                this.scene.remove(trail.line);
            }
        });

        this.velocityArrows.forEach(arrow => {
            this.scene.remove(arrow);
        });

        if (this.stars) {
            this.stars.geometry.dispose();
            this.stars.material.dispose();
            this.scene.remove(this.stars);
        }

        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
        }

        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
