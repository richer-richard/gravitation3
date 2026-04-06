use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation, rk4_step,
};

const TRAIL_LEN: usize = 10000;

/// State: [theta1, omega1, theta2, omega2]
pub struct DoublePendulum {
    state: [f64; 4],
    time: f64,
    trail: Vec<f32>, // x2, y2 interleaved (tip of second pendulum)
    trail_head: usize,
    trail_count: usize,
}

impl DoublePendulum {
    pub fn new() -> Self {
        Self {
            state: [std::f64::consts::PI / 2.0, 0.0, std::f64::consts::PI, 0.0],
            time: 0.0,
            trail: vec![0.0f32; TRAIL_LEN * 2],
            trail_head: 0,
            trail_count: 0,
        }
    }

    fn tip_position(&self, params: &ParamSet) -> (f32, f32) {
        let l1 = params.get("l1");
        let l2 = params.get("l2");
        let x1 = l1 * self.state[0].sin();
        let y1 = -l1 * self.state[0].cos();
        let x2 = x1 + l2 * self.state[2].sin();
        let y2 = y1 - l2 * self.state[2].cos();
        (x2 as f32, y2 as f32)
    }
}

impl Simulation for DoublePendulum {
    fn id(&self) -> &'static str { "double_pendulum" }
    fn name(&self) -> &'static str { "Double Pendulum" }
    fn output_kind(&self) -> OutputKind { OutputKind::Bodies { count: 2 } }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "m1", label: "Mass 1", min: 0.1, max: 10.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "m2", label: "Mass 2", min: 0.1, max: 10.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "l1", label: "Length 1", min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "l2", label: "Length 2", min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "g", label: "Gravity", min: 0.1, max: 20.0, default: 9.81, step: 0.1 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.0001, max: 0.01, default: 0.002, step: 0.0001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.state = [std::f64::consts::PI / 2.0, 0.0, std::f64::consts::PI, 0.0];
        self.time = 0.0;
        self.trail.fill(0.0);
        self.trail_head = 0;
        self.trail_count = 0;
    }

    fn step(&mut self, params: &ParamSet) {
        let m1 = params.get("m1");
        let m2 = params.get("m2");
        let l1 = params.get("l1");
        let l2 = params.get("l2");
        let g = params.get("g");
        let dt = params.get("dt");

        rk4_step(&mut self.state, dt, |s, d| {
            let t1 = s[0]; let w1 = s[1];
            let t2 = s[2]; let w2 = s[3];
            let delta = t1 - t2;
            let den = 2.0 * m1 + m2 - m2 * (2.0 * delta).cos();

            d[0] = w1;
            d[1] = (-g * (2.0 * m1 + m2) * t1.sin()
                - m2 * g * (t1 - 2.0 * t2).sin()
                - 2.0 * delta.sin() * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * delta.cos()))
                / (l1 * den);
            d[2] = w2;
            d[3] = (2.0 * delta.sin()
                * (w1 * w1 * l1 * (m1 + m2)
                    + g * (m1 + m2) * t1.cos()
                    + w2 * w2 * l2 * m2 * delta.cos()))
                / (l2 * den);
        });

        self.time += dt;

        let (tx, ty) = self.tip_position(params);
        let idx = self.trail_head * 2;
        self.trail[idx] = tx;
        self.trail[idx + 1] = ty;
        self.trail_head = (self.trail_head + 1) % TRAIL_LEN;
        if self.trail_count < TRAIL_LEN { self.trail_count += 1; }
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        let params = ParamSet::from_defaults(&self.param_schema());
        let l1 = params.get("l1");
        let l2 = params.get("l2");

        // Body 1 position
        let x1 = (l1 * self.state[0].sin()) as f32;
        let y1 = (-l1 * self.state[0].cos()) as f32;
        // Body 2 position
        let x2 = x1 + (l2 * self.state[2].sin()) as f32;
        let y2 = y1 - (l2 * self.state[2].cos()) as f32;

        // Write: [x1, y1, x2, y2, theta1, theta2, trail_count, ...trail]
        let body_data = [x1, y1, x2, y2, self.state[0] as f32, self.state[2] as f32, self.trail_count as f32];
        buffer.write_f32_slice(&body_data);

        // Write trail
        if self.trail_count < TRAIL_LEN {
            buffer.write_f32_slice(&self.trail[..self.trail_count * 2]);
        } else {
            let oldest_start = self.trail_head * 2;
            buffer.write_f32_slice(&self.trail[oldest_start..]);
            buffer.write_f32_slice(&self.trail[..oldest_start]);
        }

        let trail_bytes = self.trail_count * 2 * 4;
        body_data.len() * 4 + trail_bytes
    }

    fn time(&self) -> f64 { self.time }

    fn diagnostics(&self) -> Diagnostics {
        let params = ParamSet::from_defaults(&self.param_schema());
        let m1 = params.get("m1");
        let m2 = params.get("m2");
        let l1 = params.get("l1");
        let l2 = params.get("l2");
        let g = params.get("g");

        let ke = 0.5 * m1 * l1 * l1 * self.state[1] * self.state[1]
            + 0.5 * m2 * (l1 * l1 * self.state[1] * self.state[1]
                + l2 * l2 * self.state[3] * self.state[3]
                + 2.0 * l1 * l2 * self.state[1] * self.state[3] * (self.state[0] - self.state[2]).cos());
        let pe = -(m1 + m2) * g * l1 * self.state[0].cos()
            - m2 * g * l2 * self.state[2].cos();

        Diagnostics {
            total_energy: ke + pe,
            lyapunov_exponent: f64::NAN,
            max_divergence: f64::NAN,
        }
    }

    fn element_count(&self) -> u32 { 2 + self.trail_count as u32 }
    fn components(&self) -> u32 { 2 }
}
