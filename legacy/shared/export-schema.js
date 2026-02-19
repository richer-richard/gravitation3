/**
 * Shared Simulation Export Schema Helper
 * Produces a consistent payload structure for all simulator exports.
 */
(function createSimulationExportHelper(globalScope) {
    const VERSION = 1;

    function safe(obj, fallback) {
        return obj === undefined || obj === null ? fallback : obj;
    }

    function createSimulationExport(config = {}) {
        const now = new Date().toISOString();

        const simulation = config.simulation || {};
        const parameters = config.parameters || {};
        const state = config.state || {};
        const history = config.history || {};
        const custom = config.custom || {};
        const metadataOverrides = config.metadata || {};

        return {
            schemaVersion: VERSION,
            simulation: {
                id: safe(simulation.id, 'unknown'),
                name: safe(simulation.name, 'Unknown Simulation'),
                type: safe(simulation.type, 'custom'),
                dimension: safe(simulation.dimension, 3)
            },
            parameters,
            state: {
                time: safe(state.time, 0),
                dt: safe(state.dt, 0),
                steps: safe(state.steps, 0),
                aggregates: state.aggregates || {},
                entities: state.entities || []
            },
            history: {
                time: history.time || [],
                aggregates: history.aggregates || {},
                entities: history.entities || []
            },
            metadata: {
                exportedAt: metadataOverrides.exportedAt || now,
                source: metadataOverrides.source || 'Gravitation³',
                engine: metadataOverrides.engine || 'Web',
                schema: `SimulationExport@v${VERSION}`
            },
            custom
        };
    }

    globalScope.SimulationExport = {
        VERSION,
        createSimulationExport
    };
})(typeof window !== 'undefined' ? window : globalThis);
