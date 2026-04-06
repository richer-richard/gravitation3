use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const MAX_POINTS: usize = 100000;

pub struct Ikeda {
    x: f64, y: f64,
    points: Vec<f32>,
    point_count: usize,
    time: f64,
}

impl Ikeda {
    pub fn new() -> Self {
        Self { x: 0.1, y: 0.1, points: vec![0.0f32; MAX_POINTS * 2], point_count: 0, time: 0.0 }
    }
}

impl Simulation for Ikeda {
    fn id(&self) -> &'static str { "ikeda" }
    fn name(&self) -> &'static str { "Ikeda Map" }
    fn output_kind(&self) -> OutputKind { OutputKind::Points2D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "u", label: "u", min: 0.0, max: 1.0, default: 0.918, step: 0.001 },
            ParamDescriptor { name: "iters_per_step", label: "Iterations/Step", min: 10.0, max: 1000.0, default: 100.0, step: 10.0 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.x = 0.1; self.y = 0.1;
        self.point_count = 0; self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let u = params.get("u");
        let n = params.get("iters_per_step") as usize;

        for _ in 0..n {
            let t = 0.4 - 6.0 / (1.0 + self.x * self.x + self.y * self.y);
            let x_new = 1.0 + u * (self.x * t.cos() - self.y * t.sin());
            let y_new = u * (self.x * t.sin() + self.y * t.cos());
            self.x = x_new; self.y = y_new;

            if self.point_count < MAX_POINTS && self.x.is_finite() && self.y.is_finite() {
                let idx = self.point_count * 2;
                self.points[idx] = self.x as f32;
                self.points[idx + 1] = self.y as f32;
                self.point_count += 1;
            }
        }
        self.time += 1.0;
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        let slice = &self.points[..self.point_count * 2];
        buffer.write_f32_slice(slice);
        slice.len() * 4
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { self.point_count as u32 }
    fn components(&self) -> u32 { 2 }
}
