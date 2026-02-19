use crate::vector3::Vec3;

const MAX_ACCELERATION: f64 = 1000.0;
const MAX_VELOCITY: f64 = 100.0;

pub fn validate_g(g: f64) -> f64 {
    if !g.is_finite() || g <= 0.0 {
        return 1.0;
    }
    g
}

pub fn validate_dt(dt: f64) -> f64 {
    if !dt.is_finite() || dt <= 0.0 {
        return 0.001;
    }
    dt
}

pub fn validate_mass(mass: f64) -> f64 {
    if !mass.is_finite() || mass <= 0.0 {
        return 1.0;
    }
    mass
}

pub fn clamp_acceleration(acc: Vec3) -> Vec3 {
    let mag = acc.norm();
    if !mag.is_finite() {
        return Vec3::zeros();
    }
    if mag > MAX_ACCELERATION {
        acc * (MAX_ACCELERATION / mag)
    } else {
        acc
    }
}

pub fn clamp_velocity(vel: Vec3) -> Vec3 {
    let mag = vel.norm();
    if !mag.is_finite() {
        return Vec3::zeros();
    }
    if mag > MAX_VELOCITY {
        vel * (MAX_VELOCITY / mag)
    } else {
        vel
    }
}
