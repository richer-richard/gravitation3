use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MalkusState {
    pub omega: f64,
    pub theta: f64,
    pub bucket_masses: Vec<f64>,
    pub time: f64,
    pub omega_history: Vec<f64>,
    pub theta_history: Vec<f64>,
    pub q: f64,
    pub k: f64,
    pub nu: f64,
    pub num_buckets: usize,
}

pub struct MalkusWheelSimulator {
    pub num_buckets: usize,
    pub q: f64,
    pub k: f64,
    pub nu: f64,
    pub dt: f64,
    pub omega: f64,
    pub theta: f64,
    pub bucket_masses: Vec<f64>,
    pub time: f64,
    pub omega_history: Vec<f64>,
    pub theta_history: Vec<f64>,
    max_history: usize,
}

impl MalkusWheelSimulator {
    pub fn new(num_buckets: usize, q: f64, k: f64, nu: f64, dt: f64) -> Self {
        Self {
            num_buckets,
            q,
            k,
            nu,
            dt,
            omega: 0.1,
            theta: 0.0,
            bucket_masses: vec![0.0; num_buckets],
            time: 0.0,
            omega_history: Vec::new(),
            theta_history: Vec::new(),
            max_history: 2000,
        }
    }

    fn get_bucket_angle(&self, i: usize, theta: f64) -> f64 {
        theta + (2.0 * std::f64::consts::PI * i as f64) / self.num_buckets as f64
    }

    fn calculate_torque_from_state(&self, theta: f64, masses: &[f64]) -> f64 {
        let mut total = 0.0;
        for i in 0..self.num_buckets {
            let angle = self.get_bucket_angle(i, theta);
            total += masses[i] * angle.sin();
        }
        total
    }

    fn derivatives(&self, omega: f64, theta: f64, masses: &[f64]) -> (f64, f64, Vec<f64>) {
        let torque = self.calculate_torque_from_state(theta, masses);
        let domega = torque - self.nu * omega;
        let dtheta = omega;

        let threshold = (2.0 * std::f64::consts::PI / self.num_buckets as f64)
            .cos()
            .abs();
        let dmasses: Vec<f64> = masses
            .iter()
            .enumerate()
            .map(|(i, &m)| {
                let angle = self.get_bucket_angle(i, theta);
                let outflow = self.k * m;

                let mut inflow = 0.0;
                if angle.cos() > threshold {
                    let x = angle.tan().atan2(1.0);
                    let f = self.q / 2.0;
                    inflow = f * ((self.num_buckets as f64 * x / 2.0).cos() + 1.0);
                }

                inflow - outflow
            })
            .collect();

        (domega, dtheta, dmasses)
    }

    fn rk4_step(&mut self) {
        let omega = self.omega;
        let theta = self.theta;
        let masses = self.bucket_masses.clone();
        let dt = self.dt;

        // k1
        let (do1, dt1, dm1) = self.derivatives(omega, theta, &masses);

        // k2
        let m2: Vec<f64> = masses
            .iter()
            .zip(dm1.iter())
            .map(|(m, dm)| m + 0.5 * dt * dm)
            .collect();
        let (do2, dt2, dm2) = self.derivatives(omega + 0.5 * dt * do1, theta + 0.5 * dt * dt1, &m2);

        // k3
        let m3: Vec<f64> = masses
            .iter()
            .zip(dm2.iter())
            .map(|(m, dm)| m + 0.5 * dt * dm)
            .collect();
        let (do3, dt3, dm3) = self.derivatives(omega + 0.5 * dt * do2, theta + 0.5 * dt * dt2, &m3);

        // k4
        let m4: Vec<f64> = masses
            .iter()
            .zip(dm3.iter())
            .map(|(m, dm)| m + dt * dm)
            .collect();
        let (do4, dt4, dm4) = self.derivatives(omega + dt * do3, theta + dt * dt3, &m4);

        let dt6 = dt / 6.0;
        self.omega = omega + dt6 * (do1 + 2.0 * do2 + 2.0 * do3 + do4);
        self.theta = theta + dt6 * (dt1 + 2.0 * dt2 + 2.0 * dt3 + dt4);

        for i in 0..self.num_buckets {
            self.bucket_masses[i] =
                (masses[i] + dt6 * (dm1[i] + 2.0 * dm2[i] + 2.0 * dm3[i] + dm4[i])).max(0.0);
        }
    }

    pub fn step(&mut self, n_steps: u32) {
        for _ in 0..n_steps {
            self.omega_history.push(self.omega);
            if self.omega_history.len() > self.max_history {
                self.omega_history.remove(0);
            }
            self.theta_history.push(self.theta);
            if self.theta_history.len() > self.max_history {
                self.theta_history.remove(0);
            }

            self.rk4_step();
            self.time += self.dt;
        }
    }

    pub fn reset(&mut self) {
        self.omega = 0.1;
        self.theta = 0.0;
        self.bucket_masses.fill(0.0);
        self.omega_history.clear();
        self.theta_history.clear();
        self.time = 0.0;
    }

    pub fn get_state(&self) -> MalkusState {
        MalkusState {
            omega: self.omega,
            theta: self.theta,
            bucket_masses: self.bucket_masses.clone(),
            time: self.time,
            omega_history: self.omega_history.clone(),
            theta_history: self.theta_history.clone(),
            q: self.q,
            k: self.k,
            nu: self.nu,
            num_buckets: self.num_buckets,
        }
    }

    pub fn load_preset(&mut self, name: &str) {
        use crate::presets::malkus as presets;
        let (q, k, nu, num_buckets) = match name {
            "chaotic" => presets::chaotic(),
            "periodic" => presets::periodic(),
            "steady" => presets::steady(),
            "reversals" => presets::reversals(),
            _ => presets::chaotic(),
        };
        self.q = q;
        self.k = k;
        self.nu = nu;
        self.num_buckets = num_buckets;
        self.bucket_masses = vec![0.0; num_buckets];
        self.reset();
    }
}

impl super::Simulator for MalkusWheelSimulator {
    fn step(&mut self, steps: u32) {
        MalkusWheelSimulator::step(self, steps);
    }
    fn reset(&mut self) {
        MalkusWheelSimulator::reset(self);
    }
    fn get_state(&self) -> serde_json::Value {
        serde_json::to_value(MalkusWheelSimulator::get_state(self)).unwrap_or_default()
    }
    fn set_parameter(&mut self, name: &str, value: f64) {
        match name {
            "inflow_rate" | "Q" | "q" => self.q = value,
            "leak_rate" | "K" | "k" => self.k = value,
            "damping" | "nu" => self.nu = value,
            "dt" => self.dt = value,
            _ => {}
        }
    }
    fn load_preset(&mut self, name: &str) {
        MalkusWheelSimulator::load_preset(self, name);
    }
    fn export_data(&self) -> serde_json::Value {
        serde_json::to_value(self.get_state()).unwrap_or_default()
    }
}
