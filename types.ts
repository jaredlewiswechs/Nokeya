
export type AuthType = "none" | "optional";
export type CorsStatus = "yes" | "no" | "unknown";
export type ConfidenceLevel = "low" | "med" | "high";
export type EntityType = "ApiCard" | "TestRun" | "RouteQuery" | "Export";

export interface EndpointCard {
  id: string;
  name: string;
  method: "GET" | "POST";
  path: string;
  purpose: string;
  params_schema: {
    name: string;
    type: string;
    required: boolean;
    example: string;
  }[];
  response_schema_min: object;
  example_calls: {
    curl: string;
    fetch: string;
  };
  common_failures: string[];
  use_cases: string[];
}

export interface TestSpec {
  method: "GET" | "POST";
  path: string;
  sample_params: Record<string, any>;
  expected_status: number;
  expected_json_paths: string[];
  cors_expected: CorsStatus;
}

export interface ReliabilityStats {
  last_test_ts: number;
  last_status: "ok" | "fail" | "pending";
  avg_latency_ms: number;
  pass_rate_30d: number;
  confidence: ConfidenceLevel;
  last_known_good_ts: number;
}

export interface ApiCard {
  id: string;
  name: string;
  base_url: string;
  description: string;
  categories: string[];
  tags: string[];
  requires_key: false;
  auth_type: AuthType;
  cors: CorsStatus;
  proxy_ok: boolean;
  rate_limit: string;
  license: {
    summary: string;
    url?: string;
  };
  docs_url?: string;
  endpoints: EndpointCard[];
  test_spec: TestSpec;
  reliability: ReliabilityStats;
  updated_at: number;
  created_at: number;
}

export interface LedgerEvent {
  id: string;
  ts: number;
  type: string;
  entity_type: EntityType;
  entity_id: string;
  patch: object;
  summary: string;
  result: {
    ok: boolean;
    notes?: string;
  };
}

export interface NewtonReceipt {
  selected_api: ApiCard;
  selected_endpoint: EndpointCard;
  why: string[];
  request: {
    url: string;
    method: string;
    params: Record<string, any>;
    headers: Record<string, string>;
  };
  snippets: {
    curl: string;
    fetch: string;
  };
  response_preview: object;
  constraints: {
    no_proxy: boolean;
    browser_only: boolean;
  };
  limitations: string[];
  fallbacks: { api_id: string; reason: string }[];
  verification: {
    last_test_ts: number;
    confidence: ConfidenceLevel;
    pass_rate_30d: number;
  };
}

export interface RouteQueryIntent {
  target_category: string;
  required_inputs: string[];
  output_type: "list" | "single" | "value";
  constraints: {
    no_proxy: boolean;
    browser_only: boolean;
    prefer_reliable: boolean;
  };
}

export interface AppState {
  activeTab: 'home' | 'catalog' | 'ask' | 'tests' | 'ledger';
  useProxy: boolean;
  searchQuery: string;
}
