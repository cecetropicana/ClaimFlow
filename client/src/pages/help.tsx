import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  FileSearch, 
  CloudLightning, 
  Users, 
  ListTodo,
  MessageSquare,
  ExternalLink,
  BookOpen,
  ShieldCheck
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Chat Interface",
    description: "Natural language queries for claims management and triage",
    examples: [
      "Show backlog summary",
      "Look up claim CLM-2026-00001",
      "Find unassigned critical claims"
    ]
  },
  {
    icon: ListTodo,
    title: "Backlog Queue",
    description: "Filter, sort, and manage the storm claims backlog with bulk assignment",
    examples: [
      "How many claims are unassigned?",
      "Show catastrophic severity claims",
      "What is the current backlog ratio?"
    ]
  },
  {
    icon: CloudLightning,
    title: "Storm Claims",
    description: "View claims grouped by storm event with damage and loss summaries",
    examples: [
      "Show storm claims overview",
      "How many claims from Hurricane Milton?",
      "What is the total estimated loss?"
    ]
  },
  {
    icon: Users,
    title: "Adjuster Workload",
    description: "Monitor adjuster caseloads and availability for balanced assignment",
    examples: [
      "Check adjuster workload",
      "Who has capacity for more claims?",
      "Show adjuster specialties"
    ]
  },
  {
    icon: FileSearch,
    title: "Claims Triage",
    description: "Review individual claims, update severity, assign adjusters, and add notes",
    examples: [
      "Triage claim CLM-2026-00005",
      "What photos are attached?",
      "Update claim status to inspected"
    ]
  },
  {
    icon: ShieldCheck,
    title: "Governance",
    description: "AI agent oversight with approval workflows and trust management",
    examples: [
      "View pending approvals",
      "Check agent monitoring status",
      "Review governance policies"
    ]
  }
];

const faqs = [
  {
    question: "What AI technology powers ClaimFlow?",
    answer: "ClaimFlow uses OpenAI (GPT models) via Replit's integration for agent intelligence. The architecture supports alternative AI providers including Anthropic Claude, Google Gemini, or open-source models. Contact your administrator to discuss switching providers."
  },
  {
    question: "What is the Averecion governance platform?",
    answer: "Averecion is an external governance platform that manages agent trust levels, pre-execution checks, and earned autonomy progression. When connected, it provides additional oversight for high-risk actions. The app works in offline mode when Averecion is unavailable, using local governance rules."
  },
  {
    question: "Why does the governance banner show 'Offline'?",
    answer: "The governance banner shows 'Offline' when the Averecion external service is not reachable. This is expected during development or when the Averecion instance is not running. ClaimFlow continues to function using local agent logic and built-in fallbacks."
  },
  {
    question: "How does claim severity classification work?",
    answer: "Claims are classified into four severity levels: Catastrophic (complete structural loss), Major (significant damage requiring extensive repair), Moderate (partial damage with some habitability), and Minor (cosmetic or limited damage). Severity affects triage priority and adjuster assignment."
  },
  {
    question: "How are claims assigned to adjusters?",
    answer: "Claims can be assigned individually from the Triage page or in bulk from the Backlog Queue. The system considers adjuster specialties, current caseload, maximum capacity, and geographic coverage when suggesting assignments."
  },
  {
    question: "What storm event data is tracked?",
    answer: "Storm events include the storm name, category, status (active, monitoring, past), affected regions, total claim count, and estimated total losses. Claims are linked to storm events for consolidated reporting and analysis."
  },
  {
    question: "Can I filter claims by multiple criteria?",
    answer: "Yes, the Backlog Queue supports filtering by storm event, severity level, status, and damage type. You can also search by claim number, policyholder name, or address. Filters can be combined for precise results."
  },
  {
    question: "How is the dashboard data calculated?",
    answer: "Dashboard metrics aggregate across all claims: open claims count, unassigned ratio, average claim age in days, total estimated losses, and breakdowns by severity, status, damage type, and storm event."
  },
  {
    question: "How often is the data updated?",
    answer: "Claim data updates in real-time as changes are made. Storm event data syncs with weather services. Adjuster workload refreshes when claims are assigned or completed."
  }
];

export default function HelpPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-help">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <HelpCircle className="h-6 w-6" />
            Help & Documentation
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn how to use ClaimFlow effectively
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Features Overview
          </h2>
          
          <div className="grid gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-primary" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Example Queries
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {feature.examples.map((example, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs font-normal">
                          "{example}"
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`}>
                <AccordionTrigger className="text-left" data-testid={`accordion-faq-${idx}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Additional Resources</h2>
          
          <div className="grid gap-3">
            <a 
              href="#" 
              className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate"
              data-testid="link-api-docs"
            >
              <div>
                <p className="font-medium">API Documentation</p>
                <p className="text-sm text-muted-foreground">
                  Technical reference for claims integration
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            
            <a 
              href="#" 
              className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate"
              data-testid="link-agent-architecture"
            >
              <div>
                <p className="font-medium">Agent Architecture</p>
                <p className="text-sm text-muted-foreground">
                  Learn about the multi-agent governance system
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            
            <a 
              href="#" 
              className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate"
              data-testid="link-support"
            >
              <div>
                <p className="font-medium">Contact Support</p>
                <p className="text-sm text-muted-foreground">
                  Get help from the claims operations team
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
