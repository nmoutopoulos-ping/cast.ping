import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { TransactionRow, Entity, DbTag } from "@/types/transactions";

interface TransactionBreakdownChartProps {
  rows: TransactionRow[];
  entities: Entity[];
  tags: DbTag[];
}

interface EntityTagData {
  entityId: string;
  entityName: string;
  entityColor: string;
  tagId: string | null;
  tagName: string;
  tagColor: string;
  count: number;
}

interface ChartSlice {
  name: string;
  value: number;
  color: string;
  entityName: string;
  tagName: string;
  isUnassigned: boolean;
}

// Neutral colors for unassigned
const UNASSIGNED_ENTITY_COLOR = "#94a3b8"; // slate-400
const UNASSIGNED_TAG_COLOR = "#cbd5e1"; // slate-300

export function TransactionBreakdownChart({
  rows,
  entities,
  tags,
}: TransactionBreakdownChartProps) {
  // Build a map of address -> entity for quick lookup
  const entityByAddress = useMemo(() => {
    const map = new Map<string, Entity>();
    entities.forEach((e) => {
      if (e.wallet_address) {
        map.set(e.wallet_address.toLowerCase(), e);
      }
    });
    return map;
  }, [entities]);

  // Build a map of contract address -> tag for quick lookup
  const tagByAddress = useMemo(() => {
    const map = new Map<string, DbTag>();
    tags.forEach((t) => {
      if (t.contract_address) {
        map.set(t.contract_address.toLowerCase(), t);
      }
    });
    return map;
  }, [tags]);

  // Calculate transaction breakdown by entity and tag
  const chartData = useMemo(() => {
    const breakdown = new Map<string, EntityTagData>();

    rows.forEach((row) => {
      // Find matching entity from transaction addresses
      let matchedEntity: Entity | null = null;
      const addresses = [
        row.from_address,
        row.interacted_with,
        row.token_from,
        row.token_to,
      ].filter(Boolean);

      for (const addr of addresses) {
        const entity = entityByAddress.get(addr.toLowerCase());
        if (entity) {
          matchedEntity = entity;
          break;
        }
      }

      // Find matching tag from token contract
      let matchedTag: DbTag | null = null;
      if (row.token_contract) {
        matchedTag = tagByAddress.get(row.token_contract.toLowerCase()) || null;
      }

      // Create composite key
      const entityId = matchedEntity?.id || "unassigned";
      const tagId = matchedTag?.id || "no-tag";
      const key = `${entityId}::${tagId}`;

      const existing = breakdown.get(key);
      if (existing) {
        existing.count++;
      } else {
        breakdown.set(key, {
          entityId,
          entityName: matchedEntity?.name || "Unassigned",
          entityColor: matchedEntity?.color || UNASSIGNED_ENTITY_COLOR,
          tagId: matchedTag?.id || null,
          tagName: matchedTag?.name || "No Tag",
          tagColor: matchedTag?.color || UNASSIGNED_TAG_COLOR,
          count: 1,
        });
      }
    });

    // Convert to chart slices
    const slices: ChartSlice[] = [];
    breakdown.forEach((data) => {
      slices.push({
        name: data.tagName !== "No Tag" 
          ? `${data.entityName} - ${data.tagName}`
          : data.entityName,
        value: data.count,
        color: data.tagId ? data.tagColor : data.entityColor,
        entityName: data.entityName,
        tagName: data.tagName,
        isUnassigned: data.entityId === "unassigned" && !data.tagId,
      });
    });

    // Sort by count descending
    return slices.sort((a, b) => b.value - a.value);
  }, [rows, entityByAddress, tagByAddress]);

  // Calculate totals for percentage
  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartSlice }> }) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload;
    const percentage = ((data.value / total) * 100).toFixed(1);
    
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-2.5 h-2.5 rounded-sm" 
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm font-medium text-foreground">
            {data.entityName}
          </span>
        </div>
        {data.tagName !== "No Tag" && (
          <div className="text-xs text-muted-foreground mb-1 pl-4">
            {data.tagName}
          </div>
        )}
        <div className="text-xs text-muted-foreground pl-4">
          {formatNumber(data.value)} txns ({percentage}%)
        </div>
      </div>
    );
  };

  // Custom legend
  const renderLegend = () => {
    // Group by entity for cleaner legend
    const entityGroups = new Map<string, { color: string; tags: Array<{ name: string; color: string; count: number }> }>();
    
    chartData.forEach((slice) => {
      const existing = entityGroups.get(slice.entityName);
      if (existing) {
        existing.tags.push({ 
          name: slice.tagName, 
          color: slice.color, 
          count: slice.value 
        });
      } else {
        entityGroups.set(slice.entityName, {
          color: slice.isUnassigned ? UNASSIGNED_ENTITY_COLOR : slice.color,
          tags: [{ 
            name: slice.tagName, 
            color: slice.color, 
            count: slice.value 
          }],
        });
      }
    });

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
        {Array.from(entityGroups.entries()).map(([entityName, data]) => (
          <div key={entityName} className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-sm shrink-0" 
              style={{ backgroundColor: data.color }}
            />
            <span className="text-xs text-muted-foreground">
              {entityName}
              <span className="ml-1 tabular-nums">
                ({formatNumber(data.tags.reduce((sum, t) => sum + t.count, 0))})
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Transaction Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={1}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="outline-none focus:outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {renderLegend()}
      </CardContent>
    </Card>
  );
}
