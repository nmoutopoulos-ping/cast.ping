import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FilterMode, ActiveFilter } from "@/types/transactions";

interface TagRulesFilterProps {
  activeFilters: ActiveFilter[];
  tagFilterMode: FilterMode;
  onTagFilterModeChange: (mode: FilterMode) => void;
  onViewChanged?: () => void;
}

export function TagRulesFilter({
  activeFilters,
  tagFilterMode,
  onTagFilterModeChange,
  onViewChanged,
}: TagRulesFilterProps) {
  const activeEntityFilters = activeFilters.filter((f) => f.type === "entity");
  const activeTagFilters = activeFilters.filter((f) => f.type === "tag");
  const hasMultipleTags = activeTagFilters.length >= 2;

  if (!hasMultipleTags) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Tag Rules
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 uppercase">
            {tagFilterMode}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">When filtering by tags:</p>
            <p className="text-[10px] text-muted-foreground/70">
              {activeEntityFilters.length > 0 
                ? "Entities must all match. Tags use the rule below:"
                : "Apply the following rule to selected tags:"}
            </p>
          </div>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
              <input
                type="radio"
                name="tagFilterMode"
                checked={tagFilterMode === "any"}
                onChange={() => {
                  onTagFilterModeChange("any");
                  onViewChanged?.();
                }}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">Any tag (OR)</span>
                <p className="text-xs text-muted-foreground">Show if 1+ selected tags are present</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
              <input
                type="radio"
                name="tagFilterMode"
                checked={tagFilterMode === "all"}
                onChange={() => {
                  onTagFilterModeChange("all");
                  onViewChanged?.();
                }}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">All tags (AND)</span>
                <p className="text-xs text-muted-foreground">Show only if all selected tags are present</p>
              </div>
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
