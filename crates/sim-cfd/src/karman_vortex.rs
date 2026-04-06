use sim_core::{
    Diagnostics, FrameBuffer, OutputKind, ParamDescriptor, ParamSet, Simulation,
};

const NX: usize = 256;
const NY: usize = 128;

/// Simplified Kármán vortex street using Lattice-Boltzmann method (D2Q9).
pub struct KarmanVortex {
    // D2Q9 distribution functions
    f: Vec<[f64; 9]>,
    f_new: Vec<[f64; 9]>,
    // Macroscopic fields
    rho: Vec<f64>,
    ux: Vec<f64>,
    uy: Vec<f64>,
    // Obstacle mask
    obstacle: Vec<bool>,
    time: f64,
}

const W: [f64; 9] = [4.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/9.0,
                      1.0/36.0, 1.0/36.0, 1.0/36.0, 1.0/36.0];
const CX: [i32; 9] = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const CY: [i32; 9] = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const OPP: [usize; 9] = [0, 3, 4, 1, 2, 7, 8, 5, 6];

impl KarmanVortex {
    pub fn new() -> Self {
        let total = NX * NY;
        let u_inf = 0.04;

        let mut obstacle = vec![false; total];
        let cx = NX / 5;
        let cy = NY / 2;
        let r = NY / 10;
        for j in 0..NY {
            for i in 0..NX {
                let dx = i as i32 - cx as i32;
                let dy = j as i32 - cy as i32;
                if dx * dx + dy * dy <= (r * r) as i32 {
                    obstacle[j * NX + i] = true;
                }
            }
        }

        // Initialize equilibrium
        let mut f = vec![[0.0; 9]; total];
        let rho = vec![1.0; total];
        let ux = vec![u_inf; total];
        let uy = vec![0.0; total];

        for idx in 0..total {
            for k in 0..9 {
                let cu = CX[k] as f64 * ux[idx] + CY[k] as f64 * uy[idx];
                let u2 = ux[idx] * ux[idx] + uy[idx] * uy[idx];
                f[idx][k] = W[k] * rho[idx] * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * u2);
            }
        }

        Self {
            f,
            f_new: vec![[0.0; 9]; total],
            rho,
            ux,
            uy,
            obstacle,
            time: 0.0,
        }
    }
}

impl Simulation for KarmanVortex {
    fn id(&self) -> &'static str { "karman_vortex" }
    fn name(&self) -> &'static str { "Kármán Vortex Street" }
    fn output_kind(&self) -> OutputKind {
        OutputKind::Field2D { width: NX as u32, height: NY as u32, components: 3 }
    }

    fn param_schema(&self) -> Vec<ParamDescriptor> {
        vec![
            ParamDescriptor { name: "re", label: "Reynolds Number", min: 20.0, max: 1000.0, default: 200.0, step: 10.0 },
            ParamDescriptor { name: "u_inf", label: "Inlet Velocity", min: 0.01, max: 0.1, default: 0.04, step: 0.005 },
            ParamDescriptor { name: "steps_per_frame", label: "Steps/Frame", min: 1.0, max: 20.0, default: 5.0, step: 1.0 },
        ]
    }

    fn reset(&mut self, _params: &ParamSet) {
        *self = Self::new();
        self.time = 0.0;
    }

    fn step(&mut self, params: &ParamSet) {
        let u_inf = params.get("u_inf");
        let re = params.get("re");
        let diameter = NY as f64 / 5.0;
        let tau = 3.0 * u_inf * diameter / re + 0.5;
        let omega = 1.0 / tau;

        // Collision
        for idx in 0..NX * NY {
            if self.obstacle[idx] { continue; }

            let r = self.rho[idx];
            let u = self.ux[idx];
            let v = self.uy[idx];

            for k in 0..9 {
                let cu = CX[k] as f64 * u + CY[k] as f64 * v;
                let u2 = u * u + v * v;
                let feq = W[k] * r * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * u2);
                self.f[idx][k] += omega * (feq - self.f[idx][k]);
            }
        }

        // Streaming
        for j in 0..NY {
            for i in 0..NX {
                let idx = j * NX + i;
                for k in 0..9 {
                    let ni = (i as i32 + CX[k]) as usize;
                    let nj = (j as i32 + CY[k]) as usize;
                    if ni < NX && nj < NY {
                        self.f_new[nj * NX + ni][k] = self.f[idx][k];
                    }
                }
            }
        }

        std::mem::swap(&mut self.f, &mut self.f_new);

        // Bounce-back for obstacles
        for idx in 0..NX * NY {
            if self.obstacle[idx] {
                let tmp = self.f[idx];
                for k in 0..9 {
                    self.f[idx][k] = tmp[OPP[k]];
                }
            }
        }

        // Inlet boundary (Zou-He style, simplified)
        for j in 0..NY {
            let idx = j * NX;
            self.rho[idx] = 1.0;
            self.ux[idx] = u_inf;
            self.uy[idx] = 0.0;
            for k in 0..9 {
                let cu = CX[k] as f64 * u_inf;
                self.f[idx][k] = W[k] * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * u_inf * u_inf);
            }
        }

        // Compute macroscopic quantities
        for idx in 0..NX * NY {
            if self.obstacle[idx] {
                self.rho[idx] = 1.0;
                self.ux[idx] = 0.0;
                self.uy[idx] = 0.0;
                continue;
            }
            let mut r = 0.0;
            let mut u = 0.0;
            let mut v = 0.0;
            for k in 0..9 {
                r += self.f[idx][k];
                u += CX[k] as f64 * self.f[idx][k];
                v += CY[k] as f64 * self.f[idx][k];
            }
            self.rho[idx] = r;
            if r > 0.0 { self.ux[idx] = u / r; self.uy[idx] = v / r; }
        }

        self.time += 1.0;
    }

    fn write_frame(&self, buffer: &mut FrameBuffer) -> usize {
        let mut field = vec![0.0f32; NX * NY * 3];
        for idx in 0..NX * NY {
            let mag = (self.ux[idx] * self.ux[idx] + self.uy[idx] * self.uy[idx]).sqrt();
            field[idx * 3] = mag as f32;
            field[idx * 3 + 1] = self.ux[idx] as f32;
            field[idx * 3 + 2] = self.uy[idx] as f32;
        }
        buffer.write_f32_slice(&field);
        field.len() * 4
    }

    fn time(&self) -> f64 { self.time }
    fn diagnostics(&self) -> Diagnostics { Diagnostics::default() }
    fn element_count(&self) -> u32 { (NX * NY) as u32 }
    fn components(&self) -> u32 { 3 }
}
