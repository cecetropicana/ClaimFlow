# ForeSight Governance Integration

## Overview

ForeSight integrates with the **Averecion Platform** to provide enterprise-grade governance for AI agents. This integration enables pre-execution checks, decision telemetry, earned autonomy progression, and human-in-the-loop approval workflows.

---

## Averecion Platform Integration

### What is Averecion?

Averecion is an external governance platform that provides:

1. **Agent Registration & Discovery** - Register agents with unique IDs, capabilities, and trust levels
2. **Health Monitoring** - Continuous heartbeat tracking for agent availability
3. **Pre-Execution Governance** - Check actions before execution against organizational policies
4. **Decision Telemetry** - Record and analyze agent decision-making for the Decision Inspector
5. **Options Generation** - Generate action alternatives for high-risk decisions
6. **Earned Autonomy** - Progressive trust level advancement based on performance

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ForeSight Application                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Agent Layer                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Storm Agent │  │ Capacity    │  │ Grid Topology   │  │   │
│  │  │             │  │ Agent       │  │ Agent           │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │   │
│  │         │                │                   │           │   │
│  │         └────────────────┼───────────────────┘           │   │
│  │                          ▼                               │   │
│  │              ┌───────────────────────┐                   │   │
│  │              │     BaseAgent         │                   │   │
│  │              │  - checkGovernance()  │                   │   │
│  │              │  - handleHighRisk()   │                   │   │
│  │              │  - logAction()        │                   │   │
│  │              └───────────┬───────────┘                   │   │
│  │                          │                               │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  AverecionClient                          │   │
│  │  - registerAgent()      - checkAction()                   │   │
│  │  - sendAgentHeartbeat() - reportOutcome()                 │   │
│  │  - reportDecision()     - requestActionOptions()          │   │
│  │  - selectOption()       - waitForOptionSelection()        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Averecion Platform                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Agent     │  │ Governance  │  │   Decision Inspector    │  │
│  │  Registry   │  │   Engine    │  │   (Telemetry Viewer)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Heartbeat  │  │   Options   │  │   Human-in-the-Loop     │  │
│  │   Monitor   │  │  Generator  │  │   Approval Dashboard    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Used

### Agent Registration
```
POST /api/agents/register
{
  "name": "capacity-check-agent",
  "description": "Analyzes grid capacity for new connections",
  "endpoint": "https://foresight.replit.app/api/agent/capacity-check-agent",
  "capabilities": ["check_capacity", "datacenter_impact"],
  "organizationId": "<org-uuid>",
  "discoverySource": "sdk",
  "localAgentId": "capacity-check-agent",
  "metadata": {
    "agentType": "capacity_check",
    "trustLevel": "supervised"
  }
}
```

### Agent Heartbeat
```
POST /api/agents/{agentId}/heartbeat
{
  "status": "active",
  "timestamp": "2025-01-18T15:30:00Z"
}
```

### Governance Check
```
POST /api/governance/check
{
  "agentId": "<averecion-agent-id>",
  "action": "check_capacity",
  "context": {
    "userQuery": "Check capacity for 100MW data center",
    "trustLevel": "supervised",
    "agentType": "capacity_check"
  }
}

Response:
{
  "status": "approved" | "requires_approval" | "denied",
  "reason": "Action approved based on organizational policy",
  "alignmentScore": 0.92,
  "modifiedAction": null,
  "constraints": {}
}
```

### Decision Telemetry
```
POST /api/telemetry/decision
{
  "agentId": "<averecion-agent-id>",
  "action": "check_capacity",
  "context": {
    "task": "Check capacity for new connection",
    "inputs": { "query": "100MW data center at Atlanta" }
  },
  "rationale": "Capacity feasibility check for new connection requested",
  "confidence": 0.85,
  "riskLevel": "high",
  "alternatives": [
    { "action": "forecast_load", "confidence": 0.5, "reason_not_chosen": "User asking about new connection" }
  ]
}
```

### Outcome Reporting
```
POST /api/governance/outcome
{
  "agentId": "<averecion-agent-id>",
  "action": "check_capacity",
  "outcome": "success",
  "alignmentScore": 0.95
}
```

### Options Generation (High-Risk Actions)
```
POST /api/options/generate
{
  "agentId": "<averecion-agent-id>",
  "action": "emergency_load_shed",
  "goal": "Emergency load reduction to prevent grid failure",
  "context": "Load to shed: 50 MW",
  "riskLevel": "critical",
  "isIrreversible": true,
  "affectedEntities": 5000
}

Response:
{
  "optionsId": "<options-uuid>",
  "options": [
    {
      "id": "opt-1",
      "action": "Shed industrial loads first",
      "description": "Target large industrial customers before residential",
      "riskLevel": "high",
      "estimatedImpact": "15 customers affected",
      "recommended": true
    },
    {
      "id": "opt-2",
      "action": "Rolling blackouts",
      "description": "Rotate outages across zones",
      "riskLevel": "medium",
      "estimatedImpact": "All zones affected temporarily"
    }
  ]
}
```

### Option Selection
```
POST /api/options/{optionsId}/select
{
  "agentId": "<averecion-agent-id>",
  "selectedOptionId": "opt-1",
  "rationale": "Industrial loads have backup generation",
  "selectionType": "agent" | "human"
}
```

---

## Trust Level System

### Levels (Earned Autonomy)

| Level | Description | Permissions |
|-------|-------------|-------------|
| **Supervised** | New agents, all high-risk actions require approval | Query responses only auto-approved |
| **Guided** | Proven agents, medium-risk actions auto-approved | High-risk flagged for review |
| **Semi-Autonomous** | Trusted agents, most actions auto-approved | High-risk approved but logged |

### Promotion Criteria

```typescript
const PROMOTION_CRITERIA = {
  supervised: {
    minDecisions: 50,      // Minimum decisions made
    minSuccessRate: 0.85,  // 85% success rate
    minTrustScore: 0.7,    // Trust score threshold
    minDaysActive: 7       // Days of operation
  },
  guided: {
    minDecisions: 200,
    minSuccessRate: 0.92,
    minTrustScore: 0.9,
    minDaysActive: 30
  },
  semi_autonomous: null    // Maximum level
};
```

### Demotion Criteria

```typescript
const DEMOTION_CRITERIA = {
  failureThreshold: 3,        // Consecutive failures
  successRateThreshold: 0.5   // Below this triggers review
};
```

---

## Governance Flow

### Standard Action Flow

```
User Query
    │
    ▼
┌─────────────────────┐
│ Supervisor Routes   │
│ to Specialized Agent│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Is High-Risk Action?│─Yes─▶│ Request Options    │
└──────────┬──────────┘     │ from Averecion     │
           │No              └──────────┬──────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Check Governance    │     │ Trust Level Check   │
│ via Averecion       │     │ - Supervised: Wait  │
└──────────┬──────────┘     │ - Guided+: Auto     │
           │                └──────────┬──────────┘
           ▼                           │
┌─────────────────────┐                │
│ Approved?           │◀───────────────┘
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
    Yes          No
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────────┐
│ Execute │  │ Add to Approval │
│ Action  │  │ Queue for HITL  │
└────┬────┘  └─────────────────┘
     │
     ▼
┌─────────────────────┐
│ Report Outcome      │
│ to Averecion        │
└─────────────────────┘
```

---

## Local Fallback Rules

When Averecion is unavailable, ForeSight applies local governance rules:

```typescript
private localGovernance(context: AgentContext, action: ActionType): GovernanceDecision {
  const highRiskActions = ["datacenter_impact", "check_capacity"];
  
  switch (context.trustLevel) {
    case "supervised":
      if (action === "query_response") return { approved: true };
      return { approved: false, requiresHumanReview: true };
      
    case "guided":
      if (highRiskActions.includes(action)) {
        return { approved: false, requiresHumanReview: true };
      }
      return { approved: true };
      
    case "semi_autonomous":
      return { approved: true, requiresHumanReview: highRiskActions.includes(action) };
  }
}
```

---

## Files in This Package

| File | Purpose |
|------|---------|
| `averecion-client.ts` | HTTP client for Averecion API communication |
| `autonomy-tracker.ts` | Local tracking for trust score and promotion eligibility |
| `base-agent.ts` | Base class with governance integration for all agents |
| `types.ts` | TypeScript type definitions for governance system |
| `README.md` | This documentation file |

---

## Configuration

### Environment Variables

```bash
AVERECION_API_KEY=your-api-key  # Authentication for Averecion
```

### Constants (in averecion-client.ts)

```typescript
const AVERECION_URL = "https://..."; // Averecion platform URL
const ORGANIZATION_ID = "...";       // Your organization UUID
const HEARTBEAT_INTERVAL_MS = 30000; // System heartbeat interval
const AGENT_HEARTBEAT_INTERVAL_MS = 15000; // Per-agent heartbeat
```

---

## Key Integration Points

1. **Agent Startup**: Agents register with Averecion on initialization
2. **Every Action**: Pre-execution governance check before any agent action
3. **High-Risk Actions**: Options generated and presented for selection
4. **After Execution**: Outcome reported for trust score calculation
5. **Continuous**: Heartbeat monitoring for availability tracking

---

## Copyright

Copyright © 2025 Cece Anderson / AverNova LLC. All Rights Reserved.

This document and associated code are proprietary and confidential.
