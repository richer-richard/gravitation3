use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const MAX_POINTS: usize = 200000;

pub struct LogisticMap {
    points: Vec<f32>, // (r, x) interleaved
    point_count: usize,
    time: f64,
}

impl LogisticMap {
    pub fn new() -> Self {
        Self {
            points: vec![0.0f32; MAX_POINTS * 2],
            point_count: 0,
            time: 0.0,
        }
    }
}

impl Simulation for LogisticMap {
    fn id(&self) -> &'static str { "logistic" }
    fn name(&self) -> &'static str { "Logistic Map (Bifurcation)" }
    fn output_kind(&self) -> OutputKind { OutputKind::Points2D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "r_min", label: "r Min", min: 0.0, max: 4.0, default: 2.5, step: 0.01 },
            ParamDescriptor { name: "r_max", label: "r Max", min: 0.0, max: 4.0, default: 4.0, step: 0.01 },
            ParamDescriptor { name: "r_step", label: "r Resolution", min: 0.0001, max: 0.01, default: 0.001, step: 0.0001 },
            ParamDescriptor { name: "warmup", label: "Warmup Iterations", min: 100.0, max: 1000.0, default: 300.0, step: 50.0 },
            ParamDescriptor { name: "plot_iters", label: "Plot Iterations", min: 50.0, max: 500.0, default: 100.0, step: 10.0 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.point_count = 0;
        self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let r_min = params.get("r_min");
        let r_max = params.get("r_max");
        let r_step = params.get("r_step");
        let warmup = params.get("warmup") as usize;
        let plot_iters = params.get("plot_iters") as usize;

        self.point_count = 0;
        let mut r = r_min;
        while r <= r_max && self.point_count < MAX_POINTS {
            let mut x = 0.5_f64;
            for _ in 0..warmup {
                x = r * x * (1.0 - x);
            }
            for _ in 0..plot_iters {
                x = r * x * (1.0 - x);
                if self.point_count < MAX_POINTS {
                    let idx = self.point_count * 2;
                    self.points[idx] = r as f32;
                    self.points[idx + 1] = x as f32;
                    self.point_count += 1;
                }
            }
            r += r_step;
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
