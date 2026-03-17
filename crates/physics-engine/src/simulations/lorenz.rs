use crate::validation;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Trajectory {
    pub state: [f64; 3],
    pub color: u32,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LorenzState {
    pub trajectories: Vec<Trajectory>,
    pub time: f64,
    pub steps: u64,
    pub energy: f64,
    pub entropy: f64,
    pub sigma: f64,
    pub rho: f64,
    pub beta: f64,
    pub lyapunov_exponent: f64,
}

/// Tracks the maximal Lyapunov exponent via a shadow trajectory.
struct LyapunovTracker {
    shadow: [f64; 3],
    sum_log: f64,
    count: u64,
    perturbation: f64,
}

impl LyapunovTracker {
    fn new(initial: [f64; 3], perturbation: f64) -> Self {
        Self {
            shadow: [initial[0] + perturbation, initial[1], initial[2]],
            sum_log: 0.0,
            count: 0,
            perturbation,
        }
    }

    fn update(&mut self, reference: &[f64; 3], dt: f64) {
        let dx = self.shadow[0] - reference[0];
        let dy = self.shadow[1] - reference[1];
        let dz = self.shadow[2] - reference[2];
        let dist = (dx * dx + dy * dy + dz * dz).sqrt();

        if dist > 1e-15 {
            self.sum_log += (dist / self.perturbation).ln();
            self.count += 1;

            // Renormalize shadow back to perturbation distance
            let scale = self.perturbation / dist;
            self.shadow[0] = reference[0] + dx * scale;
            self.shadow[1] = reference[1] + dy * scale;
            self.shadow[2] = reference[2] + dz * scale;
        }
        let _ = dt; // dt is used implicitly via count
    }

    fn exponent(&self, dt: f64) -> f64 {
        if self.count == 0 {
            return 0.0;
        }
        self.sum_log / (self.count as f64 * dt)
    }
}

pub struct LorenzSimulator {
    pub sigma: f64,
    pub rho: f64,
    pub beta: f64,
    pub dt: f64,
    pub time: f64,
    pub steps: u64,
    pub trajectories: Vec<Trajectory>,
    initial_trajectories: Vec<Trajectory>,
    lyapunov: Option<LyapunovTracker>,
}

impl LorenzSimulator {
    pub fn new(sigma: f64, rho: f64, beta: f64, dt: f64) -> Self {
        Self {
            sigma: if sigma.is_finite() && sigma >= 0.1 {
                sigma
            } else {
                10.0
            },
            rho: if rho.is_finite() && rho > 0.0 {
                rho
            } else {
                28.0
            },
            beta: if beta.is_finite() && beta > 0.0 {
                beta
            } else {
                8.0 / 3.0
            },
            dt: validation::validate_dt(dt),
            time: 0.0,
            steps: 0,
            trajectories: Vec::new(),
            initial_trajectories: Vec::new(),
            lyapunov: None,
        }
    }

    pub fn set_initial_conditions(&mut self, trajectories: Vec<Trajectory>) {
        self.trajectories = trajectories.clone();
        self.initial_trajectories = trajectories;
        self.time = 0.0;
        self.steps = 0;
        self.lyapunov = if !self.trajectories.is_empty() {
            Some(LyapunovTracker::new(self.trajectories[0].state, 1e-8))
        } else {
            None
        };
    }

    fn lorenz_derivatives(&self, state: &[f64; 3]) -> [f64; 3] {
        let [x, y, z] = *state;
        [
            self.sigma * (y - x),
            x * (self.rho - z) - y,
            x * y - self.beta * z,
        ]
    }

    fn rk4_step(&self, state: &[f64; 3]) -> [f64; 3] {
        let k1 = self.lorenz_derivatives(state);

        let s2 = [
            state[0] + 0.5 * self.dt * k1[0],
            state[1] + 0.5 * self.dt * k1[1],
            state[2] + 0.5 * self.dt * k1[2],
        ];
        let k2 = self.lorenz_derivatives(&s2);

        let s3 = [
            state[0] + 0.5 * self.dt * k2[0],
            state[1] + 0.5 * self.dt * k2[1],
            state[2] + 0.5 * self.dt * k2[2],
        ];
        let k3 = self.lorenz_derivatives(&s3);

        let s4 = [
            state[0] + self.dt * k3[0],
            state[1] + self.dt * k3[1],
            state[2] + self.dt * k3[2],
        ];
        let k4 = self.lorenz_derivatives(&s4);

        let dt6 = self.dt / 6.0;
        let next = [
            state[0] + dt6 * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0]),
            state[1] + dt6 * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1]),
            state[2] + dt6 * (k1[2] + 2.0 * k2[2] + 2.0 * k3[2] + k4[2]),
        ];

        self.validate_state(&next, state)
    }

    fn validate_state(&self, state: &[f64; 3], fallback: &[f64; 3]) -> [f64; 3] {
        let limit = 1e6;
        if !state.iter().all(|v| v.is_finite()) {
            return *fallback;
        }
        if state.iter().any(|v| v.abs() > limit) {
            return [
                state[0].clamp(-limit, limit),
                state[1].clamp(-limit, limit),
                state[2].clamp(-limit, limit),
            ];
        }
        *state
    }

    pub fn step(&mut self, n_steps: u32) {
        for _ in 0..n_steps {
            for i in 0..self.trajectories.len() {
                let state = self.trajectories[i].state;
                self.trajectories[i].state = self.rk4_step(&state);
            }
            // Evolve shadow trajectory for Lyapunov calculation
            if self.lyapunov.is_some() && !self.trajectories.is_empty() {
                let shadow = self.lyapunov.as_ref().unwrap().shadow;
                let new_shadow = self.rk4_step(&shadow);
                let ref_state = self.trajectories[0].state;
                let lyap = self.lyapunov.as_mut().unwrap();
                lyap.shadow = new_shadow;
                lyap.update(&ref_state, self.dt);
            }
            self.time += self.dt;
            self.steps += 1;
        }
    }

    pub fn calculate_energy(&self) -> f64 {
        if self.trajectories.is_empty() {
            return 0.0;
        }
        let mut energy = 0.0;
        for t in &self.trajectories {
            let [x, y, z] = t.state;
            energy += x * x + y * y + z * z;
        }
        energy / self.trajectories.len() as f64
    }

    pub fn calculate_entropy(&self) -> f64 {
        if self.trajectories.len() < 2 {
            return 0.0;
        }
        let n = self.trajectories.len() as f64;
        let mut mean = [0.0; 3];
        for t in &self.trajectories {
            for i in 0..3 {
                mean[i] += t.state[i];
            }
        }
        for m in &mut mean {
            *m /= n;
        }

        let mut variance = 0.0;
        for t in &self.trajectories {
            for i in 0..3 {
                let d = t.state[i] - mean[i];
                variance += d * d;
            }
        }
        (variance / n).sqrt()
    }

    pub fn reset(&mut self) {
        self.trajectories = self.initial_trajectories.clone();
        self.time = 0.0;
        self.steps = 0;
        self.lyapunov = if !self.trajectories.is_empty() {
            Some(LyapunovTracker::new(self.trajectories[0].state, 1e-8))
        } else {
            None
        };
    }

    pub fn get_state(&self) -> LorenzState {
        LorenzState {
            trajectories: self.trajectories.clone(),
            time: self.time,
            steps: self.steps,
            energy: self.calculate_energy(),
            entropy: self.calculate_entropy(),
            sigma: self.sigma,
            rho: self.rho,
            beta: self.beta,
            lyapunov_exponent: self.lyapunov.as_ref().map_or(0.0, |l| l.exponent(self.dt)),
        }
    }

    pub fn load_preset(&mut self, name: &str) {
        use crate::presets::lorenz as presets;
        let (sigma, rho, beta, trajectories) = match name {
            "single" => presets::single(),
            "classic" => presets::classic(),
            "multicolor" => presets::multicolor(),
            "chaos" => presets::chaos(),
            "symmetric" => presets::symmetric(),
            _ => presets::classic(),
        };
        self.sigma = sigma;
        self.rho = rho;
        self.beta = beta;
        self.set_initial_conditions(trajectories);
    }
}

impl super::Simulator for LorenzSimulator {
    fn step(&mut self, steps: u32) {
        LorenzSimulator::step(self, steps);
    }
    fn reset(&mut self) {
        LorenzSimulator::reset(self);
    }
    fn get_state(&self) -> serde_json::Value {
        serde_json::to_value(LorenzSimulator::get_state(self)).unwrap_or_default()
    }
    fn set_parameter(&mut self, name: &str, value: f64) {
        match name {
            "sigma" => self.sigma = value,
            "rho" => self.rho = value,
            "beta" => self.beta = value,
            "dt" => self.dt = validation::validate_dt(value),
            _ => {}
        }
    }
    fn load_preset(&mut self, name: &str) {
        LorenzSimulator::load_preset(self, name);
    }
    fn export_data(&self) -> serde_json::Value {
        serde_json::to_value(self.get_state()).unwrap_or_default()
    }
}
