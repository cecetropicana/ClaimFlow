import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  X, 
  ListTodo,
  FileSearch,
  CloudLightning,
  Users,
  AlertTriangle,
  MessageSquare,
  Sparkles
} from "lucide-react";

interface QuickStartPanelProps {
  onSendMessage: (message: string) => void;
  onOpenGuidedActions: () => void;
}

const quickPrompts = [
  {
    icon: ListTodo,
    label: "Show backlog summary",
    prompt: "Show backlog summary",
    color: "text-amber-500"
  },
  {
    icon: FileSearch,
    label: "Look up claim CLM-2026-00001",
    prompt: "Look up claim CLM-2026-00001",
    color: "text-blue-500"
  },
  {
    icon: CloudLightning,
    label: "Show storm claims overview",
    prompt: "Show storm claims overview",
    color: "text-red-500"
  },
  {
    icon: Users,
    label: "Check adjuster workload",
    prompt: "Check adjuster workload",
    color: "text-green-500"
  },
  {
    icon: AlertTriangle,
    label: "Find unassigned critical claims",
    prompt: "Find unassigned critical claims",
    color: "text-purple-500"
  }
];

export function QuickStartPanel({ onSendMessage, onOpenGuidedActions }: QuickStartPanelProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <Card className="border-card-border bg-card/50 backdrop-blur-sm" data-testid="panel-quick-start">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">Quick Start</CardTitle>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-quickstart"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ask me anything about claims management. Here are some things you can try:
        </p>
        
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((item, idx) => (
            <Badge 
              key={idx}
              variant="outline"
              className="cursor-pointer gap-1.5 py-1.5 px-3"
              onClick={() => onSendMessage(item.prompt)}
              data-testid={`badge-quick-prompt-${idx}`}
            >
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              {item.label}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={onOpenGuidedActions}
            data-testid="button-plan-analysis"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Plan an Analysis
          </Button>
          <span className="text-xs text-muted-foreground">
            Get guided help choosing the right action
          </span>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Tip:</span> Include claim numbers, storm names, 
              or adjuster IDs for faster lookups and more precise results.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
