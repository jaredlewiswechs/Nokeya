
import { ApiCard, RouteQueryIntent, NewtonReceipt } from "../types";
import { logEvent } from "./ledgerService";

declare const puter: any;

export async function parseIntent(query: string): Promise<RouteQueryIntent> {
  const prompt = `You are a JSON-only API intent parser for NoKeypedia (a keyless API directory).
Parse the following user query into a structured intent object.

User query: "${query}"

Respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "target_category": "<string: the main API category like Weather, Geo, Finance, etc>",
  "required_inputs": ["<string: list of inputs the user needs to provide>"],
  "output_type": "<one of: list, single, value>",
  "constraints": {
    "no_proxy": <boolean>,
    "browser_only": <boolean>,
    "prefer_reliable": <boolean>
  }
}`;

  const response = await puter.ai.chat(prompt);
  const text = typeof response === 'string' ? response : response?.message?.content || response?.text || JSON.stringify(response);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  return JSON.parse(jsonMatch[0]) as RouteQueryIntent;
}

export async function generateReceipt(
  query: string,
  intent: RouteQueryIntent,
  candidates: ApiCard[]
): Promise<NewtonReceipt | null> {
  if (candidates.length === 0) return null;

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

export async function chatWithAI(messages: { role: string; content: string }[]): Promise<string> {
  const systemPrompt = `You are Newton, the AI assistant for NoKeypedia — a keyless API discovery platform.
You help developers find and integrate free, key-free APIs. You are concise, technical, and helpful.
When recommending APIs, focus on ones that don't require API keys.
You can discuss API integration patterns, REST best practices, and help debug API calls.`;

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await puter.ai.chat(chatMessages);
  const text = typeof response === 'string' ? response : response?.message?.content || response?.text || String(response);
  return text;
}
