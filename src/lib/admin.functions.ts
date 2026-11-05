// Admin user-management is owned by the FastAPI backend. Each call carries the
// Clerk token; the backend verifies admin rights and uses its admin keys.
import { backendFetch } from "./backend";

export interface AssociateRow {
  id: string;
  fullName: string;
  email: string;
  status: string;
  createdAt: string;
  lastActiveAt: string | null;
  totalQueries: number;
}

export interface AdminActivityRow {
  id: string;
  userId: string;
  associateName: string;
  mode: string;
  question: string;
  response: unknown;
  createdAt: string;
}

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function mapAssociate(r: Raw): AssociateRow {
  return {
    id: str(r.id ?? r.user_id),
    fullName: str(r.fullName ?? r.full_name ?? r.name),
    email: str(r.email),
    status: str(r.status, "active"),
    createdAt: str(r.createdAt ?? r.created_at),
    lastActiveAt: (r.lastActiveAt ?? r.last_active_at) as string | null ?? null,
    totalQueries: Number(r.totalQueries ?? r.total_queries ?? 0) || 0,
  };
}

function mapActivity(r: Raw): AdminActivityRow {
  return {
    id: str(r.id),
    userId: str(r.userId ?? r.user_id),
    associateName: str(r.associateName ?? r.associate_name ?? r.full_name, "Unknown"),
    mode: str(r.mode),
    question: str(r.question),
    response: r.response ?? null,
    createdAt: str(r.createdAt ?? r.created_at),
  };
}

export async function listAssociates(): Promise<AssociateRow[]> {
  const rows = await backendFetch<Raw[]>("/admin/associates");
  return (rows ?? []).map(mapAssociate);
}

export async function createAssociate(args: {
  data: { fullName: string; email: string; password?: string };
}): Promise<{ id: string }> {
  // The backend pre-approves the associate (e.g. an access_requests row with
  // status 'admin_approved') so they clear the gate when they register via Clerk.
  const res = await backendFetch<Raw>("/admin/associates", {
    method: "POST",
    json: {
      full_name: args.data.fullName.trim(),
      email: args.data.email.trim(),
      status: "admin_approved",
    },
  });
  return { id: str(res?.id) };
}

export async function setAssociateStatus(args: {
  data: { id: string; status: "active" | "inactive" };
}): Promise<{ ok: boolean }> {
  await backendFetch(`/admin/associates/${encodeURIComponent(args.data.id)}/status`, {
    method: "POST",
    json: { status: args.data.status },
  });
  return { ok: true };
}

export async function deleteAssociate(args: {
  data: { id: string };
}): Promise<{ ok: boolean }> {
  await backendFetch(`/admin/associates/${encodeURIComponent(args.data.id)}`, {
    method: "DELETE",
  });
  return { ok: true };
}

export async function listAllActivity(args: {
  data: { associateId?: string; from?: string; to?: string };
}): Promise<AdminActivityRow[]> {
  const params = new URLSearchParams();
  if (args.data.associateId) params.set("associate_id", args.data.associateId);
  if (args.data.from) params.set("from", args.data.from);
  if (args.data.to) params.set("to", args.data.to);
  const qs = params.toString();
  const rows = await backendFetch<Raw[]>(`/admin/activity${qs ? `?${qs}` : ""}`);
  return (rows ?? []).map(mapActivity);
}

export interface UsageRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  textUsed: number;
  textLimit: number;
  visionUsed: number;
  visionLimit: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function listAssociatesUsage(): Promise<UsageRow[]> {
  const rows = await backendFetch<Raw[]>("/admin/associates/usage");
  return (rows ?? []).map((r) => {
    const usage = (r.usage && typeof r.usage === "object" ? r.usage : {}) as Raw;
    return {
      id: str(r.id ?? r.user_id),
      email: str(r.email),
      fullName: str(r.fullName ?? r.full_name ?? r.name),
      role: str(r.role, "associate"),
      textUsed: num(usage.text_queries_used),
      textLimit: num(usage.text_queries_limit),
      visionUsed: num(usage.vision_queries_used),
      visionLimit: num(usage.vision_queries_limit),
      inputTokens: num(usage.input_tokens_used),
      outputTokens: num(usage.output_tokens_used),
      totalTokens: num(usage.total_tokens_used),
    };
  });
}
