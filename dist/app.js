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
    origin: "all",
    category: "all",
    query: "",
    rulesQuery: "",
    configQuery: "",
    configSource: "all",
    openSkillId: null,
    showFullSkill: false,
    openRuleId: null,
    showFullRule: false,
    openConfigId: null,
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
  };

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

  function visibleSkills() {
    const q = state.query.trim().toLowerCase();
    const skills = activeBundle().skills || [];
    return skills.filter((sk) => {
      if (state.origin !== "all" && sk.origin !== state.origin) return false;
      if (state.category !== "all" && !(sk.categories || []).includes(state.category)) return false;
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
    return state.config.filter((row) => {
      if (state.configSource !== "all" && row.source !== state.configSource) return false;
      if (!q) return true;
      return (row.search_blob || "").includes(q);
    });
  }

  function renderCatFilters() {
    const chips = [
      `<span class="filter-label" title="Filter by category">
        <svg class="filter-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path fill="currentColor" d="M1.5 2.5h13l-5 5.5V13l-3 1.5V8L1.5 2.5z"/>
        </svg>
      </span>`,
      `<div class="filters cats">`,
      `<button type="button" data-cat="all" class="${state.category === "all" ? "active" : ""}">All categories</button>`,
    ];
    for (const c of state.categories) {
      chips.push(
        `<button type="button" data-cat="${escapeHtml(c)}" class="${
          state.category === c ? "active" : ""
        }">${escapeHtml(c)}</button>`
      );
    }
    chips.push(`</div>`);
    els.catFilters.innerHTML = chips.join("");
    els.catFilters.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.category = btn.dataset.cat;
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
    const chips = [
      `<button type="button" data-config-source="all" class="${
        state.configSource === "all" ? "active" : ""
      }">All sources</button>`,
    ];
    for (const s of sources) {
      chips.push(
        `<button type="button" data-config-source="${escapeHtml(s)}" class="${
          state.configSource === s ? "active" : ""
        }">${escapeHtml(s)}</button>`
      );
    }
    els.configSourceFilters.innerHTML = chips.join("");
    els.configSourceFilters.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.configSource = btn.dataset.configSource;
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

  function updateMeta() {
    const c = state.cursor;
    const cl = state.claude;
    els.meta.textContent =
      `Cursor ${c.skills.length} skills / ${c.rules.length} rules · ` +
      `Claude ${cl.skills.length} skills / ${cl.rules.length} rules · ` +
      `${state.config.length} config · generated ${state.generatedAt}`;
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

  document.querySelectorAll(".filter-links.origin button[data-origin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-links.origin button[data-origin]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.origin = btn.dataset.origin;
      state.openSkillId = null;
      state.showFullSkill = false;
      renderSkillsTable();
    });
  });

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

  applyColWidths();
  initColumnResize();

  fetch(`skills.json?v=${Date.now()}`)
    .then((r) => {
      if (!r.ok) throw new Error("skills.json missing - run generate.py or ./serve.sh");
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
      updateMeta();
      setRuntime(state.runtime);
    })
    .catch((err) => {
      els.meta.textContent = String(err.message || err);
    });
})();
