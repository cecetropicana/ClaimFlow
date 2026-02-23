import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Scale, Lock, FileWarning, Award, Cpu, Users, Network, LayoutDashboard, Bot } from "lucide-react";

function PatentPendingBanner() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold">
        <Award className="h-3 w-3 mr-1" />
        PATENT PENDING
      </Badge>
    </div>
  );
}

export default function LegalPage() {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold" data-testid="text-legal-title">Legal Notice</h1>
        <p className="text-muted-foreground">
          Terms of use, intellectual property rights, patent claims, and legal disclaimers
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Intellectual Property Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Copyright {currentYear}. All Rights Reserved.</strong>
          </p>
          <p>
            This application, including but not limited to its source code, design, architecture, 
            algorithms, user interface, documentation, and all associated intellectual property 
            (collectively, the "Software"), is the exclusive property of the owner and is protected 
            by copyright laws, international treaties, and other intellectual property laws.
          </p>
          <p>
            No part of this Software may be reproduced, distributed, transmitted, displayed, 
            published, or broadcast in any form or by any means, including photocopying, recording, 
            or other electronic or mechanical methods, without the prior written permission of the owner.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2 pt-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Patent Claims
        </h2>
        <p className="text-muted-foreground text-sm">
          The following inventions and methods are claimed as intellectual property of AverNova LLC
        </p>
      </div>

      <Card data-testid="card-patent-claim-1">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Cpu className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base">Claim 1: Conditional Action Generation System</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <PatentPendingBanner />
          <p className="font-medium text-foreground">
            A computer-implemented method for automatically generating operational actions 
            based on AI analysis thresholds, comprising:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Receiving analysis results from specialized AI agents regarding utility infrastructure conditions</li>
            <li>Evaluating said results against configurable threshold values</li>
            <li>Conditionally generating action types including alerts, work orders, scheduled maintenance, asset status updates, event logs, and notifications</li>
            <li>Triggering different action types at different threshold levels for graduated response</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="card-patent-claim-2">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Bot className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base">Claim 2: Multi-Agent Orchestration System</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <PatentPendingBanner />
          <p className="font-medium text-foreground">
            A system and method for coordinating multiple specialized AI agents for 
            utility infrastructure analysis, comprising:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>A supervisor agent that receives natural language queries regarding insurance claims operations</li>
            <li>Query analysis to determine appropriate routing to specialized domain agents</li>
            <li>Specialized agents for claims triage, storm assessment, adjuster management, and backlog analysis</li>
            <li>Aggregation and presentation of multi-agent results through a unified interface</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="card-patent-claim-3">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Users className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base">Claim 3: Human-in-the-Loop Approval Workflow</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <PatentPendingBanner />
          <p className="font-medium text-foreground">
            A method for managing AI agent decision execution with human oversight, comprising:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Intercepting agent-proposed actions based on trust level classification</li>
            <li>Queuing actions for human review in a pending approvals interface</li>
            <li>Recording human approval or rejection decisions</li>
            <li>Automatically updating agent performance metrics based on approval outcomes</li>
            <li>Using updated metrics to inform future autonomy level progression</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="card-patent-claim-4">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Network className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base">Claim 4: Domain-Specific AI Agents for Utility Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <PatentPendingBanner />
          <p className="font-medium text-foreground">
            Specialized AI agent implementations for insurance claims operations, including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Claims Triage Agent:</strong> Severity classification, damage assessment, priority scoring</li>
            <li><strong>Storm Assessment Agent:</strong> Storm impact analysis, claims clustering, loss estimation</li>
            <li><strong>Adjuster Management Agent:</strong> Workload balancing, specialty matching, assignment optimization</li>
            <li><strong>Backlog Analysis Agent:</strong> Queue management, bottleneck identification, throughput forecasting</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="card-patent-claim-5">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base">Claim 5: Adaptive Card Rendering for Utility Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <PatentPendingBanner />
          <p className="font-medium text-foreground">
            A method for presenting utility infrastructure analysis through adaptive card interfaces, comprising:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Dynamic card generation based on agent response type and content</li>
            <li>Structured data presentation with expandable sections for detailed analysis</li>
            <li>Embedded action buttons for workflow initiation directly from analysis results</li>
            <li>Real-time status indicators for infrastructure components</li>
          </ul>
        </CardContent>
      </Card>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm">
        <div className="flex items-start gap-3">
          <Award className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold text-amber-600 dark:text-amber-400">Patent Notice</p>
            <p className="text-muted-foreground">
              The methods, systems, and implementations described above represent novel inventions 
              claimed by AverNova LLC. Any use, reproduction, or implementation of these claimed 
              inventions without explicit written authorization may constitute patent infringement.
            </p>
            <p className="text-muted-foreground">
              <strong>Provisional Status:</strong> These claims are documented for intellectual property 
              protection purposes. Formal patent applications may be filed with the United States Patent 
              and Trademark Office (USPTO) and international patent offices.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>Confidentiality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This Software and all information contained herein is proprietary and confidential. 
            Access to this application constitutes acknowledgment that:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>All information, data, and functionality within this application are confidential</li>
            <li>You will not disclose any information about this Software to third parties</li>
            <li>You will not reverse engineer, decompile, or disassemble any part of this Software</li>
            <li>You will not create derivative works based on this Software</li>
            <li>You will not use this Software for any unauthorized commercial purposes</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Scale className="h-5 w-5 text-primary" />
          <CardTitle>Terms of Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Authorized Use Only</strong>
          </p>
          <p>
            Use of this application is permitted only with the explicit written consent of the owner. 
            Unauthorized access, use, reproduction, or distribution of this Software is strictly 
            prohibited and may result in civil and criminal penalties.
          </p>
          <p>
            <strong className="text-foreground">No License Granted</strong>
          </p>
          <p>
            Nothing in this application shall be construed as granting any license or right to use 
            any trademark, patent, copyright, or other intellectual property right of the owner, 
            whether by implication, estoppel, or otherwise.
          </p>
          <p>
            <strong className="text-foreground">Reservation of Rights</strong>
          </p>
          <p>
            The owner reserves all rights not expressly granted herein. Any rights not explicitly 
            granted are reserved by the owner.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <FileWarning className="h-5 w-5 text-primary" />
          <CardTitle>Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
            INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
            PARTICULAR PURPOSE, AND NONINFRINGEMENT.
          </p>
          <p>
            IN NO EVENT SHALL THE OWNER BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, 
            WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN 
            CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
          </p>
          <p className="font-medium text-foreground">
            By accessing or using this application, you acknowledge that you have read, understood, 
            and agree to be bound by these terms and conditions.
          </p>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-4 border-t">
        <p>Last Updated: January {currentYear}</p>
        <p className="mt-1">For licensing inquiries, please contact the application owner.</p>
      </div>
    </div>
  );
}
