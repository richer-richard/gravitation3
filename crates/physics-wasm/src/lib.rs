use wasm_bindgen::prelude::*;
use physics_engine::simulations::*;

// Three-Body
#[wasm_bindgen]
pub struct WasmThreeBody {
    inner: ThreeBodySimulator,
}

#[wasm_bindgen]
impl WasmThreeBody {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: ThreeBodySimulator::new(1.0, 0.005),
        }
    }

    pub fn load_preset(&mut self, name: &str) -> JsValue {
        self.inner.load_preset(name);
        self.get_state()
    }

    pub fn step(&mut self, steps: u32) -> JsValue {
        self.inner.step(steps);
        self.get_state()
    }

    pub fn set_parameter(&mut self, name: &str, value: f64) {
        self.inner.set_parameter(name, value);
    }

    pub fn get_state(&self) -> JsValue {
        let state = self.inner.get_state();
        serde_wasm_bindgen::to_value(&state).unwrap_or(JsValue::NULL)
    }

    pub fn reset(&mut self) {
        self.inner.reset();
    }

    pub fn get_collisions(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.inner.recent_collisions).unwrap_or(JsValue::NULL)
    }

    pub fn get_removed_indices(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.inner.removed_indices).unwrap_or(JsValue::NULL)
    }
}

// Double Pendulum
#[wasm_bindgen]
pub struct WasmDoublePendulum {
    inner: DoublePendulumSimulator,
}

#[wasm_bindgen]
impl WasmDoublePendulum {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: DoublePendulumSimulator::new(),
        }
    }

    pub fn step(&mut self, steps: u32) -> JsValue {
        self.inner.step(steps);
        self.get_state()
    }

    pub fn reset(&mut self, preset: &str) {
        self.inner.reset(preset);
    }

    pub fn set_parameter(&mut self, name: &str, value: f64) {
        self.inner.set_parameter(name, value);
    }

    pub fn get_state(&self) -> JsValue {
        let state = self.inner.get_state();
        serde_wasm_bindgen::to_value(&state).unwrap_or(JsValue::NULL)
    }

    pub fn add_pendulum(&mut self, theta1: f64, omega1: f64, theta2: f64, omega2: f64) {
        self.inner.add_pendulum(theta1, omega1, theta2, omega2);
    }

    pub fn remove_pendulum(&mut self, index: usize) {
        self.inner.remove_pendulum(index);
    }
}

// Lorenz
#[wasm_bindgen]
pub struct WasmLorenz {
    inner: LorenzSimulator,
}

#[wasm_bindgen]
impl WasmLorenz {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: LorenzSimulator::new(10.0, 28.0, 8.0 / 3.0, 0.001),
        }
    }

    pub fn load_preset(&mut self, name: &str) -> JsValue {
        self.inner.load_preset(name);
        self.get_state()
    }

    pub fn step(&mut self, steps: u32) -> JsValue {
        self.inner.step(steps);
        self.get_state()
    }

    pub fn set_parameter(&mut self, name: &str, value: f64) {
        self.inner.set_parameter(name, value);
    }

    pub fn get_state(&self) -> JsValue {
        let state = self.inner.get_state();
        serde_wasm_bindgen::to_value(&state).unwrap_or(JsValue::NULL)
    }

    pub fn reset(&mut self) {
        self.inner.reset();
    }
}

// Rössler
#[wasm_bindgen]
pub struct WasmRossler {
    inner: RosslerSimulator,
}

#[wasm_bindgen]
impl WasmRossler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: RosslerSimulator::new(0.2, 0.2, 5.7, 0.001),
        }
    }

    pub fn load_preset(&mut self, name: &str) -> JsValue {
        self.inner.load_preset(name);
        self.get_state()
    }

    pub fn step(&mut self, steps: u32) -> JsValue {
        self.inner.step(steps);
        self.get_state()
    }

    pub fn set_parameter(&mut self, name: &str, value: f64) {
        self.inner.set_parameter(name, value);
    }

    pub fn get_state(&self) -> JsValue {
        let state = self.inner.get_state();
        serde_wasm_bindgen::to_value(&state).unwrap_or(JsValue::NULL)
    }

    pub fn reset(&mut self) {
        self.inner.reset();
    }
}

// Double Gyre
#[wasm_bindgen]
pub struct WasmDoubleGyre {
    inner: DoubleGyreSimulator,
}

#[wasm_bindgen]
impl WasmDoubleGyre {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: DoubleGyreSimulator::new(0.1, 0.25, 0.5, 0.02),
        }
    }

    pub fn load_preset(&mut self, name: &str) -> JsValue {
        self.inner.load_preset(name);
        self.get_state()
    }

    pub fn step(&mut self, steps: u32) -> JsValue {
        self.inner.step(steps);
        self.get_state()
    }

    pub fn set_parameter(&mut self, name: &str, value: f64) {
        self.inner.set_parameter(name, value);
    }

    pub fn get_state(&self) -> JsValue {
        let state = self.inner.get_state();
        serde_wasm_bindgen::to_value(&state).unwrap_or(JsValue::NULL)
    }

    pub fn reset(&mut self) {
        self.inner.reset();
    }

    pub fn seed_particles(&mut self, count: usize) {
        self.inner.seed_particles(count);
    }
}

// Malkus Waterwheel
#[wasm_bindgen]
pub struct WasmMalkus {
    inner: MalkusWheelSimulator,
}

#[wasm_bindgen]
impl WasmMalkus {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: MalkusWheelSimulator::new(20, 2.5, 0.1, 1.0, 0.01),
        }
    }

    pub fn load_preset(&mut self, name: &str) -> JsValue {
        self.inner.load_preset(name);
        self.get_state()
    }

    pub fn step(&mut self, steps: u32) -> JsValue {
        self.inner.step(steps);
        self.get_state()
    }

    pub fn set_parameter(&mut self, name: &str, value: f64) {
        self.inner.set_parameter(name, value);
    }

    pub fn get_state(&self) -> JsValue {
        let state = self.inner.get_state();
        serde_wasm_bindgen::to_value(&state).unwrap_or(JsValue::NULL)
    }

    pub fn reset(&mut self) {
        self.inner.reset();
    }
}
