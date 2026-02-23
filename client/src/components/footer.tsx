import { Shield } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-3" data-testid="footer">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" />
          <span data-testid="text-copyright">
            {currentYear} ClaimFlow. All Rights Reserved.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="/legal" 
            className="hover:text-foreground transition-colors"
            data-testid="link-legal"
          >
            Legal Notice
          </a>
          <a 
            href="/privacy" 
            className="hover:text-foreground transition-colors"
            data-testid="link-privacy"
          >
            Privacy
          </a>
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground/60 mt-2" data-testid="text-ip-notice">
        Proprietary and Confidential. Unauthorized use, reproduction, or distribution is strictly prohibited.
      </p>
    </footer>
  );
}
