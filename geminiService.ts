
import { GoogleGenAI, Type } from "@google/genai";
import { ApiCard, RouteQueryIntent, NewtonReceipt } from "../types";
import { logEvent } from "./ledgerService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function parseIntent(query: string): Promise<RouteQueryIntent> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse the following user query for NoKeypedia (an API directory) into a structured intent: "${query}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          target_category: { type: Type.STRING },
          required_inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
          output_type: { type: Type.STRING, enum: ["list", "single", "value"] },
          constraints: {
            type: Type.OBJECT,
            properties: {
              no_proxy: { type: Type.BOOLEAN },
              browser_only: { type: Type.BOOLEAN },
              prefer_reliable: { type: Type.BOOLEAN }
            }
          }
        },
        required: ["target_category", "required_inputs", "output_type", "constraints"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as RouteQueryIntent;
}

export async function generateReceipt(
  query: string,
  intent: RouteQueryIntent,
  candidates: ApiCard[]
): Promise<NewtonReceipt | null> {
  if (candidates.length === 0) return null;

  // We'll pick the best one programmatically, then use AI to craft the specific "why" and "request details"
  const best = candidates[0];
  const endpoint = best.endpoints[0];

  const summary = `Routing query "${query}" to ${best.name} (${endpoint.name})`;
  await logEvent("ROUTE_QUERY", "ApiCard", best.id, summary, { query, intent });

  return {
    selected_api: best,
    selected_endpoint: endpoint,
    why: [
      `Directly matches category: ${intent.target_category}`,
      `Supports required inputs: ${intent.required_inputs.join(", ")}`,
      `Verified high confidence (${(best.reliability.pass_rate_30d * 100).toFixed(0)}% pass rate)`
    ],
    request: {
      url: `${best.base_url}${endpoint.path}`,
      method: endpoint.method,
      params: endpoint.params_schema.reduce((acc, p) => ({ ...acc, [p.name]: p.example }), {}),
      headers: {}
    },
    snippets: endpoint.example_calls,
    response_preview: endpoint.response_schema_min,
    constraints: intent.constraints,
    limitations: [
      `Rate limit: ${best.rate_limit}`,
      `License: ${best.license.summary}`
    ],
    fallbacks: candidates.slice(1, 3).map(c => ({ api_id: c.id, reason: "Alternative provider" })),
    verification: {
      last_test_ts: best.reliability.last_test_ts,
      confidence: best.reliability.confidence,
      pass_rate_30d: best.reliability.pass_rate_30d
    }
  };
}
