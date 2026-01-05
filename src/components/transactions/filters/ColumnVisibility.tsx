import { Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColumnDef {
  key: string;
  label: string;
}

interface ColumnVisibilityProps {
  columns: ColumnDef[];
  hiddenColumns: Set<string>;
  onHiddenColumnsChange: (columns: Set<string>) => void;
  onViewChanged?: () => void;
}

export function ColumnVisibility({
  columns,
  hiddenColumns,
  onHiddenColumnsChange,
  onViewChanged,
}: ColumnVisibilityProps) {
  const toggleColumn = (key: string) => {
    const next = new Set(hiddenColumns);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onHiddenColumnsChange(next);
    onViewChanged?.();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns className="w-4 h-4" />
          Columns
          {hiddenColumns.size > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {columns.length - hiddenColumns.size}/{columns.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2 max-h-80 overflow-y-auto">
        <div className="space-y-1">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={!hiddenColumns.has(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
