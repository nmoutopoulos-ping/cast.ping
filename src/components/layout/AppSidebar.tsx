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
  LogOut,
  Coins,
  CircleDollarSign
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
  { name: "Saved Data", href: "/queries", icon: Database },
  { name: "Entities & Tags", href: "/entities", icon: Tags },
  { name: "Stablecoins", href: "/stablecoins", icon: CircleDollarSign },
  { name: "PAX Gold", href: "/paxg", icon: Coins },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <aside 
      className={cn(
        "sticky top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 flex-shrink-0",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-3 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Waves className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && <span className="font-semibold text-sm text-sidebar-foreground">Ping Caster</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && item.name}
            </NavLink>
          );
        })}
        
        {/* Separator */}
        <div className="!my-3 border-t border-sidebar-border" />
        
        {/* Sign Out Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium transition-colors text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!collapsed && "Sign Out"}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">Confirm Sign Out</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-xs">
                <p>Are you sure you want to sign out?</p>
                {user && (
                  <div className="mt-3 p-3 bg-muted rounded">
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Signed in as:</span>
                      <br />
                      <span className="font-medium">{user.email}</span>
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={signOut} className="text-xs h-8">Sign Out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </nav>

      {/* Bottom status */}
      <div className="p-2 border-t border-sidebar-border space-y-1.5">
        <NavLink
          to="/api-connections"
          className={({ isActive }) => cn(
            "flex items-center gap-2 rounded p-2 transition-colors text-xs",
            isActive 
              ? "bg-sidebar-primary text-sidebar-primary-foreground" 
              : "bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground/80",
            collapsed && "justify-center"
          )}
          title={collapsed ? "API Connections" : undefined}
        >
          {collapsed ? (
            <Plug className="w-4 h-4" />
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Dune Connected</span>
              </div>
              <div className="ml-auto">
                <CheckCircle className="w-3 h-3 text-success" />
              </div>
            </>
          )}
        </NavLink>
        
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/80 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <>
              <ChevronLeft className="w-3 h-3" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}