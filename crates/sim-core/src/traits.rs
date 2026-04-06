use crate::params::{ParamDescriptor, ParamSet};
use crate::state::FrameBuffer;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OutputKind {
    /// N particles, each with (x, y, z) as f32.
    Particles3D,
    /// N points in 2D (x, y) as f32.
    Points2D,
    /// Small number of rigid bodies with position + extra state.
    Bodies { count: u32 },
    /// 2D scalar/vector field on a grid.
    Field2D {
        width: u32,
        height: u32,
        components: u32,
    },
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Diagnostics {
    pub lyapunov_exponent: f64,
    pub total_energy: f64,
    pub max_divergence: f64,
}

/// Every simulation model implements this trait.
pub trait Simulation: Send + Sync {
    fn id(&self) -> &'static str;
    fn name(&self) -> &'static str;
    fn output_kind(&self) -> OutputKind;
    fn param_schema(&self) -> Vec<ParamDescriptor>;
    fn reset(&mut self, params: &ParamSet);
    fn step(&mut self, params: &ParamSet);

    fn step_n(&mut self, params: &ParamSet, n: usize) {
        for _ in 0..n {
            self.step(params);
        }
    }

    /// Write current state into the FrameBuffer payload area.
    /// The caller handles the 64-byte header; this writes only the payload.
    /// Returns the number of bytes written.
    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize;

    fn time(&self) -> f64;
    fn diagnostics(&self) -> Diagnostics;

    /// Number of elements (particles, points, bodies, cells) in the current output.
    fn element_count(&self) -> u32;
    /// Number of components per element (3 for xyz, 2 for xy, etc.).
    fn components(&self) -> u32;
}
