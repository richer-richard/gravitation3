use crate::body::Body;
use crate::validation;
use crate::vector3::Vec3;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CollisionEvent {
    pub position: [f64; 3],
    pub body1_name: String,
    pub body2_name: String,
    pub combined_mass: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ThreeBodyState {
    pub bodies: Vec<Body>,
    pub time: f64,
    pub steps: u64,
    pub energy: f64,
    pub entropy: f64,
    pub momentum: [f64; 3],
    pub min_distance: f64,
}

pub struct ThreeBodySimulator {
    pub bodies: Vec<Body>,
    initial_bodies: Vec<Body>,
    pub g: f64,
    pub dt: f64,
    pub time: f64,
    pub steps: u64,
    pub collisions_enabled: bool,
    pub collision_restitution: f64,
    initial_energy: f64,
    pub recent_collisions: Vec<CollisionEvent>,
    pub removed_indices: Vec<usize>,
}

impl ThreeBodySimulator {
    pub fn new(g: f64, dt: f64) -> Self {
        Self {
            bodies: Vec::new(),
            initial_bodies: Vec::new(),
            g: validation::validate_g(g),
            dt: validation::validate_dt(dt),
            time: 0.0,
            steps: 0,
            collisions_enabled: true,
            collision_restitution: 1.0,
            initial_energy: 0.0,
            recent_collisions: Vec::new(),
            removed_indices: Vec::new(),
        }
    }

    pub fn set_initial_conditions(&mut self, bodies: Vec<Body>) {
        self.bodies = bodies.clone();
        self.initial_bodies = bodies;
        self.time = 0.0;
        self.steps = 0;
        self.initial_energy = self.calculate_total_energy();
    }

    pub fn reset(&mut self) {
        self.bodies = self.initial_bodies.clone();
        self.time = 0.0;
        self.steps = 0;
        self.initial_energy = self.calculate_total_energy();
        self.recent_collisions.clear();
        self.removed_indices.clear();
    }

    fn calculate_derivative(
        &self,
        positions: &[Vec3],
        velocities: &[Vec3],
    ) -> (Vec<Vec3>, Vec<Vec3>) {
        let n = positions.len();
        let d_pos: Vec<Vec3> = velocities.to_vec();
        let mut d_vel = Vec::with_capacity(n);
        let min_distance = 0.01;

        for i in 0..n {
            let mut acc = Vec3::zeros();
            let pi = positions[i];

            for j in 0..n {
                if i != j {
                    let diff = positions[j] - pi;
                    let mut r2 = diff.norm_squared();
                    if r2 < min_distance * min_distance {
                        r2 = min_distance * min_distance;
                    }
                    let r = r2.sqrt();
                    let factor = self.g * self.bodies[j].mass / (r2 * r);
                    acc += diff * factor;
                }
            }

            d_vel.push(validation::clamp_acceleration(acc));
        }

        (d_pos, d_vel)
    }

    fn rk4_step(&mut self) -> bool {
        let n = self.bodies.len();
        if n == 0 {
            return true;
        }

        let positions: Vec<Vec3> = self.bodies.iter().map(|b| b.pos()).collect();
        let velocities: Vec<Vec3> = self.bodies.iter().map(|b| b.vel()).collect();

        // k1
        let (k1p, k1v) = self.calculate_derivative(&positions, &velocities);

        // k2
        let pos2: Vec<Vec3> = positions
            .iter()
            .zip(k1p.iter())
            .map(|(p, dp)| p + dp * (self.dt * 0.5))
            .collect();
        let vel2: Vec<Vec3> = velocities
            .iter()
            .zip(k1v.iter())
            .map(|(v, dv)| v + dv * (self.dt * 0.5))
            .collect();
        let (k2p, k2v) = self.calculate_derivative(&pos2, &vel2);

        // k3
        let pos3: Vec<Vec3> = positions
            .iter()
            .zip(k2p.iter())
            .map(|(p, dp)| p + dp * (self.dt * 0.5))
            .collect();
        let vel3: Vec<Vec3> = velocities
            .iter()
            .zip(k2v.iter())
            .map(|(v, dv)| v + dv * (self.dt * 0.5))
            .collect();
        let (k3p, k3v) = self.calculate_derivative(&pos3, &vel3);

        // k4
        let pos4: Vec<Vec3> = positions
            .iter()
            .zip(k3p.iter())
            .map(|(p, dp)| p + dp * self.dt)
            .collect();
        let vel4: Vec<Vec3> = velocities
            .iter()
            .zip(k3v.iter())
            .map(|(v, dv)| v + dv * self.dt)
            .collect();
        let (k4p, k4v) = self.calculate_derivative(&pos4, &vel4);

        // Update positions and velocities
        let dt6 = self.dt / 6.0;
        for i in 0..n {
            let dp = (k1p[i] + k2p[i] * 2.0 + k3p[i] * 2.0 + k4p[i]) * dt6;
            let dv = (k1v[i] + k2v[i] * 2.0 + k3v[i] * 2.0 + k4v[i]) * dt6;

            let new_pos = self.bodies[i].pos() + dp;
            let new_vel = validation::clamp_velocity(self.bodies[i].vel() + dv);

            self.bodies[i].set_pos(new_pos);
            self.bodies[i].set_vel(new_vel);
        }

        // Validate state
        for body in &self.bodies {
            if !body.pos().iter().all(|v| v.is_finite())
                || !body.vel().iter().all(|v| v.is_finite())
            {
                return false;
            }
        }

        self.prevent_collisions();
        self.time += self.dt;
        self.steps += 1;
        true
    }

    fn prevent_collisions(&mut self) {
        if !self.collisions_enabled {
            return;
        }

        let merge_distance = 0.15;
        self.removed_indices.clear();
        let mut collision_found = true;

        while collision_found {
            collision_found = false;
            let n = self.bodies.len();

            'outer: for i in (0..n).rev() {
                for j in (0..i).rev() {
                    let dist = (self.bodies[i].pos() - self.bodies[j].pos()).norm();
                    if dist < merge_distance {
                        let bi_mass = self.bodies[i].mass;
                        let bj_mass = self.bodies[j].mass;
                        let total_mass = bi_mass + bj_mass;

                        let collision_pos =
                            self.bodies[i].pos() + (self.bodies[j].pos() - self.bodies[i].pos()) * (bi_mass / total_mass);

                        self.recent_collisions.push(CollisionEvent {
                            position: [collision_pos.x, collision_pos.y, collision_pos.z],
                            body1_name: self.bodies[i].name.clone(),
                            body2_name: self.bodies[j].name.clone(),
                            combined_mass: total_mass,
                        });

                        self.merge_bodies(i, j);
                        collision_found = true;
                        break 'outer;
                    }
                }
            }
        }
    }

    fn merge_bodies(&mut self, i: usize, j: usize) {
        let total_mass = self.bodies[i].mass + self.bodies[j].mass;

        // Conservation of momentum
        let new_vel =
            (self.bodies[i].vel() * self.bodies[i].mass + self.bodies[j].vel() * self.bodies[j].mass)
                / total_mass;
        let new_pos =
            (self.bodies[i].pos() * self.bodies[i].mass + self.bodies[j].pos() * self.bodies[j].mass)
                / total_mass;

        let new_name = format!("{}+{}", self.bodies[i].name, self.bodies[j].name);

        if self.bodies[i].mass >= self.bodies[j].mass {
            self.bodies[i].mass = total_mass;
            self.bodies[i].set_vel(new_vel);
            self.bodies[i].set_pos(new_pos);
            self.bodies[i].name = new_name;
            self.removed_indices.push(j);
            self.bodies.remove(j);
        } else {
            self.bodies[j].mass = total_mass;
            self.bodies[j].set_vel(new_vel);
            self.bodies[j].set_pos(new_pos);
            self.bodies[j].name = new_name;
            self.removed_indices.push(i);
            self.bodies.remove(i);
        }
    }

    pub fn step(&mut self, n_steps: u32) -> bool {
        for _ in 0..n_steps {
            if !self.rk4_step() {
                return false;
            }
        }
        true
    }

    pub fn calculate_total_energy(&self) -> f64 {
        let mut ke = 0.0;
        let mut pe = 0.0;

        for body in &self.bodies {
            let v = body.vel();
            ke += 0.5 * body.mass * v.norm_squared();
        }

        for i in 0..self.bodies.len() {
            for j in (i + 1)..self.bodies.len() {
                let r = (self.bodies[j].pos() - self.bodies[i].pos()).norm();
                if r > 1e-10 {
                    pe -= self.g * self.bodies[i].mass * self.bodies[j].mass / r;
                }
            }
        }

        ke + pe
    }

    pub fn calculate_momentum(&self) -> Vec3 {
        let mut momentum = Vec3::zeros();
        for body in &self.bodies {
            momentum += body.vel() * body.mass;
        }
        momentum
    }

    pub fn calculate_center_of_mass(&self) -> Vec3 {
        let mut com = Vec3::zeros();
        let mut total_mass = 0.0;
        for body in &self.bodies {
            com += body.pos() * body.mass;
            total_mass += body.mass;
        }
        if total_mass > 0.0 {
            com / total_mass
        } else {
            Vec3::zeros()
        }
    }

    pub fn get_min_distance(&self) -> f64 {
        let mut min_dist = f64::INFINITY;
        for i in 0..self.bodies.len() {
            for j in (i + 1)..self.bodies.len() {
                let dist = (self.bodies[i].pos() - self.bodies[j].pos()).norm();
                min_dist = min_dist.min(dist);
            }
        }
        min_dist
    }

    pub fn calculate_entropy(&self) -> f64 {
        if self.bodies.len() < 2 {
            return 0.0;
        }
        let com = self.calculate_center_of_mass();
        let mut sum_dist2 = 0.0;
        for body in &self.bodies {
            let dist = (body.pos() - com).norm();
            sum_dist2 += dist * dist;
        }
        let variance = sum_dist2 / self.bodies.len() as f64;
        if variance > 0.0 {
            (1.0 + variance * 10.0).ln()
        } else {
            0.0
        }
    }

    pub fn get_energy_drift(&self) -> f64 {
        if self.initial_energy.abs() < 1e-15 {
            return 0.0;
        }
        let current = self.calculate_total_energy();
        ((current - self.initial_energy) / self.initial_energy.abs()).abs() * 100.0
    }

    pub fn get_state(&self) -> ThreeBodyState {
        let momentum = self.calculate_momentum();
        ThreeBodyState {
            bodies: self.bodies.clone(),
            time: self.time,
            steps: self.steps,
            energy: self.calculate_total_energy(),
            entropy: self.calculate_entropy(),
            momentum: [momentum.x, momentum.y, momentum.z],
            min_distance: self.get_min_distance(),
        }
    }

    pub fn load_preset(&mut self, name: &str) {
        use crate::presets::three_body as presets;
        let bodies = match name {
            "figure8" => presets::figure8(),
            "lagrange" => presets::lagrange(),
            "chaotic" => presets::chaotic(),
            _ => presets::figure8(),
        };
        self.set_initial_conditions(bodies);
    }
}

impl super::Simulator for ThreeBodySimulator {
    fn step(&mut self, steps: u32) {
        ThreeBodySimulator::step(self, steps);
    }

    fn reset(&mut self) {
        ThreeBodySimulator::reset(self);
    }

    fn get_state(&self) -> serde_json::Value {
        serde_json::to_value(ThreeBodySimulator::get_state(self)).unwrap_or_default()
    }

    fn set_parameter(&mut self, name: &str, value: f64) {
        match name {
            "G" | "g" => self.g = validation::validate_g(value),
            "dt" => self.dt = validation::validate_dt(value),
            _ => {}
        }
    }

    fn export_data(&self) -> serde_json::Value {
        self.get_state();
        serde_json::to_value(self.get_state()).unwrap_or_default()
    }
}
