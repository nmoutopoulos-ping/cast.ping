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

  const hasMatchedActors = matchedEntities.length > 0 || matchedTags.length > 0;

  if (!hasMatchedActors) {
    return <span className="text-xs text-muted-foreground italic">No matching entities or tags</span>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {matchedEntities.map((entity) => {
        const isActive = isEntityActive(entity.id);
        return (
          <button
            key={entity.id}
            onClick={() => handleEntityClick(entity)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all",
              isActive 
                ? "shadow-sm" 
                : "opacity-60 hover:opacity-100"
            )}
            style={{
              backgroundColor: isActive ? entity.color : `${entity.color}15`,
              color: isActive ? "#fff" : entity.color,
            }}
          >
            <span className="max-w-[120px] truncate">{entity.name}</span>
            {isActive && <X className="w-3 h-3 shrink-0" />}
          </button>
        );
      })}

      {matchedTags.map((tag) => {
        const isActive = isTagActive(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => handleTagClick(tag)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all",
              isActive 
                ? "shadow-sm" 
                : "opacity-60 hover:opacity-100"
            )}
            style={{
              backgroundColor: isActive ? tag.color : `${tag.color}15`,
              color: isActive ? "#fff" : tag.color,
            }}
          >
            <span className="max-w-[120px] truncate">{tag.name}</span>
            {isActive && <X className="w-3 h-3 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
