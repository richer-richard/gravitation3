/**
 * ServerHealth — monitors health of the Axum backend services.
 */

const SERVICES = {
  llm: "http://localhost:5001/health",
  data: "http://localhost:5002/api/health",
  model: "http://localhost:5003/health",
};

export interface HealthStatus {
  llm: boolean;
  data: boolean;
  model: boolean;
}

export async function checkServerHealth(): Promise<HealthStatus> {
  const results = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([key, url]) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      return [key, response.ok] as const;
    })
  );

  const status: HealthStatus = { llm: false, data: false, model: false };
  for (const result of results) {
    if (result.status === "fulfilled") {
      const [key, ok] = result.value;
      status[key as keyof HealthStatus] = ok;
    }
  }
  return status;
}
