use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const N: usize = 128;

pub struct RayleighBenard {
    // Simplified Boussinesq: velocity (u,v), temperature T, pressure p
    u: Vec<f64>,
    v: Vec<f64>,
    t: Vec<f64>,
    p: Vec<f64>,
    time: f64,
}

impl RayleighBenard {
    pub fn new() -> Self {
        let mut t = vec![0.0; N * N];
        // Initial temperature: linear gradient + small perturbation
        for j in 0..N {
            for i in 0..N {
                let y = j as f64 / N as f64;
                t[j * N + i] = 1.0 - y + 0.01 * (std::f64::consts::TAU * i as f64 / N as f64).sin();
            }
        }
        Self {
            u: vec![0.0; N * N],
            v: vec![0.0; N * N],
            t,
            p: vec![0.0; N * N],
            time: 0.0,
        }
    }
}

impl Simulation for RayleighBenard {
    fn id(&self) -> &'static str { "rayleigh_benard" }
    fn name(&self) -> &'static str { "Rayleigh-Bénard Convection" }
    fn output_kind(&self) -> OutputKind {
        OutputKind::Field2D { width: N as u32, height: N as u32, components: 3 }
    }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "ra", label: "Rayleigh Number", min: 100.0, max: 100000.0, default: 10000.0, step: 100.0 },
            ParamDescriptor { name: "pr", label: "Prandtl Number", min: 0.1, max: 10.0, default: 0.71, step: 0.01 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.00001, max: 0.001, default: 0.0001, step: 0.00001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.u.fill(0.0);
        self.v.fill(0.0);
        self.p.fill(0.0);
        for j in 0..N {
            for i in 0..N {
                let y = j as f64 / N as f64;
                self.t[j * N + i] = 1.0 - y + 0.01 * (std::f64::consts::TAU * i as f64 / N as f64).sin();
            }
        }
        self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let ra = params.get("ra");
        let pr = params.get("pr");
        let dt = params.get("dt");
        let dx = 1.0 / N as f64;
        let nu = (pr / ra).sqrt();
        let kappa = 1.0 / (pr * ra).sqrt();

        let mut u_new = self.u.clone();
        let mut v_new = self.v.clone();
        let mut t_new = self.t.clone();

        for j in 1..N - 1 {
            for i in 1..N - 1 {
                let idx = j * N + i;
                let u_c = self.u[idx];
                let v_c = self.v[idx];

                // Laplacians
                let lap_u = (self.u[idx + 1] + self.u[idx - 1] + self.u[idx + N] + self.u[idx - N] - 4.0 * u_c) / (dx * dx);
                let lap_v = (self.v[idx + 1] + self.v[idx - 1] + self.v[idx + N] + self.v[idx - N] - 4.0 * v_c) / (dx * dx);
                let lap_t = (self.t[idx + 1] + self.t[idx - 1] + self.t[idx + N] + self.t[idx - N] - 4.0 * self.t[idx]) / (dx * dx);

                // Advection (upwind)
                let du_dx = (self.u[idx + 1] - self.u[idx - 1]) / (2.0 * dx);
                let du_dy = (self.u[idx + N] - self.u[idx - N]) / (2.0 * dx);
                let dv_dx = (self.v[idx + 1] - self.v[idx - 1]) / (2.0 * dx);
                let dv_dy = (self.v[idx + N] - self.v[idx - N]) / (2.0 * dx);
                let dt_dx = (self.t[idx + 1] - self.t[idx - 1]) / (2.0 * dx);
                let dt_dy = (self.t[idx + N] - self.t[idx - N]) / (2.0 * dx);

                // Pressure gradient
                let dp_dx = (self.p[idx + 1] - self.p[idx - 1]) / (2.0 * dx);
                let dp_dy = (self.p[idx + N] - self.p[idx - N]) / (2.0 * dx);

                u_new[idx] = u_c + dt * (-u_c * du_dx - v_c * du_dy - dp_dx + nu * lap_u);
                v_new[idx] = v_c + dt * (-u_c * dv_dx - v_c * dv_dy - dp_dy + nu * lap_v + self.t[idx]);
                t_new[idx] = self.t[idx] + dt * (-u_c * dt_dx - v_c * dt_dy + kappa * lap_t);
            }
        }

        // Boundary conditions
        // Bottom (j=0): T=1, no-slip
        // Top (j=N-1): T=0, no-slip
        for i in 0..N {
            t_new[i] = 1.0;
            t_new[(N - 1) * N + i] = 0.0;
            u_new[i] = 0.0; v_new[i] = 0.0;
            u_new[(N - 1) * N + i] = 0.0; v_new[(N - 1) * N + i] = 0.0;
        }
        // Periodic in x
        for j in 0..N {
            u_new[j * N] = u_new[j * N + N - 2];
            u_new[j * N + N - 1] = u_new[j * N + 1];
            v_new[j * N] = v_new[j * N + N - 2];
            v_new[j * N + N - 1] = v_new[j * N + 1];
            t_new[j * N] = t_new[j * N + N - 2];
            t_new[j * N + N - 1] = t_new[j * N + 1];
        }

        self.u = u_new;
        self.v = v_new;
        self.t = t_new;

        // Simple pressure correction (Jacobi)
        for _ in 0..20 {
            let mut p_new = self.p.clone();
            for j in 1..N - 1 {
                for i in 1..N - 1 {
                    let idx = j * N + i;
                    let div = (self.u[idx + 1] - self.u[idx - 1] + self.v[idx + N] - self.v[idx - N]) / (2.0 * dx);
                    p_new[idx] = 0.25 * (self.p[idx + 1] + self.p[idx - 1] + self.p[idx + N] + self.p[idx - N] - dx * dx * div / dt);
                }
            }
            self.p = p_new;
        }

        self.time += dt;
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        // Output: temperature, vx, vy per cell
        let mut field = vec![0.0f32; N * N * 3];
        for j in 0..N {
            for i in 0..N {
                let idx = j * N + i;
                field[idx * 3] = self.t[idx] as f32;
                field[idx * 3 + 1] = self.u[idx] as f32;
                field[idx * 3 + 2] = self.v[idx] as f32;
            }
        }
        buffer.write_f32_slice(&field);
        field.len() * 4
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { (N * N) as u32 }
    fn components(&self) -> u32 { 3 }
}
