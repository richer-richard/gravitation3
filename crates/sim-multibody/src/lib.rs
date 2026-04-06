pub mod double_pendulum;
pub mod three_body;
pub mod malkus_waterwheel;
pub mod duffing;

use sim_core::Simulation;

pub fn all_models() -> Vec<Box<dyn Simulation>> {
    vec![
        Box::new(double_pendulum::DoublePendulum::new()),
        Box::new(three_body::ThreeBody::new()),
        Box::new(malkus_waterwheel::MalkusWaterwheel::new()),
        Box::new(duffing::Duffing::new()),
    ]
}
