/* My Skills Handbook - Cursor / Claude / Tailwind */

(() => {
  const COL_STORAGE = "skills-handbook-col-widths-v1";

  const state = {
    cursor: { skills: [], rules: [] },
    claude: { skills: [], rules: [] },
    config: [],
    categories: [],
    generatedAt: "",
    runtime: "cursor",
    section: "skills",
    origins: [],
    selectedCategories: [],
    query: "",
    rulesQuery: "",
    configQuery: "",
    configSourcesSelected: [],
    openSkillId: null,
    showFullSkill: false,
    openRuleId: null,
    showFullRule: false,
    openConfigId: null,
    settings: null,
    editBase: null,
    editInitial: {},
    editDirty: {},
  };

  const els = {
    meta: document.getElementById("meta"),
    count: document.getElementById("count"),
    rulesCount: document.getElementById("rules-count"),
    configCount: document.getElementById("config-count"),
    skillsBody: document.getElementById("skills-body"),
    rulesBody: document.getElementById("rules-body"),
    configBody: document.getElementById("config-body"),
    search: document.getElementById("search"),
    rulesSearch: document.getElementById("rules-search"),
    configSearch: document.getElementById("config-search"),
    catFilters: document.getElementById("cat-filters"),
    configSourceFilters: document.getElementById("config-source-filters"),
    skillsView: document.getElementById("skills-view"),
    rulesView: document.getElementById("rules-view"),
    configView: document.getElementById("config-view"),
    runtimePane: document.getElementById("runtime-pane"),
    sectionTabs: document.getElementById("section-tabs"),
    settingsBtn: document.getElementById("settings-btn"),
    settingsPanel: document.getElementById("settings-panel"),
    settingsBackdrop: document.getElementById("settings-backdrop"),
    settingsClose: document.getElementById("settings-close"),
    settingsBody: document.getElementById("settings-body"),
    editBackdrop: document.getElementById("edit-backdrop"),
    editModal: document.getElementById("edit-modal"),
    editModalBody: document.getElementById("edit-modal-body"),
    editClose: document.getElementById("edit-close"),
    editCancel: document.getElementById("edit-cancel"),
    editSave: document.getElementById("edit-save"),
    editStatus: document.getElementById("edit-status"),
    editFilePath: document.getElementById("edit-file-path"),
  };

  const CONFIG_GROUPS = [
    {
      title: "Cursor",
      fields: [
        {
          id: "cursor.skills_dir",
          label: "Skills folder",
          help: "Folder of Cursor skills shown under the Cursor tab.",
          kind: "dir",
        },
        {
          id: "cursor.rules_dir",
          label: "Rules folder",
          help: "Folder of Cursor rules shown under the Cursor tab.",
          kind: "dir",
        },
      ],
    },
    {
      title: "Claude",
      fields: [
        {
          id: "claude.skills_dir",
          label: "Skills folder",
          help: "Folder of Claude skills shown under the Claude tab.",
          kind: "dir",
        },
        {
          id: "claude.rules_dir",
          label: "Rules folder (optional)",
          help: "Folder of Claude rules shown under the Claude tab. Leave empty if unused.",
          kind: "dir",
          optional: true,
        },
        {
          id: "claude.claude_md_path",
          label: "Memory file (optional)",
          help: "Optional Claude memory file. Leave empty to skip.",
          kind: "file",
          optional: true,
        },
      ],
    },
    {
      title: "Personal vs Tailwind tagging",
      fields: [
        {
          id: "personal_skills_dir",
          label: "Personal skills folder",
          help: "Your skills folder. Names here count as Personal. Leave empty if none.",
          kind: "dir",
          optional: true,
        },
        {
          id: "tailwind_module_skills_dir",
          label: "Full Tailwind skills pack",
          help: "Full Tailwind skills pack on disk. Leave empty to use the default under your Cursor skills folder (…/.lola/modules/tailwind/skills).",
          kind: "dir",
          optional: true,
        },
        {
          id: "agents_skills_dir",
          label: "Add-on skills folder",
          help: "Add-on skills (for example gws). Names here also count as Tailwind.",
          kind: "dir",
          optional: true,
        },
      ],
    },
    {
      title: "Tailwind config tab",
      fields: [
        {
          id: "tailwind_dir",
          label: "Tailwind config folder",
          help: "Folder for the Tailwind config tab (tailwind.json and related files).",
          kind: "dir",
        },
      ],
    },
    {
      title: "Token file locations (status only)",
      fields: [
        {
          id: "jira_apikey_path",
          label: "Jira API token file",
          help: "Used by Jira skills (brief, inbox, status, RFEs, and similar) to call Red Hat Jira. Path to the token file only - never paste the token here.",
          kind: "file",
          optional: true,
        },
        {
          id: "rh_offline_token_path",
          label: "Red Hat Case Management offline token",
          help: "Used by Red Hat support-case skills to authenticate to the Case Management API. Path to the offline-token file only - never paste the token here.",
          kind: "file",
          optional: true,
        },
        {
          id: "rh_offline_token_plain_path",
          label: "Red Hat offline token (plain KEY file)",
          help: "Optional second file some setups use with a bare KEY=… line for the same Case Management access. Leave empty if you only keep the main offline-token file. Path only - never paste the token here.",
          kind: "file",
          optional: true,
        },
      ],
    },
  ];

  function fieldById(id) {
    for (const group of CONFIG_GROUPS) {
      for (const field of group.fields) {
        if (field.id === id) return field;
      }
    }
    return null;
  }

  const CHEVRON_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="9,5 19,12 9,19" fill="currentColor"/></svg>';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMd(md) {
    if (typeof marked !== "undefined" && marked.parse) {
      return marked.parse(md || "", { async: false });
    }
    return `<pre>${escapeHtml(md || "")}</pre>`;
  }

  function depList(arr) {
    if (!arr || !arr.length) return '<p class="none">None detected</p>';
    return `<ul>${arr.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  }

  function chevronBtn(expanded, id) {
    return `<button type="button" class="chevron" data-action="toggle" data-id="${escapeHtml(id)}"
      aria-expanded="${expanded ? "true" : "false"}"
      aria-label="${expanded ? "Collapse" : "Expand"}">${CHEVRON_SVG}</button>`;
  }

  function activeBundle() {
    return state.runtime === "claude" ? state.claude : state.cursor;
  }

  function loadColWidths() {
    try {
      return JSON.parse(localStorage.getItem(COL_STORAGE) || "{}");
    } catch {
      return {};
    }
  }

  function saveColWidths(map) {
    localStorage.setItem(COL_STORAGE, JSON.stringify(map));
  }

  function applyColWidths() {
    const map = loadColWidths();
    document.querySelectorAll("col[data-col]").forEach((col) => {
      const key = col.dataset.col;
      if (map[key]) col.style.width = map[key];
    });
  }

  function initColumnResize() {
    document.querySelectorAll(".col-resizer").forEach((handle) => {
      handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = handle.dataset.resize;
        const col = document.querySelector(`col[data-col="${key}"]`);
        if (!col) return;
        const startX = e.clientX;
        const startW = col.getBoundingClientRect().width;
        handle.classList.add("dragging");
        document.body.classList.add("col-resizing");
        handle.setPointerCapture(e.pointerId);

        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const next = Math.max(80, startW + dx);
          col.style.width = `${next}px`;
        };
        const onUp = (ev) => {
          handle.releasePointerCapture(ev.pointerId);
          handle.classList.remove("dragging");
          document.body.classList.remove("col-resizing");
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onUp);
          const map = loadColWidths();
          map[key] = col.style.width;
          saveColWidths(map);
        };
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
      });
    });
  }

  function toggleFilterValue(list, value) {
    const i = list.indexOf(value);
    if (i >= 0) list.splice(i, 1);
    else list.push(value);
  }

  function visibleSkills() {
    const q = state.query.trim().toLowerCase();
    const skills = activeBundle().skills || [];
    const origins = state.origins;
    const cats = state.selectedCategories;
    return skills.filter((sk) => {
      if (origins.length && !origins.includes(sk.origin)) return false;
      if (cats.length) {
        const skCats = sk.categories || [];
        if (!cats.some((c) => skCats.includes(c))) return false;
      }
      if (!q) return true;
      return (sk.search_blob || "").includes(q);
    });
  }

  function visibleRules() {
    const q = state.rulesQuery.trim().toLowerCase();
    const rules = activeBundle().rules || [];
    return rules.filter((r) => !q || (r.search_blob || "").includes(q));
  }

  function configSources() {
    const seen = new Set();
    const out = [];
    for (const row of state.config) {
      const s = row.source || "other";
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
    return out;
  }

  function visibleConfig() {
    const q = state.configQuery.trim().toLowerCase();
    const sources = state.configSourcesSelected;
    return state.config.filter((row) => {
      if (sources.length && !sources.includes(row.source || "other")) return false;
      if (!q) return true;
      return (row.search_blob || "").includes(q);
    });
  }

  function renderCatFilters() {
    const selected = state.selectedCategories;
    const parts = [
      `<span class="filter-label" title="Filter by category (multi-select)" aria-hidden="true">
        <svg class="filter-icon" viewBox="0 0 16 16" width="14" height="14">
          <path fill="currentColor" d="M1.5 2.5h13l-5 5.5V13l-3 1.5V8L1.5 2.5z"/>
        </svg>
      </span>`,
      `<button type="button" data-cat="all" class="${
        selected.length === 0 ? "active" : ""
      }">All</button>`,
    ];
    for (const c of state.categories) {
      parts.push(`<span class="filter-sep" aria-hidden="true">·</span>`);
      parts.push(
        `<button type="button" data-cat="${escapeHtml(c)}" class="${
          selected.includes(c) ? "active" : ""
        }">${escapeHtml(c)}</button>`
      );
    }
    els.catFilters.innerHTML = parts.join("");
    els.catFilters.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.cat;
        if (next === "all") state.selectedCategories = [];
        else toggleFilterValue(state.selectedCategories, next);
        state.openSkillId = null;
        state.showFullSkill = false;
        renderCatFilters();
        renderSkillsTable();
      });
    });
  }

  function skillExpandHtml(sk) {
    const full = state.showFullSkill
      ? `<div class="full-md prose">${renderMd(sk.full_markdown || "")}</div>`
      : "";
    return `<tr class="expand-row" data-expand-for="${escapeHtml(sk.id)}">
      <td colspan="4">
        <div class="expand">
          <div class="expand-label">Expanded detail</div>
          <code class="path">${escapeHtml(sk.path)}</code>
          <div class="actions">
            <button type="button" class="primary" data-action="toggle-full" data-id="${escapeHtml(sk.id)}">
              ${state.showFullSkill ? "Hide full SKILL.md" : "View full SKILL.md"}
            </button>
          </div>
          <div class="prose">${renderMd(sk.detail_markdown || sk.summary || "")}</div>
          <div class="dep-grid">
            <div><h4>MCP</h4>${depList(sk.dependencies && sk.dependencies.mcp)}</div>
            <div><h4>Auth</h4>${depList(sk.dependencies && sk.dependencies.auth)}</div>
            <div><h4>Tools / APIs</h4>${depList(sk.dependencies && sk.dependencies.tools)}</div>
          </div>
          ${full}
        </div>
      </td>
    </tr>`;
  }

  function renderSkillsTable() {
    const bundle = activeBundle();
    const items = visibleSkills();
    els.count.textContent = `Showing ${items.length} of ${bundle.skills.length} skills`;
    const rows = [];
    for (const sk of items) {
      const open = sk.id === state.openSkillId;
      const cats = (sk.categories || [])
        .map((c) => `<span class="badge cat">${escapeHtml(c)}</span>`)
        .join("");
      rows.push(`<tr class="skill-row ${open ? "open" : ""}" data-id="${escapeHtml(sk.id)}">
        <td class="col-toggle">${chevronBtn(open, sk.id)}</td>
        <td>
          <div class="name-cell">
            <span>${escapeHtml(sk.name || sk.id)}</span>
            <span class="id">${escapeHtml(sk.id)}</span>
            <span><span class="badge ${escapeHtml(sk.origin)}">${escapeHtml(sk.origin)}</span></span>
          </div>
        </td>
        <td>${cats || '<span class="badge cat">-</span>'}</td>
        <td class="desc-cell">${escapeHtml(sk.summary || "")}</td>
      </tr>`);
      if (open) rows.push(skillExpandHtml(sk));
    }
    els.skillsBody.innerHTML = rows.join("") || `<tr><td colspan="4">No matching skills.</td></tr>`;
  }

  function ruleExpandHtml(rule) {
    const body = state.showFullRule
      ? `<div class="prose">${renderMd(rule.full_markdown || "")}</div>`
      : `<div class="prose"><p>${escapeHtml(rule.summary || "")}</p></div>`;
    const paths = rule.paths
      ? `<div><span class="label">Paths</span> <code class="path">${escapeHtml(rule.paths)}</code></div>`
      : "";
    return `<tr class="expand-row" data-expand-for="${escapeHtml(rule.id)}">
      <td colspan="3">
        <div class="expand">
          <div class="expand-label">Expanded detail</div>
          <code class="path">${escapeHtml(rule.path)}</code>
          ${paths}
          <div class="actions">
            <button type="button" class="primary" data-action="toggle-full-rule" data-id="${escapeHtml(rule.id)}">
              ${state.showFullRule ? "Show summary" : "View full rule"}
            </button>
          </div>
          ${body}
        </div>
      </td>
    </tr>`;
  }

  function renderRulesTable() {
    const bundle = activeBundle();
    const items = visibleRules();
    els.rulesCount.textContent = `Showing ${items.length} of ${bundle.rules.length} rules`;
    const rows = [];
    for (const rule of items) {
      const open = rule.id === state.openRuleId;
      const ext = rule.ext || "mdc";
      const idLabel = String(rule.id).includes(".")
        ? rule.id
        : `${rule.id}.${ext}`;
      rows.push(`<tr class="rule-row ${open ? "open" : ""}" data-id="${escapeHtml(rule.id)}">
        <td class="col-toggle">${chevronBtn(open, rule.id)}</td>
        <td>
          <div class="name-cell">
            <span>${escapeHtml(rule.name || rule.id)}</span>
            <span class="id">${escapeHtml(idLabel)}</span>
          </div>
        </td>
        <td class="desc-cell">${escapeHtml(rule.summary || "")}</td>
      </tr>`);
      if (open) rows.push(ruleExpandHtml(rule));
    }
    els.rulesBody.innerHTML = rows.join("") || `<tr><td colspan="3">No matching rules.</td></tr>`;
  }

  function renderConfigSourceFilters() {
    if (!els.configSourceFilters) return;
    const sources = configSources();
    const selected = state.configSourcesSelected;
    const parts = [
      `<span class="filter-label" title="Filter by source (multi-select)" aria-hidden="true">
        <svg class="filter-icon" viewBox="0 0 16 16" width="14" height="14">
          <path fill="currentColor" d="M1.5 2.5h13l-5 5.5V13l-3 1.5V8L1.5 2.5z"/>
        </svg>
      </span>`,
      `<button type="button" data-config-source="all" class="${
        selected.length === 0 ? "active" : ""
      }">All</button>`,
    ];
    for (const s of sources) {
      parts.push(`<span class="filter-sep" aria-hidden="true">·</span>`);
      parts.push(
        `<button type="button" data-config-source="${escapeHtml(s)}" class="${
          selected.includes(s) ? "active" : ""
        }">${escapeHtml(s)}</button>`
      );
    }
    els.configSourceFilters.innerHTML = parts.join("");
    els.configSourceFilters.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.configSource;
        if (next === "all") state.configSourcesSelected = [];
        else toggleFilterValue(state.configSourcesSelected, next);
        state.openConfigId = null;
        renderConfigSourceFilters();
        renderConfigTable();
      });
    });
  }

  function configExpandHtml(row) {
    const kind = row.kind || "";
    return `<tr class="expand-row" data-expand-for="${escapeHtml(row.id)}">
      <td colspan="3">
        <div class="expand">
          <div class="expand-label">Expanded detail</div>
          <div class="config-meta">
            <div><span class="label">Source</span> <span class="badge cat">${escapeHtml(
              row.source || ""
            )}</span>
            ${kind ? ` <span class="badge ${escapeHtml(kind)}">${escapeHtml(kind)}</span>` : ""}</div>
            <div><span class="label">File</span> <code class="path">${escapeHtml(
              row.path || ""
            )}</code></div>
          </div>
          <h4>Value</h4>
          <pre class="config-value">${escapeHtml(row.detail_value != null ? row.detail_value : row.value || "")}</pre>
        </div>
      </td>
    </tr>`;
  }

  function renderConfigTable() {
    if (!els.configBody) return;
    const items = visibleConfig();
    els.configCount.textContent = `Showing ${items.length} of ${state.config.length} config rows`;
    const rows = [];
    for (const row of items) {
      const open = row.id === state.openConfigId;
      rows.push(`<tr class="config-row ${open ? "open" : ""}" data-id="${escapeHtml(row.id)}">
        <td class="col-toggle">${chevronBtn(open, row.id)}</td>
        <td>
          <div class="name-cell">
            <span>${escapeHtml(row.name || row.id)}</span>
            <span class="id">${escapeHtml(row.source || "")}</span>
          </div>
        </td>
        <td class="desc-cell">${escapeHtml(row.value || "")}</td>
      </tr>`);
      if (open) rows.push(configExpandHtml(row));
    }
    els.configBody.innerHTML =
      rows.join("") || `<tr><td colspan="3">No matching config rows.</td></tr>`;
  }

  function formatRefreshedAt(iso) {
    const m = String(iso || "").match(
      /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/
    );
    if (!m) return String(iso || "");
    return `${m[1]} ${m[2]}:${m[3]}`;
  }

  function updateMeta() {
    els.meta.textContent = state.generatedAt
      ? `Last refreshed ${formatRefreshedAt(state.generatedAt)}`
      : "";
    const issueCount = (state.settings && state.settings.issues && state.settings.issues.length) || 0;
    if (els.settingsBtn) {
      els.settingsBtn.classList.toggle("has-issues", issueCount > 0);
      els.settingsBtn.title =
        issueCount > 0
          ? `Settings (${issueCount} issue${issueCount === 1 ? "" : "s"})`
          : "Settings";
    }
  }

  const PATH_HELP = {
    "cursor.skills_dir": "Skills listed under the Cursor tab.",
    "cursor.rules_dir": "Rules listed under the Cursor tab.",
    "claude.skills_dir": "Skills listed under the Claude tab.",
    "claude.rules_dir": "Rules listed under the Claude tab.",
    "claude.claude_md_path": "Optional Claude memory file under Claude → Rules.",
    personal_skills_dir:
      "Your skills folder. Names here count as Personal in All / Personal / Tailwind.",
    tailwind_module_skills_dir:
      "Full Tailwind skills pack on disk (usually …/.lola/modules/tailwind/skills). Names here count as Tailwind.",
    agents_skills_dir:
      "Add-on skills folder (for example gws). Names here also count as Tailwind.",
    tailwind_dir: "Folder for the Tailwind config tab.",
    jira_apikey_path: "Jira API token file for Jira skills (status only).",
    rh_offline_token_path: "Case Management offline token for support-case skills (status only).",
    rh_offline_token_plain_path: "Optional plain-KEY copy of that Case Management token (status only).",
  };

  function fileHref(absPath) {
    if (!absPath) return "";
    const normalized = String(absPath).replace(/\\/g, "/");
    if (/^[A-Za-z]:\//.test(normalized)) {
      return `file:///${normalized}`;
    }
    return `file://${normalized.startsWith("/") ? "" : "/"}${normalized}`;
  }

  function renderSettings() {
    if (!els.settingsBody) return;
    const s = state.settings;
    if (!s) {
      els.settingsBody.innerHTML =
        '<p class="settings-note">No settings data. Restart with ./serve.sh.</p>';
      return;
    }
    const issues = s.issues || [];
    const paths = s.paths || [];
    const issuesHtml = issues.length
      ? `<section>
          <h3>Suspicious</h3>
          <ul class="settings-issues">
            ${issues
              .map(
                (iss) =>
                  `<li class="${escapeHtml(iss.level || "warn")}">${escapeHtml(
                    iss.message || ""
                  )}</li>`
              )
              .join("")}
          </ul>
        </section>`
      : `<section>
          <h3>Suspicious</h3>
          <p class="settings-note">No path or origin issues detected.</p>
        </section>`;

    const handbookLine = `<div class="settings-handbook-line">
          <button type="button" id="open-config-editor" class="settings-primary">Edit configuration</button>
        </div>`;

    const pathRows = paths
      .map((p) => {
        const status = p.exists
          ? '<span class="ok">found</span>'
          : '<span class="missing">missing</span>';
        const count =
          p.kind === "dir" && p.exists ? String(p.skill_count ?? 0) : "-";
        const help = PATH_HELP[p.key] || "";
        const resolved = p.resolved || "";
        const configured =
          p.configured && p.configured !== p.resolved ? p.configured : "";
        const resolvedCell = resolved
          ? `<a class="mono" href="${escapeHtml(fileHref(resolved))}"${
              configured
                ? ` title="In handbook.json: ${escapeHtml(configured)}"`
                : ""
            }>${escapeHtml(resolved)}</a>`
          : `<code class="mono">${escapeHtml(p.configured || "")}</code>`;
        return `<tr>
          <td>
            <code class="mono">${escapeHtml(p.key || "")}</code>
            ${help ? `<span class="key-help">${escapeHtml(help)}</span>` : ""}
          </td>
          <td class="col-status">${status}</td>
          <td class="col-count">${escapeHtml(count)}</td>
          <td>${resolvedCell}</td>
        </tr>`;
      })
      .join("");

    els.settingsBody.innerHTML = `
      <section class="settings-handbook-section">
        ${handbookLine}
      </section>
      ${issuesHtml}
      <section class="settings-paths-section">
        <h3>Paths from handbook.json</h3>
        <p class="settings-note">
          <strong># skills</strong> is how many skill folders exist at that path.
          Those names drive All / Personal / Tailwind.
        </p>
        <div class="settings-table-wrap">
          <table class="settings-table resizable">
            <colgroup>
              <col data-col="settings-key" style="width: 28%" />
              <col data-col="settings-status" style="width: 5.5rem" />
              <col data-col="settings-count" style="width: 5.5rem" />
              <col data-col="settings-path" style="width: auto" />
            </colgroup>
            <thead>
              <tr>
                <th data-col="settings-key">Key<span class="col-resizer" data-resize="settings-key"></span></th>
                <th data-col="settings-status">Status<span class="col-resizer" data-resize="settings-status"></span></th>
                <th data-col="settings-count"># skills<span class="col-resizer" data-resize="settings-count"></span></th>
                <th data-col="settings-path">Resolved path</th>
              </tr>
            </thead>
            <tbody>${pathRows}</tbody>
          </table>
        </div>
      </section>
    `;
    applyColWidths();
    initSettingsColumnResize();
    const openEdit = document.getElementById("open-config-editor");
    if (openEdit) openEdit.addEventListener("click", () => openConfigEditor());
  }

  function getByPath(obj, dotted) {
    return dotted.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  function setByPath(obj, dotted, value) {
    const parts = dotted.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!cur[key] || typeof cur[key] !== "object") cur[key] = {};
      cur = cur[key];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function looksLikeSecret(value) {
    const v = String(value || "");
    if (!v) return false;
    if (/xox[baprs]-|ghp_[A-Za-z0-9]{20,}|glpat-|eyJ[A-Za-z0-9_\-]{20,}\.|BEGIN (RSA |OPENSSH )?PRIVATE KEY/i.test(v)) {
      return true;
    }
    if (v.length > 200 && !/[\/\\]/.test(v) && !v.startsWith("~")) return true;
    return false;
  }

  function setEditStatus(msg, kind) {
    if (!els.editStatus) return;
    els.editStatus.textContent = msg || "";
    els.editStatus.classList.toggle("is-error", kind === "error");
    els.editStatus.classList.toggle("is-ok", kind === "ok");
  }

  function isFieldDirty(id) {
    return Boolean(state.editDirty[id]);
  }

  function markFieldDirty(input) {
    const id = input.dataset.configId;
    if (!id || state.editDirty[id]) return;
    state.editDirty[id] = true;
    input.classList.remove("is-pristine");
    input.classList.add("is-dirty");
  }

  function syncFieldDirtyFromValue(input) {
    const id = input.dataset.configId;
    if (!id || state.editDirty[id]) return;
    const initial = state.editInitial[id] == null ? "" : String(state.editInitial[id]);
    if (input.value.trim() !== initial.trim()) {
      markFieldDirty(input);
    }
  }

  function collectDirtyFieldIds() {
    return Object.keys(state.editDirty).filter((id) => state.editDirty[id]);
  }

  function renderConfigForm(values) {
    if (!els.editModalBody) return;
    const html = CONFIG_GROUPS.map((group) => {
      const fields = group.fields
        .map((field) => {
          const val = values[field.id] == null ? "" : String(values[field.id]);
          const dirty = isFieldDirty(field.id);
          return `<label class="config-field">
            <span class="config-field-label">${escapeHtml(field.label)}</span>
            <span class="config-field-help">${escapeHtml(field.help)}</span>
            <input type="text" data-config-id="${escapeHtml(field.id)}" data-kind="${escapeHtml(
              field.kind || "dir"
            )}" data-optional="${field.optional ? "1" : "0"}" value="${escapeHtml(
              val
            )}" spellcheck="false" autocomplete="off" class="${
              dirty ? "is-dirty" : "is-pristine"
            }" ${field.optional ? 'placeholder="(optional)"' : ""} />
            <span class="config-field-error" data-error-for="${escapeHtml(field.id)}" hidden></span>
          </label>`;
        })
        .join("");
      return `<section class="config-group">
        <h3>${escapeHtml(group.title)}</h3>
        ${fields}
      </section>`;
    }).join("");
    els.editModalBody.innerHTML = html;
    bindConfigFieldValidation();
    updateSaveEnabled();
  }

  function collectConfigForm() {
    const values = {};
    if (!els.editModal) return values;
    els.editModal.querySelectorAll("input[data-config-id]").forEach((input) => {
      values[input.dataset.configId] = input.value.trim();
    });
    return values;
  }

  function setFieldError(input, message) {
    const id = input.dataset.configId;
    const errEl =
      (els.editModal &&
        els.editModal.querySelector(`.config-field-error[data-error-for="${id}"]`)) ||
      null;
    const bad = Boolean(message);
    input.classList.toggle("is-invalid", bad);
    input.setAttribute("aria-invalid", bad ? "true" : "false");
    if (errEl) {
      errEl.textContent = message || "";
      errEl.hidden = !bad;
    }
  }

  function updateSaveEnabled() {
    if (!els.editSave) return;
    const invalid =
      els.editModal && els.editModal.querySelector("input[data-config-id].is-invalid");
    els.editSave.disabled = Boolean(invalid);
  }

  async function checkPathOnServer(field, value, requireExists) {
    if (looksLikeSecret(value)) {
      return `${field.label}: enter a filesystem path only, not a secret value.`;
    }
    try {
      const r = await fetch("/api/check-path", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          path: value,
          kind: field.kind || "dir",
          optional: Boolean(field.optional),
          require_exists: Boolean(requireExists),
          label: field.label,
        }),
      });
      const text = await r.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!data || typeof data !== "object") {
        return "Path check unavailable. Stop the old server and run ./serve.sh again from ~/Projects/skills-handbook.";
      }
      if (data.ok) return "";
      return data.error || `${field.label}: invalid path.`;
    } catch {
      return "Path check unavailable. Stop the old server and run ./serve.sh again from ~/Projects/skills-handbook.";
    }
  }

  async function validateConfigInput(input) {
    const field = fieldById(input.dataset.configId);
    if (!field) return true;
    const value = input.value.trim();
    const requireExists = isFieldDirty(field.id);
    const err = await checkPathOnServer(field, value, requireExists);
    setFieldError(input, err);
    updateSaveEnabled();
    return !err;
  }

  function bindConfigFieldValidation() {
    if (!els.editModal) return;
    els.editModal.querySelectorAll("input[data-config-id]").forEach((input) => {
      input.addEventListener("blur", () => {
        validateConfigInput(input);
      });
      input.addEventListener("input", () => {
        syncFieldDirtyFromValue(input);
        if (input.classList.contains("is-invalid")) {
          setFieldError(input, "");
          updateSaveEnabled();
        }
      });
    });
  }

  async function validateConfigValues(values) {
    for (const group of CONFIG_GROUPS) {
      for (const field of group.fields) {
        const val = values[field.id] == null ? "" : String(values[field.id]);
        const requireExists = isFieldDirty(field.id);
        const err = await checkPathOnServer(field, val, requireExists);
        if (err) {
          const input =
            els.editModal &&
            els.editModal.querySelector(`input[data-config-id="${field.id}"]`);
          if (input) setFieldError(input, err);
          updateSaveEnabled();
          return err;
        }
      }
    }
    return "";
  }

  function buildConfigObject(base, values) {
    const out = base && typeof base === "object" ? JSON.parse(JSON.stringify(base)) : {};
    if (!out.cursor || typeof out.cursor !== "object") out.cursor = {};
    if (!out.claude || typeof out.claude !== "object") out.claude = {};
    for (const group of CONFIG_GROUPS) {
      for (const field of group.fields) {
        setByPath(out, field.id, values[field.id] == null ? "" : String(values[field.id]));
      }
    }
    return out;
  }

  function setEditFilePath(absPath, usingExample) {
    if (!els.editFilePath) return;
    if (!absPath) {
      els.editFilePath.hidden = true;
      els.editFilePath.textContent = "";
      return;
    }
    const label = usingExample ? "Will create" : "File";
    els.editFilePath.innerHTML = `<span class="edit-file-label">${escapeHtml(
      label
    )}</span><span class="edit-file-value">${escapeHtml(absPath)}</span>`;
    els.editFilePath.hidden = false;
  }

  async function openConfigEditor() {
    setEditStatus("Loading…");
    if (els.editBackdrop) {
      els.editBackdrop.hidden = false;
      els.editBackdrop.classList.remove("hidden");
    }
    if (els.editModal) {
      els.editModal.hidden = false;
      els.editModal.classList.remove("hidden");
    }
    try {
      const r = await fetch("/api/handbook-config", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not load handbook.json");
      let parsed = {};
      try {
        parsed = JSON.parse(data.text || "{}");
      } catch {
        parsed = {};
      }
      if (!parsed || typeof parsed !== "object") parsed = {};
      state.editBase = parsed;
      state.editDirty = {};
      const values = {};
      for (const group of CONFIG_GROUPS) {
        for (const field of group.fields) {
          const v = getByPath(parsed, field.id);
          values[field.id] = v == null ? "" : String(v);
        }
      }
      state.editInitial = { ...values };
      setEditFilePath(data.path || "", Boolean(data.using_example));
      renderConfigForm(values);
      setEditStatus(
        data.using_example
          ? "Loaded example defaults. Save to create handbook.json."
          : "Loaded from disk.",
        "ok"
      );
    } catch (err) {
      state.editInitial = {};
      state.editDirty = {};
      setEditFilePath("", false);
      renderConfigForm({});
      setEditStatus(
        String(err.message || err) + " Start the app with ./serve.sh.",
        "error"
      );
    }
  }

  function closeConfigEditor() {
    if (els.editModal) {
      els.editModal.hidden = true;
      els.editModal.classList.add("hidden");
    }
    if (els.editBackdrop) {
      els.editBackdrop.hidden = true;
      els.editBackdrop.classList.add("hidden");
    }
    state.editBase = null;
    state.editInitial = {};
    state.editDirty = {};
    setEditStatus("");
  }

  async function saveConfigForm() {
    const values = collectConfigForm();
    setEditStatus("Checking paths…");
    const verr = await validateConfigValues(values);
    if (verr) {
      setEditStatus(verr, "error");
      return;
    }
    const payload = buildConfigObject(state.editBase || {}, values);
    payload._dirty_fields = collectDirtyFieldIds();
    setEditStatus("Saving…");
    try {
      const r = await fetch("/api/handbook-config", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload, null, 2),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Save failed");
      const catalog = await fetch(`skills.json?v=${Date.now()}`, { cache: "no-store" });
      if (!catalog.ok) throw new Error("Catalog missing after save - restart ./serve.sh");
      const body = await catalog.json();
      const cursor = body.cursor || {};
      const claude = body.claude || {};
      state.cursor = {
        skills: cursor.skills || body.skills || [],
        rules: cursor.rules || body.rules || [],
      };
      state.claude = {
        skills: claude.skills || [],
        rules: claude.rules || [],
      };
      state.config = Array.isArray(body.config) ? body.config : [];
      state.categories = body.categories || [];
      state.generatedAt = body.generated_at || "";
      state.settings = body.settings || null;
      updateMeta();
      setRuntime(state.runtime);
      closeConfigEditor();
      renderSettings();
    } catch (err) {
      setEditStatus(String(err.message || err), "error");
    }
  }

  function initSettingsColumnResize() {
    if (!els.settingsPanel) return;
    els.settingsPanel.querySelectorAll(".col-resizer").forEach((handle) => {
      if (handle.dataset.bound === "1") return;
      handle.dataset.bound = "1";
      handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = handle.dataset.resize;
        const col = els.settingsPanel.querySelector(`col[data-col="${key}"]`);
        if (!col) return;
        const startX = e.clientX;
        const startW = col.getBoundingClientRect().width;
        handle.classList.add("dragging");
        document.body.classList.add("col-resizing");
        handle.setPointerCapture(e.pointerId);

        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const min = key === "settings-status" ? 72 : 80;
          col.style.width = `${Math.max(min, startW + dx)}px`;
        };
        const onUp = (ev) => {
          handle.releasePointerCapture(ev.pointerId);
          handle.classList.remove("dragging");
          document.body.classList.remove("col-resizing");
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onUp);
          const map = loadColWidths();
          map[key] = col.style.width;
          saveColWidths(map);
        };
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
      });
    });
  }

  function openSettings() {
    renderSettings();
    if (els.settingsPanel) {
      els.settingsPanel.hidden = false;
      els.settingsPanel.classList.remove("hidden");
    }
    if (els.settingsBackdrop) {
      els.settingsBackdrop.hidden = false;
      els.settingsBackdrop.classList.remove("hidden");
    }
    if (els.settingsClose) els.settingsClose.focus();
  }

  function closeSettings() {
    if (els.settingsPanel) {
      els.settingsPanel.hidden = true;
      els.settingsPanel.classList.add("hidden");
    }
    if (els.settingsBackdrop) {
      els.settingsBackdrop.hidden = true;
      els.settingsBackdrop.classList.add("hidden");
    }
  }

  function setRuntime(runtime) {
    state.runtime = runtime;
    document.querySelectorAll(".tabs button").forEach((b) => {
      b.classList.toggle("active", b.dataset.runtime === runtime);
    });
    const isConfig = runtime === "config";
    if (els.runtimePane) els.runtimePane.classList.toggle("hidden", isConfig);
    if (els.configView) els.configView.classList.toggle("hidden", !isConfig);
    if (isConfig) {
      renderConfigSourceFilters();
      renderConfigTable();
      return;
    }
    state.openSkillId = null;
    state.showFullSkill = false;
    state.openRuleId = null;
    state.showFullRule = false;
    setSection(state.section);
  }

  function setSection(section) {
    state.section = section;
    if (els.sectionTabs) {
      els.sectionTabs.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("active", b.dataset.section === section);
      });
    }
    if (els.skillsView) els.skillsView.classList.toggle("hidden", section !== "skills");
    if (els.rulesView) els.rulesView.classList.toggle("hidden", section !== "rules");
    if (section === "skills") {
      renderCatFilters();
      renderSkillsTable();
    } else {
      renderRulesTable();
    }
  }

  function toggleConfig(id) {
    state.openConfigId = state.openConfigId === id ? null : id;
    renderConfigTable();
  }

  function toggleSkill(id) {
    if (state.openSkillId === id) {
      state.openSkillId = null;
      state.showFullSkill = false;
    } else {
      state.openSkillId = id;
      state.showFullSkill = false;
    }
    renderSkillsTable();
  }

  function toggleRule(id) {
    if (state.openRuleId === id) {
      state.openRuleId = null;
      state.showFullRule = false;
    } else {
      state.openRuleId = id;
      state.showFullRule = true;
    }
    renderRulesTable();
  }

  els.skillsBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (btn) {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (btn.dataset.action === "toggle") {
        toggleSkill(id);
        return;
      }
      if (btn.dataset.action === "toggle-full") {
        state.openSkillId = id;
        state.showFullSkill = !state.showFullSkill;
        renderSkillsTable();
        return;
      }
    }
    const row = e.target.closest("tr.skill-row");
    if (row) toggleSkill(row.dataset.id);
  });

  els.rulesBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (btn) {
      e.stopPropagation();
      if (btn.dataset.action === "toggle") {
        toggleRule(btn.dataset.id);
        return;
      }
      if (btn.dataset.action === "toggle-full-rule") {
        state.openRuleId = btn.dataset.id;
        state.showFullRule = !state.showFullRule;
        renderRulesTable();
        return;
      }
    }
    const row = e.target.closest("tr.rule-row");
    if (row) toggleRule(row.dataset.id);
  });

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    state.openSkillId = null;
    state.showFullSkill = false;
    renderSkillsTable();
  });

  els.rulesSearch.addEventListener("input", () => {
    state.rulesQuery = els.rulesSearch.value;
    state.openRuleId = null;
    renderRulesTable();
  });

  if (els.configBody) {
    els.configBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (btn) {
        e.stopPropagation();
        if (btn.dataset.action === "toggle") {
          toggleConfig(btn.dataset.id);
          return;
        }
      }
      const row = e.target.closest("tr.config-row");
      if (row) toggleConfig(row.dataset.id);
    });
  }

  if (els.configSearch) {
    els.configSearch.addEventListener("input", () => {
      state.configQuery = els.configSearch.value;
      state.openConfigId = null;
      renderConfigTable();
    });
  }

  function syncOriginFilterButtons() {
    const selected = state.origins;
    document.querySelectorAll(".filter-links.origin button[data-origin]").forEach((b) => {
      const v = b.dataset.origin;
      const on = v === "all" ? selected.length === 0 : selected.includes(v);
      b.classList.toggle("active", on);
    });
  }

  document.querySelectorAll(".filter-links.origin button[data-origin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.origin;
      if (next === "all") state.origins = [];
      else toggleFilterValue(state.origins, next);
      syncOriginFilterButtons();
      state.openSkillId = null;
      state.showFullSkill = false;
      renderSkillsTable();
    });
  });
  syncOriginFilterButtons();

  document.querySelectorAll(".tabs button[data-runtime]").forEach((btn) => {
    btn.addEventListener("click", () => setRuntime(btn.dataset.runtime));
  });

  if (els.sectionTabs) {
    els.sectionTabs.querySelectorAll("button[data-section]").forEach((btn) => {
      btn.addEventListener("click", () => setSection(btn.dataset.section));
    });
  }

  document.querySelectorAll("thead th[data-col]").forEach((th) => {
    th.style.position = "sticky";
  });

  if (els.settingsBtn) els.settingsBtn.addEventListener("click", openSettings);
  if (els.settingsClose) els.settingsClose.addEventListener("click", closeSettings);
  if (els.settingsBackdrop) els.settingsBackdrop.addEventListener("click", closeSettings);
  if (els.editClose) els.editClose.addEventListener("click", closeConfigEditor);
  if (els.editCancel) els.editCancel.addEventListener("click", closeConfigEditor);
  if (els.editBackdrop) els.editBackdrop.addEventListener("click", closeConfigEditor);
  if (els.editSave) els.editSave.addEventListener("click", () => saveConfigForm());
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (els.editModal && !els.editModal.hidden) {
      closeConfigEditor();
      return;
    }
    closeSettings();
  });

  applyColWidths();
  initColumnResize();

  fetch(`skills.json?v=${Date.now()}`)
    .then((r) => {
      if (!r.ok) throw new Error("skills.json missing - run ./serve.sh");
      return r.json();
    })
    .then((data) => {
      const cursor = data.cursor || {};
      const claude = data.claude || {};
      state.cursor = {
        skills: cursor.skills || data.skills || [],
        rules: cursor.rules || data.rules || [],
      };
      state.claude = {
        skills: claude.skills || [],
        rules: claude.rules || [],
      };
      state.config = Array.isArray(data.config) ? data.config : [];
      state.categories = data.categories || [];
      state.generatedAt = data.generated_at || "";
      state.settings = data.settings || null;
      updateMeta();
      setRuntime(state.runtime);
    })
    .catch((err) => {
      els.meta.textContent = String(err.message || err);
    });
})();
