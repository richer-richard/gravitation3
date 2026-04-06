use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation, rk4_step,
};

const TRAIL_LEN: usize = 20000;

/// 3-species Lotka-Volterra: predator-prey with chaotic dynamics.
/// State: [x, y, z] = populations of species 1, 2, 3
pub struct LotkaVolterra {
    state: [f64; 3],
    time: f64,
    trail: Vec<f32>, // x, y, z interleaved
    trail_head: usize,
    trail_count: usize,
}

impl LotkaVolterra {
    pub fn new() -> Self {
        Self {
            state: [1.0, 1.0, 1.0],
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
        if self.trail_count < TRAIL_LEN { self.trail_count += 1; }
    }
}

impl Simulation for LotkaVolterra {
    fn id(&self) -> &'static str { "lotka_volterra" }
    fn name(&self) -> &'static str { "Lotka-Volterra (3 Species)" }
    fn output_kind(&self) -> OutputKind { OutputKind::Particles3D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "a12", label: "a₁₂ (1 eats 2)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "a13", label: "a₁₃ (1 eats 3)", min: 0.0, max: 5.0, default: 0.5, step: 0.1 },
            ParamDescriptor { name: "a21", label: "a₂₁ (2 eats 1)", min: 0.0, max: 5.0, default: 0.5, step: 0.1 },
            ParamDescriptor { name: "a23", label: "a₂₃ (2 eats 3)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "a31", label: "a₃₁ (3 eats 1)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "a32", label: "a₃₂ (3 eats 2)", min: 0.0, max: 5.0, default: 0.5, step: 0.1 },
            ParamDescriptor { name: "r1", label: "r₁ (growth 1)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "r2", label: "r₂ (growth 2)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "r3", label: "r₃ (growth 3)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.001, max: 0.05, default: 0.01, step: 0.001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.state = [1.0, 1.0, 1.0];
        self.time = 0.0;
        self.trail.fill(0.0);
        self.trail_head = 0;
        self.trail_count = 0;
    }

    fn step(&mut self, params: &ParamSet) {
        let a12 = params.get("a12");
        let a13 = params.get("a13");
        let a21 = params.get("a21");
        let a23 = params.get("a23");
        let a31 = params.get("a31");
        let a32 = params.get("a32");
        let r1 = params.get("r1");
        let r2 = params.get("r2");
        let r3 = params.get("r3");
        let dt = params.get("dt");

        rk4_step(&mut self.state, dt, |s, d| {
            d[0] = s[0] * (r1 - a12 * s[1] - a13 * s[2]);
            d[1] = s[1] * (r2 - a21 * s[0] - a23 * s[2]);
            d[2] = s[2] * (r3 - a31 * s[0] - a32 * s[1]);
        });

        // Clamp to prevent negative populations
        for v in &mut self.state {
            if *v < 0.0 { *v = 0.0; }
        }

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
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { self.trail_count as u32 }
    fn components(&self) -> u32 { 3 }
}
