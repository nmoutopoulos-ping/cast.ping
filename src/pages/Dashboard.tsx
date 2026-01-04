import { useEffect, useState } from "react";
import { Wallet, Building2, Database, FileText } from "lucide-react";
import { KPICard } from "@/components/shared/KPICard";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [savedQueriesCount, setSavedQueriesCount] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      const { count } = await supabase
        .from("saved_queries")
        .select("*", { count: "exact", head: true });
      
      setSavedQueriesCount(count || 0);
    }
    fetchStats();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your wallet tracking activity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title="Total Wallets Tracked"
          value="0"
          icon={Wallet}
        />
        <KPICard
          title="Entities"
          value="0"
          icon={Building2}
        />
        <KPICard
          title="Saved Queries"
          value={savedQueriesCount.toString()}
          icon={Database}
        />
        <KPICard
          title="Notes & Documents"
          value="0"
          icon={FileText}
        />
      </div>
    </div>
  );
}
