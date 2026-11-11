import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireClerkAuth } from "@/integrations/clerk/auth-middleware";

const syncInput = z.object({
  email: z.string(),
  fullName: z.string(),
});

interface SyncedUserFields {
  id?: string;
  user_id?: string;
  email?: string;
  full_name?: string;
  fullName?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  status?: string;
  role?: string;
  is_admin?: boolean;
  isAdmin?: boolean;
}

interface SyncResponse extends SyncedUserFields {
  user?: SyncedUserFields;
}

export const syncCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((data) => syncInput.parse(data))
  .handler(async ({ data }) => {
    const backendUrl = (
      process.env["VITE_BACKEND_URL"] ||
      process.env["VITE_API_BASE_URL"] ||
      (typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL)
        : "") ||
      "https://lawyer-backend-production-5c6d.up.railway.app"
    ).replace(/\/$/, "");

    let authorization = getRequest().headers.get("authorization");
    if (!authorization) {
      const cookieHeader = getRequest().headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
        if (match) {
          authorization = `Bearer ${decodeURIComponent(match[1])}`;
        }
      }
    }

    if (!authorization) throw new Error("No active session found.");

    const response = await fetch(`${backendUrl}/users/sync`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: data.email, full_name: data.fullName }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Failed to sync user (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }

    return (await response.json()) as SyncResponse;
  });
