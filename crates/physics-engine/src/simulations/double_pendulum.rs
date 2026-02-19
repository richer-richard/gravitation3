use crate::validation;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PendulumState {
    /// [theta1, omega1, theta2, omega2]
    pub state: [f64; 4],
    pub l1: f64,
    pub l2: f64,
    pub m1: f64,
    pub m2: f64,
    pub trail: Vec<[f64; 2]>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DoublePendulumState {
    pub pendulums: Vec<PendulumState>,
    pub time: f64,
    pub energy: f64,
    pub entropy: f64,
}

pub struct DoublePendulumSimulator {
    pub pendulums: Vec<PendulumState>,
    pub g: f64,
    pub dt: f64,
    pub time: f64,
    max_trail_length: usize,
    step_counter: Vec<u32>,
}

impl DoublePendulumSimulator {
    pub fn new() -> Self {
        let mut sim = Self {
            pendulums: Vec::new(),
            g: 9.81,
            dt: 0.02,
            time: 0.0,
            max_trail_length: 200,
            step_counter: Vec::new(),
        };
        sim.add_pendulum(std::f64::consts::FRAC_PI_2, 0.0, std::f64::consts::FRAC_PI_2, 0.0);
        sim
    }

    pub fn add_pendulum(&mut self, theta1: f64, omega1: f64, theta2: f64, omega2: f64) {
        if self.pendulums.len() >= 4 {
            return;
        }
        self.pendulums.push(PendulumState {
            state: [theta1, omega1, theta2, omega2],
            l1: 1.0,
            l2: 1.0,
            m1: 1.0,
            m2: 1.0,
            trail: Vec::new(),
        });
        self.step_counter.push(0);
    }

    pub fn remove_pendulum(&mut self, index: usize) {
        if self.pendulums.len() <= 1 || index >= self.pendulums.len() {
            return;
        }
        self.pendulums.remove(index);
        self.step_counter.remove(index);
    }

    fn derivatives(state: &[f64; 4], l1: f64, l2: f64, m1: f64, m2: f64, g: f64) -> [f64; 4] {
        let [theta1, omega1, theta2, omega2] = *state;
        let delta = theta2 - theta1;
        let cos_delta = delta.cos();
        let sin_delta = delta.sin();

        let den1 = (m1 + m2) * l1 - m2 * l1 * cos_delta * cos_delta;
        let den2 = (l2 / l1) * den1;

        let domega1 = (m2 * l1 * omega1 * omega1 * sin_delta * cos_delta
            + m2 * g * theta2.sin() * cos_delta
            + m2 * l2 * omega2 * omega2 * sin_delta
            - (m1 + m2) * g * theta1.sin())
            / den1;

        let domega2 = (-m2 * l2 * omega2 * omega2 * sin_delta * cos_delta
            + (m1 + m2) * g * theta1.sin() * cos_delta
            - (m1 + m2) * l1 * omega1 * omega1 * sin_delta
            - (m1 + m2) * g * theta2.sin())
            / den2;

        [omega1, domega1, omega2, domega2]
    }

    fn step_pendulum(&mut self, idx: usize) {
        let p = &self.pendulums[idx];
        let state = p.state;
        let (l1, l2, m1, m2) = (p.l1, p.l2, p.m1, p.m2);
        let g = self.g;
        let dt = self.dt;

        let k1 = Self::derivatives(&state, l1, l2, m1, m2, g);

        let s2 = [
            state[0] + k1[0] * dt * 0.5,
            state[1] + k1[1] * dt * 0.5,
            state[2] + k1[2] * dt * 0.5,
            state[3] + k1[3] * dt * 0.5,
        ];
        let k2 = Self::derivatives(&s2, l1, l2, m1, m2, g);

        let s3 = [
            state[0] + k2[0] * dt * 0.5,
            state[1] + k2[1] * dt * 0.5,
            state[2] + k2[2] * dt * 0.5,
            state[3] + k2[3] * dt * 0.5,
        ];
        let k3 = Self::derivatives(&s3, l1, l2, m1, m2, g);

        let s4 = [
            state[0] + k3[0] * dt,
            state[1] + k3[1] * dt,
            state[2] + k3[2] * dt,
            state[3] + k3[3] * dt,
        ];
        let k4 = Self::derivatives(&s4, l1, l2, m1, m2, g);

        let dt6 = dt / 6.0;
        let p = &mut self.pendulums[idx];
        for i in 0..4 {
            p.state[i] += (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]) * dt6;
        }

        // Update trail every 2 steps
        self.step_counter[idx] += 1;
        if self.step_counter[idx] % 2 == 0 {
            let pos = self.get_positions(idx);
            let p = &mut self.pendulums[idx];
            p.trail.push([pos.2, pos.3]); // x2, y2
            if p.trail.len() > self.max_trail_length {
                p.trail.remove(0);
            }
        }
    }

    /// Returns (x1, y1, x2, y2) for pendulum at index
    pub fn get_positions(&self, idx: usize) -> (f64, f64, f64, f64) {
        let p = &self.pendulums[idx];
        let [theta1, _, theta2, _] = p.state;
        let x1 = p.l1 * theta1.sin();
        let y1 = -p.l1 * theta1.cos();
        let x2 = x1 + p.l2 * theta2.sin();
        let y2 = y1 - p.l2 * theta2.cos();
        (x1, y1, x2, y2)
    }

    pub fn calculate_energy(&self, idx: usize) -> f64 {
        let p = &self.pendulums[idx];
        let [theta1, omega1, theta2, omega2] = p.state;
        let (_, y1, _, y2) = self.get_positions(idx);

        let v1x = p.l1 * omega1 * theta1.cos();
        let v1y = p.l1 * omega1 * theta1.sin();
        let v2x = v1x + p.l2 * omega2 * theta2.cos();
        let v2y = v1y + p.l2 * omega2 * theta2.sin();

        let ke = 0.5 * p.m1 * (v1x * v1x + v1y * v1y)
            + 0.5 * p.m2 * (v2x * v2x + v2y * v2y);
        let pe = p.m1 * self.g * y1 + p.m2 * self.g * y2;

        ke + pe
    }

    pub fn calculate_entropy(&self) -> f64 {
        if self.pendulums.len() < 2 {
            return 0.0;
        }
        let n = self.pendulums.len() as f64;
        let mut sum_x = 0.0;
        let mut sum_y = 0.0;
        let mut sum_x2 = 0.0;
        let mut sum_y2 = 0.0;

        for i in 0..self.pendulums.len() {
            let (_, _, x2, y2) = self.get_positions(i);
            sum_x += x2;
            sum_y += y2;
            sum_x2 += x2 * x2;
            sum_y2 += y2 * y2;
        }

        let mean_x = sum_x / n;
        let mean_y = sum_y / n;
        let var_x = sum_x2 / n - mean_x * mean_x;
        let var_y = sum_y2 / n - mean_y * mean_y;
        let spread = (var_x + var_y).sqrt();

        if spread > 0.0 {
            (1.0 + spread * 10.0).ln()
        } else {
            0.0
        }
    }

    pub fn step(&mut self, n_steps: u32) {
        for _ in 0..n_steps {
            for i in 0..self.pendulums.len() {
                self.step_pendulum(i);
            }
            self.time += self.dt;
        }
    }

    pub fn reset(&mut self, preset: &str) {
        self.time = 0.0;
        for (idx, p) in self.pendulums.iter_mut().enumerate() {
            p.trail.clear();
            let variation = idx as f64 * 0.01;
            match preset {
                "chaos" => {
                    p.state = [
                        std::f64::consts::FRAC_PI_2 + 0.1 + variation,
                        0.0,
                        std::f64::consts::FRAC_PI_2 - variation,
                        0.0,
                    ];
                }
                "asymmetric" => {
                    p.state = [
                        std::f64::consts::FRAC_PI_4 + variation,
                        0.0,
                        3.0 * std::f64::consts::FRAC_PI_4 - variation,
                        0.0,
                    ];
                }
                "spin" => {
                    p.state = [
                        std::f64::consts::FRAC_PI_2 + variation,
                        3.0,
                        std::f64::consts::FRAC_PI_2 - variation,
                        3.0,
                    ];
                }
                _ => {
                    p.state = [
                        std::f64::consts::FRAC_PI_2 + variation,
                        0.0,
                        std::f64::consts::FRAC_PI_2 - variation,
                        0.0,
                    ];
                }
            }
        }
    }

    pub fn get_state(&self) -> DoublePendulumState {
        DoublePendulumState {
            pendulums: self.pendulums.clone(),
            time: self.time,
            energy: if !self.pendulums.is_empty() {
                self.calculate_energy(0)
            } else {
                0.0
            },
            entropy: self.calculate_entropy(),
        }
    }
}

impl super::Simulator for DoublePendulumSimulator {
    fn step(&mut self, steps: u32) {
        DoublePendulumSimulator::step(self, steps);
    }

    fn reset(&mut self) {
        DoublePendulumSimulator::reset(self, "default");
    }

    fn get_state(&self) -> serde_json::Value {
        serde_json::to_value(DoublePendulumSimulator::get_state(self)).unwrap_or_default()
    }

    fn set_parameter(&mut self, name: &str, value: f64) {
        match name {
            "g" => self.g = value,
            "dt" => self.dt = validation::validate_dt(value),
            "l1" => {
                for p in &mut self.pendulums {
                    p.l1 = value;
                }
            }
            "l2" => {
                for p in &mut self.pendulums {
                    p.l2 = value;
                }
            }
            "m1" => {
                for p in &mut self.pendulums {
                    p.m1 = value;
                }
            }
            "m2" => {
                for p in &mut self.pendulums {
                    p.m2 = value;
                }
            }
            _ => {}
        }
    }

    fn export_data(&self) -> serde_json::Value {
        serde_json::to_value(self.get_state()).unwrap_or_default()
    }
}
