import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Database, UserCheck, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold" data-testid="text-privacy-title">Privacy Policy</h1>
        <p className="text-muted-foreground">
          How we handle and protect your data
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle>Data Collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This application may collect and process the following types of data:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>User queries and interactions with the system</li>
            <li>Session information for authentication purposes</li>
            <li>System usage analytics for performance optimization</li>
            <li>Agent decision logs for governance and audit purposes</li>
          </ul>
          <p>
            All data collection is performed solely for the purpose of providing and improving 
            the application's functionality.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Data Storage and Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            We implement appropriate technical and organizational measures to protect your data:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Data is stored in secure, encrypted databases</li>
            <li>Access to data is restricted to authorized personnel only</li>
            <li>Regular security audits are conducted</li>
            <li>Data transmission is encrypted using industry-standard protocols</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <UserCheck className="h-5 w-5 text-primary" />
          <CardTitle>Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Subject to applicable law, you may have the following rights regarding your data:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Right to access your personal data</li>
            <li>Right to request correction of inaccurate data</li>
            <li>Right to request deletion of your data</li>
            <li>Right to restrict processing of your data</li>
            <li>Right to data portability</li>
          </ul>
          <p>
            To exercise any of these rights, please contact the application owner.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Third-Party Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This application integrates with third-party services for enhanced functionality:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>AI Services:</strong> Used for natural language processing and analysis</li>
            <li><strong>Averecion Governance Platform:</strong> Used for agent governance and compliance</li>
          </ul>
          <p>
            These services have their own privacy policies and data handling practices. 
            Use of this application constitutes acknowledgment of these third-party integrations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            By using this application, you consent to the collection, processing, and storage 
            of your data as described in this Privacy Policy.
          </p>
          <p>
            If you do not agree to this Privacy Policy, you must discontinue use of this 
            application immediately.
          </p>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-4 border-t">
        <p>Last Updated: January {currentYear}</p>
        <p className="mt-1">For privacy inquiries, please contact the application owner.</p>
      </div>
    </div>
  );
}
