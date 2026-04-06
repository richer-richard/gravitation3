pub mod bz_reaction;
pub mod lotka_volterra;

use sim_core::Simulation;

pub fn all_models() -> Vec<Box<dyn Simulation>> {
    vec![
        Box::new(bz_reaction::BZReaction::new()),
        Box::new(lotka_volterra::LotkaVolterra::new()),
    ]
}
