# Multi-Agent ClaimFlow Architecture

## Overview

This document outlines the architecture for ClaimFlow, a governed multi-agent insurance claims management platform for storm backlog processing, integrated with Averecion for pre-execution governance.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPERIENCE LAYER                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Chat UI    │  │  Adaptive   │  │  Approval   │  │  Dashboard  │        │
│  │  (React)    │  │   Cards     │  │   Queue     │  │  (Metrics)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                         │
│                          SSE/WebSocket (Streaming)                          │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                      AGENT ORCHESTRATION LAYER                               │
│                                    │                                         │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                        SUPERVISOR AGENT                                │  │
│  │  • Intent Classification (GPT-4o-mini - cheap)                        │  │
│  │  • Agent Routing & Coordination                                        │  │
│  │  • Response Composition & Streaming                                    │  │
│  │  • Circuit Breaker Management                                          │  │
│  │  • Fallback to Deterministic Parser                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                    │              │              │              │            │
│         ┌─────────┴──┐    ┌──────┴─────┐  ┌────┴──────┐  ┌────┴──────┐     │
│         ▼            ▼    ▼            ▼  ▼           ▼  ▼           ▼     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │  CLAIMS   │ │  BACKLOG   │ │  ADJUSTER  │ │   STORM    │              │
│  │  TRIAGE   │ │  ANALYSIS  │ │ MANAGEMENT │ │ ASSESSMENT │              │
│  │  AGENT    │ │   AGENT    │ │   AGENT    │ │   AGENT    │              │
│  │            │ │            │ │            │ │            │              │
│  │ Trust: 85% │ │ Trust: 92% │ │ Trust: 78% │ │ Trust: 70% │              │
│  │ Level:     │ │ Level:     │ │ Level:     │ │ Level:     │              │
│  │ Guided     │ │ Guided     │ │ Guided     │ │ Supervised │              │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘              │
│        │              │              │              │                      │
│        └──────────────┴──────────────┴──────────────┘                      │
│                                 │                                           │
│  ┌──────────────────────────────┴──────────────────────────────────────┐   │
│  │                      SHARED SERVICES                                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Cache   │ │  Audit   │ │  Rate    │ │ Circuit  │ │Confidence│  │   │
│  │  │  Layer   │ │  Logger  │ │ Limiter  │ │ Breaker  │ │  Scorer  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                          All Agent Calls Pass Through
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                         AVERECION GOVERNANCE LAYER                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    UNIVERSAL CREDENTIAL VAULT                          │ │
│  │                    (OpenAI API Keys Secured)                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                     │                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      STANDING ORDER RULES                              │ │
│  │                                                                        │ │
│  │  GLOBAL RULES:                                                         │ │
│  │  • Prohibit: Bypass governance, expose credentials, PII in responses  │ │
│  │  • Require: Correlation IDs, source citations, confidence scores      │ │
│  │  • Constrain: 1000 tokens/response, 100 calls/hour/agent              │ │
│  │                                                                        │ │
│  │  CLAIMS TRIAGE AGENT RULES:                                            │ │
│  │  • Prohibit: Auto-closing claims exceeding $50K without human review  │ │
│  │  • Require: Human approval for catastrophic severity classifications  │ │
│  │  • Constrain: 20 triages/hour, read-only claims data access           │ │
│  │                                                                        │ │
│  │  BACKLOG ANALYSIS AGENT RULES:                                         │ │
│  │  • Prohibit: Modifying queue priorities without approval               │ │
│  │  • Require: Read-only access to backlog data                          │ │
│  │  • Constrain: Assigned region scope only                              │ │
│  │                                                                        │ │
│  │  ADJUSTER MANAGEMENT AGENT RULES:                                      │ │
│  │  • Prohibit: Overloading adjusters beyond max caseload limits         │ │
│  │  • Require: Specialty matching for all adjuster assignments           │ │
│  │  • Constrain: Max 5 reassignments per adjuster per day                │ │
│  │                                                                        │ │
│  │  STORM ASSESSMENT AGENT RULES:                                         │ │
│  │  • Prohibit: Issuing loss estimates exceeding $500K without review    │ │
│  │  • Require: Human approval for CAT4+ storm impact assessments         │ │
│  │  • Constrain: Summary estimates only, no binding loss declarations    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                     │                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Decision   │  │   Approval   │  │   Earned     │  │    Audit     │    │
│  │   Network    │  │    Queue     │  │  Autonomy    │  │    Trail     │    │
│  │  (Real-time) │  │  (Human-in-  │  │   Tracker    │  │   (100%)     │    │
│  │              │  │   the-loop)  │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                          Approved Requests Only
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                            DATA & AI LAYER                                   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   OpenAI     │  │  PostgreSQL  │  │   Weather    │  │   Mapping    │    │
│  │   GPT-4o     │  │ (Claims DB)  │  │   APIs       │  │    APIs      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Agent Request Lifecycle

```
1. USER REQUEST
   │
   ▼
2. EXPERIENCE LAYER
   │  • React chat captures query
   │  • WebSocket connection for streaming
   │
   ▼
3. EXPRESS ORCHESTRATION API
   │  • Rate limiting check
   │  • Authentication validation
   │  • Request logging with correlation ID
   │
   ▼
4. SUPERVISOR AGENT
   │  • Intent classification (GPT-4o-mini - cheap model)
   │  • Agent selection based on query type
   │  • Check cache for recent identical queries
   │
   ├─── Cache HIT ──► Return cached response (fast path)
   │
   ▼
5. WORKER AGENT PREPARATION
   │  • Build action package (intent, parameters, context)
   │  • Attach source data references
   │
   ▼
6. AVERECION EVALUATION (/evaluate via MCP)
   │  • Standing order rules applied
   │  • Trust level checked
   │  • Action risk assessed
   │
   ├─── BLOCKED ──► Return policy violation + alternatives
   │
   ├─── HUMAN APPROVAL NEEDED ──► Route to approval queue
   │                              │
   │                              ▼
   │                         OPERATOR REVIEWS
   │                              │
   │                    ┌─────────┴─────────┐
   │                    ▼                   ▼
   │               APPROVED            REJECTED
   │                    │                   │
   │                    ▼                   ▼
   │              Continue flow     Return rejection reason
   │
   ▼
7. LLM EXECUTION (via Averecion proxy)
   │  • Averecion forwards request with real credentials
   │  • Response captured for audit
   │
   ▼
8. RESPONSE PROCESSING
   │  • Confidence scoring applied
   │  • Source data attached (grounded response)
   │  • Cache updated
   │  • Audit log written
   │
   ▼
9. STREAMING RESPONSE
   │  • SSE/WebSocket sends partial results
   │  • Adaptive Card rendered
   │  • Final confidence indicator shown
   │
   ▼
10. EARNED AUTONOMY UPDATE
    • Averecion tracks decision outcome
    • Agent trust score adjusted
    • Graduation/demotion evaluated
```

---

## Component Specifications

### Supervisor Agent
```typescript
interface SupervisorAgent {
  classifyIntent(query: string): Promise<{
    intent: 'claims_triage' | 'backlog_analysis' | 'adjuster_management' | 'storm_assessment' | 'general';
    confidence: number;
    parameters: Record<string, unknown>;
  }>;
  
  routeToWorker(intent: Intent): WorkerAgent;
  
  composeResponse(workerOutput: WorkerOutput): StreamingResponse;
  
  fallbackToDeterministic(query: string): DeterministicResponse;
  
  checkCircuitBreaker(agentId: string): boolean;
  tripCircuitBreaker(agentId: string, reason: string): void;
}
```

### Worker Agent Interface
```typescript
interface WorkerAgent {
  id: string;
  type: 'claims_triage' | 'backlog_analysis' | 'adjuster_management' | 'storm_assessment';
  trustLevel: 'supervised' | 'guided' | 'semi-auto' | 'autonomous' | 'trusted';
  trustScore: number; // 0-100
  
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
  
  prepareActionPackage(request: AnalysisRequest): ActionPackage;
  
  validateResponse(response: LLMResponse): ValidationResult;
  
  getDeterministicFallback(request: AnalysisRequest): FallbackResult;
}
```

### Averecion Integration
```typescript
interface AverecionClient {
  registerAgent(agent: AgentRegistration): Promise<AgentCredential>;
  
  evaluateAction(action: ActionPackage): Promise<{
    decision: 'approved' | 'blocked' | 'needs_approval';
    reason?: string;
    alternatives?: ActionPackage[];
    approvalId?: string;
  }>;
  
  executeAction(action: ApprovedAction): Promise<LLMResponse>;
  
  checkApprovalStatus(approvalId: string): Promise<ApprovalStatus>;
  
  logDecision(decision: DecisionLog): Promise<void>;
  
  getAgentMetrics(agentId: string): Promise<TrustMetrics>;
}
```

### Shared Services

#### Cache Layer
```typescript
interface CacheService {
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  invalidate(pattern: string): Promise<void>;
  
  // Cache keys by type
  // claims:{region}:{claimId} - 15 min TTL
  // backlog:{region}:{status} - 30 min TTL
  // adjuster:{adjusterId}:{workload} - 60 min TTL
  // storm:{stormId}:{region} - 5 min TTL
}
```

#### Audit Logger
```typescript
interface AuditLogger {
  log(entry: {
    correlationId: string;
    timestamp: Date;
    agentId: string;
    action: string;
    input: unknown;
    output: unknown;
    decision: 'approved' | 'blocked' | 'human_approved' | 'human_rejected';
    confidenceScore: number;
    latencyMs: number;
    tokenUsage: { prompt: number; completion: number };
    costUsd: number;
  }): Promise<void>;
  
  query(filters: AuditFilters): Promise<AuditEntry[]>;
}
```

#### Rate Limiter
```typescript
interface RateLimiter {
  checkLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }>;
  
  // Limits by type:
  // global: 1000 requests/hour
  // per-user: 100 requests/hour
  // per-agent: 50 requests/hour
}
```

#### Circuit Breaker
```typescript
interface CircuitBreaker {
  // States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing)
  getState(agentId: string): 'closed' | 'open' | 'half_open';
  
  recordSuccess(agentId: string): void;
  recordFailure(agentId: string): void;
  
  // Config: 5 failures in 1 minute = OPEN
  // OPEN for 30 seconds, then HALF_OPEN
  // 3 successes in HALF_OPEN = CLOSED
}
```

#### Confidence Scorer
```typescript
interface ConfidenceScorer {
  score(response: LLMResponse, groundTruth: GroundTruthData): {
    overall: number; // 0-100
    factors: {
      dataRecency: number;
      sourceCount: number;
      modelConfidence: number;
      validationPassed: number;
    };
    warnings: string[];
  };
}
```

---

## Risk Mitigations Implemented

| Risk | Mitigation | Implementation |
|------|------------|----------------|
| Agent hallucination | Grounded responses | Attach source claims data to every response |
| | Confidence scoring | Display confidence level to adjusters and supervisors |
| | Validation layer | Check LLM output against known claims constraints |
| Unauthorized actions | Averecion governance | All actions evaluated before execution |
| | Standing order rules | Explicit prohibit/require/constrain policies |
| | Human-in-the-loop | High-risk claims actions routed to senior adjusters |
| Cost overruns | Tiered models | Cheap model for routing, powerful for analysis |
| | Rate limiting | Per-user and per-agent limits |
| | Token budgets | Max tokens per request in standing orders |
| | Cost tracking | Real-time cost monitoring in audit log |
| Latency issues | Caching | Cache common claims queries with appropriate TTL |
| | Streaming | SSE for partial results as they arrive |
| | Parallel execution | Run independent claims analyses concurrently |
| Agent failures | Circuit breakers | Disable failing agents temporarily |
| | Deterministic fallback | Rule-based parsing when AI fails |
| | Graceful degradation | Return partial results if available |
| Incorrect triage | Severity validation | Cross-check severity against damage estimates |
| | Caseload limits | Prevent adjuster overloading via standing orders |
| | Storm correlation | Validate storm data against weather API sources |
| Audit/Compliance | Complete audit trail | Every decision logged with full context |
| | Averecion Decision Network | Real-time visibility into agent actions |
| | Policy versioning | Track all standing order changes |

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | React + TypeScript | Existing stack |
| Streaming | Server-Sent Events (SSE) | Simpler than WebSocket for one-way streaming |
| Backend | Express + TypeScript | Existing stack |
| Agent Framework | Custom + OpenAI SDK | Flexibility, Averecion compatibility |
| LLM (Routing) | GPT-4o-mini | Cost-effective intent classification |
| LLM (Analysis) | GPT-4o | High-quality analysis output |
| Governance | Averecion MCP | Pre-execution control |
| Cache | In-memory (Redis later) | Start simple, scale as needed |
| Database | PostgreSQL (Claims DB) | Claims data, audit logs, persistent storage |
| Weather Data | Weather APIs | Storm tracking and impact assessment |
| Geospatial | Mapping APIs | Claims clustering and regional analysis |
| Monitoring | Averecion Dashboard | Agent metrics, decision network |

---

## Earned Autonomy Progression

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT AUTONOMY LEVELS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SUPERVISED (New Agents)                                            │
│  ├── All actions require human approval                             │
│  ├── Full context shown to approvers                                │
│  └── Reliability threshold: N/A (starting point)                   │
│           │                                                          │
│           ▼ 80% reliability over 20 decisions                       │
│                                                                      │
│  GUIDED                                                              │
│  ├── Low-risk claims actions auto-approved                          │
│  ├── Medium/high-risk claims need approval                          │
│  └── Reliability threshold: 80%+                                    │
│           │                                                          │
│           ▼ 90% reliability over 50 decisions                       │
│                                                                      │
│  SEMI-AUTONOMOUS                                                     │
│  ├── Low and medium-risk claims auto-approved                       │
│  ├── High-risk claims (e.g. >$50K, CAT4+ storms) need approval     │
│  └── Reliability threshold: 90%+                                    │
│           │                                                          │
│           ▼ 95% reliability over 100 decisions                      │
│                                                                      │
│  AUTONOMOUS                                                          │
│  ├── Most claims actions auto-approved                              │
│  ├── Only critical actions (e.g. >$500K estimates) need approval    │
│  └── Reliability threshold: 95%+                                    │
│           │                                                          │
│           ▼ 98% reliability over 200 decisions                      │
│                                                                      │
│  TRUSTED                                                             │
│  ├── Full autonomy                                                  │
│  ├── Audit-only monitoring                                          │
│  └── Reliability threshold: 98%+                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Note: Agents can be demoted if reliability drops below threshold
```

---

## API Endpoints (New/Modified)

### Agent Orchestration
```
POST /api/v2/chat              - New governed chat endpoint
GET  /api/v2/chat/stream/:id   - SSE streaming for responses
GET  /api/v2/approvals         - Pending approval queue
POST /api/v2/approvals/:id     - Approve/reject action
GET  /api/v2/agents            - List registered agents
GET  /api/v2/agents/:id/metrics - Agent trust metrics
```

### Audit & Monitoring
```
GET  /api/v2/audit             - Query audit logs
GET  /api/v2/metrics           - System metrics
GET  /api/v2/health            - Health check with circuit states
```

---

## File Structure (New)

```
server/
├── agents/
│   ├── supervisor-agent.ts        # Supervisor agent (intent routing)
│   ├── orchestrator.ts            # Agent orchestrator (coordination)
│   ├── averecion-client.ts        # Averecion governance client
│   ├── base-agent.ts              # Base agent class
│   ├── specialized/
│   │   ├── storm-agent.ts         # Claims Triage specialist
│   │   ├── load-forecast-agent.ts # Backlog Analysis specialist
│   │   ├── grid-topology-agent.ts # Adjuster Management specialist
│   │   └── capacity-agent.ts      # Storm Assessment specialist
│   ├── types.ts                   # Agent interfaces & types
│   ├── sync-service.ts            # Governance sync queue
│   ├── action-handler.ts          # Agent action execution
│   ├── autonomy-tracker.ts        # Earned autonomy tracking
│   ├── fallbacks.ts               # Deterministic fallback logic
│   └── cache.ts                   # Agent response caching
├── services/
│   ├── cache.ts                   # Caching layer
│   ├── audit-logger.ts            # Audit logging
│   ├── rate-limiter.ts            # Rate limiting
│   ├── circuit-breaker.ts         # Circuit breaker
│   ├── confidence-scorer.ts       # Confidence scoring
│   └── streaming.ts               # SSE streaming
├── routes/
│   ├── v2/
│   │   ├── chat.ts                # Governed chat routes
│   │   ├── approvals.ts           # Approval queue routes
│   │   ├── agents.ts              # Agent management routes
│   │   └── audit.ts               # Audit routes
│   └── index.ts                   # Route registration
└── middleware/
    ├── rate-limit.ts              # Rate limiting middleware
    └── correlation-id.ts          # Request correlation

client/src/
├── components/
│   ├── approvals/
│   │   ├── approval-queue.tsx     # Approval queue UI
│   │   └── approval-card.tsx      # Individual approval item
│   ├── agents/
│   │   ├── agent-status.tsx       # Agent health display
│   │   └── trust-meter.tsx        # Trust level visualization
│   └── chat/
│       ├── streaming-message.tsx  # Streaming response
│       └── confidence-badge.tsx   # Confidence indicator
└── pages/
    ├── approvals.tsx              # Approval queue page
    └── agent-dashboard.tsx        # Agent monitoring page
```
