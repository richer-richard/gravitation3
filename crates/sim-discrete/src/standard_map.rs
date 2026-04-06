use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const MAX_POINTS: usize = 100000;

pub struct StandardMap {
    theta: f64,
    p: f64,
    points: Vec<f32>,
    point_count: usize,
    time: f64,
}

impl StandardMap {
    pub fn new() -> Self {
        Self { theta: 0.5, p: 0.5, points: vec![0.0f32; MAX_POINTS * 2], point_count: 0, time: 0.0 }
    }
}

impl Simulation for StandardMap {
    fn id(&self) -> &'static str { "standard_map" }
    fn name(&self) -> &'static str { "Standard Map (Chirikov)" }
    fn output_kind(&self) -> OutputKind { OutputKind::Points2D }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "k", label: "K (stochasticity)", min: 0.0, max: 10.0, default: 0.971635, step: 0.01 },
            ParamDescriptor { name: "iters_per_step", label: "Iterations/Step", min: 10.0, max: 1000.0, default: 100.0, step: 10.0 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        self.theta = 0.5; self.p = 0.5;
        self.point_count = 0; self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let k = params.get("k");
        let n = params.get("iters_per_step") as usize;
        let two_pi = std::f64::consts::TAU;

        for _ in 0..n {
            self.p = (self.p + k / two_pi * (two_pi * self.theta).sin()).rem_euclid(1.0);
            self.theta = (self.theta + self.p).rem_euclid(1.0);

            if self.point_count < MAX_POINTS {
                let idx = self.point_count * 2;
                self.points[idx] = self.theta as f32;
                self.points[idx + 1] = self.p as f32;
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
