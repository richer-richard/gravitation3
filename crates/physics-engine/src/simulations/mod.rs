pub mod double_gyre;
pub mod double_pendulum;
pub mod lid_driven_cavity;
pub mod lorenz;
pub mod malkus_waterwheel;
pub mod rossler;
pub mod three_body;

pub use double_gyre::DoubleGyreSimulator;
pub use double_pendulum::DoublePendulumSimulator;
pub use lid_driven_cavity::LidDrivenCavitySimulator;
pub use lorenz::LorenzSimulator;
pub use malkus_waterwheel::MalkusWheelSimulator;
pub use rossler::RosslerSimulator;
pub use three_body::ThreeBodySimulator;

/// Common trait for all simulators
pub trait Simulator: Send {
    fn step(&mut self, steps: u32);
    fn reset(&mut self);
    fn get_state(&self) -> serde_json::Value;
    fn set_parameter(&mut self, name: &str, value: f64);
    fn load_preset(&mut self, name: &str);
    fn export_data(&self) -> serde_json::Value;

    fn get_collisions(&self) -> Result<serde_json::Value, String> {
        Err("Collisions are not supported for this simulation".to_string())
    }

    fn seed_particles(&mut self, _count: usize) -> Result<serde_json::Value, String> {
        Err("Particle seeding is not supported for this simulation".to_string())
    }

    fn add_pendulum(
        &mut self,
        _theta1: f64,
        _omega1: f64,
        _theta2: f64,
        _omega2: f64,
    ) -> Result<serde_json::Value, String> {
        Err("Adding pendulums is not supported for this simulation".to_string())
    }

    fn remove_pendulum(&mut self, _index: usize) -> Result<serde_json::Value, String> {
        Err("Removing pendulums is not supported for this simulation".to_string())
    }

    fn add_body(&mut self) -> Result<serde_json::Value, String> {
        Err("Adding bodies is not supported for this simulation".to_string())
    }

    fn remove_body(&mut self, _index: usize) -> Result<serde_json::Value, String> {
        Err("Removing bodies is not supported for this simulation".to_string())
    }
}
