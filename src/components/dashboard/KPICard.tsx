import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "primary" | "warning" | "success" | "destructive" | "accent";
}

const variantStyles = {
  default: "border-border",
  primary: "border-primary/30 glow-primary",
  warning: "border-warning/30",
  success: "border-success/30",
  destructive: "border-destructive/30",
  accent: "border-accent/30 glow-accent",
};

const iconVariantStyles = {
  default: "text-muted-foreground bg-muted",
  primary: "text-primary bg-primary/15",
  warning: "text-warning bg-warning/15",
  success: "text-success bg-success/15",
  destructive: "text-destructive bg-destructive/15",
  accent: "text-accent bg-accent/15",
};

const valueVariantStyles = {
  default: "text-foreground",
  primary: "text-primary",
  warning: "text-foreground",
  success: "text-foreground",
  destructive: "text-destructive",
  accent: "text-accent",
};

export function KPICard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: KPICardProps) {
  return (
    <div className={`glass-card rounded-lg p-4 animate-slide-up shadow-card hover:shadow-card-hover transition-all ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold font-mono-data tracking-tight ${valueVariantStyles[variant]}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={`text-[11px] font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% dari bulan lalu
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${iconVariantStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
