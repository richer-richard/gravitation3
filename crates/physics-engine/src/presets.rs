use crate::body::Body;
use crate::simulations::lorenz::Trajectory as LorenzTrajectory;
use crate::simulations::rossler::Trajectory as RosslerTrajectory;
use crate::vector3::Vec3;

pub mod three_body {
    use super::*;
    use std::f64::consts::PI;

    pub fn figure8() -> Vec<Body> {
        vec![
            Body::new(
                Vec3::new(-0.97000436, 0.24208753, 0.0),
                Vec3::new(0.4662036850, 0.4323657300, 0.0),
                1.0,
                0x00d4ff,
                "Body 1",
            ),
            Body::new(
                Vec3::new(0.0, 0.0, 0.0),
                Vec3::new(-0.93240737, -0.86473146, 0.0),
                1.0,
                0x8b5cf6,
                "Body 2",
            ),
            Body::new(
                Vec3::new(0.97000436, -0.24208753, 0.0),
                Vec3::new(0.4662036850, 0.4323657300, 0.0),
                1.0,
                0xec4899,
                "Body 3",
            ),
        ]
    }

    pub fn lagrange() -> Vec<Body> {
        let r = 1.0;
        let omega = (3.0_f64 / (4.0 * r * r * r)).sqrt();
        let angles = [0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0];
        let colors = [0x00d4ff, 0x8b5cf6, 0xec4899];

        angles
            .iter()
            .enumerate()
            .map(|(i, &angle)| {
                Body::new(
                    Vec3::new(r * angle.cos(), r * angle.sin(), 0.0),
                    Vec3::new(-r * omega * angle.sin(), r * omega * angle.cos(), 0.0),
                    1.0,
                    colors[i],
                    &format!("Body {}", i + 1),
                )
            })
            .collect()
    }

    pub fn chaotic() -> Vec<Body> {
        // Deterministic chaotic preset (fallback to safe configuration)
        let colors = [0x00d4ff, 0x8b5cf6, 0xec4899];
        let r = 1.15;
        let omega = (3.0_f64 / (4.0 * r * r * r)).sqrt();
        let perturb = 0.35;
        let base_angles = [0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0];
        let angles = [
            base_angles[0] + 0.05,
            base_angles[1] + perturb,
            base_angles[2] - perturb * 0.65,
        ];

        angles
            .iter()
            .enumerate()
            .map(|(i, &angle)| {
                Body::new(
                    Vec3::new(r * angle.cos(), r * angle.sin(), 0.0),
                    Vec3::new(-r * omega * angle.sin(), r * omega * angle.cos(), 0.0),
                    1.0,
                    colors[i],
                    &format!("Body {}", i + 1),
                )
            })
            .collect()
    }

    pub fn custom() -> Vec<Body> {
        vec![
            Body::new(
                Vec3::new(1.0, 0.0, 0.0),
                Vec3::new(0.0, 0.3, 0.0),
                1.0,
                0x00d4ff,
                "Body 1",
            ),
            Body::new(
                Vec3::new(-0.5, 0.866, 0.0),
                Vec3::new(-0.26, -0.15, 0.0),
                1.0,
                0x8b5cf6,
                "Body 2",
            ),
            Body::new(
                Vec3::new(-0.5, -0.866, 0.0),
                Vec3::new(-0.26, 0.15, 0.0),
                1.0,
                0xec4899,
                "Body 3",
            ),
        ]
    }
}

pub mod lorenz {
    use super::*;

    fn traj(x: f64, y: f64, z: f64, color: u32, name: &str) -> LorenzTrajectory {
        LorenzTrajectory {
            state: [x, y, z],
            color,
            name: name.to_string(),
        }
    }

    pub fn single() -> (f64, f64, f64, Vec<LorenzTrajectory>) {
        (10.0, 28.0, 8.0 / 3.0, vec![traj(1.0, 1.0, 1.0, 0x00d4ff, "Clean Butterfly")])
    }

    pub fn classic() -> (f64, f64, f64, Vec<LorenzTrajectory>) {
        (
            10.0,
            28.0,
            8.0 / 3.0,
            vec![
                traj(1.0, 1.0, 1.0, 0x00d4ff, "Trajectory 1"),
                traj(1.01, 1.0, 1.0, 0xec4899, "Trajectory 2"),
            ],
        )
    }

    pub fn multicolor() -> (f64, f64, f64, Vec<LorenzTrajectory>) {
        (
            10.0,
            28.0,
            8.0 / 3.0,
            vec![
                traj(1.0, 1.0, 1.0, 0xff0000, "Red"),
                traj(2.0, 1.0, 1.0, 0x00ff00, "Green"),
                traj(1.0, 2.0, 1.0, 0x0000ff, "Blue"),
                traj(1.0, 1.0, 2.0, 0xffff00, "Yellow"),
            ],
        )
    }

    pub fn chaos() -> (f64, f64, f64, Vec<LorenzTrajectory>) {
        (
            10.0,
            28.0,
            8.0 / 3.0,
            vec![
                traj(0.1, 0.0, 0.0, 0x00d4ff, "Chaos 1"),
                traj(0.11, 0.0, 0.0, 0xec4899, "Chaos 2"),
                traj(0.12, 0.0, 0.0, 0x00ff88, "Chaos 3"),
            ],
        )
    }

    pub fn symmetric() -> (f64, f64, f64, Vec<LorenzTrajectory>) {
        (
            10.0,
            28.0,
            8.0 / 3.0,
            vec![
                traj(5.0, 5.0, 10.0, 0x00d4ff, "Sym 1"),
                traj(-5.0, -5.0, 10.0, 0xec4899, "Sym 2"),
                traj(5.0, -5.0, 10.0, 0xff8800, "Sym 3"),
                traj(-5.0, 5.0, 10.0, 0x8b5cf6, "Sym 4"),
            ],
        )
    }
}

pub mod rossler {
    use super::*;

    fn traj(x: f64, y: f64, z: f64, color: u32, name: &str) -> RosslerTrajectory {
        RosslerTrajectory {
            state: [x, y, z],
            color,
            name: name.to_string(),
        }
    }

    pub fn classic() -> (f64, f64, f64, Vec<RosslerTrajectory>) {
        (
            0.2,
            0.2,
            5.7,
            vec![
                traj(1.0, 1.0, 1.0, 0x00d4ff, "Trajectory 1"),
                traj(1.01, 1.0, 1.0, 0xec4899, "Trajectory 2"),
            ],
        )
    }

    pub fn chaotic() -> (f64, f64, f64, Vec<RosslerTrajectory>) {
        (
            0.1,
            0.1,
            4.0,
            vec![
                traj(0.5, 0.5, 0.5, 0xff0000, "Chaos 1"),
                traj(0.51, 0.5, 0.5, 0x00ff00, "Chaos 2"),
                traj(0.5, 0.51, 0.5, 0x0000ff, "Chaos 3"),
            ],
        )
    }

    pub fn periodic() -> (f64, f64, f64, Vec<RosslerTrajectory>) {
        (
            0.3,
            0.3,
            3.0,
            vec![
                traj(1.0, 0.0, 0.0, 0x00d4ff, "Periodic 1"),
                traj(-1.0, 0.0, 0.0, 0xec4899, "Periodic 2"),
            ],
        )
    }

    pub fn funnel() -> (f64, f64, f64, Vec<RosslerTrajectory>) {
        (
            0.2,
            0.2,
            9.0,
            vec![
                traj(2.0, 2.0, 2.0, 0x00d4ff, "Funnel 1"),
                traj(2.1, 2.0, 2.0, 0xff8800, "Funnel 2"),
                traj(2.0, 2.1, 2.0, 0x8b5cf6, "Funnel 3"),
            ],
        )
    }
}

pub mod double_gyre {
    pub fn standard() -> (f64, f64, f64, usize) {
        (0.1, 0.25, 0.5, 500)
    }

    pub fn divergence() -> (f64, f64, f64, usize) {
        (0.15, 0.1, 1.0, 600)
    }

    pub fn convergence() -> (f64, f64, f64, usize) {
        (0.08, 0.4, 0.3, 700)
    }

    pub fn chaos() -> (f64, f64, f64, usize) {
        (0.12, 0.35, 1.5, 800)
    }
}

pub mod malkus {
    pub fn chaotic() -> (f64, f64, f64, usize) {
        (2.5, 0.1, 1.0, 20)
    }

    pub fn periodic() -> (f64, f64, f64, usize) {
        (1.5, 0.15, 1.5, 20)
    }

    pub fn steady() -> (f64, f64, f64, usize) {
        (4.0, 0.05, 0.5, 20)
    }

    pub fn reversals() -> (f64, f64, f64, usize) {
        (2.0, 0.12, 1.2, 20)
    }
}
