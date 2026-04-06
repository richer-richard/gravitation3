use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation, rk4_step,
};

const TRAIL_LEN: usize = 20000;

pub struct Aizawa {
    state: [f64; 3],
    time: f64,
    trail: Vec<f32>,
    trail_head: usize,
    trail_count: usize,
}

impl Aizawa {
    pub fn new() -> Self {
        Self {
            state: [0.1, 0.0, 0.0],
            time: 0.0,
            trail: vec![0.0f32; TRAIL_LEN * 3],
            trail_head: 0,
            trail_count: 0,
        }
    }

    fn push_trail(&mut self) {
        let idx = self.trail_head * 3;
        self.trail[idx] = self.state[0] as f32;
        self.trail[idx + 1] = self.state[1] as f32;
        self.trail[idx + 2] = self.state[2] as f32;
        self.trail_head = (self.trail_head + 1) % TRAIL_LEN;
        if self.trail_count < TRAIL_LEN {
            self.trail_count += 1;
        }
    }
}

impl Simulation for Aizawa {
    fn id(&self) -> &'static str { "aizawa" }
    fn name(&self) -> &'static str { "Aizawa Attractor" }
    fn output_kind(&self) -> OutputKind { OutputKind::Particles3D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "a", label: "a", min: 0.0, max: 2.0, default: 0.95, step: 0.01 },
            ParamDescriptor { name: "b", label: "b", min: 0.0, max: 2.0, default: 0.7, step: 0.01 },
            ParamDescriptor { name: "c", label: "c", min: 0.0, max: 2.0, default: 0.6, step: 0.01 },
            ParamDescriptor { name: "d", label: "d", min: 0.0, max: 5.0, default: 3.5, step: 0.1 },
            ParamDescriptor { name: "e", label: "e", min: 0.0, max: 1.0, default: 0.25, step: 0.01 },
            ParamDescriptor { name: "f", label: "f", min: 0.0, max: 1.0, default: 0.1, step: 0.01 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.001, max: 0.05, default: 0.005, step: 0.001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.state = [0.1, 0.0, 0.0];
        self.time = 0.0;
        self.trail.fill(0.0);
        self.trail_head = 0;
        self.trail_count = 0;
    }

    fn step(&mut self, params: &ParamSet) {
        let a = params.get("a");
        let b = params.get("b");
        let c = params.get("c");
        let d = params.get("d");
        let e = params.get("e");
        let f = params.get("f");
        let dt = params.get("dt");

        rk4_step(&mut self.state, dt, |s, deriv| {
            let x = s[0];
            let y = s[1];
            let z = s[2];
            deriv[0] = (z - b) * x - d * y;
            deriv[1] = d * x + (z - b) * y;
            deriv[2] = c + a * z - z * z * z / 3.0
                - (x * x + y * y) * (1.0 + e * z)
                + f * z * x * x * x;
        });

        self.time += dt;
        self.push_trail();
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        if self.trail_count < TRAIL_LEN {
            let slice = &self.trail[..self.trail_count * 3];
            buffer.write_f32_slice(slice);
            slice.len() * 4
        } else {
            let oldest_start = self.trail_head * 3;
            buffer.write_f32_slice(&self.trail[oldest_start..]);
            buffer.write_f32_slice(&self.trail[..oldest_start]);
            self.trail_count * 3 * 4
        }
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics { lyapunov_exponent: f64::NAN, total_energy: f64::NAN, max_divergence: f64::NAN } }
    fn element_count(&self) -> u32 { self.trail_count as u32 }
    fn components(&self) -> u32 { 3 }
}
