
import { ApiCard, TestSpec, ReliabilityStats } from '../types';
import { db } from '../db';
import { logEvent } from './ledgerService';

export async function runApiTest(api: ApiCard, useProxy: boolean): Promise<ApiCard> {
  const spec: TestSpec = api.test_spec;
  const start = Date.now();
  let status: "ok" | "fail" = "fail";
  let latency = 0;
  let notes = "";

  const queryParams = new URLSearchParams(spec.sample_params as any).toString();
  const url = `${api.base_url}${spec.path}${queryParams ? '?' + queryParams : ''}`;

  try {
    const response = await fetch(url, {
      method: spec.method,
      // No headers for keyless
    });

    latency = Date.now() - start;
    if (response.status === spec.expected_status) {
      status = "ok";
      notes = `Received expected status ${spec.expected_status}`;
    } else {
      notes = `Status mismatch: expected ${spec.expected_status}, got ${response.status}`;
    }
  } catch (err: any) {
    status = "fail";
    notes = `Fetch failed: ${err.message}`;
    latency = Date.now() - start;
  }

  const newReliability: ReliabilityStats = {
    ...api.reliability,
    last_test_ts: Date.now(),
    last_status: status,
    avg_latency_ms: (api.reliability.avg_latency_ms + latency) / 2,
    pass_rate_30d: status === "ok" ? Math.min(1, api.reliability.pass_rate_30d + 0.05) : Math.max(0, api.reliability.pass_rate_30d - 0.1),
    confidence: status === "ok" ? "high" : "low",
    last_known_good_ts: status === "ok" ? Date.now() : api.reliability.last_known_good_ts
  };

  const updatedApi: ApiCard = {
    ...api,
    reliability: newReliability,
    updated_at: Date.now()
  };

  await db.saveApi(updatedApi);
  await logEvent("RUN_TESTS", "ApiCard", api.id, `Test ${status === 'ok' ? 'passed' : 'failed'} for ${api.name}`, { latency, notes }, { ok: status === 'ok', notes });

  return updatedApi;
}
