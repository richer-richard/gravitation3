use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CavityFlowPoint {
    pub x: f64,
    pub y: f64,
    pub u: f64,
    pub v: f64,
    pub speed: f64,
    pub pressure: f64,
    pub vorticity: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CavityParticle {
    pub x: f64,
    pub y: f64,
    pub hue: f64,
    pub age: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LidDrivenCavityState {
    pub flow_field: Vec<CavityFlowPoint>,
    pub particles: Vec<CavityParticle>,
    pub time: f64,
    pub reynolds: f64,
    pub lid_velocity: f64,
    pub viscosity: f64,
    pub divergence_norm: f64,
    pub circulation: f64,
}

pub struct LidDrivenCavitySimulator {
    size: usize,
    u: Vec<f64>,
    v: Vec<f64>,
    u_prev: Vec<f64>,
    v_prev: Vec<f64>,
    pressure: Vec<f64>,
    divergence: Vec<f64>,
    dt: f64,
    time: f64,
    lid_velocity: f64,
    reynolds: f64,
    viscosity: f64,
    particles: Vec<CavityParticle>,
    particle_capacity: usize,
    emission_phase: f64,
}

impl LidDrivenCavitySimulator {
    pub fn new() -> Self {
        let size = 36;
        let len = size * size;
        let mut sim = Self {
            size,
            u: vec![0.0; len],
            v: vec![0.0; len],
            u_prev: vec![0.0; len],
            v_prev: vec![0.0; len],
            pressure: vec![0.0; len],
            divergence: vec![0.0; len],
            dt: 0.01,
            time: 0.0,
            lid_velocity: 1.0,
            reynolds: 400.0,
            viscosity: 1.0 / 400.0,
            particles: Vec::new(),
            particle_capacity: 480,
            emission_phase: 0.0,
        };
        sim.reset_fields();
        sim.seed_particles_grid(sim.particle_capacity);
        sim
    }

    fn idx(&self, x: usize, y: usize) -> usize {
        y * self.size + x
    }

    fn cell_spacing(&self) -> f64 {
        1.0 / (self.size as f64 - 1.0)
    }

    fn reset_fields(&mut self) {
        self.u.fill(0.0);
        self.v.fill(0.0);
        self.u_prev.fill(0.0);
        self.v_prev.fill(0.0);
        self.pressure.fill(0.0);
        self.divergence.fill(0.0);
        self.apply_boundary_conditions();
    }

    fn update_viscosity(&mut self) {
        self.viscosity = (self.lid_velocity.abs().max(0.1) / self.reynolds.max(1.0)).clamp(0.0001, 0.05);
    }

    fn apply_boundary_conditions(&mut self) {
        let n = self.size;
        for x in 0..n {
            let top = self.idx(x, n - 1);
            let bottom = self.idx(x, 0);
            self.u[top] = self.lid_velocity;
            self.v[top] = 0.0;
            self.u[bottom] = 0.0;
            self.v[bottom] = 0.0;
        }
        for y in 0..n {
            let left = self.idx(0, y);
            let right = self.idx(n - 1, y);
            self.u[left] = 0.0;
            self.v[left] = 0.0;
            self.u[right] = 0.0;
            self.v[right] = 0.0;
        }
    }

    fn diffuse_scalar(size: usize, dt: f64, viscosity: f64, source: &[f64], target: &mut [f64]) {
        let a = dt * viscosity * (size as f64 - 1.0).powi(2);
        target.copy_from_slice(source);
        for _ in 0..14 {
            for y in 1..size - 1 {
                for x in 1..size - 1 {
                    let idx = y * size + x;
                    let left = idx - 1;
                    let right = idx + 1;
                    let down = idx - size;
                    let up = idx + size;
                    target[idx] =
                        (source[idx] + a * (target[left] + target[right] + target[down] + target[up]))
                            / (1.0 + 4.0 * a);
                }
            }
        }
    }

    fn sample_velocity_from(&self, u_field: &[f64], v_field: &[f64], x: f64, y: f64) -> (f64, f64) {
        let px = x.clamp(0.0, 1.0) * (self.size as f64 - 1.0);
        let py = y.clamp(0.0, 1.0) * (self.size as f64 - 1.0);
        let x0 = px.floor() as usize;
        let y0 = py.floor() as usize;
        let x1 = (x0 + 1).min(self.size - 1);
        let y1 = (y0 + 1).min(self.size - 1);
        let tx = px - x0 as f64;
        let ty = py - y0 as f64;

        let idx00 = self.idx(x0, y0);
        let idx10 = self.idx(x1, y0);
        let idx01 = self.idx(x0, y1);
        let idx11 = self.idx(x1, y1);

        let lerp = |a: f64, b: f64, t: f64| a + (b - a) * t;
        let u0 = lerp(u_field[idx00], u_field[idx10], tx);
        let u1 = lerp(u_field[idx01], u_field[idx11], tx);
        let v0 = lerp(v_field[idx00], v_field[idx10], tx);
        let v1 = lerp(v_field[idx01], v_field[idx11], tx);

        (lerp(u0, u1, ty), lerp(v0, v1, ty))
    }

    fn advect_velocity(&mut self) {
        let mut next_u = self.u.clone();
        let mut next_v = self.v.clone();

        for y in 1..self.size - 1 {
            for x in 1..self.size - 1 {
                let idx = self.idx(x, y);
                let pos_x = x as f64 / (self.size as f64 - 1.0);
                let pos_y = y as f64 / (self.size as f64 - 1.0);
                let src_x = pos_x - self.dt * self.u_prev[idx];
                let src_y = pos_y - self.dt * self.v_prev[idx];
                let (u, v) = self.sample_velocity_from(&self.u_prev, &self.v_prev, src_x, src_y);
                next_u[idx] = u;
                next_v[idx] = v;
            }
        }

        self.u = next_u;
        self.v = next_v;
    }

    fn project(&mut self) {
        let h = self.cell_spacing();
        self.pressure.fill(0.0);

        for y in 1..self.size - 1 {
            for x in 1..self.size - 1 {
                let idx = self.idx(x, y);
                let du = self.u[self.idx(x + 1, y)] - self.u[self.idx(x - 1, y)];
                let dv = self.v[self.idx(x, y + 1)] - self.v[self.idx(x, y - 1)];
                self.divergence[idx] = -0.5 * h * (du + dv);
            }
        }

        for _ in 0..28 {
            for y in 1..self.size - 1 {
                for x in 1..self.size - 1 {
                    let idx = self.idx(x, y);
                    self.pressure[idx] = (
                        self.divergence[idx]
                            + self.pressure[self.idx(x - 1, y)]
                            + self.pressure[self.idx(x + 1, y)]
                            + self.pressure[self.idx(x, y - 1)]
                            + self.pressure[self.idx(x, y + 1)]
                    ) / 4.0;
                }
            }
        }

        for y in 1..self.size - 1 {
            for x in 1..self.size - 1 {
                let idx = self.idx(x, y);
                self.u[idx] -= 0.5 * (self.pressure[self.idx(x + 1, y)] - self.pressure[self.idx(x - 1, y)]) / h;
                self.v[idx] -= 0.5 * (self.pressure[self.idx(x, y + 1)] - self.pressure[self.idx(x, y - 1)]) / h;
            }
        }
    }

    fn velocity_at(&self, x: f64, y: f64) -> (f64, f64) {
        self.sample_velocity_from(&self.u, &self.v, x, y)
    }

    fn seed_particles_grid(&mut self, count: usize) {
        self.particles.clear();
        let cols = (count as f64).sqrt().ceil() as usize;
        let rows = cols.max(1);

        for row in 0..rows {
            for col in 0..cols {
                if self.particles.len() >= count {
                    break;
                }
                let x = 0.08 + (col as f64 + 0.5) / cols as f64 * 0.84;
                let y = 0.08 + (row as f64 + 0.5) / rows as f64 * 0.84;
                self.particles.push(CavityParticle {
                    x,
                    y,
                    hue: ((col + row * cols) % 360) as f64,
                    age: 0.0,
                });
            }
        }
    }

    fn advect_particles(&mut self) {
        let dt = self.dt;
        for index in 0..self.particles.len() {
            let (x, y) = {
                let particle = &self.particles[index];
                (particle.x, particle.y)
            };
            let (u, v) = self.velocity_at(x, y);
            let particle = &mut self.particles[index];
            particle.x = (particle.x + u * dt).clamp(0.02, 0.98);
            particle.y = (particle.y + v * dt).clamp(0.02, 0.98);
            particle.age += dt;
        }

        self.emission_phase = (self.emission_phase + dt * self.lid_velocity * 0.9) % 1.0;
        let particle_len = self.particles.len().max(1) as f64;
        for (index, particle) in self.particles.iter_mut().enumerate() {
            if particle.age > 4.5 {
                let band = ((index as f64 / particle_len) + self.emission_phase) % 1.0;
                particle.x = 0.08 + 0.84 * band;
                particle.y = 0.96;
                particle.age = 0.0;
            }
        }
    }

    pub fn load_preset(&mut self, name: &str) {
        match name {
            "laminar" => {
                self.reynolds = 120.0;
                self.lid_velocity = 0.75;
                self.dt = 0.012;
            }
            "transition" => {
                self.reynolds = 900.0;
                self.lid_velocity = 1.0;
                self.dt = 0.008;
            }
            "high-shear" => {
                self.reynolds = 2500.0;
                self.lid_velocity = 1.2;
                self.dt = 0.006;
            }
            _ => {
                self.reynolds = 400.0;
                self.lid_velocity = 1.0;
                self.dt = 0.01;
            }
        }
        self.update_viscosity();
        self.time = 0.0;
        self.reset_fields();
        self.seed_particles_grid(self.particle_capacity);
    }

    fn divergence_norm(&self) -> f64 {
        let mut sum = 0.0;
        for value in &self.divergence {
            sum += value * value;
        }
        (sum / self.divergence.len() as f64).sqrt()
    }

    fn circulation(&self) -> f64 {
        let mut total = 0.0;
        for y in 1..self.size - 1 {
            for x in 1..self.size - 1 {
                total += self.local_vorticity(x, y).abs();
            }
        }
        total * self.cell_spacing() * self.cell_spacing()
    }

    fn local_vorticity(&self, x: usize, y: usize) -> f64 {
        let h = self.cell_spacing();
        let dvdx = (self.v[self.idx(x + 1, y)] - self.v[self.idx(x - 1, y)]) / (2.0 * h);
        let dudy = (self.u[self.idx(x, y + 1)] - self.u[self.idx(x, y - 1)]) / (2.0 * h);
        dvdx - dudy
    }

    pub fn get_state(&self) -> LidDrivenCavityState {
        let mut flow_field = Vec::with_capacity(self.size * self.size);
        for y in 0..self.size {
            for x in 0..self.size {
                let idx = self.idx(x, y);
                let u = self.u[idx];
                let v = self.v[idx];
                let vorticity = if x > 0 && x < self.size - 1 && y > 0 && y < self.size - 1 {
                    self.local_vorticity(x, y)
                } else {
                    0.0
                };
                flow_field.push(CavityFlowPoint {
                    x: x as f64 / (self.size as f64 - 1.0),
                    y: y as f64 / (self.size as f64 - 1.0),
                    u,
                    v,
                    speed: (u * u + v * v).sqrt(),
                    pressure: self.pressure[idx],
                    vorticity,
                });
            }
        }

        LidDrivenCavityState {
            flow_field,
            particles: self.particles.clone(),
            time: self.time,
            reynolds: self.reynolds,
            lid_velocity: self.lid_velocity,
            viscosity: self.viscosity,
            divergence_norm: self.divergence_norm(),
            circulation: self.circulation(),
        }
    }
}

impl super::Simulator for LidDrivenCavitySimulator {
    fn step(&mut self, steps: u32) {
        for _ in 0..steps {
            self.u_prev.copy_from_slice(&self.u);
            self.v_prev.copy_from_slice(&self.v);
            Self::diffuse_scalar(self.size, self.dt, self.viscosity, &self.u_prev, &mut self.u);
            Self::diffuse_scalar(self.size, self.dt, self.viscosity, &self.v_prev, &mut self.v);
            self.apply_boundary_conditions();
            self.project();
            self.apply_boundary_conditions();
            self.u_prev.copy_from_slice(&self.u);
            self.v_prev.copy_from_slice(&self.v);
            self.advect_velocity();
            self.apply_boundary_conditions();
            self.project();
            self.apply_boundary_conditions();
            self.advect_particles();
            self.time += self.dt;
        }
    }

    fn reset(&mut self) {
        self.time = 0.0;
        self.reset_fields();
        self.seed_particles_grid(self.particle_capacity);
    }

    fn get_state(&self) -> serde_json::Value {
        serde_json::to_value(LidDrivenCavitySimulator::get_state(self)).unwrap_or_default()
    }

    fn set_parameter(&mut self, name: &str, value: f64) {
        match name {
            "reynolds" => self.reynolds = value.clamp(25.0, 10_000.0),
            "lid_velocity" => self.lid_velocity = value.clamp(0.1, 3.0),
            "viscosity" => self.viscosity = value.clamp(0.0001, 0.1),
            "dt" => self.dt = value.clamp(0.001, 0.03),
            _ => {}
        }

        if name != "viscosity" {
            self.update_viscosity();
        }
        self.apply_boundary_conditions();
    }

    fn load_preset(&mut self, name: &str) {
        LidDrivenCavitySimulator::load_preset(self, name);
    }

    fn export_data(&self) -> serde_json::Value {
        serde_json::to_value(LidDrivenCavitySimulator::get_state(self)).unwrap_or_default()
    }

    fn seed_particles(&mut self, count: usize) -> Result<serde_json::Value, String> {
        self.particle_capacity = count.clamp(64, 2048);
        self.seed_particles_grid(self.particle_capacity);
        Ok(serde_json::to_value(LidDrivenCavitySimulator::get_state(self)).unwrap_or_default())
    }
}
