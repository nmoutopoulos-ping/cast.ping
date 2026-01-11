import { LogIn, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface AuthRequiredCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
}

/**
 * Shared component for displaying authentication required prompts
 * Used across pages that require user login to view data
 */
export function AuthRequiredCard({
  title = 'Authentication Required',
  description = 'Sign in to view this data',
  icon: Icon = LogIn,
  iconClassName = 'text-muted-foreground',
}: AuthRequiredCardProps) {
  return (
    <div className="p-6 lg:p-8">
      <div className="rounded border bg-card p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded bg-muted p-3">
            <Icon className={`w-5 h-5 ${iconClassName}`} />
          </div>
          <div>
            <h3 className="font-medium text-sm mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Button size="sm" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
