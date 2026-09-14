/* ============================================================================
 * commands.js — COMMAND REGISTRY
 * Maps input strings -> async handler functions.
 * Only talks to data.js getters (never raw data), so the Django swap is safe.
 * Each handler receives (args, ctx) and returns an HTML string (or uses ctx).
 * ========================================================================== */

const COMMANDS = {};
function registerCommand(name, { desc, usage, fn }) {
  COMMANDS[name] = { desc, usage: usage || name, fn };
}
function commandNames() {
  return Object.keys(COMMANDS).sort();
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ------------------------------- commands ------------------------------ */

registerCommand("help", {
  desc: "list all available commands",
  usage: "help [command]",
  fn: async (args) => {
    if (args.length > 0) {
      const target = (COMMANDS[args[0]] && args[0]) || null;
      if (!target) return `<span class="error">no such command: ${esc(args[0])}</span>`;
      const c = COMMANDS[target];
      return `<div><span class="green bold">${esc(target)}</span> <span class="dim">— ${esc(c.desc)}</span></div>`
        + `<div class="dim">usage: <span class="green">${esc(c.usage || target)}</span></div>`;
    }
    const CATS = {
      "👤 About me": ["whoami", "about", "skills", "neofetch"],
      "📦 Projects": ["projects", "github"],
      "✉️ Get in touch": ["contact", "socials", "resume"],
      "⚙️ Terminal": ["help", "theme", "motd", "api", "echo", "date", "ls", "clear"],
    };
    const section = ([title, names]) =>
      `<div class="cyan bold">${title}</div><table class="kv">` + names
        .filter((n) => COMMANDS[n])
        .map((n) => `<tr><td><span class="run-cmd green bold" data-cmd="${esc(n)}">${esc(n)}</span></td><td class="dim">${esc(COMMANDS[n].desc)}</td></tr>`)
        .join("") + `</table>`;
    return `<div>Available commands — <span class="dim">click any of them to run it:</span></div>`
      + Object.entries(CATS).map(section).join("")
      + `<div class="dim">examples: <span class="run-cmd" data-cmd="projects rag">projects rag</span> · <span class="run-cmd" data-cmd="projects --top">projects --top</span> · <span class="run-cmd" data-cmd="help contact">help contact</span> · just type <span class="run-cmd" data-cmd="1">1</span>–<span class="run-cmd" data-cmd="5">5</span> for the quickstart</div>`;
  },
});

registerCommand("whoami", {
  desc: "who is this guy?",
  fn: async () => {
    const p = await getProfile();
    return `<div><span class="green bold">${esc(p.name)}</span> <span class="dim">aka</span> <span class="cyan">${esc(p.username)}</span></div>`
      + `<div>${esc(p.role)}</div><div class="dim">${esc(p.tagline)}</div>`;
  },
});

registerCommand("about", {
  desc: "bio, education & current focus",
  fn: async () => {
    const p = await getProfile();
    const bio = p.bio.map((b) => `<div>· ${esc(b)}</div>`).join("");
    return `<div class="cyan bold">about ${esc(p.username)}</div>${bio}`
      + `<div class="dim">education: ${esc(p.education)}</div>`
      + `<div class="dim">location: ${esc(p.location)}</div>`
      + `<div class="dim">fun_fact: ${esc(p.fun_fact)}</div>`;
  },
});

registerCommand("skills", {
  desc: "tech stack grouped by category",
  fn: async () => {
    const skills = await getSkills();
    return Object.entries(skills)
      .map(([cat, items]) =>
        `<div class="cyan bold">${esc(cat)}</div><div>${items.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>`
      ).join("");
  },
});

registerCommand("projects", {
  desc: "featured projects — filters, numbers or `projects <slug>`",
  usage: "projects [--featured] [--top] [--all] [--stack=X] [slug|number]",
  fn: async (args) => {
    let all = await getProjects();
    const flags = args.filter((a) => a.startsWith("--"));
    const rest = args.filter((a) => !a.startsWith("--"));

    if (flags.includes("--featured")) all = all.filter((p) => p.featured);
    if (flags.includes("--top")) all = [...all].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)).slice(0, 3);
    let stackArg = null;
    const stackEq = flags.find((f) => f.startsWith("--stack="));
    if (stackEq) stackArg = stackEq.slice("--stack=".length);
    const stackIdx = rest.indexOf("--stack");
    if (stackIdx !== -1 && rest[stackIdx + 1]) stackArg = rest.splice(stackIdx, 2)[1];
    if (stackArg) {
      const q = stackArg.toLowerCase();
      all = all.filter((p) => (p.stack || []).some((s) => s.toLowerCase().includes(q)));
      if (!all.length) return `<span class="error">no projects with stack matching "${esc(stackArg)}".</span> <span class="dim">try <span class="run-cmd" data-cmd="projects">projects</span> to see all.</span>`;
    }

    // Default view stays curated: featured first, topped up to 6.
    // `projects --all` (or any filter flag) shows everything.
    const showAll = flags.includes("--all");
    let display = all;
    let capped = 0;
    if (!showAll && !flags.includes("--featured") && !flags.includes("--top") && !stackArg) {
      const feat = all.filter((p) => p.featured);
      const restTop = all.filter((p) => !p.featured).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
      display = [...feat, ...restTop].slice(0, 6);
      capped = all.length - display.length;
    }

    if (rest.length > 0) {
      let p = null;
      if (/^\d+$/.test(rest[0])) {
        const i = parseInt(rest[0], 10) - 1;
        p = display[i] || null;
      } else {
        p = await getProject(rest[0]);
      }
      if (!p) {
        const slugs = all.map((x) => x.slug).join(", ");
        return `<span class="error">project not found: ${esc(rest[0])}</span><div class="dim">available: ${esc(slugs) || "none for this filter"}</div>`;
      }
      return `<div class="proj"><div class="proj-name">${esc(p.name)} ${p.featured ? '<span class="tag">featured</span>' : ""}</div>`
        + `<div>${esc(p.desc)}</div>`
        + `<div>${(p.stack || []).map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>`
        + `<div class="proj-meta">★ ${p.stars ?? 0} · <a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link)}</a></div></div>`;
    }
    const rows = display.map((p, i) =>
      `<div class="proj"><span class="dim">[${i + 1}]</span> <span class="run-cmd proj-name" data-cmd="projects ${esc(p.slug)}">${esc(p.name)}</span> <span class="dim">[${esc(p.slug)}]${p.featured ? " ★ featured" : ""}</span>`
      + `<div>${esc(p.desc)}</div><div class="proj-meta">${(p.stack || []).map(esc).join(" · ")}</div></div>`).join("");
    const head = capped > 0
      ? `<div class="cyan bold">featured projects <span class="dim">(${display.length} of ${all.length} — <span class="run-cmd" data-cmd="projects --all">show all</span>)</span></div>`
      : `<div class="cyan bold">projects (${display.length}) — <span class="dim">click a name or type its number/slug</span></div>`;
    return head + (rows || `<div class="dim">nothing matches this filter.</div>`)
      + `<div class="dim">filters: <span class="run-cmd" data-cmd="projects --featured">--featured</span> · <span class="run-cmd" data-cmd="projects --top">--top</span> · <span class="run-cmd" data-cmd="projects --all">--all</span> · <span class="green">--stack=django</span> &nbsp; e.g. <span class="run-cmd" data-cmd="projects 1">projects 1</span></div>`;
  },
});

registerCommand("socials", {
  desc: "github, telegram, email & more",
  fn: async () => {
    const socials = await getSocials();
    const rows = socials
      .map((s) => `<tr><td>${esc(s.label)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.value)}</a></td></tr>`)
      .join("");
    return `<table class="kv">${rows}</table>`;
  },
});

registerCommand("github", {
  desc: "open my github profile",
  fn: async () => {
    window.open("https://github.com/Soroush-Eghdami", "_blank", "noopener");
    return `<span class="success">opening</span> <a href="https://github.com/Soroush-Eghdami" target="_blank" rel="noopener">github.com/Soroush-Eghdami</a> in a new tab…`;
  },
});

registerCommand("resume", {
  desc: "download my resume (pdf)",
  fn: async () => {
    const url = await getResumeUrl();
    if (!url || url === "#") {
      return `<span class="yellow">resume.pdf not uploaded yet.</span><div class="dim">drop it at <span class="cyan">assets/resume.pdf</span> and update <span class="cyan">resumeUrl</span> in js/data.js</div>`;
    }
    window.open(url, "_blank", "noopener");
    return `<span class="success">downloading resume…</span> <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`;
  },
});

registerCommand("contact", {
  desc: "send me a message (guided: 3 steps + preview)",
  usage: "contact [--quick <name> <email> <message...>]",
  fn: async (args, ctx) => {
    const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const cancelled = `<span class="dim">contact cancelled — nothing sent. run <span class="green">contact</span> anytime to retry.</span>`;

    const askField = async (step, label, check, hint) => {
      for (;;) {
        const val = await ctx.prompt(`${step} ${label}${hint ? ` <span class="dim">${hint}</span>` : ""}`);
        if (val === null) return null;
        const err = check(val.trim());
        if (!err) return val.trim();
        ctx.print(`<span class="error">✕ ${esc(err)}</span> <span class="dim">try again (ESC cancels)</span>`);
      }
    };

    // --quick mode: `contact --quick Ada ada@mail.com hello there...`
    if (args[0] === "--quick" || args[0] === "-q") {
      const [, name = "", email = "", ...msgParts] = args;
      const message = msgParts.join(" ");
      const problems = [
        name.trim().length < 2 && "name needs 2+ characters",
        !EMAIL_RE.test(email.trim()) && "email looks invalid",
        message.trim().length < 10 && "message needs 10+ characters",
      ].filter(Boolean);
      if (problems.length) {
        return `<span class="error">quick send failed:</span> ${problems.map(esc).join("; ")}`
          + `<div class="dim">usage: <span class="green">contact --quick &lt;name&gt; &lt;email&gt; &lt;message…&gt;</span> — or just <span class="green">contact</span> for the guided flow</div>`;
      }
      return await send({ name: name.trim(), email: email.trim(), message: message.trim() });
    }

    ctx.print(`<div class="cyan bold">✉️ new message — 3 quick steps</div><div class="dim">ESC cancels at any point. nothing is sent until you confirm.</div>`);
    let name = await askField("[1/3]", "your name", (v) => (v.length < 2 ? "give me at least 2 characters" : ""));
    if (name === null) return cancelled;
    let email = await askField("[2/3]", "your email", (v) => (!EMAIL_RE.test(v) ? "that doesn't look like an email" : ""));
    if (email === null) return cancelled;
    let message = await askField("[3/3]", "your message", (v) => (v.length < 10 ? "a little longer please (10+ characters)" : ""), "(10+ chars)");
    if (message === null) return cancelled;

    // preview + confirm loop with per-field edit
    for (;;) {
      ctx.print(`<div class="cyan bold">— preview —</div><table class="kv">`
        + `<tr><td>from</td><td>${esc(name)} &lt;${esc(email)}&gt;</td></tr>`
        + `<tr><td>message</td><td>${esc(message)}</td></tr></table>`
        + `<div class="dim">send it? <span class="green">y</span> = send · <span class="green">edit name|email|message</span> · <span class="green">q</span> = discard</div>`);
      const ans = ((await ctx.prompt("send? [y/edit/q]")) || "").trim().toLowerCase();
      if (ans === null || ans === "q" || ans === "quit" || ans === "n") return cancelled;
      if (ans === "y" || ans === "yes" || ans === "send" || ans === "") {
        return await send({ name, email, message });
      }
      const m = ans.match(/^edit\s+(name|email|message)$/);
      if (m) {
        if (m[1] === "name") {
          const v = await askField("[1/3]", "your name", (x) => (x.length < 2 ? "give me at least 2 characters" : ""));
          if (v === null) return cancelled;
          name = v;
        } else if (m[1] === "email") {
          const v = await askField("[2/3]", "your email", (x) => (!EMAIL_RE.test(x) ? "that doesn't look like an email" : ""));
          if (v === null) return cancelled;
          email = v;
        } else {
          const v = await askField("[3/3]", "your message", (x) => (x.length < 10 ? "a little longer please (10+ characters)" : ""));
          if (v === null) return cancelled;
          message = v;
        }
        continue;
      }
      ctx.print(`<span class="dim">type <span class="green">y</span> to send, <span class="green">edit email</span> to fix a field, or <span class="green">q</span> to discard.</span>`);
    }

    async function send(form) {
      ctx.print(`<div class="dim">⏳ sending… please wait until you see the confirmation below — don't retype or close.</div>`);
      const result = await submitContact(form);
      if (result.ok && result.mode === "api") {
        return `<div><span class="success">✔ sent! thanks, ${esc(form.name)} — I'll get back to you at ${esc(form.email)}.</span></div>`
          + `<div class="dim">in a hurry? ping me on <a href="https://t.me/inairplanemode" target="_blank" rel="noopener">telegram</a> for a faster reply ⚡</div>`;
      }
      if (!result.ok && result.errors) {
        const errs = Object.entries(result.errors)
          .map(([f, msgs]) => `${esc(f)}: ${esc([].concat(msgs).join(", "))}`).join(" · ");
        return `<span class="error">server said no:</span> ${errs}<div class="dim">run <span class="green">contact</span> again to fix and resend.</div>`;
      }
      return `<div class="success">✔ saved locally, ${esc(form.name)} (backend offline — I'll still get it from the outbox).</div>`
        + `<div class="dim">in a hurry? direct: <a href="mailto:Soroush.egh@gmail.com">Soroush.egh@gmail.com</a> · <a href="https://t.me/inairplanemode" target="_blank" rel="noopener">telegram</a></div>`;
    }
  },
});

registerCommand("api", {
  desc: "backend connection: api [on|off|status]",
  usage: "api [on|off|status]",
  fn: async (args) => {
    const mode = (args[0] || "status").toLowerCase();
    const set = (on) => {
      BACKEND_CONFIG.USE_API = on;
      try { localStorage.setItem("portfolio_use_api", on ? "1" : "0"); } catch (_) { /* ignore */ }
      try { window.__setBackendStatus && window.__setBackendStatus(on); } catch (_) { /* ignore */ }
    };
    if (mode === "on") {
      set(true);
      return `<span class="success">✔ backend mode ON</span> <span class="dim">— data now comes from</span> <span class="cyan">${esc(BACKEND_CONFIG.API_BASE)}</span><div class="dim">run <span class="run-cmd" data-cmd="api status">api status</span> to check the connection, <span class="green">api off</span> to go static again.</div>`;
    }
    if (mode === "off") {
      set(false);
      return `<span class="dim">backend mode OFF — serving static content from js/data.js.</span>`;
    }
    // status: ping /api/meta/
    try {
      const res = await fetch(BACKEND_CONFIG.API_BASE + BACKEND_CONFIG.ENDPOINTS.meta, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const m = await res.json();
      const when = m.last_synced ? esc(new Date(m.last_synced).toLocaleString()) : "never (run sync_github)";
      return `<div><span class="success">● backend reachable</span> <span class="dim">at</span> <span class="cyan">${esc(BACKEND_CONFIG.API_BASE)}</span></div>`
        + `<table class="kv"><tr><td>mode</td><td>${BACKEND_CONFIG.USE_API ? "API (live)" : "static (run `api on` to switch)"}</td></tr>`
        + `<tr><td>projects</td><td>${esc(m.projects)}</td></tr><tr><td>github sync</td><td>${when}</td></tr></table>`;
    } catch (err) {
      return `<div><span class="error">● backend unreachable</span> <span class="dim">at</span> <span class="cyan">${esc(BACKEND_CONFIG.API_BASE)}</span> <span class="dim">(${esc(err.message)})</span></div>`
        + `<div class="dim">start it: <span class="green">cd backend && ..\\.venv\\Scripts\\python manage.py runserver</span> — then <span class="green">api on</span></div>`;
    }
  },
});

registerCommand("theme", {
  desc: "switch color theme",
  usage: "theme [green|amber|ice]",
  fn: async (args) => {
    const themes = ["green", "amber", "ice"];
    const cur = document.body.dataset.theme || "green";
    if (!args.length) {
      return `<div>themes: ${themes.map((t) => t === cur
        ? `<span class="green bold">${esc(t)} ●</span>`
        : `<span class="run-cmd" data-cmd="theme ${esc(t)}">${esc(t)}</span>`).join(" · ")}</div>`
        + `<div class="dim">usage: <span class="green">theme amber</span> — your pick is remembered</div>`;
    }
    const t = args[0].toLowerCase();
    if (!themes.includes(t)) {
      return `<span class="error">unknown theme: ${esc(args[0])}</span> <span class="dim">available: ${themes.join(", ")}</span>`;
    }
    document.body.dataset.theme = t;
    try { localStorage.setItem("portfolio_theme", t); } catch (_) { /* ignore */ }
    return `<span class="success">✔ theme → ${esc(t)}</span> <span class="dim">(saved for next visit)</span>`;
  },
});

registerCommand("motd", {
  desc: "message of the day (a useful tip)",
  fn: async () => {
    const tips = [
      `press <span class="green">tab</span> to autocomplete commands and project slugs`,
      `type just <span class="green">1</span>–<span class="green">5</span> to run the quickstart menu`,
      `misspell something? the terminal suggests what you meant`,
      `<span class="green">projects --top</span> shows the most-starred repos first`,
      `<span class="green">contact --quick Ada ada@mail.com hello!</span> skips the guided flow`,
      `<span class="green">ctrl+l</span> clears, <span class="green">↑/↓</span> browses history`,
      `everything clickable in here actually runs — try the <span class="green">help</span> list`,
    ];
    const i = Math.floor(Date.now() / 864e5) % tips.length;
    return `<div><span class="cyan bold">motd —</span> ${tips[i]}</div>`;
  },
});

registerCommand("neofetch", {
  desc: "system info, but make it me",
  fn: async () => {
    const p = await getProfile();
    const all = await getProjects();
    const rows = [
      ["user", `${p.username}@soroush.dev`],
      ["role", p.role],
      ["stack", "Python · Django · DRF · Docker · PostgreSQL"],
      ["focus", "RAG systems + backend architecture"],
      ["projects", `${all.length} repos (github.com/Soroush-Eghdami)`],
      ["uptime", "currently studying + building"],
      ["coffee", "critical — levels nominal"],
    ].map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
    return `<div class="green bold">◢◣ soroush-fetch ◢◣</div><table class="kv">${rows}</table>`;
  },
});

registerCommand("echo", {
  desc: "print text back",
  usage: "echo <text>",
  fn: async (args) => esc(args.join(" ")) || `<span class="dim">usage: echo &lt;text&gt;</span>`,
});

registerCommand("date", {
  desc: "current date/time",
  fn: async () => esc(new Date().toString()),
});

registerCommand("ls", {
  desc: "list fake filesystem",
  fn: async () => `<div>about.txt&nbsp;&nbsp;skills.json&nbsp;&nbsp;projects/&nbsp;&nbsp;socials.link&nbsp;&nbsp;resume.pdf&nbsp;&nbsp;<span class="dim">backend/ (coming soon)</span></div>`,
});

registerCommand("clear", {
  desc: "clear the terminal",
  fn: async (args, ctx) => {
    ctx.clear();
    return "";
  },
});

/* ------------------------------ easter eggs ---------------------------- */

registerCommand("sudo", {
  desc: "try it and see",
  usage: "sudo <anything>",
  fn: async (args) => {
    if (args.join(" ").toLowerCase().includes("sandwich")) {
      return `<div class="green">okay. 🥪 one sandwich, coming right up. (extra pickles, backend-dev fuel)</div>`;
    }
    return `<span class="error">visitor is not in the sudoers file.</span> <span class="dim">this incident will be reported… to /dev/null.</span>`;
  },
});

registerCommand("vim", {
  desc: "no.",
  fn: async () => `<span class="dim">you opened vim. you can never leave. (just kidding — type <span class="green">help</span>)</span>`,
});
registerCommand("exit", {
  desc: "there is no escape",
  fn: async () => `<span class="dim">there is no escape. this terminal is home now. try <span class="green">clear</span> for a fresh start.</span>`,
});
registerCommand("coffee", {
  desc: "essential fuel check",
  fn: async () => `<div>☕ brewing… <span class="success">done.</span> <span class="dim">fun_fact confirmed: needs_coffee() -&gt; True</span></div>`,
});
