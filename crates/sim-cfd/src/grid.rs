/// 2D staggered grid for incompressible Navier-Stokes.
/// Stores velocity components (u, v) and pressure (p).
pub struct Grid2D {
    pub width: usize,
    pub height: usize,
    pub u: Vec<f64>,  // x-velocity (width+1 x height)
    pub v: Vec<f64>,  // y-velocity (width x height+1)
    pub p: Vec<f64>,  // pressure (width x height)
    pub dx: f64,
    pub dy: f64,
}

impl Grid2D {
    pub fn new(width: usize, height: usize) -> Self {
        let dx = 1.0 / width as f64;
        let dy = 1.0 / height as f64;
        Self {
            width,
            height,
            u: vec![0.0; (width + 1) * height],
            v: vec![0.0; width * (height + 1)],
            p: vec![0.0; width * height],
            dx,
            dy,
        }
    }

    pub fn u_at(&self, i: usize, j: usize) -> f64 {
        self.u[j * (self.width + 1) + i]
    }

    pub fn v_at(&self, i: usize, j: usize) -> f64 {
        self.v[j * self.width + i]
    }

    pub fn p_at(&self, i: usize, j: usize) -> f64 {
        self.p[j * self.width + i]
    }

    pub fn cell_velocity(&self, i: usize, j: usize) -> (f64, f64) {
        let uc = 0.5 * (self.u_at(i, j) + self.u_at(i + 1, j));
        let vc = 0.5 * (self.v_at(i, j) + self.v_at(i, j + 1));
        (uc, vc)
    }

    /// Write velocity magnitude + vx + vy for each cell as f32 (3 components per cell).
    pub fn write_velocity_field(&self, out: &mut [f32]) {
        for j in 0..self.height {
            for i in 0..self.width {
                let (uc, vc) = self.cell_velocity(i, j);
                let mag = (uc * uc + vc * vc).sqrt();
                let idx = (j * self.width + i) * 3;
                out[idx] = mag as f32;
                out[idx + 1] = uc as f32;
                out[idx + 2] = vc as f32;
            }
        }
    }

    pub fn reset(&mut self) {
        self.u.fill(0.0);
        self.v.fill(0.0);
        self.p.fill(0.0);
    }
}
