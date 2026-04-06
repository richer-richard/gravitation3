use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const N: usize = 128;

/// Couette flow: shear-driven fluid between two parallel plates.
pub struct CouetteFlow {
    u: Vec<f64>,
    v: Vec<f64>,
    p: Vec<f64>,
    time: f64,
}

impl CouetteFlow {
    pub fn new() -> Self {
        Self {
            u: vec![0.0; N * N],
            v: vec![0.0; N * N],
            p: vec![0.0; N * N],
            time: 0.0,
        }
    }
}

impl Simulation for CouetteFlow {
    fn id(&self) -> &'static str { "couette" }
    fn name(&self) -> &'static str { "Couette Flow" }
    fn output_kind(&self) -> OutputKind {
        OutputKind::Field2D { width: N as u32, height: N as u32, components: 3 }
    }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "re", label: "Reynolds Number", min: 10.0, max: 5000.0, default: 500.0, step: 10.0 },
            ParamDescriptor { name: "wall_velocity", label: "Top Wall Velocity", min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "perturbation", label: "Perturbation", min: 0.0, max: 0.5, default: 0.1, step: 0.01 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.0001, max: 0.01, default: 0.001, step: 0.0001 },
        ]
    }

    fn reset(&mut self, params: &ParamSet) {
        let perturbation = params.get("perturbation");
        let wall_vel = params.get("wall_velocity");
        for j in 0..N {
            let y = j as f64 / (N - 1) as f64;
            for i in 0..N {
                let idx = j * N + i;
                // Linear profile + perturbation
                self.u[idx] = wall_vel * y
                    + perturbation * (std::f64::consts::TAU * y).sin()
                        * (std::f64::consts::TAU * i as f64 / N as f64).sin();
                self.v[idx] = perturbation * 0.5
                    * (std::f64::consts::TAU * y).cos()
                    * (std::f64::consts::TAU * i as f64 / N as f64).cos();
            }
        }
        self.p.fill(0.0);
        self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let re = params.get("re");
        let wall_vel = params.get("wall_velocity");
        let dt = params.get("dt");
        let dx = 1.0 / N as f64;
        let nu = wall_vel / re;

        let mut u_new = self.u.clone();
        let mut v_new = self.v.clone();

        for j in 1..N - 1 {
            for i in 1..N - 1 {
                let idx = j * N + i;
                let uc = self.u[idx];
                let vc = self.v[idx];

                let lap_u = (self.u[idx + 1] + self.u[idx - 1] + self.u[idx + N] + self.u[idx - N] - 4.0 * uc) / (dx * dx);
                let lap_v = (self.v[idx + 1] + self.v[idx - 1] + self.v[idx + N] + self.v[idx - N] - 4.0 * vc) / (dx * dx);

                let du_dx = (self.u[idx + 1] - self.u[idx - 1]) / (2.0 * dx);
                let du_dy = (self.u[idx + N] - self.u[idx - N]) / (2.0 * dx);
                let dv_dx = (self.v[idx + 1] - self.v[idx - 1]) / (2.0 * dx);
                let dv_dy = (self.v[idx + N] - self.v[idx - N]) / (2.0 * dx);

                let dp_dx = (self.p[idx + 1] - self.p[idx - 1]) / (2.0 * dx);
                let dp_dy = (self.p[idx + N] - self.p[idx - N]) / (2.0 * dx);

                u_new[idx] = uc + dt * (-uc * du_dx - vc * du_dy - dp_dx + nu * lap_u);
                v_new[idx] = vc + dt * (-uc * dv_dx - vc * dv_dy - dp_dy + nu * lap_v);
            }
        }

        // BCs: bottom no-slip, top moves, periodic in x
        for i in 0..N {
            u_new[i] = 0.0; v_new[i] = 0.0;
            u_new[(N - 1) * N + i] = wall_vel; v_new[(N - 1) * N + i] = 0.0;
        }
        for j in 0..N {
            u_new[j * N] = u_new[j * N + N - 2];
            u_new[j * N + N - 1] = u_new[j * N + 1];
            v_new[j * N] = v_new[j * N + N - 2];
            v_new[j * N + N - 1] = v_new[j * N + 1];
        }

        self.u = u_new;
        self.v = v_new;
        self.time += dt;
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        let mut field = vec![0.0f32; N * N * 3];
        for idx in 0..N * N {
            let mag = (self.u[idx] * self.u[idx] + self.v[idx] * self.v[idx]).sqrt();
            field[idx * 3] = mag as f32;
            field[idx * 3 + 1] = self.u[idx] as f32;
            field[idx * 3 + 2] = self.v[idx] as f32;
        }
        buffer.write_f32_slice(&field);
        field.len() * 4
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { (N * N) as u32 }
    fn components(&self) -> u32 { 3 }
}
