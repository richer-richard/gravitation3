use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};
use crate::grid::Grid2D;

const DEFAULT_N: usize = 128;

pub struct LidDrivenCavity {
    grid: Grid2D,
    time: f64,
}

impl LidDrivenCavity {
    pub fn new() -> Self {
        let grid = Grid2D::new(DEFAULT_N, DEFAULT_N);
        Self { grid, time: 0.0 }
    }

    fn pressure_solve(&mut self, dt: f64) {
        let n = self.grid.width;
        let dx = self.grid.dx;
        let dy = self.grid.dy;

        // Jacobi iteration for pressure Poisson equation
        let mut p_new = self.grid.p.clone();
        for _ in 0..50 {
            for j in 0..n {
                for i in 0..n {
                    let idx = j * n + i;
                    let p_left = if i > 0 { self.grid.p[idx - 1] } else { self.grid.p[idx] };
                    let p_right = if i < n - 1 { self.grid.p[idx + 1] } else { self.grid.p[idx] };
                    let p_bottom = if j > 0 { self.grid.p[idx - n] } else { self.grid.p[idx] };
                    let p_top = if j < n - 1 { self.grid.p[idx + n] } else { self.grid.p[idx] };

                    let div = (self.grid.u_at(i + 1, j) - self.grid.u_at(i, j)) / dx
                        + (self.grid.v_at(i, j + 1) - self.grid.v_at(i, j)) / dy;

                    p_new[idx] = 0.25 * (p_left + p_right + p_bottom + p_top - dx * dx * div / dt);
                }
            }
            self.grid.p.copy_from_slice(&p_new);
        }
    }
}

impl Simulation for LidDrivenCavity {
    fn id(&self) -> &'static str { "lid_driven" }
    fn name(&self) -> &'static str { "Lid-Driven Cavity" }
    fn output_kind(&self) -> OutputKind {
        OutputKind::Field2D { width: DEFAULT_N as u32, height: DEFAULT_N as u32, components: 3 }
    }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "re", label: "Reynolds Number", min: 10.0, max: 10000.0, default: 400.0, step: 10.0 },
            ParamDescriptor { name: "lid_velocity", label: "Lid Velocity", min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.0001, max: 0.01, default: 0.001, step: 0.0001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.grid.reset();
        self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let re = params.get("re");
        let lid_vel = params.get("lid_velocity");
        let dt = params.get("dt");
        let n = self.grid.width;
        let dx = self.grid.dx;
        let dy = self.grid.dy;
        let nu = lid_vel / re; // kinematic viscosity

        // Set lid boundary condition (top wall)
        for i in 0..=n {
            self.grid.u[n.saturating_sub(1) * (n + 1) + i] = lid_vel;
        }

        // Advection + diffusion for u
        let mut u_new = self.grid.u.clone();
        for j in 1..n - 1 {
            for i in 1..n {
                let idx = j * (n + 1) + i;
                let u_c = self.grid.u[idx];
                let v_c = 0.25 * (self.grid.v_at(i.saturating_sub(1), j) + self.grid.v_at(i, j)
                    + self.grid.v_at(i.saturating_sub(1), j + 1) + self.grid.v_at(i, j + 1));

                let du_dx = (self.grid.u[idx + 1] - self.grid.u[idx - 1]) / (2.0 * dx);
                let du_dy = (self.grid.u[idx + (n + 1)] - self.grid.u[idx - (n + 1)]) / (2.0 * dy);
                let d2u = (self.grid.u[idx + 1] - 2.0 * u_c + self.grid.u[idx - 1]) / (dx * dx)
                    + (self.grid.u[idx + (n + 1)] - 2.0 * u_c + self.grid.u[idx - (n + 1)]) / (dy * dy);

                u_new[idx] = u_c + dt * (-u_c * du_dx - v_c * du_dy + nu * d2u);
            }
        }

        // Advection + diffusion for v
        let mut v_new = self.grid.v.clone();
        for j in 1..n {
            for i in 1..n - 1 {
                let idx = j * n + i;
                let v_c = self.grid.v[idx];
                let u_c = 0.25 * (self.grid.u_at(i, j.saturating_sub(1)) + self.grid.u_at(i + 1, j.saturating_sub(1))
                    + self.grid.u_at(i, j) + self.grid.u_at(i + 1, j));

                let dv_dx = (self.grid.v[idx + 1] - self.grid.v[idx - 1]) / (2.0 * dx);
                let dv_dy = (self.grid.v[idx + n] - self.grid.v[idx - n]) / (2.0 * dy);
                let d2v = (self.grid.v[idx + 1] - 2.0 * v_c + self.grid.v[idx - 1]) / (dx * dx)
                    + (self.grid.v[idx + n] - 2.0 * v_c + self.grid.v[idx - n]) / (dy * dy);

                v_new[idx] = v_c + dt * (-u_c * dv_dx - v_c * dv_dy + nu * d2v);
            }
        }

        self.grid.u = u_new;
        self.grid.v = v_new;

        // Enforce boundary conditions
        // Bottom wall (j=0): no-slip
        for i in 0..=n { self.grid.u[i] = 0.0; }
        for i in 0..n { self.grid.v[i] = 0.0; }
        // Top wall (j=n-1): lid velocity
        for i in 0..=n { self.grid.u[(n - 1) * (n + 1) + i] = lid_vel; }
        for i in 0..n { self.grid.v[n * n + i] = 0.0; }
        // Left wall (i=0)
        for j in 0..n { self.grid.u[j * (n + 1)] = 0.0; self.grid.v[j * n] = 0.0; }
        // Right wall (i=n-1)
        for j in 0..n { self.grid.u[j * (n + 1) + n] = 0.0; }
        // v at right boundary already handled by initialization

        self.pressure_solve(dt);

        // Pressure correction
        for j in 1..n - 1 {
            for i in 1..n {
                let dp_dx = (self.grid.p_at(i, j) - self.grid.p_at(i.saturating_sub(1), j)) / dx;
                self.grid.u[j * (n + 1) + i] -= dt * dp_dx;
            }
        }
        for j in 1..n {
            for i in 1..n - 1 {
                let dp_dy = (self.grid.p_at(i, j) - self.grid.p_at(i, j.saturating_sub(1))) / dy;
                self.grid.v[j * n + i] -= dt * dp_dy;
            }
        }

        self.time += dt;
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        let mut field_buf = vec![0.0f32; DEFAULT_N * DEFAULT_N * 3];
        self.grid.write_velocity_field(&mut field_buf);
        buffer.write_f32_slice(&field_buf);
        field_buf.len() * 4
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { (DEFAULT_N * DEFAULT_N) as u32 }
    fn components(&self) -> u32 { 3 }
}
