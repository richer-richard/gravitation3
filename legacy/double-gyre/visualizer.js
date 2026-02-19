/**
 * Canvas Visualizer for Double-Gyre Flow
 * 2D visualization of ocean-like circulation patterns
 */

class DoubleGyreVisualizer {
    constructor(canvasId, containerWidth, containerHeight) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Display settings
        this.showFlowField = true;
        this.showStreamlines = false;
        this.showParticles = true;
        this.showVorticity = false;
        this.particleSize = 2;
        
        // Domain dimensions (logical)
        this.domainWidth = 2;
        this.domainHeight = 1;
        
        // Animation
        this.frameCount = 0;
        this.fps = 120;
        this.lastFrameTime = Date.now();
        
        this.resize(containerWidth, containerHeight);
    }

    resize(width, height) {
        // Set canvas size with device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.scale(dpr, dpr);
        
        this.width = width;
        this.height = height;
        
        // Calculate scale factors
        this.scaleX = width / this.domainWidth;
        this.scaleY = height / this.domainHeight;
    }

    /**
     * Convert from simulation coordinates to canvas coordinates
     */
    toCanvasX(x) {
        return x * this.scaleX;
    }

    toCanvasY(y) {
        return this.height - y * this.scaleY; // Flip y-axis
    }

    /**
     * Draw background gradient
     */
    drawBackground() {
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width * 0.8
        );
        gradient.addColorStop(0, '#0f1d3a');
        gradient.addColorStop(1, '#050812');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Draw flow field as arrows
     */
    drawFlowField(flowField) {
        if (!this.showFlowField || !flowField) return;
        
        const arrowSize = 8;
        const arrowSpacing = Math.max(this.width, this.height) / 30;
        
        flowField.forEach(point => {
            const canvasX = this.toCanvasX(point.x);
            const canvasY = this.toCanvasY(point.y);
            
            // Skip if outside visible area or too close to edge
            if (canvasX < 0 || canvasX > this.width || canvasY < 0 || canvasY > this.height) {
                return;
            }
            
            // Calculate arrow direction and magnitude
            const magnitude = Math.sqrt(point.u * point.u + point.v * point.v);
            if (magnitude < 0.001) return;
            
            const angle = Math.atan2(-point.v, point.u); // Negative v because canvas y is flipped
            
            // Color based on magnitude
            const intensity = Math.min(magnitude * 3, 1);
            const hue = 200 + intensity * 60; // Blue to cyan
            this.ctx.strokeStyle = `hsla(${hue}, 70%, ${50 + intensity * 20}%, ${0.4 + intensity * 0.3})`;
            this.ctx.lineWidth = 1 + intensity;
            
            // Draw arrow
            this.ctx.save();
            this.ctx.translate(canvasX, canvasY);
            this.ctx.rotate(angle);
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(arrowSize * (0.5 + intensity * 0.5), 0);
            this.ctx.stroke();
            
            // Arrowhead
            this.ctx.beginPath();
            this.ctx.moveTo(arrowSize * (0.5 + intensity * 0.5), 0);
            this.ctx.lineTo(arrowSize * (0.3 + intensity * 0.3), -3);
            this.ctx.lineTo(arrowSize * (0.3 + intensity * 0.3), 3);
            this.ctx.closePath();
            this.ctx.fillStyle = this.ctx.strokeStyle;
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    /**
     * Draw vorticity field as colored regions
     */
    drawVorticity(vorticityField) {
        if (!this.showVorticity || !vorticityField) return;
        
        // Find min and max vorticity for normalization
        let minOmega = Infinity;
        let maxOmega = -Infinity;
        vorticityField.forEach(v => {
            minOmega = Math.min(minOmega, v.omega);
            maxOmega = Math.max(maxOmega, v.omega);
        });
        
        const range = Math.max(Math.abs(minOmega), Math.abs(maxOmega));
        if (range < 0.001) return;
        
        // Draw vorticity as colored cells
        const cellSize = this.width / 30;
        
        vorticityField.forEach(v => {
            const canvasX = this.toCanvasX(v.x);
            const canvasY = this.toCanvasY(v.y);
            
            // Normalize vorticity to [-1, 1]
            const normalized = v.omega / range;
            
            // Color: red for positive (clockwise), blue for negative (counter-clockwise)
            let color;
            if (normalized > 0) {
                color = `rgba(255, 100, 100, ${Math.abs(normalized) * 0.5})`;
            } else {
                color = `rgba(100, 150, 255, ${Math.abs(normalized) * 0.5})`;
            }
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                canvasX - cellSize / 2,
                canvasY - cellSize / 2,
                cellSize,
                cellSize
            );
        });
    }

    /**
     * Draw particles
     */
    drawParticles(particles) {
        if (!this.showParticles) return;
        
        particles.forEach(particle => {
            if (!particle.active) return;
            
            const canvasX = this.toCanvasX(particle.x);
            const canvasY = this.toCanvasY(particle.y);
            
            // Draw particle trail with fade effect
            if (particle.trail.length > 1) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = particle.color;
                this.ctx.lineWidth = 1;
                
                for (let i = 0; i < particle.trail.length - 1; i++) {
                    const alpha = (i / particle.trail.length) * 0.3;
                    const p1 = particle.trail[i];
                    const p2 = particle.trail[i + 1];
                    
                    const x1 = this.toCanvasX(p1.x);
                    const y1 = this.toCanvasY(p1.y);
                    const x2 = this.toCanvasX(p2.x);
                    const y2 = this.toCanvasY(p2.y);
                    
                    this.ctx.globalAlpha = alpha;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                }
                
                this.ctx.globalAlpha = 1;
            }
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(canvasX, canvasY, this.particleSize, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
            
            // Add glow effect
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = particle.color;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    /**
     * Draw streamlines
     */
    drawStreamlines(simulator) {
        if (!this.showStreamlines) return;
        
        const numStreamlines = 15;
        const maxSteps = 200;
        const stepSize = 0.01;
        
        for (let i = 0; i < numStreamlines; i++) {
            // Start position
            let x = Math.random() * this.domainWidth;
            let y = Math.random() * this.domainHeight;
            
            const hue = (i / numStreamlines) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.4)`;
            this.ctx.lineWidth = 1.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.toCanvasX(x), this.toCanvasY(y));
            
            // Trace streamline
            for (let step = 0; step < maxSteps; step++) {
                const vel = simulator.getVelocity(x, y, simulator.time);
                const mag = Math.sqrt(vel.u * vel.u + vel.v * vel.v);
                
                if (mag < 0.001) break;
                
                x += vel.u * stepSize / mag * 0.01;
                y += vel.v * stepSize / mag * 0.01;
                
                // Check boundaries
                if (x < 0 || x > this.domainWidth || y < 0 || y > this.domainHeight) {
                    break;
                }
                
                this.ctx.lineTo(this.toCanvasX(x), this.toCanvasY(y));
            }
            
            this.ctx.stroke();
        }
    }

    /**
     * Main render function
     */
    render(simulator) {
        // Clear and draw background
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();
        
        // Draw vorticity field (if enabled)
        if (this.showVorticity) {
            const vorticityField = simulator.getVorticityField();
            this.drawVorticity(vorticityField);
        }
        
        // Draw flow field
        this.drawFlowField(simulator.flowField);
        
        // Draw streamlines (if enabled)
        if (this.showStreamlines) {
            this.drawStreamlines(simulator);
        }
        
        // Draw particles
        this.drawParticles(simulator.particles);
        
        // Calculate FPS
        const currentTime = Date.now();
        this.frameCount++;
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
    }

    getFPS() {
        return this.fps;
    }

    setShowFlowField(show) {
        this.showFlowField = show;
    }

    setShowStreamlines(show) {
        this.showStreamlines = show;
    }

    setShowParticles(show) {
        this.showParticles = show;
    }

    setShowVorticity(show) {
        this.showVorticity = show;
    }

    setParticleSize(size) {
        this.particleSize = size;
    }

    dispose() {
        // Clean up resources
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}
