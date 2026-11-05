import { createContext, useContext, type ReactNode } from "react";

export type AssistantId = "jurist" | "counsel" | "ark" | "mike";

export const ASSISTANTS: Record<string, { name: string; role: string }> = {
  jurist: { name: "Jurist", role: "Chief Legal Research Specialist" },
  counsel: { name: "Counsel", role: "Courtroom Litigation & Drafting Specialist" },
  ark: { name: "Jurist", role: "Chief Legal Research Specialist" },
  mike: { name: "Counsel", role: "Courtroom Litigation & Drafting Specialist" },
};

const AssistantContext = createContext<AssistantId | null>(null);

export function AssistantProvider({ id, children }: { id: AssistantId | null; children: ReactNode }) {
  return <AssistantContext.Provider value={id}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantId | null {
  return useContext(AssistantContext);
}
