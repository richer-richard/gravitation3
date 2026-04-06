use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const MAX_POINTS: usize = 100000;

pub struct Tinkerbell {
    x: f64, y: f64,
    points: Vec<f32>,
    point_count: usize,
    time: f64,
}

impl Tinkerbell {
    pub fn new() -> Self {
        Self { x: -0.72, y: -0.64, points: vec![0.0f32; MAX_POINTS * 2], point_count: 0, time: 0.0 }
    }
}

impl Simulation for Tinkerbell {
    fn id(&self) -> &'static str { "tinkerbell" }
    fn name(&self) -> &'static str { "Tinkerbell Map" }
    fn output_kind(&self) -> OutputKind { OutputKind::Points2D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "a", label: "a", min: -1.0, max: 1.0, default: 0.9, step: 0.01 },
            ParamDescriptor { name: "b", label: "b", min: -1.0, max: 1.0, default: -0.6013, step: 0.001 },
            ParamDescriptor { name: "c", label: "c", min: 0.0, max: 5.0, default: 2.0, step: 0.01 },
            ParamDescriptor { name: "d", label: "d", min: 0.0, max: 2.0, default: 0.5, step: 0.01 },
            ParamDescriptor { name: "iters_per_step", label: "Iterations/Step", min: 10.0, max: 1000.0, default: 100.0, step: 10.0 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.x = -0.72; self.y = -0.64;
        self.point_count = 0; self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let a = params.get("a");
        let b = params.get("b");
        let c = params.get("c");
        let d = params.get("d");
        let n = params.get("iters_per_step") as usize;

        for _ in 0..n {
            let x_new = self.x * self.x - self.y * self.y + a * self.x + b * self.y;
            let y_new = 2.0 * self.x * self.y + c * self.x + d * self.y;
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
