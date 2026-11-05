import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PrecedentCard } from "@/lib/api";
import {
  listSavedPrecedents,
  removeSavedPrecedent,
  savePrecedent,
  type SavedPrecedent,
} from "@/lib/library.functions";

export function precedentKey(card: PrecedentCard): string {
  const id = card.judgment_id || card.case_id;
  if (id) return `id:${id}`;
  const cit = (card.citation || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (cit) return `cit:${cit}`;
  return `title:${(card.case_title || card.case_name || "").toLowerCase().trim()}`.slice(0, 300);
}

export function useLibrary() {
  const { isLoaded, isSignedIn } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["savedPrecedents"],
    enabled: isLoaded && isSignedIn,
    queryFn: () => listSavedPrecedents(),
    retry: 1,
  });
  const byKey = new Map<string, SavedPrecedent>((query.data ?? []).map((r) => [r.card_key, r]));

  const save = useMutation({
    mutationFn: (v: { card: PrecedentCard; tags: string[]; matter: string; note: string }) =>
      savePrecedent({
        data: {
          cardKey: precedentKey(v.card),
          citation: v.card.citation || "",
          caseTitle: v.card.case_title || v.card.case_name || "",
          card: JSON.parse(JSON.stringify(v.card)),
          tags: v.tags,
          matter: v.matter,
          note: v.note,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedPrecedents"] }),
  });
  const remove = useMutation({
    mutationFn: (cardKey: string) => removeSavedPrecedent({ data: { cardKey } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedPrecedents"] }),
  });

  return { ...query, rows: query.data ?? [], byKey, save, remove };
}
