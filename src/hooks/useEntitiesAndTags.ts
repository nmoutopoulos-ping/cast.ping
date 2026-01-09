import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Entity, DbTag } from "@/types/transactions";

interface UseEntitiesAndTagsResult {
  entities: Entity[];
  tags: DbTag[];
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Shared hook for fetching entities and tags from database
 * Used across SavedSearchDetail, QueryResults, and other pages
 */
export function useEntitiesAndTags(userId: string | undefined): UseEntitiesAndTagsResult {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tags, setTags] = useState<DbTag[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    const [entitiesRes, tagsRes] = await Promise.all([
      supabase.from("entities").select("id, name, wallet_address, color, notes"),
      supabase.from("tags").select("id, name, color, contract_address, decimals, token_symbol, token_name"),
    ]);

    setEntities((entitiesRes.data as Entity[]) || []);
    setTags((tagsRes.data as DbTag[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { entities, tags, loading, refetch: fetchData };
}