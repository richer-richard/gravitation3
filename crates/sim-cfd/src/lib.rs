pub mod grid;
pub mod lid_driven;
pub mod rayleigh_benard;
pub mod karman_vortex;
pub mod couette;

use sim_core::Simulation;

pub fn all_models() -> Vec<Box<dyn Simulation>> {
    vec![
        Box::new(lid_driven::LidDrivenCavity::new()),
        Box::new(rayleigh_benard::RayleighBenard::new()),
        Box::new(karman_vortex::KarmanVortex::new()),
        Box::new(couette::CouetteFlow::new()),
    ]
}
