import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToastAction } from "@/components/ui/toast";
import {
  FileSearch,
  User,
  MapPin,
  Calendar,
  DollarSign,
  MessageSquare,
  Phone,
  Mail,
  CloudLightning,
  Camera,
  Shield,
  UserCheck,
  ArrowRight,
  Search,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRightLeft,
  History,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Claim, ClaimNote, ClaimActivity, Adjuster, ClaimStatus } from "@shared/schema";

const STATUS_FLOW: ClaimStatus[] = [
  "new",
  "triaged",
  "assigned",
  "inspected",
  "estimated",
  "approved",
  "settled",
  "closed",
];

function severityVariant(severity: string) {
  switch (severity) {
    case "catastrophic": return "destructive" as const;
    case "major": return "default" as const;
    case "moderate": return "secondary" as const;
    case "minor": return "outline" as const;
    default: return "secondary" as const;
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "new": return "outline" as const;
    case "triaged": return "secondary" as const;
    case "assigned": return "default" as const;
    case "inspected": return "default" as const;
    case "estimated": return "secondary" as const;
    case "approved": return "default" as const;
    case "settled": return "secondary" as const;
    case "closed": return "outline" as const;
    case "denied": return "destructive" as const;
    default: return "secondary" as const;
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ClaimDetailSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

function SearchView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: claims } = useQuery<Claim[]>({
    queryKey: ["/api/claims"],
  });

  function handleLookup() {
    if (!searchTerm.trim()) {
      toast({ title: "Enter a claim number", variant: "destructive" });
      return;
    }
    const found = claims?.find(
      (c) => c.claimNumber.toLowerCase() === searchTerm.trim().toLowerCase()
    );
    if (found) {
      setLocation(`/triage/${found.id}`);
    } else {
      toast({ title: "Claim not found", description: `No claim found with number "${searchTerm}"`, variant: "destructive" });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Claim Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a claim number to view its details.
          </p>
          <div className="flex gap-2">
            <Input
              data-testid="input-claim-search"
              placeholder="e.g. CLM-001"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <Button data-testid="button-claim-lookup" onClick={handleLookup}>
              <Search className="h-4 w-4 mr-1" />
              Look Up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClaimDetailView({ claimId }: { claimId: string }) {
  const { toast } = useToast();
  const [selectedAdjusterId, setSelectedAdjusterId] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteRole, setNoteRole] = useState("adjuster");
  const [noteContent, setNoteContent] = useState("");

  const { data: claim, isLoading: claimLoading } = useQuery<Claim>({
    queryKey: ["/api/claims", claimId],
  });

  const { data: notes, isLoading: notesLoading } = useQuery<ClaimNote[]>({
    queryKey: ["/api/claims", claimId, "notes"],
  });

  const { data: adjusters } = useQuery<Adjuster[]>({
    queryKey: ["/api/adjusters"],
  });

  const { data: activity } = useQuery<ClaimActivity[]>({
    queryKey: ["/api/claims", claimId, "activity"],
  });

  const assignMutation = useMutation({
    mutationFn: (params: { adjusterId: string; force?: boolean }) =>
      apiRequest("POST", `/api/claims/${claimId}/assign`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims", claimId] });
      queryClient.invalidateQueries({ queryKey: ["/api/adjusters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/claims", claimId, "activity"] });
      toast({ title: "Adjuster assigned successfully" });
      setSelectedAdjusterId("");
    },
    onError: (err: Error) => {
      try {
        const body = JSON.parse(err.message.replace(/^\d+:\s*/, ""));
        if (body.warning) {
          toast({
            title: "Assignment Warning",
            description: `${body.error}. Assign anyway?`,
            variant: "destructive",
            action: (
              <ToastAction
                altText="Force assign"
                onClick={() => selectedAdjusterId && assignMutation.mutate({ adjusterId: selectedAdjusterId, force: true })}
                data-testid="button-force-assign"
              >
                Force Assign
              </ToastAction>
            ),
          });
          return;
        }
      } catch {}
      toast({ title: "Assignment failed", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: ClaimStatus) =>
      apiRequest("PATCH", `/api/claims/${claimId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims", claimId] });
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/claims", claimId, "activity"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/claims/${claimId}/notes`, {
        authorName: noteAuthor,
        authorRole: noteRole,
        content: noteContent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims", claimId, "notes"] });
      toast({ title: "Note added successfully" });
      setNoteAuthor("");
      setNoteContent("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add note", description: err.message, variant: "destructive" });
    },
  });

  if (claimLoading) {
    return <ClaimDetailSkeleton />;
  }

  if (!claim) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium" data-testid="text-claim-not-found">Claim not found</p>
            <p className="text-sm text-muted-foreground mt-1">The requested claim could not be loaded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusIndex = STATUS_FLOW.indexOf(claim.status as ClaimStatus);
  const nextStatuses = claim.status !== "denied" && claim.status !== "closed"
    ? STATUS_FLOW.slice(currentStatusIndex + 1)
    : [];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap" data-testid="claim-header">
        <h1 className="text-2xl font-bold" data-testid="text-claim-number">{claim.claimNumber}</h1>
        <Badge variant={severityVariant(claim.severity)} data-testid="badge-severity">
          {claim.severity}
        </Badge>
        <Badge variant={statusVariant(claim.status)} data-testid="badge-status">
          {claim.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-policyholder">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Policyholder Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-policyholder-name">{claim.policyholderName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-policyholder-phone">{claim.policyholderPhone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-policyholder-email">{claim.policyholderEmail}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span data-testid="text-property-address">
                {claim.propertyAddress}, {claim.propertyCity}, {claim.propertyState} {claim.propertyZip}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-claim-details">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4" />
              Claim Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CloudLightning className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Storm Event:</span>
              <span data-testid="text-storm-event">{claim.stormEventId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Damage Type:</span>
              <Badge variant="secondary" data-testid="badge-damage-type">{claim.damageType}</Badge>
            </div>
            <p className="text-sm" data-testid="text-description">{claim.description}</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filed:</span>
              <span data-testid="text-filed-date">{formatDate(claim.filedDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Updated:</span>
              <span data-testid="text-last-updated">{formatDate(claim.lastUpdated)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Photos:</span>
              <span data-testid="text-photos-count">{claim.photos}</span>
            </div>
            {claim.estimatedLoss !== undefined && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Estimated Loss:</span>
                <span className="font-medium" data-testid="text-estimated-loss">{formatCurrency(claim.estimatedLoss)}</span>
              </div>
            )}
            {claim.approvedAmount !== undefined && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Approved:</span>
                <span className="font-medium text-green-700 dark:text-green-400" data-testid="text-approved-amount">{formatCurrency(claim.approvedAmount)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-assignment">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4" />
            Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Currently Assigned:</span>
            <span className="font-medium" data-testid="text-assigned-adjuster">
              {claim.assignedAdjusterName || "Unassigned"}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedAdjusterId} onValueChange={setSelectedAdjusterId}>
              <SelectTrigger className="w-full sm:w-64" data-testid="select-adjuster">
                <SelectValue placeholder="Select adjuster" />
              </SelectTrigger>
              <SelectContent>
                {adjusters?.map((adj) => (
                  <SelectItem key={adj.id} value={adj.id} data-testid={`select-adjuster-option-${adj.id}`}>
                    {adj.name} ({adj.currentCaseload}/{adj.maxCaseload})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              data-testid="button-assign-adjuster"
              onClick={() => selectedAdjusterId && assignMutation.mutate({ adjusterId: selectedAdjusterId })}
              disabled={!selectedAdjusterId || assignMutation.isPending}
            >
              Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-status-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4" />
            Status Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Status:</span>
            <Badge variant={statusVariant(claim.status)} className="text-sm" data-testid="text-current-status">
              {claim.status}
            </Badge>
          </div>
          {(nextStatuses.length > 0 || (claim.status !== "denied" && claim.status !== "closed")) && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Advance to:</p>
              <div className="flex gap-2 flex-wrap">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    data-testid={`button-status-${s}`}
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(s)}
                  >
                    {s}
                  </Button>
                ))}
                {claim.status !== "denied" && claim.status !== "closed" && (
                  <Button
                    variant="destructive"
                    data-testid="button-status-denied"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("denied")}
                  >
                    Deny
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-timeline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Claim Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
            {[
              {
                label: "Filed",
                date: claim.filedDate,
                icon: Circle,
                done: true,
              },
              ...STATUS_FLOW.filter((s) => {
                const claimIdx = STATUS_FLOW.indexOf(claim.status as ClaimStatus);
                const thisIdx = STATUS_FLOW.indexOf(s);
                return thisIdx <= claimIdx || thisIdx === claimIdx + 1;
              }).map((s) => {
                const claimIdx = STATUS_FLOW.indexOf(claim.status as ClaimStatus);
                const thisIdx = STATUS_FLOW.indexOf(s);
                const done = thisIdx <= claimIdx;
                const current = thisIdx === claimIdx;
                return {
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                  date: current ? claim.lastUpdated : done ? claim.lastUpdated : null,
                  icon: done ? CheckCircle2 : Circle,
                  done,
                  current,
                };
              }),
              ...(claim.status === "denied"
                ? [
                    {
                      label: "Denied",
                      date: claim.lastUpdated,
                      icon: AlertCircle,
                      done: true,
                      current: true,
                    },
                  ]
                : []),
            ].map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={i} className="relative flex items-start gap-3" data-testid={`timeline-step-${i}`}>
                  <div className="absolute -left-6 mt-0.5">
                    <StepIcon
                      className={`h-[22px] w-[22px] ${
                        (step as any).current
                          ? "text-primary"
                          : step.done
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        (step as any).current ? "" : step.done ? "text-muted-foreground" : "text-muted-foreground/40"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-muted-foreground">{formatDate(step.date)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {notes && notes.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Recent Activity</p>
              {notes.slice(0, 3).map((note) => (
                <div key={note.id} className="flex items-start gap-2 text-xs">
                  <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{note.authorName}</span>
                    <span className="text-muted-foreground"> - {formatTimestamp(note.timestamp)}</span>
                    <p className="text-muted-foreground line-clamp-1">{note.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-notes">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {notesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="border border-border rounded-md p-4 space-y-2"
                  data-testid={`note-${note.id}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" data-testid={`text-note-author-${note.id}`}>{note.authorName}</span>
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-note-role-${note.id}`}>{note.authorRole}</Badge>
                    <span className="text-xs text-muted-foreground" data-testid={`text-note-time-${note.id}`}>
                      {formatTimestamp(note.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm" data-testid={`text-note-content-${note.id}`}>{note.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-notes">No notes yet.</p>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">Add a Note</p>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap">
              <Input
                data-testid="input-note-author"
                placeholder="Your name"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
                className="w-full sm:w-48"
              />
              <Select value={noteRole} onValueChange={setNoteRole}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-note-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjuster">Adjuster</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="examiner">Examiner</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              data-testid="input-note-content"
              placeholder="Write a note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
            />
            <Button
              data-testid="button-add-note"
              disabled={!noteAuthor.trim() || !noteContent.trim() || addNoteMutation.isPending}
              onClick={() => addNoteMutation.mutate()}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card data-testid="card-activity-log">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity && activity.length > 0 ? (
            <div className="relative space-y-0">
              {activity.map((entry, idx) => {
                const isLast = idx === activity.length - 1;
                const actionIcon = entry.action === "assignment" || entry.action === "reassignment"
                  ? <UserCheck className="h-3.5 w-3.5" />
                  : entry.action === "status_change"
                  ? <ArrowRightLeft className="h-3.5 w-3.5" />
                  : <Circle className="h-3.5 w-3.5" />;

                const actionColor = entry.action === "assignment" || entry.action === "reassignment"
                  ? "text-blue-500 bg-blue-500/10 border-blue-500/30"
                  : entry.action === "status_change"
                  ? "text-orange-500 bg-orange-500/10 border-orange-500/30"
                  : "text-muted-foreground bg-muted border-border";

                return (
                  <div key={entry.id} className="flex gap-3" data-testid={`activity-entry-${entry.id}`}>
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center justify-center h-7 w-7 rounded-full border shrink-0 ${actionColor}`}>
                        {actionIcon}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border min-h-[24px]" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-sm font-medium" data-testid={`text-activity-detail-${entry.id}`}>
                        {entry.details}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs text-muted-foreground" data-testid={`text-activity-by-${entry.id}`}>
                          by {entry.performedBy}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-activity">No activity recorded yet. Changes will appear here as the claim is processed.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TriagePage() {
  const [isDetail, params] = useRoute("/triage/:claimId");

  if (isDetail && params?.claimId) {
    return <ClaimDetailView claimId={params.claimId} />;
  }

  return <SearchView />;
}
