import { AlertTriangle, Info } from "lucide-react";

interface MockDataBannerProps {
  variant?: "warning" | "info";
  className?: string;
}

export function MockDataBanner({ variant = "warning", className = "" }: MockDataBannerProps) {
  const isWarning = variant === "warning";
  
  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
        isWarning 
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800" 
          : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
      } ${className}`}
      data-testid="banner-mock-data"
    >
      {isWarning ? (
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Info className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="font-medium">Sample Data</span>
      <span className="text-xs opacity-80">
        This is demonstration data. Connect data sources for real analysis.
      </span>
    </div>
  );
}
