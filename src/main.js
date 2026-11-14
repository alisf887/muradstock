import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/report.css";

import { migrate } from "./state/migrate.js";
import { applyTheme } from "./lib/dom.js";
import { initDownloads } from "./reports/export.js";
import { render } from "./views/index.js";
import { bindInput } from "./events/input.js";
import { bindChange } from "./events/change.js";
import { bindClick } from "./events/click.js";

migrate();
applyTheme();
initDownloads();
bindInput();
bindChange();
bindClick();
render();
