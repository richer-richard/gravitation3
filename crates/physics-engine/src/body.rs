use crate::vector3::Vec3;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Body {
    pub position: [f64; 3],
    pub velocity: [f64; 3],
    pub mass: f64,
    pub color: u32,
    pub name: String,
}

impl Body {
    pub fn new(position: Vec3, velocity: Vec3, mass: f64, color: u32, name: &str) -> Self {
        Self {
            position: [position.x, position.y, position.z],
            velocity: [velocity.x, velocity.y, velocity.z],
            mass,
            color,
            name: name.to_string(),
        }
    }

    pub fn pos(&self) -> Vec3 {
        Vec3::new(self.position[0], self.position[1], self.position[2])
    }

    pub fn vel(&self) -> Vec3 {
        Vec3::new(self.velocity[0], self.velocity[1], self.velocity[2])
    }

    pub fn set_pos(&mut self, v: Vec3) {
        self.position = [v.x, v.y, v.z];
    }

    pub fn set_vel(&mut self, v: Vec3) {
        self.velocity = [v.x, v.y, v.z];
    }
}
