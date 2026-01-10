import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Database, 
  Tags, 
  Settings,
  Waves,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Plug,
  Search,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const navigation = [
  { name: "Search", href: "/", icon: Search },
  { name: "Data", href: "/queries", icon: Database },
  { name: "Entities & Tags", href: "/entities", icon: Tags },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <aside 
      className={cn(
        "sticky top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Waves className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-semibold text-lg">Ping Caster</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && item.name}
            </NavLink>
          );
        })}
        
        {/* Sign Out Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!collapsed && "Sign Out"}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Sign Out</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to sign out?</p>
                {user && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="text-muted-foreground">Signed in as:</span>
                      <br />
                      <span className="font-medium">{user.email}</span>
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={signOut}>Sign Out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </nav>

      {/* Bottom status */}
      <div className="p-2 border-t border-sidebar-border space-y-2">
        <NavLink
          to="/api-connections"
          className={({ isActive }) => cn(
            "flex items-center gap-3 rounded-lg p-3 transition-colors",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "bg-sidebar-accent hover:bg-sidebar-accent/80",
            collapsed && "justify-center p-2"
          )}
          title={collapsed ? "API Connections" : undefined}
        >
          {collapsed ? (
            <Plug className="w-5 h-5" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span>Dune Connected</span>
              </div>
              <div className="ml-auto">
                <CheckCircle className="w-3.5 h-3.5 text-success" />
              </div>
            </>
          )}
        </NavLink>
        
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
