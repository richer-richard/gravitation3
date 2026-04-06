use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const MAX_POINTS: usize = 100000;

pub struct Henon {
    x: f64,
    y: f64,
    points: Vec<f32>,
    point_count: usize,
    time: f64,
}

impl Henon {
    pub fn new() -> Self {
        Self { x: 0.1, y: 0.1, points: vec![0.0f32; MAX_POINTS * 2], point_count: 0, time: 0.0 }
    }
}

impl Simulation for Henon {
    fn id(&self) -> &'static str { "henon" }
    fn name(&self) -> &'static str { "Hénon Map" }
    fn output_kind(&self) -> OutputKind { OutputKind::Points2D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "a", label: "a", min: 0.0, max: 2.0, default: 1.4, step: 0.01 },
            ParamDescriptor { name: "b", label: "b", min: 0.0, max: 1.0, default: 0.3, step: 0.01 },
            ParamDescriptor { name: "iters_per_step", label: "Iterations/Step", min: 10.0, max: 1000.0, default: 100.0, step: 10.0 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.x = 0.1;
        self.y = 0.1;
        self.point_count = 0;
        self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let a = params.get("a");
        let b = params.get("b");
        let n = params.get("iters_per_step") as usize;

        for _ in 0..n {
            let x_new = 1.0 - a * self.x * self.x + self.y;
            let y_new = b * self.x;
            self.x = x_new;
            self.y = y_new;

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
