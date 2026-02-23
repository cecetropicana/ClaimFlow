import type { ActionType, AgentResult } from "./types";

interface FallbackResponse {
  response: string;
  analysis?: Record<string, unknown>;
  recommendations?: string[];
}

const FALLBACK_RESPONSES: Record<ActionType, FallbackResponse> = {
  triage_claim: {
    response: "Claims triage service is currently unavailable. Based on standard procedures, claims should be prioritized by severity and damage type.",
    analysis: {
      status: "fallback",
      recommendation: "Review existing triage protocols",
      priority: "medium",
    },
    recommendations: [
      "Prioritize critical severity claims first",
      "Review damage documentation for completeness",
      "Follow standard triage classification guidelines",
    ],
  },

  analyze_backlog: {
    response: "Backlog analysis service is temporarily unavailable. Using standard queue metrics for planning purposes.",
    analysis: {
      status: "fallback",
      method: "standard_metrics",
      confidence: 0.6,
    },
    recommendations: [
      "Review current queue depth manually",
      "Monitor aging claims for SLA compliance",
      "Allocate additional adjusters to high-volume regions",
    ],
  },

  manage_adjusters: {
    response: "Adjuster management service is unavailable. Manual workload review recommended.",
    analysis: {
      status: "fallback",
      suggestion: "Review adjuster dashboards directly",
    },
    recommendations: [
      "Check adjuster availability and current caseloads",
      "Match specialties to pending claim types manually",
      "Contact regional managers for assignment decisions",
    ],
  },

  assess_storm: {
    response: "Storm assessment service is temporarily unavailable. Standard storm response protocols should be followed.",
    analysis: {
      status: "fallback",
      approach: "standard_protocols",
    },
    recommendations: [
      "Follow catastrophe response playbook",
      "Deploy field teams to affected regions",
      "Coordinate with weather services for updated forecasts",
    ],
  },

  query_response: {
    response: "I'm currently unable to process your query. Please try rephrasing or contact support for assistance.",
    analysis: {
      status: "fallback",
    },
    recommendations: [
      "Try a more specific question",
      "Check system status dashboard",
      "Contact support if issue persists",
    ],
  },
};

export function getDeterministicFallback(action: ActionType): AgentResult {
  const fallback = FALLBACK_RESPONSES[action] || FALLBACK_RESPONSES.query_response;

  return {
    success: true,
    action,
    data: fallback,
    confidenceScore: 0.3,
  };
}

export function shouldUseFallback(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("enotfound")
    ) {
      return true;
    }

    if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.includes("too many requests")
    ) {
      return true;
    }

    if (
      errorMessage.includes("503") ||
      errorMessage.includes("service unavailable") ||
      errorMessage.includes("temporarily unavailable")
    ) {
      return true;
    }
  }

  return false;
}

export function enhanceFallbackWithContext(
  fallback: AgentResult,
  context: { userQuery?: string; agentId?: string }
): AgentResult {
  const data = fallback.data as FallbackResponse;
  
  return {
    ...fallback,
    data: {
      ...data,
      context: {
        originalQuery: context.userQuery,
        handledBy: context.agentId,
        timestamp: new Date().toISOString(),
        note: "This is a fallback response. The AI service may be experiencing issues.",
      },
    },
  };
}
