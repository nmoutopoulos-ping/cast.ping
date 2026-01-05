import { Building2, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Entity, DbTag, ActiveFilter } from "@/types/transactions";

interface EntityTagIndicatorProps {
  entities: Entity[];
  tags: DbTag[];
  transactionAddresses: Set<string>;
  activeFilters: ActiveFilter[];
  onFilterChange: (filters: ActiveFilter[]) => void;
}

export function EntityTagIndicator({
  entities,
  tags,
  transactionAddresses,
  activeFilters,
  onFilterChange,
}: EntityTagIndicatorProps) {
  const matchedEntities = entities.filter(
    (e) => e.wallet_address && transactionAddresses.has(e.wallet_address.toLowerCase())
  );

  const matchedTags = tags.filter(
    (t) => t.contract_address && transactionAddresses.has(t.contract_address.toLowerCase())
  );

  if (matchedEntities.length === 0 && matchedTags.length === 0) {
    return null;
  }

  const isEntityActive = (entityId: string) =>
    activeFilters.some((f) => f.type === "entity" && f.id === entityId);

  const isTagActive = (tagId: string) =>
    activeFilters.some((f) => f.type === "tag" && f.id === tagId);

  const handleEntityClick = (entity: Entity) => {
    if (!entity.wallet_address) return;
    
    if (isEntityActive(entity.id)) {
      onFilterChange(activeFilters.filter((f) => !(f.type === "entity" && f.id === entity.id)));
    } else {
      onFilterChange([
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
      onFilterChange(activeFilters.filter((f) => !(f.type === "tag" && f.id === tag.id)));
    } else {
      onFilterChange([
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

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
      {matchedEntities.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-medium">Entities:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedEntities.map((entity) => {
              const isActive = isEntityActive(entity.id);
              return (
                <button
                  key={entity.id}
                  onClick={() => handleEntityClick(entity)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                    isActive ? "shadow-sm ring-2 ring-offset-1" : "hover:opacity-80"
                  )}
                  style={{
                    backgroundColor: isActive ? entity.color : `${entity.color}20`,
                    borderColor: entity.color,
                    color: isActive ? "#fff" : entity.color,
                  }}
                >
                  {entity.name}
                  {isActive && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {matchedEntities.length > 0 && matchedTags.length > 0 && (
        <div className="w-px h-6 bg-border/60" />
      )}

      {matchedTags.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Tag className="w-4 h-4" />
            <span className="text-xs font-medium">Tags:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedTags.map((tag) => {
              const isActive = isTagActive(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                    isActive ? "shadow-sm ring-2 ring-offset-1" : "hover:opacity-80"
                  )}
                  style={{
                    backgroundColor: isActive ? tag.color : `${tag.color}20`,
                    borderColor: tag.color,
                    color: isActive ? "#fff" : tag.color,
                  }}
                >
                  {tag.name}
                  {isActive && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="ml-auto text-xs text-muted-foreground">
          {activeFilters.length} filter{activeFilters.length > 1 ? "s" : ""} active
        </div>
      )}
    </div>
  );
}
