import { useSyncExternalStore } from "react";

import type { PrecedentCard } from "@/lib/api";

export const MAX_PINS = 3;

export interface PinnedCase {
  id: string;
  label: string;
  card: PrecedentCard;
}

let pins: PinnedCase[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function pinId(card: PrecedentCard): string {
  return (
    card.judgment_id ||
    card.case_id ||
    card.citation ||
    card.case_title ||
    card.case_name ||
    ""
  ).trim();
}

export function togglePin(card: PrecedentCard): "pinned" | "unpinned" | "full" {
  const id = pinId(card);
  if (pins.some((p) => p.id === id)) {
    pins = pins.filter((p) => p.id !== id);
    emit();
    return "unpinned";
  }
  if (pins.length >= MAX_PINS) return "full";
  pins = [...pins, { id, label: card.citation || card.case_title || card.case_name || id, card }];
  emit();
  return "pinned";
}

export function unpin(id: string) {
  pins = pins.filter((p) => p.id !== id);
  emit();
}

export function usePins(): PinnedCase[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pins,
    () => pins,
  );
}
