// Automatic Labeling for Training Data
// Classifies simulation outcomes into predefined categories

class AutoLabeler {
  constructor(simulatorType, config) {
    this.simulatorType = simulatorType;
    this.config = config;
    this.labels = config.classifiers[simulatorType].labels;
  }
  
  /**
   * Automatically label a simulation based on its outcome
   * @param {Object} simulationData - Complete simulation data
   * @returns {string} Label from predefined set
   */
  label(simulationData) {
    const labeler = this.getLabelerForType(this.simulatorType);
    return labeler(simulationData);
  }
  
  /**
   * Get the appropriate labeling function
   */
  getLabelerForType(type) {
    const labelers = {
      'three-body': this.labelThreeBody.bind(this),
      'double-pendulum': this.labelDoublePendulum.bind(this),
      'lorenz-attractor': this.labelLorenz.bind(this),
      'rossler-attractor': this.labelRossler.bind(this),
      'hopalong-attractor': this.labelHopalong.bind(this),
      'double-gyre': this.labelDoubleGyre.bind(this),
      'lid-cavity': this.labelLidCavity.bind(this),
      'malkus-waterwheel': this.labelMalkusWaterwheel.bind(this),
      'turbulent-jet': this.labelTurbulentJet.bind(this)
    };
    
    return labelers[type] || (() => 'unknown');
  }
  
  /**
   * THREE-BODY: 'stable', 'chaotic', 'collision', 'escape'
   */
  labelThreeBody(data) {
    const { trajectory, initialConditions } = data;
    
    // Check for collision
    if (this.hasCollision(trajectory)) {
      return 'collision';
    }
    
    // Check for escape (body leaves system)
    if (this.hasEscape(trajectory, initialConditions)) {
      return 'escape';
    }
    
    // Estimate Lyapunov exponent for chaos detection
    const lyapunov = this.estimateLyapunovExponent(trajectory);
    
    if (lyapunov > 0.1) {
      return 'chaotic';
    } else {
      return 'stable';
    }
  }
  
  /**
   * DOUBLE PENDULUM: 'periodic', 'chaotic', 'resonant'
   */
  labelDoublePendulum(data) {
    const { trajectory } = data;
    
    // Analyze angular motion patterns
    const periodicity = this.detectPeriodicity(trajectory);
    const resonance = this.detectResonance(trajectory);
    
    if (resonance > 0.8) {
      return 'resonant';
    } else if (periodicity > 0.7) {
      return 'periodic';
    } else {
      return 'chaotic';
    }
  }
  
  /**
   * LORENZ: 'transient', 'attractor', 'divergent'
   */
  labelLorenz(data) {
    const { trajectory, parameters } = data;
    
    // Check if trajectory settles on attractor
    const onAttractor = this.isOnAttractor(trajectory);
    
    if (onAttractor) {
      return 'attractor';
    }
    
    // Check for divergence
    const finalPosition = trajectory[trajectory.length - 1];
    const distance = Math.sqrt(
      finalPosition.x**2 + finalPosition.y**2 + finalPosition.z**2
    );
    
    if (distance > 100) {
      return 'divergent';
    }
    
    return 'transient';
  }
  
  /**
   * RÖSSLER: 'limit_cycle', 'strange_attractor', 'wandering'
   */
  labelRossler(data) {
    const { trajectory } = data;
    
    // Analyze trajectory structure
    const cycleDetected = this.detectLimitCycle(trajectory);
    const strangeAttractor = this.hasStrangeAttractor(trajectory);
    
    if (cycleDetected) {
      return 'limit_cycle';
    } else if (strangeAttractor) {
      return 'strange_attractor';
    } else {
      return 'wandering';
    }
  }
  
  /**
   * HOPALONG: 'regular', 'chaotic', 'bounded', 'unbounded'
   */
  labelHopalong(data) {
    const { trajectory } = data;
    
    // Check bounds
    const bounds = this.getBounds(trajectory);
    const maxDim = Math.max(
      bounds.xmax - bounds.xmin,
      bounds.ymax - bounds.ymin
    );
    
    if (maxDim > 1000) {
      return 'unbounded';
    }
    
    // Check for regularity
    const regularity = this.measureRegularity(trajectory);
    
    if (regularity > 0.7) {
      return 'regular';
    } else if (regularity > 0.3) {
      return 'bounded';
    } else {
      return 'chaotic';
    }
  }
  
  /**
   * DOUBLE GYRE: 'laminar', 'transitional', 'turbulent'
   */
  labelDoubleGyre(data) {
    const { trajectory, parameters } = data;
    
    const Re = parameters.reynoldsNumber || 100;
    
    if (Re < 2000) {
      return 'laminar';
    } else if (Re < 4000) {
      return 'transitional';
    } else {
      return 'turbulent';
    }
  }
  
  /**
   * LID CAVITY: 'steady', 'oscillatory', 'turbulent'
   */
  labelLidCavity(data) {
    const { trajectory, parameters } = data;
    
    const Re = parameters.reynoldsNumber || 100;
    const oscillations = this.detectFlowOscillations(trajectory);
    
    if (Re > 10000) {
      return 'turbulent';
    } else if (oscillations) {
      return 'oscillatory';
    } else {
      return 'steady';
    }
  }
  
  /**
   * MALKUS: 'continuous', 'periodic', 'chaotic', 'stopped'
   */
  labelMalkusWaterwheel(data) {
    const { trajectory } = data;
    
    // Check if wheel stopped
    const finalSpeed = this.getFinalAngularVelocity(trajectory);
    if (Math.abs(finalSpeed) < 0.01) {
      return 'stopped';
    }
    
    // Check motion pattern
    const reversals = this.countDirectionReversals(trajectory);
    const periodicity = this.detectPeriodicity(trajectory);
    
    if (reversals > 5 && periodicity < 0.3) {
      return 'chaotic';
    } else if (periodicity > 0.6) {
      return 'periodic';
    } else {
      return 'continuous';
    }
  }
  
  /**
   * TURBULENT JET: 'laminar', 'transitional', 'fully_turbulent'
   */
  labelTurbulentJet(data) {
    const { trajectory, parameters } = data;
    
    const Re = parameters.reynoldsNumber || 1000;
    const turbulenceIntensity = this.measureTurbulenceIntensity(trajectory);
    
    if (Re < 2300) {
      return 'laminar';
    } else if (Re < 4000 || turbulenceIntensity < 0.1) {
      return 'transitional';
    } else {
      return 'fully_turbulent';
    }
  }
  
  // ==================== Helper Methods ====================
  
  hasCollision(trajectory, threshold = 0.1) {
    for (const state of trajectory) {
      if (!state.positions) continue;
      
      // Check all pairs of bodies
      for (let i = 0; i < state.positions.length; i++) {
        for (let j = i + 1; j < state.positions.length; j++) {
          const dist = this.distance3D(
            state.positions[i],
            state.positions[j]
          );
          
          if (dist < threshold) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  hasEscape(trajectory, initialConditions, escapeRadius = 50) {
    if (!trajectory || trajectory.length === 0) return false;
    
    const finalState = trajectory[trajectory.length - 1];
    
    if (!finalState.positions) return false;
    
    // Check if any body is beyond escape radius
    for (const pos of finalState.positions) {
      const dist = Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2);
      
      if (dist > escapeRadius) {
        return true;
      }
    }
    
    return false;
  }
  
  estimateLyapunovExponent(trajectory) {
    if (trajectory.length < 200) return 0;
    
    // Sample divergence at multiple time points
    const divergences = [];
    const step = Math.floor(trajectory.length / 10);
    
    for (let i = step; i < trajectory.length - step; i += step) {
      const early = trajectory[i];
      const late = trajectory[i + step];
      
      const div = this.stateDivergence(early, late);
      divergences.push(div);
    }
    
    // Estimate Lyapunov from average divergence growth
    const avgGrowth = divergences.reduce((a, b) => a + b, 0) / divergences.length;
    return Math.log(avgGrowth + 1) / step;
  }
  
  detectPeriodicity(trajectory) {
    if (trajectory.length < 100) return 0;
    
    // Simple autocorrelation approach
    const values = this.extractPrimaryVariable(trajectory);
    const autocorr = this.autocorrelation(values, Math.floor(values.length / 4));
    
    // Find secondary peaks in autocorrelation
    let maxPeak = 0;
    for (let lag = 5; lag < autocorr.length; lag++) {
      maxPeak = Math.max(maxPeak, autocorr[lag]);
    }
    
    return maxPeak;
  }
  
  detectResonance(trajectory) {
    // Check for specific frequency ratios
    // Simplified: measure correlation between theta1 and theta2
    if (trajectory.length < 100) return 0;
    
    const theta1s = trajectory.map(s => s.theta1 || 0);
    const theta2s = trajectory.map(s => s.theta2 || 0);
    
    return Math.abs(this.correlation(theta1s, theta2s));
  }
  
  isOnAttractor(trajectory, window = 100) {
    if (trajectory.length < window * 2) return false;
    
    // Check if trajectory stays in bounded region
    const recent = trajectory.slice(-window);
    const bounds = this.getBounds(recent);
    
    const size = Math.max(
      bounds.xmax - bounds.xmin,
      bounds.ymax - bounds.ymin,
      (bounds.zmax || 0) - (bounds.zmin || 0)
    );
    
    // Attractor should be bounded
    return size < 50;
  }
  
  detectLimitCycle(trajectory) {
    // Check for repeating patterns
    const periodicity = this.detectPeriodicity(trajectory);
    return periodicity > 0.8;
  }
  
  hasStrangeAttractor(trajectory) {
    // Check for bounded but non-periodic behavior
    const bounded = this.isOnAttractor(trajectory);
    const periodic = this.detectPeriodicity(trajectory) > 0.7;
    
    return bounded && !periodic;
  }
  
  measureRegularity(trajectory) {
    if (trajectory.length < 100) return 0;
    
    // Measure how uniform the point distribution is
    const xs = trajectory.map(p => p.x);
    const ys = trajectory.map(p => p.y);
    
    const xStd = this.std(xs);
    const yStd = this.std(ys);
    
    // More uniform distribution = higher regularity
    return 1 / (1 + xStd + yStd);
  }
  
  detectFlowOscillations(trajectory) {
    // Detect temporal oscillations in flow field
    const periodicity = this.detectPeriodicity(trajectory);
    return periodicity > 0.5;
  }
  
  getFinalAngularVelocity(trajectory) {
    if (trajectory.length === 0) return 0;
    
    const recent = trajectory.slice(-10);
    const velocities = recent.map(s => s.omega || s.angularVelocity || 0);
    
    return velocities.reduce((a, b) => a + b, 0) / velocities.length;
  }
  
  countDirectionReversals(trajectory) {
    if (trajectory.length < 10) return 0;
    
    let reversals = 0;
    let prevSign = Math.sign(trajectory[0].omega || 0);
    
    for (let i = 1; i < trajectory.length; i++) {
      const currSign = Math.sign(trajectory[i].omega || 0);
      
      if (currSign !== 0 && currSign !== prevSign) {
        reversals++;
        prevSign = currSign;
      }
    }
    
    return reversals;
  }
  
  measureTurbulenceIntensity(trajectory) {
    // Measure velocity fluctuations
    const velocities = this.extractVelocityMagnitude(trajectory);
    const mean = this.mean(velocities);
    const std = this.std(velocities);
    
    return std / (mean + 1e-10); // Turbulence intensity = u' / U
  }
  
  // Utility functions
  distance3D(p1, p2) {
    return Math.sqrt(
      (p1[0] - p2[0])**2 + 
      (p1[1] - p2[1])**2 + 
      (p1[2] - p2[2])**2
    );
  }
  
  stateDivergence(state1, state2) {
    // Measure distance between two states
    let sum = 0;
    let count = 0;
    
    Object.keys(state1).forEach(key => {
      if (typeof state1[key] === 'number' && typeof state2[key] === 'number') {
        sum += (state1[key] - state2[key])**2;
        count++;
      }
    });
    
    return count > 0 ? Math.sqrt(sum / count) : 0;
  }
  
  extractPrimaryVariable(trajectory) {
    // Extract most relevant variable for analysis
    if (trajectory[0].x !== undefined) {
      return trajectory.map(s => s.x);
    } else if (trajectory[0].theta1 !== undefined) {
      return trajectory.map(s => s.theta1);
    } else if (trajectory[0].omega !== undefined) {
      return trajectory.map(s => s.omega);
    } else {
      return trajectory.map((s, i) => i);
    }
  }
  
  extractVelocityMagnitude(trajectory) {
    return trajectory.map(s => {
      if (s.velocity) {
        return Math.sqrt(s.velocity[0]**2 + s.velocity[1]**2);
      } else if (s.vx !== undefined) {
        return Math.sqrt(s.vx**2 + (s.vy || 0)**2);
      } else {
        return 0;
      }
    });
  }
  
  autocorrelation(values, maxLag) {
    const n = values.length;
    const mean = this.mean(values);
    const variance = this.variance(values);
    
    const autocorr = [];
    
    for (let lag = 0; lag < maxLag; lag++) {
      let sum = 0;
      
      for (let i = 0; i < n - lag; i++) {
        sum += (values[i] - mean) * (values[i + lag] - mean);
      }
      
      autocorr.push(sum / (n - lag) / variance);
    }
    
    return autocorr;
  }
  
  correlation(arr1, arr2) {
    const n = Math.min(arr1.length, arr2.length);
    const mean1 = this.mean(arr1);
    const mean2 = this.mean(arr2);
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      
      numerator += diff1 * diff2;
      denom1 += diff1**2;
      denom2 += diff2**2;
    }
    
    return numerator / Math.sqrt(denom1 * denom2 + 1e-10);
  }
  
  getBounds(trajectory) {
    const bounds = {
      xmin: Infinity, xmax: -Infinity,
      ymin: Infinity, ymax: -Infinity,
      zmin: Infinity, zmax: -Infinity
    };
    
    trajectory.forEach(state => {
      if (state.x !== undefined) {
        bounds.xmin = Math.min(bounds.xmin, state.x);
        bounds.xmax = Math.max(bounds.xmax, state.x);
      }
      if (state.y !== undefined) {
        bounds.ymin = Math.min(bounds.ymin, state.y);
        bounds.ymax = Math.max(bounds.ymax, state.y);
      }
      if (state.z !== undefined) {
        bounds.zmin = Math.min(bounds.zmin, state.z);
        bounds.zmax = Math.max(bounds.zmax, state.z);
      }
    });
    
    return bounds;
  }
  
  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  variance(arr) {
    const m = this.mean(arr);
    return arr.reduce((sum, val) => sum + (val - m)**2, 0) / arr.length;
  }
  
  std(arr) {
    return Math.sqrt(this.variance(arr));
  }
}

module.exports = AutoLabeler;
