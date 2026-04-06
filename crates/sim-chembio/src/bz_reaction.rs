use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const N: usize = 256;

/// Belousov-Zhabotinsky reaction: Oregonator model on a 2D grid.
/// Two variables: u (activator/HBrO2), v (inhibitor/Ce4+)
pub struct BZReaction {
    u: Vec<f64>,
    v: Vec<f64>,
    time: f64,
}

impl BZReaction {
    pub fn new() -> Self {
        let total = N * N;
        let mut u = vec![0.0; total];
        let mut v = vec![0.0; total];

        // Initial condition: random perturbations
        let mut seed: u64 = 42;
        for i in 0..total {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let r = (seed >> 33) as f64 / (u32::MAX as f64);
            u[i] = r * 0.5;
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let r2 = (seed >> 33) as f64 / (u32::MAX as f64);
            v[i] = r2 * 0.3;
        }

        Self { u, v, time: 0.0 }
    }
}

impl Simulation for BZReaction {
    fn id(&self) -> &'static str { "bz_reaction" }
    fn name(&self) -> &'static str { "Belousov-Zhabotinsky Reaction" }
    fn output_kind(&self) -> OutputKind {
        OutputKind::Field2D { width: N as u32, height: N as u32, components: 2 }
    }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "f_param", label: "f (stoichiometry)", min: 0.5, max: 3.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "q", label: "q", min: 0.0001, max: 0.01, default: 0.002, step: 0.0001 },
            ParamDescriptor { name: "epsilon", label: "ε (time scale ratio)", min: 0.01, max: 0.5, default: 0.1, step: 0.01 },
            ParamDescriptor { name: "du", label: "D_u (diffusion u)", min: 0.0, max: 1.0, default: 0.1, step: 0.01 },
            ParamDescriptor { name: "dv", label: "D_v (diffusion v)", min: 0.0, max: 1.0, default: 0.05, step: 0.01 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.001, max: 0.1, default: 0.02, step: 0.001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        *self = Self::new();
    }

    fn step(&mut self, params: &ParamSet) {
        let f = params.get("f_param");
        let q = params.get("q");
        let eps = params.get("epsilon");
        let du = params.get("du");
        let dv = params.get("dv");
        let dt = params.get("dt");
        let dx = 1.0 / N as f64;
        let dx2 = dx * dx;

        let mut u_new = self.u.clone();
        let mut v_new = self.v.clone();

        for j in 0..N {
            for i in 0..N {
                let idx = j * N + i;
                let ip = if i + 1 < N { idx + 1 } else { j * N };
                let im = if i > 0 { idx - 1 } else { j * N + N - 1 };
                let jp = if j + 1 < N { idx + N } else { i };
                let jm = if j > 0 { idx - N } else { (N - 1) * N + i };

                let lap_u = (self.u[ip] + self.u[im] + self.u[jp] + self.u[jm] - 4.0 * self.u[idx]) / dx2;
                let lap_v = (self.v[ip] + self.v[im] + self.v[jp] + self.v[jm] - 4.0 * self.v[idx]) / dx2;

                let u_val = self.u[idx];
                let v_val = self.v[idx];

                // Oregonator kinetics
                let reaction_u = (u_val - u_val * u_val - f * v_val * (u_val - q) / (u_val + q)) / eps;
                let reaction_v = u_val - v_val;

                u_new[idx] = (u_val + dt * (reaction_u + du * lap_u)).max(0.0);
                v_new[idx] = (v_val + dt * (reaction_v + dv * lap_v)).max(0.0);
            }
        }

        self.u = u_new;
        self.v = v_new;
        self.time += dt;
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        let mut field = vec![0.0f32; N * N * 2];
        for idx in 0..N * N {
            field[idx * 2] = self.u[idx] as f32;
            field[idx * 2 + 1] = self.v[idx] as f32;
        }
        buffer.write_f32_slice(&field);
        field.len() * 4
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { (N * N) as u32 }
    fn components(&self) -> u32 { 2 }
}
