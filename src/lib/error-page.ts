export function renderErrorPage(error?: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Section — Connecting to Workspace</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --bg: #0a0a0a;
        --card-bg: #141414;
        --border: #262626;
        --text: #f5f5f5;
        --muted: #a3a3a3;
        --gold: #c5a059;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        background: var(--bg);
        color: var(--text);
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
        box-sizing: border-box;
      }
      .card {
        max-width: 28rem;
        width: 100%;
        text-align: center;
        padding: 2.5rem 2rem;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .wordmark {
        font-family: "Source Serif 4", Georgia, serif;
        font-size: 1.75rem;
        margin-bottom: 1.5rem;
        color: var(--text);
        letter-spacing: -0.02em;
      }
      .wordmark .mark {
        color: var(--gold);
        margin-right: 0.25rem;
      }
      h1 {
        font-family: "Source Serif 4", Georgia, serif;
        font-size: 1.35rem;
        font-weight: 500;
        margin: 0 0 0.5rem;
        color: var(--text);
      }
      p {
        color: var(--muted);
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 0 0 1.5rem;
      }
      .error-box {
        margin: 1rem 0 1.5rem;
        padding: 0.75rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.25);
        border-radius: 0.375rem;
        text-align: left;
      }
      .error-box pre {
        margin: 0;
        font-family: monospace;
        font-size: 0.75rem;
        color: #fca5a5;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .actions {
        display: flex;
        gap: 0.625rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      a, button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.55rem 1.15rem;
        border-radius: 0.375rem;
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.15s ease;
      }
      .primary {
        background: var(--text);
        color: #000;
        border: 1px solid var(--text);
      }
      .primary:hover {
        opacity: 0.9;
      }
      .secondary {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--border);
      }
      .secondary:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .muted-btn {
        background: transparent;
        color: var(--muted);
        border: 1px solid var(--border);
      }
      .muted-btn:hover {
        color: var(--text);
        background: rgba(255, 255, 255, 0.05);
      }
      .countdown {
        font-size: 0.75rem;
        color: var(--muted);
        margin-top: 1.25rem;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="wordmark"><span class="mark">§</span> Section</div>
      <h1>Connecting to your workspace</h1>
      <p>The workspace service is refreshing or starting up. Your session is safe and will resume in a moment.</p>
      ${message ? `<div class="error-box"><pre>${message.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] || c)}</pre></div>` : ""}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/app">Go to workspace</a>
        <button class="muted-btn" onclick="resetSession()">Reset session</button>
      </div>
      <div class="countdown" id="timer">Retrying automatically in <span id="sec">4</span>s...</div>
    </div>
    <script>
      function resetSession() {
        try {
          localStorage.clear();
          sessionStorage.clear();
          document.cookie.split(";").forEach(function(c) {
            document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
          });
        } catch(e) {}
        window.location.href = "/auth";
      }
      var count = 4;
      var interval = setInterval(function() {
        count--;
        var el = document.getElementById("sec");
        if (el) el.textContent = count;
        if (count <= 0) {
          clearInterval(interval);
          location.reload();
        }
      }, 1000);
    </script>
  </body>
</html>`;
}
