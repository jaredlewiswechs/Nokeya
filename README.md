
# 🌌 NoKeypedia — The Newton Verified Substrate

> **"In the absence of keys, truth must be self-evident."** — NoKeypedia Core Axiom.

NoKeypedia is a high-integrity, deterministic directory and intelligent routing engine for **keyless APIs**. Built on the **Newton Substrate**, it provides developers with a verification-first environment to discover, test, and integrate external data sources without the friction of API keys, proxies (where possible), or opaque reliability metrics.

---

## 💎 Core Philosophy: The Newton Substrate

NoKeypedia operates on three pillars of the "Truth Axis":
1.  **Keyless Sovereignty**: Every node (API) in the substrate must be accessible without proprietary authentication.
2.  **Deterministic Verification**: Reliability is not a static claim; it is a calculated result of continuous automated testing.
3.  **Immutable Auditability**: Every interaction—from intent parsing to node verification—is etched into a local, append-only ledger.

---

## 🚀 Key Features

### 🧠 Intelligent Intent Routing ("Ask")
Driven by **Gemini 3 Flash**, the routing engine translates natural language developer intents (e.g., *"I need high-latency-tolerant weather data for a frontend-only app"*) into structured queries. It then sifts through the substrate to provide a **Newton Verification Receipt**.

### 📜 The Newton Receipt
When a route is successful, the system generates a high-fidelity integration receipt containing:
- **Verification Hash**: A unique fingerprint for the routing event.
- **Reliability Proofs**: Real-time latency and 30-day pass-rate stats.
- **Universal Snippets**: Copy-paste ready implementation code in modern ES6+ Fetch.

### 🧪 Automated Verification Suite ("Audit")
Built-in automated testing pings every endpoint in the catalog. 
- **Latency Tracking**: Calculated via moving average.
- **Confidence Scoring**: Dynamic assignment of `low` | `med` | `high` based on response consistency.
- **State Monitoring**: Visualizes the health of the entire keyless ecosystem at a glance.

### 🔗 The Immutable Chain ("Ledger")
A locally-persisted audit trail using **IndexedDB**. Every "Event" (Catalog Seed, Test Run, Route Query) is recorded with a timestamp and status, ensuring a transparent history of the substrate's evolution.

---

## 🛠 Tech Stack

- **Framework**: React 19.2 (Concurrent Rendering)
- **Intelligence**: Google Gemini API (@google/genai)
- **Styling**: Tailwind CSS (Fluid Responsive Layouts)
- **Persistence**: IndexedDB (Native Browser Substrate)
- **Architecture**: ES6+ Module Pattern with a deterministic service layer.

---

## 📋 The `ApiCard` Schema

Every API in the catalog adheres to the `nokeypedia_v1` specification:

```typescript
interface ApiCard {
  id: string;               // Unique Identifier
  base_url: string;         // Root endpoint
  auth_type: "none" | "optional";
  cors: "yes" | "no" | "unknown";
  reliability: {
    pass_rate_30d: number;  // 0.0 to 1.0
    confidence: string;     // low | med | high
  };
  test_spec: TestSpec;      // Rules for the Verification Engine
}
```

---

## 🚦 Getting Started

### Prerequisites
- An environment variable `process.env.API_KEY` must be configured with a valid Google Gemini API key to enable Intent Routing.

### Installation
1.  **Bootstrapping**: Upon first launch, the app initializes the IndexedDB schema and seeds the catalog with 30+ verified keyless nodes.
2.  **Navigation**:
    *   **Home**: Overview of the substrate health and trending nodes.
    *   **Nodes**: The full searchable catalog with multi-dimensional filtering.
    *   **Ask**: The AI-driven intent router.
    *   **Audit**: Manual and automated testing controls.
    *   **Chain**: The append-only event log.

---

## 🛡️ Verification Engine Logic

The verification engine calculates health using a dampened probability model:
- **Success**: Increases `pass_rate_30d` by +0.05 (capped at 1.0).
- **Failure**: Decreases `pass_rate_30d` by -0.10 (floor at 0.0).
- **Confidence**: Set to `high` only if `pass_rate_30d` > 0.95 and `last_test_ts` < 24 hours.

---

## ⚖️ License

Distributed under the MIT License. **Attribution to the Newton Substrate is required for all derivatives.**
