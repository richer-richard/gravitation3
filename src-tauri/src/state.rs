use sim_core::{FrameBuffer, ParamDescriptor, ParamSet, Simulation};
use std::collections::HashMap;

pub struct SimulationManager {
    active: Option<Box<dyn Simulation>>,
    params: ParamSet,
    frame_buf: FrameBuffer,
    frame_id: u32,
    running: bool,
    steps_per_frame: usize,
    registry: Vec<Box<dyn Fn() -> Box<dyn Simulation> + Send + Sync>>,
}

impl SimulationManager {
    pub fn new() -> Self {
        let mut registry: Vec<Box<dyn Fn() -> Box<dyn Simulation> + Send + Sync>> = Vec::new();

        // Register all models
        // Attractors
        registry.push(Box::new(|| Box::new(sim_attractors::lorenz::Lorenz::new())));
        registry.push(Box::new(|| Box::new(sim_attractors::rossler::Rossler::new())));
        registry.push(Box::new(|| Box::new(sim_attractors::aizawa::Aizawa::new())));
        registry.push(Box::new(|| Box::new(sim_attractors::thomas::Thomas::new())));
        registry.push(Box::new(|| Box::new(sim_attractors::chua::Chua::new())));

        // Discrete maps
        registry.push(Box::new(|| Box::new(sim_discrete::logistic::LogisticMap::new())));
        registry.push(Box::new(|| Box::new(sim_discrete::henon::Henon::new())));
        registry.push(Box::new(|| Box::new(sim_discrete::ikeda::Ikeda::new())));
        registry.push(Box::new(|| Box::new(sim_discrete::tinkerbell::Tinkerbell::new())));
        registry.push(Box::new(|| Box::new(sim_discrete::standard_map::StandardMap::new())));

        // Multi-body
        registry.push(Box::new(|| Box::new(sim_multibody::double_pendulum::DoublePendulum::new())));
        registry.push(Box::new(|| Box::new(sim_multibody::three_body::ThreeBody::new())));
        registry.push(Box::new(|| Box::new(sim_multibody::malkus_waterwheel::MalkusWaterwheel::new())));
        registry.push(Box::new(|| Box::new(sim_multibody::duffing::Duffing::new())));

        // CFD
        registry.push(Box::new(|| Box::new(sim_cfd::lid_driven::LidDrivenCavity::new())));
        registry.push(Box::new(|| Box::new(sim_cfd::rayleigh_benard::RayleighBenard::new())));
        registry.push(Box::new(|| Box::new(sim_cfd::karman_vortex::KarmanVortex::new())));
        registry.push(Box::new(|| Box::new(sim_cfd::couette::CouetteFlow::new())));

        // Chemical/Bio
        registry.push(Box::new(|| Box::new(sim_chembio::bz_reaction::BZReaction::new())));
        registry.push(Box::new(|| Box::new(sim_chembio::lotka_volterra::LotkaVolterra::new())));

        Self {
            active: None,
            params: ParamSet::new(),
            frame_buf: FrameBuffer::new(1024 * 1024 * 4), // 4 MB
            frame_id: 0,
            running: false,
            steps_per_frame: 10,
            registry,
        }
    }

    pub fn list_models(&self) -> Vec<ModelInfo> {
        let model_info = [
            ("lorenz", "Lorenz Attractor", "attractors"),
            ("rossler", "Rössler Attractor", "attractors"),
            ("aizawa", "Aizawa Attractor", "attractors"),
            ("thomas", "Thomas' Cyclically Symmetric", "attractors"),
            ("chua", "Chua's Circuit", "attractors"),
            ("logistic", "Logistic Map (Bifurcation)", "discrete"),
            ("henon", "Hénon Map", "discrete"),
            ("ikeda", "Ikeda Map", "discrete"),
            ("tinkerbell", "Tinkerbell Map", "discrete"),
            ("standard_map", "Standard Map (Chirikov)", "discrete"),
            ("double_pendulum", "Double Pendulum", "multibody"),
            ("three_body", "Three-Body Problem", "multibody"),
            ("malkus_waterwheel", "Malkus Waterwheel", "multibody"),
            ("duffing", "Duffing Oscillator", "multibody"),
            ("lid_driven", "Lid-Driven Cavity", "cfd"),
            ("rayleigh_benard", "Rayleigh-Bénard Convection", "cfd"),
            ("karman_vortex", "Kármán Vortex Street", "cfd"),
            ("couette", "Couette Flow", "cfd"),
            ("bz_reaction", "Belousov-Zhabotinsky Reaction", "chembio"),
            ("lotka_volterra", "Lotka-Volterra (3 Species)", "chembio"),
        ];

        model_info.iter().map(|(id, name, cat)| ModelInfo {
            id: id.to_string(),
            name: name.to_string(),
            category: cat.to_string(),
        }).collect()
    }

    pub fn select_model(&mut self, id: &str) -> Option<Vec<ParamDescriptor>> {
        // Find and instantiate the model
        let index = self.list_models().iter().position(|m| m.id == id)?;
        let mut sim = (self.registry[index])();
        let schema = sim.param_schema();
        self.params = ParamSet::from_defaults(&schema);
        sim.reset(&self.params);
        self.active = Some(sim);
        self.frame_id = 0;
        self.running = false;
        Some(schema)
    }

    pub fn set_params(&mut self, map: &HashMap<String, f64>) {
        self.params.update_from_map(map);
    }

    pub fn set_running(&mut self, running: bool) {
        self.running = running;
    }

    pub fn set_steps_per_frame(&mut self, n: usize) {
        self.steps_per_frame = n.max(1);
    }

    pub fn reset(&mut self) {
        if let Some(sim) = &mut self.active {
            sim.reset(&self.params);
            self.frame_id = 0;
        }
    }

    pub fn get_frame(&mut self) -> &[u8] {
        if self.running {
            if let Some(sim) = &mut self.active {
                sim.step_n(&self.params, self.steps_per_frame);
                self.frame_id += 1;
                crate::bridge::serialize_frame(&**sim, self.frame_id, &mut self.frame_buf);
            }
        } else if let Some(sim) = &self.active {
            crate::bridge::serialize_frame(&**sim, self.frame_id, &mut self.frame_buf);
        }
        self.frame_buf.as_bytes()
    }
}

#[derive(serde::Serialize, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub category: String,
}
