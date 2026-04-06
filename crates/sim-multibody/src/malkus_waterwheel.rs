use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation, rk4_step,
};

const TRAIL_LEN: usize = 10000;

/// Malkus waterwheel: equivalent to Lorenz equations.
/// State: [a1, b1, omega] where a1, b1 are first Fourier mode coefficients
/// and omega is the angular velocity.
pub struct MalkusWaterwheel {
    state: [f64; 3],
    time: f64,
    trail: Vec<f32>,
    trail_head: usize,
    trail_count: usize,
}

impl MalkusWaterwheel {
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

impl Simulation for MalkusWaterwheel {
    fn id(&self) -> &'static str { "malkus_waterwheel" }
    fn name(&self) -> &'static str { "Malkus Waterwheel" }
    fn output_kind(&self) -> OutputKind { OutputKind::Particles3D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "q", label: "Q (inflow)", min: 0.0, max: 20.0, default: 5.0, step: 0.1 },
            ParamDescriptor { name: "k", label: "K (leak rate)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "nu", label: "ν (friction)", min: 0.0, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "r", label: "R (radius)", min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "inertia", label: "I (inertia)", min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "g", label: "g", min: 0.1, max: 20.0, default: 9.81, step: 0.1 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.001, max: 0.05, default: 0.005, step: 0.001 },
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
        let q = params.get("q");
        let k = params.get("k");
        let nu = params.get("nu");
        let r = params.get("r");
        let inertia = params.get("inertia");
        let g = params.get("g");
        let dt = params.get("dt");

        rk4_step(&mut self.state, dt, |s, d| {
            // da1/dt = omega * b1 - k * a1
            d[0] = s[2] * s[1] - k * s[0];
            // db1/dt = -omega * a1 - k * b1 + q
            d[1] = -s[2] * s[0] - k * s[1] + q;
            // domega/dt = (-nu * omega + g * r * a1) / I
            d[2] = (-nu * s[2] + g * r * s[0]) / inertia;
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
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { self.trail_count as u32 }
    fn components(&self) -> u32 { 3 }
}
