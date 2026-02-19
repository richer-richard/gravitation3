/**
 * DataService — client for the data collection service (:5002).
 */

const DATA_BASE = "http://localhost:5002";

interface DataPoint {
  simulation_id: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export async function submitData(
  simulationId: string,
  data: Record<string, unknown>
): Promise<void> {
  await fetch(`${DATA_BASE}/api/data/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      simulation_id: simulationId,
      timestamp: Date.now(),
      data,
    }),
  });
}

export async function getData(simulationId: string): Promise<DataPoint[]> {
  const response = await fetch(`${DATA_BASE}/api/data/get/${simulationId}`);
  if (!response.ok) return [];
  return response.json();
}

export async function getLatest(
  simulationId: string
): Promise<DataPoint | null> {
  const response = await fetch(
    `${DATA_BASE}/api/data/latest/${simulationId}`
  );
  if (!response.ok) return null;
  return response.json();
}

export async function listSimulations(): Promise<string[]> {
  const response = await fetch(`${DATA_BASE}/api/data/list`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.simulations || [];
}

export async function clearData(simulationId: string): Promise<void> {
  await fetch(`${DATA_BASE}/api/data/clear/${simulationId}`, {
    method: "POST",
  });
}
