use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Particle {
    pub x: f64,
    pub y: f64,
    pub color: u32,
    pub active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FlowFieldPoint {
    pub x: f64,
    pub y: f64,
    pub u: f64,
    pub v: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DoubleGyreState {
    pub particles: Vec<Particle>,
    pub flow_field: Vec<FlowFieldPoint>,
    pub time: f64,
    pub a: f64,
    pub epsilon: f64,
    pub omega: f64,
}

pub struct DoubleGyreSimulator {
    pub a_param: f64,
    pub epsilon: f64,
    pub omega: f64,
    pub dt: f64,
    pub domain_width: f64,
    pub domain_height: f64,
    pub particles: Vec<Particle>,
    pub time: f64,
    flow_field_resolution: usize,
    cached_flow_field: Vec<FlowFieldPoint>,
    flow_field_counter: u32,
}

impl DoubleGyreSimulator {
    pub fn new(a: f64, epsilon: f64, omega: f64, dt: f64) -> Self {
        Self {
            a_param: a,
            epsilon,
            omega,
            dt,
            domain_width: 2.0,
            domain_height: 1.0,
            particles: Vec::new(),
            time: 0.0,
            flow_field_resolution: 20,
            cached_flow_field: Vec::new(),
            flow_field_counter: 0,
        }
    }

    fn get_time_functions(&self, t: f64) -> (f64, f64) {
        let sin_omega_t = (self.omega * t).sin();
        let a = self.epsilon * sin_omega_t;
        let b = 1.0 - 2.0 * self.epsilon * sin_omega_t;
        (a, b)
    }

    fn calculate_f(&self, x: f64, t: f64) -> (f64, f64) {
        let (a, b) = self.get_time_functions(t);
        let f = a * x * x + b * x;
        let dfdx = 2.0 * a * x + b;
        (f, dfdx)
    }

    pub fn get_velocity(&self, x: f64, y: f64, t: f64) -> (f64, f64) {
        let (f, dfdx) = self.calculate_f(x, t);
        let pi = std::f64::consts::PI;
        let pi_f = pi * f;
        let pi_y = pi * y;

        let u = -pi * self.a_param * pi_f.sin() * pi_y.cos();
        let v = pi * self.a_param * pi_f.cos() * pi_y.sin() * dfdx;
        (u, v)
    }

    pub fn seed_particles(&mut self, num: usize) {
        self.particles.clear();
        let cols = ((num as f64 * 2.0).sqrt().ceil()) as usize;
        let rows = (num + cols - 1) / cols;

        for i in 0..num {
            let col = i % cols;
            let row = i / cols;

            let x = (col as f64 + 0.5) * self.domain_width / cols as f64;
            let y = (row as f64 + 0.5) * self.domain_height / rows as f64;

            let hue = ((x / self.domain_width * 180.0 + y / self.domain_height * 60.0) % 360.0) as u32;
            let color = hsl_to_rgb_hex(hue as f64, 0.7, 0.6);

            self.particles.push(Particle {
                x,
                y,
                color,
                active: true,
            });
        }
    }

    pub fn step(&mut self, n_steps: u32) {
        for _ in 0..n_steps {
            let t = self.time;
            let dt = self.dt;
            let dw = self.domain_width;
            let dh = self.domain_height;

            for i in 0..self.particles.len() {
                let (u, v) = self.get_velocity(self.particles[i].x, self.particles[i].y, t);
                self.particles[i].x += dt * u;
                self.particles[i].y += dt * v;

                // Boundary wrapping
                if self.particles[i].x < 0.0 {
                    self.particles[i].x += dw;
                } else if self.particles[i].x > dw {
                    self.particles[i].x -= dw;
                }
                if self.particles[i].y < 0.0 {
                    self.particles[i].y = -self.particles[i].y;
                } else if self.particles[i].y > dh {
                    self.particles[i].y = 2.0 * dh - self.particles[i].y;
                }
            }
            self.time += dt;
        }

        self.flow_field_counter += n_steps;
        if self.flow_field_counter >= 20 {
            self.update_flow_field();
            self.flow_field_counter = 0;
        }
    }

    fn get_velocity_cached(&self, x: f64, y: f64, t: f64) -> (f64, f64) {
        self.get_velocity(x, y, t)
    }

    pub fn update_flow_field(&mut self) {
        self.cached_flow_field.clear();
        let res = self.flow_field_resolution;
        for i in 0..=res {
            let x = i as f64 / res as f64 * self.domain_width;
            for j in 0..=res {
                let y = j as f64 / res as f64 * self.domain_height;
                let (u, v) = self.get_velocity(x, y, self.time);
                self.cached_flow_field.push(FlowFieldPoint { x, y, u, v });
            }
        }
    }

    pub fn reset(&mut self) {
        self.time = 0.0;
        self.flow_field_counter = 0;
        self.update_flow_field();
    }

    pub fn get_state(&self) -> DoubleGyreState {
        DoubleGyreState {
            particles: self.particles.clone(),
            flow_field: self.cached_flow_field.clone(),
            time: self.time,
            a: self.a_param,
            epsilon: self.epsilon,
            omega: self.omega,
        }
    }

    pub fn load_preset(&mut self, name: &str) {
        use crate::presets::double_gyre as presets;
        let (a, epsilon, omega, num_particles) = match name {
            "standard" => presets::standard(),
            "divergence" => presets::divergence(),
            "convergence" => presets::convergence(),
            "chaos" => presets::chaos(),
            _ => presets::standard(),
        };
        self.a_param = a;
        self.epsilon = epsilon;
        self.omega = omega;
        self.seed_particles(num_particles);
        self.reset();
    }
}

impl super::Simulator for DoubleGyreSimulator {
    fn step(&mut self, steps: u32) {
        DoubleGyreSimulator::step(self, steps);
    }
    fn reset(&mut self) {
        DoubleGyreSimulator::reset(self);
    }
    fn get_state(&self) -> serde_json::Value {
        serde_json::to_value(DoubleGyreSimulator::get_state(self)).unwrap_or_default()
    }
    fn set_parameter(&mut self, name: &str, value: f64) {
        match name {
            "A" => self.a_param = value,
            "epsilon" => self.epsilon = value,
            "omega" => self.omega = value,
            "dt" => self.dt = value,
            _ => {}
        }
    }
    fn export_data(&self) -> serde_json::Value {
        serde_json::to_value(self.get_state()).unwrap_or_default()
    }
}

fn hsl_to_rgb_hex(h: f64, s: f64, l: f64) -> u32 {
    let h = h / 360.0;
    let a = s * l.min(1.0 - l);
    let f = |n: f64| {
        let k = (n + h * 12.0) % 12.0;
        l - a * (k - 3.0).min(9.0 - k).min(1.0).max(-1.0)
    };
    let r = (255.0 * f(0.0)) as u32;
    let g = (255.0 * f(8.0)) as u32;
    let b = (255.0 * f(4.0)) as u32;
    (r << 16) | (g << 8) | b
}
