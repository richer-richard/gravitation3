/**
 * Trail Management Utility for Simulations
 * Provides efficient, consistent trail rendering with circular buffer
 * and automatic decimation for performance
 */

class TrailManager {
    constructor(maxLength = 2000, decimationThreshold = 5000) {
        this.maxLength = maxLength;
        this.decimationThreshold = decimationThreshold;
        this.trails = new Map(); // id -> trail data
        this.autoDecimate = true;
    }

    /**
     * Create a new trail
     */
    createTrail(id, color = 0xffffff, opacity = 0.6) {
        const trail = {
            id: id,
            positions: [],
            color: color,
            opacity: opacity,
            active: true,
            lineObject: null,
            geometry: null,
            material: null
        };
        this.trails.set(id, trail);
        return trail;
    }

    /**
     * Add a point to a trail (circular buffer implementation)
     */
    addPoint(id, x, y, z) {
        const trail = this.trails.get(id);
        if (!trail) return;

        trail.positions.push({ x, y, z });

        // Limit trail length using circular buffer
        if (trail.positions.length > this.maxLength) {
            trail.positions.shift();
        }

        // Auto-decimate if trail gets too long and performance degrades
        if (this.autoDecimate && trail.positions.length > this.decimationThreshold) {
            this.decimateTrail(id);
        }
    }

    /**
     * Decimate trail by keeping every nth point
     */
    decimateTrail(id, factor = 2) {
        const trail = this.trails.get(id);
        if (!trail) return;

        const decimated = trail.positions.filter((_, index) => index % factor === 0);
        trail.positions = decimated;
    }

    /**
     * Get trail positions as Three.js Vector3 array
     */
    getThreeJSPoints(id) {
        const trail = this.trails.get(id);
        if (!trail || trail.positions.length === 0) return [];

        return trail.positions.map(p => new THREE.Vector3(p.x, p.y, p.z));
    }

    /**
     * Update Three.js line object for a trail
     */
    updateThreeJSLine(id, scene) {
        const trail = this.trails.get(id);
        if (!trail || !trail.active) return;

        // Remove old line if it exists
        if (trail.lineObject) {
            scene.remove(trail.lineObject);
            if (trail.geometry) trail.geometry.dispose();
            trail.lineObject = null;
        }

        // Create new line if there are enough points
        if (trail.positions.length < 2) return;

        const points = this.getThreeJSPoints(id);
        trail.geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        if (!trail.material) {
            trail.material = new THREE.LineBasicMaterial({
                color: trail.color,
                transparent: true,
                opacity: trail.opacity,
                linewidth: 2,
                blending: THREE.AdditiveBlending
            });
        }

        trail.lineObject = new THREE.Line(trail.geometry, trail.material);
        scene.add(trail.lineObject);
    }

    /**
     * Clear a specific trail
     */
    clearTrail(id) {
        const trail = this.trails.get(id);
        if (!trail) return;

        trail.positions = [];
        
        if (trail.lineObject && trail.lineObject.parent) {
            trail.lineObject.parent.remove(trail.lineObject);
        }
        if (trail.geometry) trail.geometry.dispose();
        
        trail.lineObject = null;
        trail.geometry = null;
    }

    /**
     * Clear all trails
     */
    clearAllTrails(scene = null) {
        this.trails.forEach((trail, id) => {
            if (scene && trail.lineObject) {
                scene.remove(trail.lineObject);
            }
            if (trail.geometry) trail.geometry.dispose();
            trail.positions = [];
            trail.lineObject = null;
            trail.geometry = null;
        });
    }

    /**
     * Remove a trail completely
     */
    removeTrail(id, scene = null) {
        const trail = this.trails.get(id);
        if (!trail) return;

        if (scene && trail.lineObject) {
            scene.remove(trail.lineObject);
        }
        if (trail.geometry) trail.geometry.dispose();
        if (trail.material) trail.material.dispose();

        this.trails.delete(id);
    }

    /**
     * Set maximum trail length
     */
    setMaxLength(length) {
        this.maxLength = length;
        
        // Trim existing trails if needed
        this.trails.forEach(trail => {
            if (trail.positions.length > length) {
                trail.positions = trail.positions.slice(-length);
            }
        });
    }

    /**
     * Set trail opacity
     */
    setOpacity(id, opacity) {
        const trail = this.trails.get(id);
        if (!trail) return;

        trail.opacity = opacity;
        if (trail.material) {
            trail.material.opacity = opacity;
        }
    }

    /**
     * Set all trails opacity
     */
    setAllOpacity(opacity) {
        this.trails.forEach((trail, id) => {
            this.setOpacity(id, opacity);
        });
    }

    /**
     * Toggle trail visibility
     */
    setTrailActive(id, active) {
        const trail = this.trails.get(id);
        if (!trail) return;

        trail.active = active;
        if (trail.lineObject) {
            trail.lineObject.visible = active;
        }
    }

    /**
     * Toggle all trails visibility
     */
    setAllTrailsActive(active) {
        this.trails.forEach((trail, id) => {
            this.setTrailActive(id, active);
        });
    }

    /**
     * Get trail count
     */
    getTrailCount() {
        return this.trails.size;
    }

    /**
     * Get total memory usage estimate (in points)
     */
    getMemoryUsage() {
        let totalPoints = 0;
        this.trails.forEach(trail => {
            totalPoints += trail.positions.length;
        });
        return totalPoints;
    }

    /**
     * Optimize all trails (decimate if needed)
     */
    optimizeAll() {
        this.trails.forEach((trail, id) => {
            if (trail.positions.length > this.decimationThreshold) {
                this.decimateTrail(id);
            }
        });
    }

    /**
     * Dispose all resources
     */
    dispose(scene = null) {
        this.trails.forEach((trail, id) => {
            if (scene && trail.lineObject) {
                scene.remove(trail.lineObject);
            }
            if (trail.geometry) trail.geometry.dispose();
            if (trail.material) trail.material.dispose();
        });
        this.trails.clear();
    }

    /**
     * Export trail data
     */
    exportTrailData(id) {
        const trail = this.trails.get(id);
        if (!trail) return null;

        return {
            id: trail.id,
            positions: trail.positions.map(p => [p.x, p.y, p.z]),
            color: trail.color,
            opacity: trail.opacity,
            length: trail.positions.length
        };
    }

    /**
     * Export all trails data
     */
    exportAllTrails() {
        const data = [];
        this.trails.forEach((trail, id) => {
            data.push(this.exportTrailData(id));
        });
        return data;
    }

    /**
     * Import trail data
     */
    importTrailData(data) {
        const trail = this.createTrail(data.id, data.color, data.opacity);
        trail.positions = data.positions.map(p => ({ x: p[0], y: p[1], z: p[2] }));
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrailManager;
}
