import { Wallet, Building2, Database, FileText } from "lucide-react";
import { WalletSearchBar } from "@/components/shared/WalletSearchBar";
import { KPICard } from "@/components/shared/KPICard";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { DirectionBadge } from "@/components/shared/DirectionBadge";
import { mockRecentSearches, mockChartData } from "@/lib/mockData";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleSearch = (address: string) => {
    navigate(`/wallets?address=${address}`);
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your wallet tracking activity</p>
      </div>

      {/* Search Bar */}
      <WalletSearchBar onSearch={handleSearch} size="large" />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title="Total Wallets Tracked"
          value="247"
          icon={Wallet}
          trend={{ value: 12, isPositive: true }}
        />
        <KPICard
          title="Entities"
          value="38"
          icon={Building2}
          trend={{ value: 5, isPositive: true }}
        />
        <KPICard
          title="Saved Queries"
          value="12"
          icon={Database}
        />
        <KPICard
          title="Notes & Documents"
          value="156"
          icon={FileText}
          trend={{ value: 23, isPositive: true }}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Wallet Searches */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Recent Wallet Searches</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Last Query</th>
                  <th>Tags</th>
                  <th>Direction</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentSearches.map((search, idx) => (
                  <tr key={idx} className="cursor-pointer" onClick={() => navigate(`/wallets?address=${search.address}`)}>
                    <td>
                      <AddressDisplay address={search.address} showExternalLink={false} />
                    </td>
                    <td className="text-muted-foreground">
                      {formatDistanceToNow(search.lastQuery, { addSuffix: true })}
                    </td>
                    <td>
                      <span className="text-muted-foreground">{search.tagCount}</span>
                    </td>
                    <td>
                      <DirectionBadge direction={search.lastDirection} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Transaction Activity (30 days)</h2>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="transactions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
