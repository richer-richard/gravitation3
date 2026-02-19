use nalgebra::Vector3;
use serde::{Deserialize, Serialize};

/// Type alias for 3D vectors using nalgebra
pub type Vec3 = Vector3<f64>;

/// Convenience constructors and utilities for Vec3
pub fn vec3(x: f64, y: f64, z: f64) -> Vec3 {
    Vec3::new(x, y, z)
}

/// Serializable wrapper for Vec3 (for JSON export compatibility)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Vec3Data {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl From<Vec3> for Vec3Data {
    fn from(v: Vec3) -> Self {
        Self {
            x: v.x,
            y: v.y,
            z: v.z,
        }
    }
}

impl From<Vec3Data> for Vec3 {
    fn from(v: Vec3Data) -> Self {
        Vec3::new(v.x, v.y, v.z)
    }
}

impl Vec3Data {
    pub fn to_array(&self) -> [f64; 3] {
        [self.x, self.y, self.z]
    }
}
