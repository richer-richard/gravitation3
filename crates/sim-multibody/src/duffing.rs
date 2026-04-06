use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation, rk4_step,
};

const TRAIL_LEN: usize = 20000;

/// Duffing oscillator: x'' + delta*x' + alpha*x + beta*x^3 = gamma*cos(omega*t)
/// State: [x, x', t_phase]
pub struct Duffing {
    state: [f64; 3],
    time: f64,
    trail: Vec<f32>, // (x, x') phase portrait
    trail_head: usize,
    trail_count: usize,
}

impl Duffing {
    pub fn new() -> Self {
        Self {
            state: [1.0, 0.0, 0.0],
            time: 0.0,
            trail: vec![0.0f32; TRAIL_LEN * 2],
            trail_head: 0,
            trail_count: 0,
        }
    }
}

impl Simulation for Duffing {
    fn id(&self) -> &'static str { "duffing" }
    fn name(&self) -> &'static str { "Duffing Oscillator" }
    fn output_kind(&self) -> OutputKind { OutputKind::Points2D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "alpha", label: "α (stiffness)", min: -5.0, max: 5.0, default: -1.0, step: 0.1 },
            ParamDescriptor { name: "beta_coeff", label: "β (nonlinearity)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "delta", label: "δ (damping)", min: 0.0, max: 2.0, default: 0.3, step: 0.01 },
            ParamDescriptor { name: "gamma", label: "γ (drive amplitude)", min: 0.0, max: 2.0, default: 0.5, step: 0.01 },
            ParamDescriptor { name: "omega", label: "ω (drive frequency)", min: 0.1, max: 5.0, default: 1.2, step: 0.1 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.001, max: 0.05, default: 0.005, step: 0.001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.state = [1.0, 0.0, 0.0];
        self.time = 0.0;
        self.trail.fill(0.0);
        self.trail_head = 0;
        self.trail_count = 0;
    }

    fn step(&mut self, params: &ParamSet) {
        let alpha = params.get("alpha");
        let beta = params.get("beta_coeff");
        let delta = params.get("delta");
        let gamma = params.get("gamma");
        let omega = params.get("omega");
        let dt = params.get("dt");

        rk4_step(&mut self.state, dt, |s, d| {
            d[0] = s[1];
            d[1] = -delta * s[1] - alpha * s[0] - beta * s[0] * s[0] * s[0] + gamma * (omega * s[2]).cos();
            d[2] = 1.0; // time evolution
        });

        self.time += dt;

        let idx = self.trail_head * 2;
        self.trail[idx] = self.state[0] as f32;
        self.trail[idx + 1] = self.state[1] as f32;
        self.trail_head = (self.trail_head + 1) % TRAIL_LEN;
        if self.trail_count < TRAIL_LEN { self.trail_count += 1; }
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        if self.trail_count < TRAIL_LEN {
            let slice = &self.trail[..self.trail_count * 2];
            buffer.write_f32_slice(slice);
            slice.len() * 4
        } else {
            let oldest_start = self.trail_head * 2;
            buffer.write_f32_slice(&self.trail[oldest_start..]);
            buffer.write_f32_slice(&self.trail[..oldest_start]);
            self.trail_count * 2 * 4
        }
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { self.trail_count as u32 }
    fn components(&self) -> u32 { 2 }
}
