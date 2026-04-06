/// Fourth-order Runge-Kutta integrator for arbitrary-dimension ODE systems.
/// `f` computes derivatives: f(state, deriv_out)
pub fn rk4_step<const N: usize, F>(state: &mut [f64; N], dt: f64, f: F)
where
    F: Fn(&[f64; N], &mut [f64; N]),
{
    let mut k1 = [0.0f64; N];
    let mut k2 = [0.0f64; N];
    let mut k3 = [0.0f64; N];
    let mut k4 = [0.0f64; N];
    let mut tmp = [0.0f64; N];

    f(state, &mut k1);

    for i in 0..N {
        tmp[i] = state[i] + 0.5 * dt * k1[i];
    }
    f(&tmp, &mut k2);

    for i in 0..N {
        tmp[i] = state[i] + 0.5 * dt * k2[i];
    }
    f(&tmp, &mut k3);

    for i in 0..N {
        tmp[i] = state[i] + dt * k3[i];
    }
    f(&tmp, &mut k4);

    for i in 0..N {
        state[i] += dt / 6.0 * (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]);
    }
}
