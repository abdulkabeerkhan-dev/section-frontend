/**
 * "Remember me" on the sign-in page. Ticked (default): stay signed in and pre-fill the email next
 * time. Unticked: the session ends when the browser is closed (useEndSessionOnBrowserClose).
 * Storage can be blocked (private mode); every access is guarded and failures fall back to
 * "remembered", which is Clerk's normal behaviour.
 */
const EMAIL_KEY = "section_remembered_email";
const EPHEMERAL_KEY = "section_signed_in_without_remember";
const ALIVE_KEY = "section_browser_session_alive";

export function rememberedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function rememberSignIn(remember: boolean, email: string): void {
  try {
    if (remember) {
      localStorage.setItem(EMAIL_KEY, email);
      localStorage.removeItem(EPHEMERAL_KEY);
    } else {
      localStorage.removeItem(EMAIL_KEY);
      localStorage.setItem(EPHEMERAL_KEY, "1");
    }
    sessionStorage.setItem(ALIVE_KEY, "1");
  } catch {
    // storage unavailable: behave as "remembered"
  }
}

/** True when the user chose not to be remembered and this is a new browser session. */
export function shouldEndSessionOnBrowserClose(): boolean {
  try {
    if (localStorage.getItem(EPHEMERAL_KEY) !== "1") return false;
    if (sessionStorage.getItem(ALIVE_KEY) === "1") return false;
    localStorage.removeItem(EPHEMERAL_KEY);
    return true;
  } catch {
    return false;
  }
}
