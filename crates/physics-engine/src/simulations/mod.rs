pub mod three_body;
pub mod double_pendulum;
pub mod lorenz;
pub mod rossler;
pub mod double_gyre;
pub mod malkus_waterwheel;

pub use three_body::ThreeBodySimulator;
pub use double_pendulum::DoublePendulumSimulator;
pub use lorenz::LorenzSimulator;
pub use rossler::RosslerSimulator;
pub use double_gyre::DoubleGyreSimulator;
pub use malkus_waterwheel::MalkusWheelSimulator;

/// Common trait for all simulators
pub trait Simulator: Send {
    fn step(&mut self, steps: u32);
    fn reset(&mut self);
    fn get_state(&self) -> serde_json::Value;
    fn set_parameter(&mut self, name: &str, value: f64);
    fn export_data(&self) -> serde_json::Value;
}
