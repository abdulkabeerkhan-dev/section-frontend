// Profile updates are owned by the FastAPI backend, which writes to the `users`
// table with admin keys. The Clerk token is attached automatically.
import { backendFetch } from "./backend";

export interface SetMyNameResult {
  ok: boolean;
  firstName: string;
  lastName: string;
  fullName: string;
}

export async function setMyName(args: {
  data: { firstName: string; lastName: string };
}): Promise<SetMyNameResult> {
  const firstName = args.data.firstName.trim();
  const lastName = args.data.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();

  await backendFetch("/users/update-profile", {
    method: "POST",
    json: { first_name: firstName, last_name: lastName, full_name: fullName },
  });

  return { ok: true, firstName, lastName, fullName };
}
