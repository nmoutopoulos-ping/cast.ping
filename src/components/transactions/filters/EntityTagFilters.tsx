import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Entity, DbTag, ActiveFilter } from "@/types/transactions";

interface EntityTagFiltersProps {
  entities: Entity[];
  tags: DbTag[];
  transactionAddresses: Set<string>;
  activeFilters: ActiveFilter[];
  onActiveFiltersChange: (filters: ActiveFilter[]) => void;
}

export function EntityTagFilters({
  entities,
  tags,
  transactionAddresses,
  activeFilters,
  onActiveFiltersChange,
}: EntityTagFiltersProps) {
  const matchedEntities = entities.filter(
    (e) => e.wallet_address && transactionAddresses.has(e.wallet_address.toLowerCase())
  );
  const matchedTags = tags.filter(
    (t) => t.contract_address && transactionAddresses.has(t.contract_address.toLowerCase())
  );

  const isEntityActive = (entityId: string) =>
    activeFilters.some((f) => f.type === "entity" && f.id === entityId);

  const isTagActive = (tagId: string) =>
    activeFilters.some((f) => f.type === "tag" && f.id === tagId);

  const handleEntityClick = (entity: Entity) => {
    if (!entity.wallet_address) return;

    if (isEntityActive(entity.id)) {
      onActiveFiltersChange(activeFilters.filter((f) => !(f.type === "entity" && f.id === entity.id)));
    } else {
      onActiveFiltersChange([
        ...activeFilters,
        {
          type: "entity",
          id: entity.id,
          address: entity.wallet_address.toLowerCase(),
          color: entity.color,
        },
      ]);
    }
  };

  const handleTagClick = (tag: DbTag) => {
    if (!tag.contract_address) return;

    if (isTagActive(tag.id)) {
      onActiveFiltersChange(activeFilters.filter((f) => !(f.type === "tag" && f.id === tag.id)));
    } else {
      onActiveFiltersChange([
        ...activeFilters,
        {
          type: "tag",
          id: tag.id,
          address: tag.contract_address.toLowerCase(),
          color: tag.color,
        },
      ]);
    }
  };

  const hasMatchedEntities = matchedEntities.length > 0;
  const hasMatchedTags = matchedTags.length > 0;

  if (!hasMatchedEntities && !hasMatchedTags) {
    return <span className="text-xs text-muted-foreground italic">No matching entities or tags found in transactions</span>;
  }

  return (
    <div className="flex items-start gap-8 w-full">
      {/* Entities Section */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
          Entities
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasMatchedEntities ? (
            matchedEntities.map((entity) => {
              const isActive = isEntityActive(entity.id);
              return (
                <button
                  key={entity.id}
                  onClick={() => handleEntityClick(entity)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    isActive 
                      ? "shadow-sm ring-1 ring-black/10" 
                      : "opacity-50 hover:opacity-90"
                  )}
                  style={{
                    backgroundColor: isActive ? entity.color : `${entity.color}20`,
                    color: isActive ? "#fff" : entity.color,
                  }}
                >
                  <span className="max-w-[100px] truncate">{entity.name}</span>
                  {isActive && <X className="w-3 h-3 shrink-0" />}
                </button>
              );
            })
          ) : (
            <span className="text-xs text-muted-foreground/60 italic">None</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border/40 self-center shrink-0" />

      {/* Tags Section */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
          Tags
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasMatchedTags ? (
            matchedTags.map((tag) => {
              const isActive = isTagActive(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    isActive 
                      ? "shadow-sm ring-1 ring-black/10" 
                      : "opacity-50 hover:opacity-90"
                  )}
                  style={{
                    backgroundColor: isActive ? tag.color : `${tag.color}20`,
                    color: isActive ? "#fff" : tag.color,
                  }}
                >
                  <span className="max-w-[100px] truncate">{tag.name}</span>
                  {isActive && <X className="w-3 h-3 shrink-0" />}
                </button>
              );
            })
          ) : (
            <span className="text-xs text-muted-foreground/60 italic">None</span>
          )}
        </div>
      </div>
    </div>
  );
}
