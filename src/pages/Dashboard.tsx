import { useEffect, useState } from "react";
import { Wallet, Building2, Database, FileText } from "lucide-react";
import { KPICard } from "@/components/shared/KPICard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const [savedQueriesCount, setSavedQueriesCount] = useState(0);
  const [transactionsCount, setTransactionsCount] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      
      const { count: queriesCount } = await supabase
        .from("saved_queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      const { count: txCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      setSavedQueriesCount(queriesCount || 0);
      setTransactionsCount(txCount || 0);
    }
    fetchStats();
  }, [user]);

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
          title="Saved Transactions"
          value={transactionsCount.toString()}
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
