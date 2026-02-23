import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileSearch,
  ListTodo,
  CloudLightning,
  Users,
  ClipboardCheck,
  ArrowRight,
  FileText,
  MapPin,
  Calendar,
  Zap
} from "lucide-react";

interface GuidedActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAction: (prompt: string) => void;
}

interface AnalysisType {
  id: string;
  title: string;
  description: string;
  icon: typeof FileSearch;
  requiredInfo: string[];
  examplePrompt: string;
  color: string;
}

const analysisTypes: AnalysisType[] = [
  {
    id: "claim-lookup",
    title: "Claim Lookup",
    description: "Look up a specific claim by number to view its details and status",
    icon: FileSearch,
    requiredInfo: [
      "Claim number (e.g., CLM-2026-00001)",
      "Or policyholder name",
      "Or property address"
    ],
    examplePrompt: "Look up claim CLM-2026-00001",
    color: "text-blue-500"
  },
  {
    id: "backlog-analysis",
    title: "Backlog Analysis",
    description: "Review backlog stats, unassigned claims, and pipeline status",
    icon: ListTodo,
    requiredInfo: [
      "Filter by severity (optional)",
      "Filter by storm event (optional)",
      "Date range (optional)"
    ],
    examplePrompt: "Show me the current backlog summary with unassigned claims",
    color: "text-amber-500"
  },
  {
    id: "storm-impact",
    title: "Storm Impact",
    description: "View claims grouped by storm event with loss totals",
    icon: CloudLightning,
    requiredInfo: [
      "Storm name or ID (optional)",
      "Region filter (optional)",
      "Storm status (active/past)"
    ],
    examplePrompt: "Show storm claims overview for all active storms",
    color: "text-red-500"
  },
  {
    id: "adjuster-assignment",
    title: "Adjuster Assignment",
    description: "Check adjuster workload and availability for claim assignments",
    icon: Users,
    requiredInfo: [
      "Region (optional)",
      "Specialty needed (optional)",
      "Number of claims to assign (optional)"
    ],
    examplePrompt: "Check adjuster workload and find available adjusters",
    color: "text-green-500"
  },
  {
    id: "triage-review",
    title: "Triage Review",
    description: "Review and classify pending claims by severity and priority",
    icon: ClipboardCheck,
    requiredInfo: [
      "Severity filter (optional)",
      "Storm event (optional)",
      "Damage type (optional)"
    ],
    examplePrompt: "Show me pending claims that need triage review",
    color: "text-purple-500"
  }
];

export function GuidedActions({ open, onOpenChange, onSelectAction }: GuidedActionsProps) {
  const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);

  const handleUseExample = () => {
    if (selectedType) {
      onSelectAction(selectedType.examplePrompt);
      onOpenChange(false);
      setSelectedType(null);
    }
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        {!selectedType ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Plan an Analysis
              </DialogTitle>
              <DialogDescription>
                Select the type of claims action you want to perform. Each type requires specific information for best results.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="grid gap-3">
                {analysisTypes.map((type) => (
                  <Card 
                    key={type.id} 
                    className="cursor-pointer hover-elevate border-card-border"
                    onClick={() => setSelectedType(type)}
                    data-testid={`card-analysis-${type.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg bg-muted ${type.color}`}>
                          <type.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold">{type.title}</h3>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <selectedType.icon className={`h-5 w-5 ${selectedType.color}`} />
                {selectedType.title}
              </DialogTitle>
              <DialogDescription>
                {selectedType.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Information Needed
                </h4>
                <ul className="space-y-2">
                  {selectedType.requiredInfo.map((info, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="mt-0.5 shrink-0">
                        {idx + 1}
                      </Badge>
                      <span>{info}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">Example Prompt</h4>
                <p className="text-sm text-muted-foreground italic">
                  "{selectedType.examplePrompt}"
                </p>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  The more specific your information, the more accurate the results. 
                  Include claim numbers and exact values when possible.
                </span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} data-testid="button-back">
                Back to List
              </Button>
              <Button onClick={handleUseExample} data-testid="button-use-example">
                <Calendar className="h-4 w-4 mr-2" />
                Use Example Prompt
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
