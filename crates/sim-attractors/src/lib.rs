pub mod lorenz;
pub mod rossler;
pub mod aizawa;
pub mod thomas;
pub mod chua;

use sim_core::Simulation;

pub fn all_models() -> Vec<Box<dyn Simulation>> {
    vec![
        Box::new(lorenz::Lorenz::new()),
        Box::new(rossler::Rossler::new()),
        Box::new(aizawa::Aizawa::new()),
        Box::new(thomas::Thomas::new()),
        Box::new(chua::Chua::new()),
    ]
}
