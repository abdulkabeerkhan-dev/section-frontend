import type { GenerateRequest, GenerateResponse } from "@/lib/api";

export interface HistoryItem {
  id: string;
  question: string;
  mode: GenerateRequest["mode"];
  createdAt: number;
  request: GenerateRequest;
  response: GenerateResponse;
}
