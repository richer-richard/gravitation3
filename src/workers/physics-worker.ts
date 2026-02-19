/**
 * Physics Web Worker — runs WASM simulator off the main thread.
 * Communicates with the main thread via postMessage.
 */

import init, {
  WasmThreeBody,
  WasmDoublePendulum,
  WasmLorenz,
  WasmRossler,
  WasmDoubleGyre,
  WasmMalkus,
} from "../wasm/physics_wasm.js";

type SimulatorInstance =
  | WasmThreeBody
  | WasmDoublePendulum
  | WasmLorenz
  | WasmRossler
  | WasmDoubleGyre
  | WasmMalkus;

interface WorkerCommand {
  id: number;
  type:
    | "init"
    | "create"
    | "step"
    | "loadPreset"
    | "setParameter"
    | "getState"
    | "reset"
    | "getCollisions"
    | "seedParticles"
    | "addPendulum"
    | "removePendulum";
  simType?: string;
  preset?: string;
  steps?: number;
  name?: string;
  value?: number;
  count?: number;
  theta1?: number;
  omega1?: number;
  theta2?: number;
  omega2?: number;
  index?: number;
}

interface WorkerResponse {
  id: number;
  type: "result" | "error";
  data?: unknown;
  error?: string;
}

let simulator: SimulatorInstance | null = null;
let wasmReady = false;

function createSimulator(simType: string): SimulatorInstance {
  switch (simType) {
    case "three-body":
      return new WasmThreeBody();
    case "double-pendulum":
      return new WasmDoublePendulum();
    case "lorenz":
      return new WasmLorenz();
    case "rossler":
      return new WasmRossler();
    case "double-gyre":
      return new WasmDoubleGyre();
    case "malkus-waterwheel":
      return new WasmMalkus();
    default:
      throw new Error(`Unknown simulation type: ${simType}`);
  }
}

function handleCommand(cmd: WorkerCommand): unknown {
  switch (cmd.type) {
    case "init":
      return { ready: wasmReady };

    case "create": {
      if (simulator) {
        simulator.free();
      }
      simulator = createSimulator(cmd.simType!);
      return { created: cmd.simType };
    }

    case "step": {
      if (!simulator) throw new Error("No simulator created");
      return simulator.step(cmd.steps ?? 1);
    }

    case "loadPreset": {
      if (!simulator) throw new Error("No simulator created");
      if ("load_preset" in simulator) {
        return (
          simulator as WasmThreeBody | WasmLorenz | WasmRossler | WasmDoubleGyre | WasmMalkus
        ).load_preset(cmd.preset!);
      }
      if ("reset" in simulator && cmd.simType === "double-pendulum") {
        (simulator as WasmDoublePendulum).reset(cmd.preset!);
        return (simulator as WasmDoublePendulum).get_state();
      }
      return null;
    }

    case "setParameter": {
      if (!simulator) throw new Error("No simulator created");
      simulator.set_parameter(cmd.name!, cmd.value!);
      return { set: cmd.name, value: cmd.value };
    }

    case "getState": {
      if (!simulator) throw new Error("No simulator created");
      return simulator.get_state();
    }

    case "reset": {
      if (!simulator) throw new Error("No simulator created");
      if (cmd.simType === "double-pendulum") {
        (simulator as WasmDoublePendulum).reset(cmd.preset ?? "standard");
      } else {
        (simulator as WasmThreeBody).reset();
      }
      return simulator.get_state();
    }

    case "getCollisions": {
      if (!simulator || !("get_collisions" in simulator))
        throw new Error("Not a three-body simulator");
      return (simulator as WasmThreeBody).get_collisions();
    }

    case "seedParticles": {
      if (!simulator || !("seed_particles" in simulator))
        throw new Error("Not a double-gyre simulator");
      (simulator as WasmDoubleGyre).seed_particles(cmd.count ?? 500);
      return simulator.get_state();
    }

    case "addPendulum": {
      if (!simulator || !("add_pendulum" in simulator))
        throw new Error("Not a double-pendulum simulator");
      (simulator as WasmDoublePendulum).add_pendulum(
        cmd.theta1 ?? Math.PI / 2,
        cmd.omega1 ?? 0,
        cmd.theta2 ?? Math.PI / 2,
        cmd.omega2 ?? 0
      );
      return simulator.get_state();
    }

    case "removePendulum": {
      if (!simulator || !("remove_pendulum" in simulator))
        throw new Error("Not a double-pendulum simulator");
      (simulator as WasmDoublePendulum).remove_pendulum(cmd.index ?? 0);
      return simulator.get_state();
    }

    default:
      throw new Error(`Unknown command: ${cmd.type}`);
  }
}

self.onmessage = async (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;
  const response: WorkerResponse = { id: cmd.id, type: "result" };

  try {
    if (!wasmReady && cmd.type !== "init") {
      throw new Error("WASM not initialized yet");
    }
    response.data = handleCommand(cmd);
  } catch (err) {
    response.type = "error";
    response.error = err instanceof Error ? err.message : String(err);
  }

  self.postMessage(response);
};

// Initialize WASM on worker start
init().then(() => {
  wasmReady = true;
  self.postMessage({ id: -1, type: "result", data: { ready: true } });
});
