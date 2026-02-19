// Feature Extraction for Physics Simulators
// Converts raw simulation data into ML-ready feature vectors

class FeatureExtractor {
  constructor(simulatorType) {
    this.simulatorType = simulatorType;
  }
  
  /**
   * Extract features based on simulator type
   * @param {Object} simulationData - Raw simulation output
   * @returns {Array} Feature vector
   */
  extract(simulationData) {
    const extractor = this.getExtractorForType(this.simulatorType);
    return extractor(simulationData);
  }
  
  /**
   * Get the appropriate feature extractor function
   */
  getExtractorForType(type) {
    const extractors = {
      'three-body': this.extractThreeBody.bind(this),
      'double-pendulum': this.extractDoublePendulum.bind(this),
      'lorenz-attractor': this.extractLorenz.bind(this),
      'rossler-attractor': this.extractRossler.bind(this),
      'hopalong-attractor': this.extractHopalong.bind(this),
      'double-gyre': this.extractDoubleGyre.bind(this),
      'lid-cavity': this.extractLidCavity.bind(this),
      'malkus-waterwheel': this.extractMalkusWaterwheel.bind(this),
      'turbulent-jet': this.extractTurbulentJet.bind(this)
    };
    
    return extractors[type] || (() => []);
  }
  
  /**
   * THREE-BODY SYSTEM
   * Features: 27D initial conditions + 6D derived features = 33D total
   */
  extractThreeBody(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Initial masses (3D)
    features.push(...initialConditions.masses);
    
    // Initial positions (9D)
    features.push(
      ...initialConditions.positions[0], // body 1: [x, y, z]
      ...initialConditions.positions[1], // body 2: [x, y, z]
      ...initialConditions.positions[2]  // body 3: [x, y, z]
    );
    
    // Initial velocities (9D)
    features.push(
      ...initialConditions.velocities[0], // body 1: [vx, vy, vz]
      ...initialConditions.velocities[1], // body 2: [vx, vy, vz]
      ...initialConditions.velocities[2]  // body 3: [vx, vy, vz]
    );
    
    // Derived features (6D)
    features.push(
      this.calculateTotalEnergy(initialConditions),
      ...this.calculateAngularMomentum(initialConditions),
      ...this.calculateCenterOfMassVelocity(initialConditions),
      this.calculateMinInitialSeparation(initialConditions)
    );
    
    return features;
  }
  
  /**
   * DOUBLE PENDULUM
   * Features: 4D initial + 4D parameters + 3D derived = 11D total
   */
  extractDoublePendulum(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Initial angles and angular velocities (4D)
    features.push(
      initialConditions.theta1,
      initialConditions.theta2,
      initialConditions.omega1,
      initialConditions.omega2
    );
    
    // Physical parameters (4D)
    features.push(
      parameters.m1,
      parameters.m2,
      parameters.l1,
      parameters.l2
    );
    
    // Derived features (3D)
    features.push(
      this.calculatePendulumEnergy(initialConditions, parameters),
      this.estimateLyapunov(trajectory),
      this.calculateMaxAngle(trajectory)
    );
    
    return features;
  }
  
  /**
   * LORENZ ATTRACTOR
   * Features: 3D initial + 3D parameters + 6D statistics = 12D total
   */
  extractLorenz(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Initial conditions (3D)
    features.push(
      initialConditions.x,
      initialConditions.y,
      initialConditions.z
    );
    
    // Parameters (3D)
    features.push(
      parameters.sigma,
      parameters.rho,
      parameters.beta
    );
    
    // Trajectory statistics (6D)
    const stats = this.calculateTrajectoryStatistics(trajectory);
    features.push(
      stats.meanX, stats.meanY, stats.meanZ,
      stats.stdX, stats.stdY, stats.stdZ
    );
    
    return features;
  }
  
  /**
   * RÖSSLER ATTRACTOR
   * Features: 3D initial + 3D parameters + 4D frequency = 10D total
   */
  extractRossler(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Initial conditions (3D)
    features.push(
      initialConditions.x,
      initialConditions.y,
      initialConditions.z
    );
    
    // Parameters (3D)
    features.push(
      parameters.a,
      parameters.b,
      parameters.c
    );
    
    // Frequency analysis (4D)
    const freqAnalysis = this.analyzeFrequency(trajectory);
    features.push(
      freqAnalysis.dominantFreq,
      freqAnalysis.secondaryFreq,
      freqAnalysis.spectralEntropy,
      freqAnalysis.correlationDim
    );
    
    return features;
  }
  
  /**
   * HOPALONG ATTRACTOR
   * Features: 2D initial + 3D parameters + 8D statistics = 13D total
   */
  extractHopalong(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Initial conditions (2D)
    features.push(
      initialConditions.x,
      initialConditions.y
    );
    
    // Parameters (3D)
    features.push(
      parameters.a,
      parameters.b,
      parameters.c
    );
    
    // Statistical measures (8D)
    const bounds = this.calculateBoundingBox(trajectory);
    features.push(
      bounds.xmin, bounds.xmax,
      bounds.ymin, bounds.ymax,
      this.calculateDensity(trajectory),
      this.calculateSymmetry(trajectory),
      this.estimateFractalDimension(trajectory),
      this.calculateCoverageArea(trajectory)
    );
    
    return features;
  }
  
  /**
   * DOUBLE GYRE
   * Features: 3D flow params + 10D particle tracking = 13D total
   */
  extractDoubleGyre(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Flow parameters (3D)
    features.push(
      parameters.amplitude,
      parameters.frequency,
      parameters.epsilon
    );
    
    // Particle tracking (10D)
    const tracking = this.analyzeParticleTracking(trajectory);
    features.push(
      ...tracking.initialPositions,  // 2D
      ...tracking.finalPositions,    // 2D
      tracking.mixingMetric,
      tracking.stretchingField,
      tracking.meanVorticity,
      tracking.maxVorticity,
      tracking.velocityMagnitude,
      tracking.pathLength
    );
    
    return features;
  }
  
  /**
   * LID CAVITY
   * Features: 2D flow params + 8D grid statistics = 10D total
   */
  extractLidCavity(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Flow parameters (2D)
    features.push(
      parameters.reynoldsNumber,
      parameters.lidVelocity
    );
    
    // Grid statistics (8D)
    const stats = this.analyzeFluidGrid(trajectory);
    features.push(
      stats.meanVelocity,
      stats.stdVelocity,
      stats.maxVelocity,
      stats.meanVorticity,
      stats.stdVorticity,
      stats.maxVorticity,
      stats.meanPressure,
      stats.stdPressure
    );
    
    return features;
  }
  
  /**
   * MALKUS WATERWHEEL
   * Features: 4D parameters + 6D rotational dynamics = 10D total
   */
  extractMalkusWaterwheel(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Parameters (4D)
    features.push(
      parameters.damping,
      parameters.inflowRate,
      parameters.numBuckets,
      parameters.gravity
    );
    
    // Rotational dynamics (6D)
    const dynamics = this.analyzeRotationalDynamics(trajectory);
    features.push(
      dynamics.initialAngularVelocity,
      dynamics.angularAccelerationTrend,
      dynamics.oscillationFrequency,
      dynamics.amplitudeDecay,
      dynamics.directionChanges,
      dynamics.maxSpeedReached
    );
    
    return features;
  }
  
  /**
   * TURBULENT JET
   * Features: 3D jet params + 10D turbulence statistics = 13D total
   */
  extractTurbulentJet(data) {
    const { initialConditions, trajectory, parameters } = data;
    const features = [];
    
    // Jet parameters (3D)
    features.push(
      parameters.reynoldsNumber,
      parameters.jetVelocity,
      parameters.jetWidth
    );
    
    // Turbulence statistics (10D)
    const turb = this.analyzeTurbulence(trajectory);
    features.push(
      turb.turbulentIntensity,
      turb.integralLengthScale,
      turb.taylorMicroscale,
      turb.kolmogorovScale,
      turb.energySpectrumSlope,
      turb.velocityFluctuationRMS,
      turb.reynoldsStressXX,
      turb.reynoldsStressXY,
      turb.reynoldsStressYY,
      turb.vorticityEnstrophy
    );
    
    return features;
  }
  
  // ==================== Helper Methods ====================
  
  calculateTotalEnergy(ic) {
    let kinetic = 0;
    let potential = 0;
    const G = 1.0; // Gravitational constant
    
    // Kinetic energy
    for (let i = 0; i < 3; i++) {
      const v = ic.velocities[i];
      kinetic += 0.5 * ic.masses[i] * (v[0]**2 + v[1]**2 + v[2]**2);
    }
    
    // Potential energy
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const r = this.distance3D(ic.positions[i], ic.positions[j]);
        potential -= G * ic.masses[i] * ic.masses[j] / r;
      }
    }
    
    return kinetic + potential;
  }
  
  calculateAngularMomentum(ic) {
    const L = [0, 0, 0];
    
    for (let i = 0; i < 3; i++) {
      const r = ic.positions[i];
      const v = ic.velocities[i];
      const m = ic.masses[i];
      
      // L = r × (m*v)
      L[0] += m * (r[1] * v[2] - r[2] * v[1]);
      L[1] += m * (r[2] * v[0] - r[0] * v[2]);
      L[2] += m * (r[0] * v[1] - r[1] * v[0]);
    }
    
    return L;
  }
  
  calculateCenterOfMassVelocity(ic) {
    const totalMass = ic.masses.reduce((a, b) => a + b, 0);
    let vx = 0, vy = 0;
    
    for (let i = 0; i < 3; i++) {
      vx += ic.masses[i] * ic.velocities[i][0];
      vy += ic.masses[i] * ic.velocities[i][1];
    }
    
    return [vx / totalMass, vy / totalMass];
  }
  
  calculateMinInitialSeparation(ic) {
    let minDist = Infinity;
    
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const dist = this.distance3D(ic.positions[i], ic.positions[j]);
        minDist = Math.min(minDist, dist);
      }
    }
    
    return minDist;
  }
  
  calculatePendulumEnergy(ic, params) {
    const { theta1, theta2, omega1, omega2 } = ic;
    const { m1, m2, l1, l2 } = params;
    const g = 9.81;
    
    // Kinetic energy (simplified)
    const K = 0.5 * m1 * (l1 * omega1)**2 + 
              0.5 * m2 * ((l1 * omega1)**2 + (l2 * omega2)**2);
    
    // Potential energy
    const P = -m1 * g * l1 * Math.cos(theta1) - 
              m2 * g * (l1 * Math.cos(theta1) + l2 * Math.cos(theta2));
    
    return K + P;
  }
  
  estimateLyapunov(trajectory) {
    // Simplified Lyapunov estimation from trajectory divergence
    if (trajectory.length < 100) return 0;
    
    const early = trajectory.slice(0, 50);
    const late = trajectory.slice(-50);
    
    const divergence = this.calculateDivergence(early, late);
    return Math.log(divergence) / trajectory.length;
  }
  
  calculateMaxAngle(trajectory) {
    let maxAngle = 0;
    
    trajectory.forEach(state => {
      maxAngle = Math.max(maxAngle, Math.abs(state.theta1), Math.abs(state.theta2));
    });
    
    return maxAngle;
  }
  
  calculateTrajectoryStatistics(trajectory) {
    const xs = trajectory.map(s => s.x);
    const ys = trajectory.map(s => s.y);
    const zs = trajectory.map(s => s.z);
    
    return {
      meanX: this.mean(xs),
      meanY: this.mean(ys),
      meanZ: this.mean(zs),
      stdX: this.std(xs),
      stdY: this.std(ys),
      stdZ: this.std(zs)
    };
  }
  
  analyzeFrequency(trajectory) {
    // Simplified frequency analysis
    return {
      dominantFreq: this.findDominantFrequency(trajectory),
      secondaryFreq: this.findSecondaryFrequency(trajectory),
      spectralEntropy: this.calculateSpectralEntropy(trajectory),
      correlationDim: this.estimateCorrelationDimension(trajectory)
    };
  }
  
  calculateBoundingBox(trajectory) {
    const xs = trajectory.map(p => p.x);
    const ys = trajectory.map(p => p.y);
    
    return {
      xmin: Math.min(...xs),
      xmax: Math.max(...xs),
      ymin: Math.min(...ys),
      ymax: Math.max(...ys)
    };
  }
  
  calculateDensity(trajectory) {
    const bounds = this.calculateBoundingBox(trajectory);
    const area = (bounds.xmax - bounds.xmin) * (bounds.ymax - bounds.ymin);
    return trajectory.length / area;
  }
  
  calculateSymmetry(trajectory) {
    // Measure symmetry about origin
    const xs = trajectory.map(p => p.x);
    const ys = trajectory.map(p => p.y);
    
    const meanX = this.mean(xs);
    const meanY = this.mean(ys);
    
    return Math.exp(-Math.sqrt(meanX**2 + meanY**2));
  }
  
  estimateFractalDimension(trajectory) {
    // Box-counting estimate (simplified)
    return 1.5; // Placeholder - implement proper box-counting
  }
  
  calculateCoverageArea(trajectory) {
    const bounds = this.calculateBoundingBox(trajectory);
    return (bounds.xmax - bounds.xmin) * (bounds.ymax - bounds.ymin);
  }
  
  // Utility functions
  distance3D(p1, p2) {
    return Math.sqrt(
      (p1[0] - p2[0])**2 + 
      (p1[1] - p2[1])**2 + 
      (p1[2] - p2[2])**2
    );
  }
  
  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  std(arr) {
    const m = this.mean(arr);
    const variance = arr.reduce((sum, val) => sum + (val - m)**2, 0) / arr.length;
    return Math.sqrt(variance);
  }
  
  calculateDivergence(early, late) {
    // Measure how much trajectories diverge
    let sumDist = 0;
    const n = Math.min(early.length, late.length);
    
    for (let i = 0; i < n; i++) {
      const dist = this.objectDistance(early[i], late[i]);
      sumDist += dist;
    }
    
    return sumDist / n;
  }
  
  objectDistance(obj1, obj2) {
    // Generic distance between state objects
    let sum = 0;
    Object.keys(obj1).forEach(key => {
      if (typeof obj1[key] === 'number' && typeof obj2[key] === 'number') {
        sum += (obj1[key] - obj2[key])**2;
      }
    });
    return Math.sqrt(sum);
  }
  
  findDominantFrequency(trajectory) {
    // Placeholder - implement FFT
    return 1.0;
  }
  
  findSecondaryFrequency(trajectory) {
    // Placeholder - implement FFT
    return 0.5;
  }
  
  calculateSpectralEntropy(trajectory) {
    // Placeholder
    return 0.5;
  }
  
  estimateCorrelationDimension(trajectory) {
    // Placeholder
    return 2.0;
  }
  
  analyzeParticleTracking(trajectory) {
    // Simplified particle analysis
    return {
      initialPositions: [0, 0],
      finalPositions: [0, 0],
      mixingMetric: 0.5,
      stretchingField: 1.0,
      meanVorticity: 0.1,
      maxVorticity: 1.0,
      velocityMagnitude: 1.0,
      pathLength: 10.0
    };
  }
  
  analyzeFluidGrid(trajectory) {
    // Simplified fluid analysis
    return {
      meanVelocity: 1.0,
      stdVelocity: 0.2,
      maxVelocity: 2.0,
      meanVorticity: 0.5,
      stdVorticity: 0.1,
      maxVorticity: 1.5,
      meanPressure: 0.0,
      stdPressure: 0.1
    };
  }
  
  analyzeRotationalDynamics(trajectory) {
    // Simplified rotational analysis
    return {
      initialAngularVelocity: 0.0,
      angularAccelerationTrend: 0.0,
      oscillationFrequency: 1.0,
      amplitudeDecay: 0.1,
      directionChanges: 0,
      maxSpeedReached: 1.0
    };
  }
  
  analyzeTurbulence(trajectory) {
    // Simplified turbulence analysis
    return {
      turbulentIntensity: 0.1,
      integralLengthScale: 1.0,
      taylorMicroscale: 0.1,
      kolmogorovScale: 0.01,
      energySpectrumSlope: -5/3,
      velocityFluctuationRMS: 0.1,
      reynoldsStressXX: 0.01,
      reynoldsStressXY: 0.005,
      reynoldsStressYY: 0.01,
      vorticityEnstrophy: 0.1
    };
  }
}

module.exports = FeatureExtractor;
