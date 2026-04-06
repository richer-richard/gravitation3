pub mod logistic;
pub mod henon;
pub mod ikeda;
pub mod tinkerbell;
pub mod standard_map;

use sim_core::Simulation;

pub fn all_models() -> Vec<Box<dyn Simulation>> {
    vec![
        Box::new(logistic::LogisticMap::new()),
        Box::new(henon::Henon::new()),
        Box::new(ikeda::Ikeda::new()),
        Box::new(tinkerbell::Tinkerbell::new()),
        Box::new(standard_map::StandardMap::new()),
    ]
}
