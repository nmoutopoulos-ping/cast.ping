import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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

// Muted institutional colors for unassigned
const UNASSIGNED_ENTITY_COLOR = "#64748b"; // slate-500
const UNASSIGNED_TAG_COLOR = "#94a3b8"; // slate-400

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

  // Institutional tooltip - table style
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartSlice }> }) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload;
    const percentage = ((data.value / total) * 100).toFixed(1);
    
    return (
      <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs">
        <table className="text-left">
          <tbody>
            <tr>
              <td className="pr-3 text-muted-foreground">Entity</td>
              <td className="font-medium">{data.entityName}</td>
            </tr>
            {data.tagName !== "No Tag" && (
              <tr>
                <td className="pr-3 text-muted-foreground">Tag</td>
                <td className="font-medium">{data.tagName}</td>
              </tr>
            )}
            <tr>
              <td className="pr-3 text-muted-foreground">Count</td>
              <td className="font-mono tabular-nums">{formatNumber(data.value)}</td>
            </tr>
            <tr>
              <td className="pr-3 text-muted-foreground">Share</td>
              <td className="font-mono tabular-nums">{percentage}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="chart-title">Transaction Breakdown by Entity</div>
      <div className="flex items-start gap-8">
        <div className="h-[200px] w-[240px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={1}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    opacity={0.85}
                    className="outline-none focus:outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-4 pt-1 text-xs">
          {/* Entity Legend */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Entities</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {Array.from(
                chartData.reduce((map, slice) => {
                  const existing = map.get(slice.entityName);
                  if (existing) {
                    existing.count += slice.value;
                  } else {
                    map.set(slice.entityName, { 
                      color: slice.isUnassigned ? UNASSIGNED_ENTITY_COLOR : slice.color, 
                      count: slice.value 
                    });
                  }
                  return map;
                }, new Map<string, { color: string; count: number }>())
              ).map(([entityName, data]) => (
                <div key={entityName} className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-sm shrink-0" 
                    style={{ backgroundColor: data.color, opacity: 0.85 }}
                  />
                  <span className="text-muted-foreground">
                    {entityName}
                    <span className="ml-1 font-mono tabular-nums">
                      ({formatNumber(data.count)})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tag Legend */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {Array.from(
                chartData.reduce((map, slice) => {
                  if (slice.tagName === "No Tag") return map;
                  const existing = map.get(slice.tagName);
                  if (existing) {
                    existing.count += slice.value;
                  } else {
                    map.set(slice.tagName, { 
                      color: slice.color, 
                      count: slice.value 
                    });
                  }
                  return map;
                }, new Map<string, { color: string; count: number }>())
              ).map(([tagName, data]) => (
                <div key={tagName} className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-sm shrink-0" 
                    style={{ backgroundColor: data.color, opacity: 0.85 }}
                  />
                  <span className="text-muted-foreground">
                    {tagName}
                    <span className="ml-1 font-mono tabular-nums">
                      ({formatNumber(data.count)})
                    </span>
                  </span>
                </div>
              ))}
              {!chartData.some(s => s.tagName !== "No Tag") && (
                <span className="text-muted-foreground/50 italic">No tags assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}