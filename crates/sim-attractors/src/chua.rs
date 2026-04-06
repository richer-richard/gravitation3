use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation, rk4_step,
};

const TRAIL_LEN: usize = 20000;

pub struct Chua {
    state: [f64; 3],
    time: f64,
    trail: Vec<f32>,
    trail_head: usize,
    trail_count: usize,
}

impl Chua {
    pub fn new() -> Self {
        Self {
            state: [0.7, 0.0, 0.0],
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

impl Simulation for Chua {
    fn id(&self) -> &'static str { "chua" }
    fn name(&self) -> &'static str { "Chua's Circuit" }
    fn output_kind(&self) -> OutputKind { OutputKind::Particles3D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "alpha", label: "α (Alpha)", min: 0.0, max: 20.0, default: 15.6, step: 0.1 },
            ParamDescriptor { name: "beta", label: "β (Beta)", min: 0.0, max: 40.0, default: 28.0, step: 0.1 },
            ParamDescriptor { name: "m0", label: "m₀", min: -2.0, max: 0.0, default: -1.143, step: 0.001 },
            ParamDescriptor { name: "m1", label: "m₁", min: -1.0, max: 0.0, default: -0.714, step: 0.001 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.001, max: 0.05, default: 0.005, step: 0.001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.state = [0.7, 0.0, 0.0];
        self.time = 0.0;
        self.trail.fill(0.0);
        self.trail_head = 0;
        self.trail_count = 0;
    }

    fn step(&mut self, params: &ParamSet) {
        let alpha = params.get("alpha");
        let beta = params.get("beta");
        let m0 = params.get("m0");
        let m1 = params.get("m1");
        let dt = params.get("dt");

        rk4_step(&mut self.state, dt, |s, d| {
            // Chua's diode nonlinearity
            let h = m1 * s[0] + 0.5 * (m0 - m1) * ((s[0] + 1.0).abs() - (s[0] - 1.0).abs());
            d[0] = alpha * (s[1] - s[0] - h);
            d[1] = s[0] - s[1] + s[2];
            d[2] = -beta * s[1];
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
