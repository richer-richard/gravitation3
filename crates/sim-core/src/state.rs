pub struct FrameBuffer {
    pub data: Vec<u8>,
    pub len: usize,
}

impl FrameBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            data: vec![0u8; capacity],
            len: 0,
        }
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.data[..self.len]
    }

    pub fn reset(&mut self) {
        self.len = 0;
    }

    pub fn ensure_capacity(&mut self, needed: usize) {
        let total = self.len + needed;
        if total > self.data.len() {
            self.data.resize(total * 2, 0);
        }
    }

    pub fn write_u32(&mut self, v: u32) {
        self.ensure_capacity(4);
        self.data[self.len..self.len + 4].copy_from_slice(&v.to_le_bytes());
        self.len += 4;
    }

    pub fn write_f64(&mut self, v: f64) {
        self.ensure_capacity(8);
        self.data[self.len..self.len + 8].copy_from_slice(&v.to_le_bytes());
        self.len += 8;
    }

    pub fn write_f32_slice(&mut self, values: &[f32]) {
        let bytes: &[u8] = bytemuck::cast_slice(values);
        self.ensure_capacity(bytes.len());
        self.data[self.len..self.len + bytes.len()].copy_from_slice(bytes);
        self.len += bytes.len();
    }

    pub fn write_f64_slice(&mut self, values: &[f64]) {
        let bytes: &[u8] = bytemuck::cast_slice(values);
        self.ensure_capacity(bytes.len());
        self.data[self.len..self.len + bytes.len()].copy_from_slice(bytes);
        self.len += bytes.len();
    }
}
