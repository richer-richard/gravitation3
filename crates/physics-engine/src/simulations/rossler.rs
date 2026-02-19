use crate::validation;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Trajectory {
    pub state: [f64; 3],
    pub color: u32,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RosslerState {
    pub trajectories: Vec<Trajectory>,
    pub time: f64,
    pub steps: u64,
    pub energy: f64,
    pub entropy: f64,
    pub a: f64,
    pub b: f64,
    pub c: f64,
}

pub struct RosslerSimulator {
    pub a: f64,
    pub b: f64,
    pub c: f64,
    pub dt: f64,
    pub time: f64,
    pub steps: u64,
    pub trajectories: Vec<Trajectory>,
    initial_trajectories: Vec<Trajectory>,
}

impl RosslerSimulator {
    pub fn new(a: f64, b: f64, c: f64, dt: f64) -> Self {
        Self {
            a: if a.is_finite() { a } else { 0.2 },
            b: if b.is_finite() { b } else { 0.2 },
            c: if c.is_finite() && c > 0.0 { c } else { 5.7 },
            dt: validation::validate_dt(dt),
            time: 0.0,
            steps: 0,
            trajectories: Vec::new(),
            initial_trajectories: Vec::new(),
        }
    }

    pub fn set_initial_conditions(&mut self, trajectories: Vec<Trajectory>) {
        self.trajectories = trajectories.clone();
        self.initial_trajectories = trajectories;
        self.time = 0.0;
        self.steps = 0;
    }

    /// dx/dt = -y - z, dy/dt = x + ay, dz/dt = b + z(x - c)
    fn rossler_derivatives(&self, state: &[f64; 3]) -> [f64; 3] {
        let [x, y, z] = *state;
        [
            -y - z,
            x + self.a * y,
            self.b + z * (x - self.c),
        ]
    }

    fn rk4_step(&self, state: &[f64; 3]) -> [f64; 3] {
        let k1 = self.rossler_derivatives(state);

        let s2 = [
            state[0] + 0.5 * self.dt * k1[0],
            state[1] + 0.5 * self.dt * k1[1],
            state[2] + 0.5 * self.dt * k1[2],
        ];
        let k2 = self.rossler_derivatives(&s2);

        let s3 = [
            state[0] + 0.5 * self.dt * k2[0],
            state[1] + 0.5 * self.dt * k2[1],
            state[2] + 0.5 * self.dt * k2[2],
        ];
        let k3 = self.rossler_derivatives(&s3);

        let s4 = [
            state[0] + self.dt * k3[0],
            state[1] + self.dt * k3[1],
            state[2] + self.dt * k3[2],
        ];
        let k4 = self.rossler_derivatives(&s4);

        let dt6 = self.dt / 6.0;
        [
            state[0] + dt6 * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0]),
            state[1] + dt6 * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1]),
            state[2] + dt6 * (k1[2] + 2.0 * k2[2] + 2.0 * k3[2] + k4[2]),
        ]
    }

    pub fn step(&mut self, n_steps: u32) {
        for _ in 0..n_steps {
            for i in 0..self.trajectories.len() {
                let state = self.trajectories[i].state;
                self.trajectories[i].state = self.rk4_step(&state);
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
    }

    pub fn get_state(&self) -> RosslerState {
        RosslerState {
            trajectories: self.trajectories.clone(),
            time: self.time,
            steps: self.steps,
            energy: self.calculate_energy(),
            entropy: self.calculate_entropy(),
            a: self.a,
            b: self.b,
            c: self.c,
        }
    }

    pub fn load_preset(&mut self, name: &str) {
        use crate::presets::rossler as presets;
        let (a, b, c, trajectories) = match name {
            "classic" => presets::classic(),
            "chaotic" => presets::chaotic(),
            "periodic" => presets::periodic(),
            "funnel" => presets::funnel(),
            _ => presets::classic(),
        };
        self.a = a;
        self.b = b;
        self.c = c;
        self.set_initial_conditions(trajectories);
    }
}

impl super::Simulator for RosslerSimulator {
    fn step(&mut self, steps: u32) {
        RosslerSimulator::step(self, steps);
    }
    fn reset(&mut self) {
        RosslerSimulator::reset(self);
    }
    fn get_state(&self) -> serde_json::Value {
        serde_json::to_value(RosslerSimulator::get_state(self)).unwrap_or_default()
    }
    fn set_parameter(&mut self, name: &str, value: f64) {
        match name {
            "a" => self.a = value,
            "b" => self.b = value,
            "c" => self.c = value,
            "dt" => self.dt = validation::validate_dt(value),
            _ => {}
        }
    }
    fn export_data(&self) -> serde_json::Value {
        serde_json::to_value(self.get_state()).unwrap_or_default()
    }
}
