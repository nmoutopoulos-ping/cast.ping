import { useState } from "react";
import { Building2, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Entity {
  id: string;
  name: string;
  wallet_address: string | null;
}

interface DbTag {
  id: string;
  name: string;
  color: string;
  contract_address: string | null;
}

interface EntityTagIndicatorProps {
  entities: Entity[];
  tags: DbTag[];
  transactionAddresses: Set<string>;
  activeFilter: { type: "entity" | "tag"; id: string } | null;
  onFilterChange: (filter: { type: "entity" | "tag"; id: string } | null) => void;
}

export function EntityTagIndicator({
  entities,
  tags,
  transactionAddresses,
  activeFilter,
  onFilterChange,
}: EntityTagIndicatorProps) {
  // Find entities whose wallet addresses appear in the transactions
  const matchedEntities = entities.filter(
    (e) => e.wallet_address && transactionAddresses.has(e.wallet_address.toLowerCase())
  );

  // Find tags whose contract addresses appear in the transactions
  const matchedTags = tags.filter(
    (t) => t.contract_address && transactionAddresses.has(t.contract_address.toLowerCase())
  );

  if (matchedEntities.length === 0 && matchedTags.length === 0) {
    return null;
  }

  const handleEntityClick = (entity: Entity) => {
    if (activeFilter?.type === "entity" && activeFilter.id === entity.id) {
      onFilterChange(null);
    } else {
      onFilterChange({ type: "entity", id: entity.id });
    }
  };

  const handleTagClick = (tag: DbTag) => {
    if (activeFilter?.type === "tag" && activeFilter.id === tag.id) {
      onFilterChange(null);
    } else {
      onFilterChange({ type: "tag", id: tag.id });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
      {/* Entities */}
      {matchedEntities.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-medium">Entities:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedEntities.map((entity) => {
              const isActive = activeFilter?.type === "entity" && activeFilter.id === entity.id;
              return (
                <button
                  key={entity.id}
                  onClick={() => handleEntityClick(entity)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background hover:bg-accent border border-border/60"
                  )}
                >
                  {entity.name}
                  {isActive && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Separator */}
      {matchedEntities.length > 0 && matchedTags.length > 0 && (
        <div className="w-px h-6 bg-border/60" />
      )}

      {/* Tags */}
      {matchedTags.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Tag className="w-4 h-4" />
            <span className="text-xs font-medium">Tags:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedTags.map((tag) => {
              const isActive = activeFilter?.type === "tag" && activeFilter.id === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                    isActive
                      ? "shadow-sm ring-2 ring-offset-1"
                      : "hover:opacity-80"
                  )}
                  style={{
                    backgroundColor: isActive ? tag.color : `${tag.color}20`,
                    borderColor: tag.color,
                    color: isActive ? "#fff" : tag.color,
                    ...(isActive && { ringColor: tag.color }),
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

      {/* Active filter info */}
      {activeFilter && (
        <div className="ml-auto text-xs text-muted-foreground">
          Showing matching transactions
        </div>
      )}
    </div>
  );
}
