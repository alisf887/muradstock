import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/report.css";
import "./styles/auth.css";

import { supabase } from "./lib/supabase.js";
import { loadSession } from "./auth/session.js";
import { showLogin } from "./auth/loginView.js";
import { migrate } from "./state/migrate.js";
import { applyTheme } from "./lib/dom.js";
import { initDownloads } from "./reports/export.js";
import { render } from "./views/index.js";
import { bindInput } from "./events/input.js";
import { bindChange } from "./events/change.js";
import { bindClick } from "./events/click.js";

let started = false;

/** Runs once, only after a valid login. */
function startApp() {
  if (started) return;
  started = true;
  migrate();
  applyTheme();
  initDownloads();
  bindInput();
  bindChange();
  bindClick();
  render();
}

async function boot() {
  applyTheme();
  const r = await loadSession();
  if (r.ok) startApp(); else showLogin(startApp, r.msg);
  // Session expired or signed out in another tab: back to the login page.
  if (supabase) supabase.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT" && started) location.reload(); });
}
boot();