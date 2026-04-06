use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParamDescriptor {
    pub name: &'static str,
    pub label: &'static str,
    pub min: f64,
    pub max: f64,
    pub default: f64,
    pub step: f64,
}

#[derive(Debug, Clone, Default)]
pub struct ParamSet {
    values: HashMap<String, f64>,
}

impl ParamSet {
    pub fn new() -> Self {
        Self {
            values: HashMap::new(),
        }
    }

    pub fn from_defaults(descriptors: &[ParamDescriptor]) -> Self {
        let mut ps = Self::new();
        for d in descriptors {
            ps.set(d.name, d.default);
        }
        ps
    }

    pub fn get(&self, name: &str) -> f64 {
        self.values.get(name).copied().unwrap_or(0.0)
    }

    pub fn set(&mut self, name: &str, value: f64) {
        self.values.insert(name.to_string(), value);
    }

    pub fn update_from_map(&mut self, map: &HashMap<String, f64>) {
        for (k, v) in map {
            self.values.insert(k.clone(), *v);
        }
    }
}
