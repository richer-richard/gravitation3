use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation, rk4_step,
};

const TRAIL_LEN: usize = 8000;

/// State: [x1,y1,vx1,vy1, x2,y2,vx2,vy2, x3,y3,vx3,vy3]
pub struct ThreeBody {
    state: [f64; 12],
    time: f64,
    trails: [Vec<f32>; 3], // 3 trails, each x,y interleaved
    trail_heads: [usize; 3],
    trail_count: usize,
}

impl ThreeBody {
    pub fn new() -> Self {
        Self {
            state: [
                -1.0, 0.0, 0.0, -0.5,    // body 1
                 1.0, 0.0, 0.0,  0.5,     // body 2
                 0.0, 1.0, 0.3, 0.0,      // body 3
            ],
            time: 0.0,
            trails: [
                vec![0.0f32; TRAIL_LEN * 2],
                vec![0.0f32; TRAIL_LEN * 2],
                vec![0.0f32; TRAIL_LEN * 2],
            ],
            trail_heads: [0; 3],
            trail_count: 0,
        }
    }
}

impl Simulation for ThreeBody {
    fn id(&self) -> &'static str { "three_body" }
    fn name(&self) -> &'static str { "Three-Body Problem" }
    fn output_kind(&self) -> OutputKind { OutputKind::Bodies { count: 3 } }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "m1", label: "Mass 1", min: 0.1, max: 10.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "m2", label: "Mass 2", min: 0.1, max: 10.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "m3", label: "Mass 3", min: 0.1, max: 10.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "g_const", label: "G", min: 0.1, max: 10.0, default: 1.0, step: 0.1 },
            ParamDescriptor { name: "softening", label: "Softening ε", min: 0.001, max: 0.5, default: 0.05, step: 0.001 },
            ParamDescriptor { name: "dt", label: "Time Step", min: 0.0001, max: 0.01, default: 0.001, step: 0.0001 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.state = [
            -1.0, 0.0, 0.0, -0.5,
             1.0, 0.0, 0.0,  0.5,
             0.0, 1.0, 0.3, 0.0,
        ];
        self.time = 0.0;
        for t in &mut self.trails { t.fill(0.0); }
        self.trail_heads = [0; 3];
        self.trail_count = 0;
    }

    fn step(&mut self, params: &ParamSet) {
        let masses = [params.get("m1"), params.get("m2"), params.get("m3")];
        let g = params.get("g_const");
        let eps = params.get("softening");
        let dt = params.get("dt");
        let eps2 = eps * eps;

        rk4_step(&mut self.state, dt, |s, d| {
            for i in 0..3 {
                let ix = i * 4;
                d[ix] = s[ix + 2];     // dx = vx
                d[ix + 1] = s[ix + 3]; // dy = vy
                let mut ax = 0.0;
                let mut ay = 0.0;
                for j in 0..3 {
                    if i == j { continue; }
                    let jx = j * 4;
                    let dx = s[jx] - s[ix];
                    let dy = s[jx + 1] - s[ix + 1];
                    let r2 = dx * dx + dy * dy + eps2;
                    let r3 = r2 * r2.sqrt();
                    ax += g * masses[j] * dx / r3;
                    ay += g * masses[j] * dy / r3;
                }
                d[ix + 2] = ax;
                d[ix + 3] = ay;
            }
        });

        self.time += dt;

        for i in 0..3 {
            let idx = self.trail_heads[i] * 2;
            self.trails[i][idx] = self.state[i * 4] as f32;
            self.trails[i][idx + 1] = self.state[i * 4 + 1] as f32;
            self.trail_heads[i] = (self.trail_heads[i] + 1) % TRAIL_LEN;
        }
        if self.trail_count < TRAIL_LEN { self.trail_count += 1; }
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        // Write body positions: [x1,y1, x2,y2, x3,y3, trail_count]
        let body_data = [
            self.state[0] as f32, self.state[1] as f32,
            self.state[4] as f32, self.state[5] as f32,
            self.state[8] as f32, self.state[9] as f32,
            self.trail_count as f32,
        ];
        buffer.write_f32_slice(&body_data);
        let mut total = body_data.len() * 4;

        for i in 0..3 {
            if self.trail_count < TRAIL_LEN {
                let slice = &self.trails[i][..self.trail_count * 2];
                buffer.write_f32_slice(slice);
                total += slice.len() * 4;
            } else {
                let oldest = self.trail_heads[i] * 2;
                buffer.write_f32_slice(&self.trails[i][oldest..]);
                buffer.write_f32_slice(&self.trails[i][..oldest]);
                total += TRAIL_LEN * 2 * 4;
            }
        }
        total
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { 3 + self.trail_count as u32 * 3 }
    fn components(&self) -> u32 { 2 }
}
