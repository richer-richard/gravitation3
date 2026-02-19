use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExportSchema {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub simulation: SimulationInfo,
    pub parameters: serde_json::Value,
    pub state: serde_json::Value,
    pub history: serde_json::Value,
    pub metadata: ExportMetadata,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SimulationInfo {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub sim_type: String,
    pub dimension: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExportMetadata {
    #[serde(rename = "exportedAt")]
    pub exported_at: String,
    pub source: String,
    pub engine: String,
    pub schema: String,
}

impl ExportSchema {
    pub fn new(
        simulation: SimulationInfo,
        parameters: serde_json::Value,
        state: serde_json::Value,
        history: serde_json::Value,
    ) -> Self {
        Self {
            schema_version: 1,
            simulation,
            parameters,
            state,
            history,
            metadata: ExportMetadata {
                exported_at: String::new(), // Set at export time
                source: "Gravitation³".to_string(),
                engine: "Rust/WASM".to_string(),
                schema: "SimulationExport@v1".to_string(),
            },
        }
    }
}
