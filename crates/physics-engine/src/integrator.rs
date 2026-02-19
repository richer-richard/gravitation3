/// Trait for dynamical systems that can be integrated with RK4.
pub trait DynamicalSystem {
    /// The state type for this system.
    type State: Clone;

    /// Compute time derivatives of the state.
    fn derivatives(&self, state: &Self::State, t: f64) -> Self::State;

    /// Add two states: result = a + b * scalar
    fn state_add_scaled(&self, base: &Self::State, delta: &Self::State, scalar: f64)
        -> Self::State;

    /// Perform one RK4 integration step.
    fn step_rk4(&self, state: &mut Self::State, t: f64, dt: f64) {
        let k1 = self.derivatives(state, t);
        let s2 = self.state_add_scaled(state, &k1, 0.5 * dt);
        let k2 = self.derivatives(&s2, t + 0.5 * dt);
        let s3 = self.state_add_scaled(state, &k2, 0.5 * dt);
        let k3 = self.derivatives(&s3, t + 0.5 * dt);
        let s4 = self.state_add_scaled(state, &k3, dt);
        let k4 = self.derivatives(&s4, t + dt);

        // Combine: state += (dt/6) * (k1 + 2*k2 + 2*k3 + k4)
        let tmp1 = self.state_add_scaled(&k1, &k2, 2.0);
        let tmp2 = self.state_add_scaled(&tmp1, &k3, 2.0);
        let combined = self.state_add_scaled(&tmp2, &k4, 1.0);
        *state = self.state_add_scaled(state, &combined, dt / 6.0);
    }
}
