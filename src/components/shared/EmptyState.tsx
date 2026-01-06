import { LucideIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon: Icon = Search, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
