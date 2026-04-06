use sim_core::{FrameBuffer, OutputKind, Simulation};

const MAGIC: u32 = 0x47335633;
const HEADER_SIZE: usize = 64;

pub fn serialize_frame(sim: &dyn Simulation, frame_id: u32, buf: &mut FrameBuffer) {
    buf.reset();

    // Reserve header space
    buf.ensure_capacity(HEADER_SIZE);
    buf.len = HEADER_SIZE;

    // Write payload
    let payload_bytes = sim.write_frame(buf);

    // Now fill in the header
    let kind_u32: u32 = match sim.output_kind() {
        OutputKind::Particles3D => 0,
        OutputKind::Points2D => 1,
        OutputKind::Bodies { .. } => 2,
        OutputKind::Field2D { .. } => 3,
    };

    let header = &mut buf.data[..HEADER_SIZE];
    header[0..4].copy_from_slice(&MAGIC.to_le_bytes());
    header[4..8].copy_from_slice(&frame_id.to_le_bytes());
    header[8..12].copy_from_slice(&kind_u32.to_le_bytes());
    header[12..16].copy_from_slice(&sim.element_count().to_le_bytes());
    header[16..20].copy_from_slice(&sim.components().to_le_bytes());
    header[20..24].copy_from_slice(&0u32.to_le_bytes()); // dtype: 0 = f32
    header[24..32].copy_from_slice(&sim.time().to_le_bytes());

    let diag = sim.diagnostics();
    header[32..40].copy_from_slice(&diag.lyapunov_exponent.to_le_bytes());
    header[40..48].copy_from_slice(&diag.total_energy.to_le_bytes());
    header[48..56].copy_from_slice(&diag.max_divergence.to_le_bytes());
    header[56..64].copy_from_slice(&0u64.to_le_bytes()); // reserved

    buf.len = HEADER_SIZE + payload_bytes;
}
