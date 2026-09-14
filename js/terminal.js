// Terminal core: input, history, completion, rendering. No content here.
(function () {
  "use strict";

  const outputEl = document.getElementById("output");
  const termEl = document.getElementById("terminal");
  const typedEl = document.getElementById("typed");
  const hiddenInput = document.getElementById("hidden-input");
  const windowEl = document.getElementById("terminal-window");

  const PROMPT_HTML =
    '<span class="prompt"><span class="user">visitor</span><span class="at">@</span>' +
    '<span class="host">soroush.dev</span><span class="colon">:</span>' +
    '<span class="path">~</span><span class="dollar">$</span></span>';

  window.BANNER_HTML =
    '<div class="banner">███████╗ ██████╗ ██████╗  ██████╗ ██╗   ██╗███████╗██╗  ██╗\n' +
    '██╔════╝██╔═══██╗██╔══██╗██╔═══██╗██║   ██║██╔════╝██║  ██║\n' +
    '███████╗██║   ██║██████╔╝██║   ██║██║   ██║███████╗███████║\n' +
    '╚════██║██║   ██║██╔══██╗██║   ██║██║   ██║╚════██║██╔══██║\n' +
    '███████║╚██████╔╝██║  ██║╚██████╔╝╚██████╔╝███████║██║  ██║\n' +
    '╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝</div>' +
    '<div><span class="green bold">Soroush Eghdami</span> <span class="dim">— Python Backend Developer · Django · REST APIs · Docker · RAG</span></div>' +
    '<div class="dim">type <span class="run-cmd" data-cmd="help">help</span> to see commands, or pick a number:</div>' +
    '<div class="quick-menu"><span class="run-cmd" data-cmd="1">[1] whoami</span>  <span class="run-cmd" data-cmd="2">[2] projects</span>  <span class="run-cmd" data-cmd="3">[3] skills</span>  <span class="run-cmd" data-cmd="4">[4] contact</span>  <span class="run-cmd" data-cmd="5">[5] socials</span></div>';

  let buffer = "";
  let history = [];
  let historyIdx = -1;
  let busy = false; // true while awaiting command / interactive prompt
  let promptQueue = null; // {resolve} for ctx.prompt()

  function scrollBottom() {
    termEl.scrollTop = termEl.scrollHeight;
  }

  function print(html, cls) {
    const div = document.createElement("div");
    div.className = "line " + (cls || "");
    div.innerHTML = html;
    outputEl.appendChild(div);
    scrollBottom();
    return div;
  }

  function echoCommand(raw) {
    print(`${PROMPT_HTML}&nbsp;<span class="cmd-echo">${escapeHtml(raw)}</span>`);
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function renderBuffer() {
    typedEl.textContent = buffer;
    syncHidden();
    scrollBottom();
  }

  function syncHidden() {
    hiddenInput.value = buffer;
  }

  function clear() {
    outputEl.innerHTML = "";
    print(window.BANNER_HTML); // every fresh screen starts at the banner
  }

  function parse(raw) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    return { name: (parts[0] || "").toLowerCase(), args: parts.slice(1) };
  }
  const ALIASES = {
    h: "help", "?": "help", cls: "clear",
    cv: "resume", mail: "contact", email: "contact",
    gh: "github", repos: "projects", repo: "projects",
    aboutme: "about", "about-me": "about",
    quit: "exit", logout: "exit",
  };
  // Matches the quickstart menu printed under the banner.
  const MENU_NUMBERS = { 1: "whoami", 2: "projects", 3: "skills", 4: "contact", 5: "socials" };

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      let cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  function didYouMean(name) {
    let best = null, bestD = 3;
    for (const n of commandNames()) {
      const d = levenshtein(name, n);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  async function run(raw) {
    const input = raw.trim();
    if (!input) return;
    echoCommand(input);
    history.push(input);
    historyIdx = history.length;

    let { name, args } = parse(input);
    if (MENU_NUMBERS[name] && args.length === 0) {
      name = MENU_NUMBERS[name]; // quickstart: "1".."5"
      print(`<span class="dim">→ running</span> <span class="green">${escapeHtml(name)}</span>`);
    } else if (ALIASES[name]) {
      name = ALIASES[name];
    }
    const cmd = COMMANDS[name];

    if (!cmd) {
      const guess = didYouMean(name);
      print(`<span class="error">command not found:</span> ${escapeHtml(name)}`
        + (guess
          ? ` <span class="dim">— did you mean</span> <span class="run-cmd green bold" data-cmd="${escapeHtml(guess)}">${escapeHtml(guess)}</span><span class="dim">? (click it or press ↑ then edit)</span>`
          : ` <span class="dim">— type</span> <span class="green">help</span>`));
      return;
    }

    busy = true;
    try {
      const ctx = { clear, prompt: ask, print, echo: print };
      const out = await cmd.fn(args, ctx);
      if (out) print(out);
    } catch (err) {
      console.error(err);
      print(`<span class="error">error running ${escapeHtml(name)}: ${escapeHtml(err.message)}</span>`);
    } finally {
      busy = false;
      renderBuffer();
      focusInput();
    }
  }

  // `contact` prompts resolve here; null = cancelled with ESC.
  function ask(question) {
    return new Promise((resolve) => {
      promptQueue = { resolve, question };
      print(`<span class="cyan">?</span> ${escapeHtml(question)} <span class="dim">(esc to cancel)</span>`);
      buffer = "";
      renderBuffer();
      focusInput();
    });
  }

  function complete() {
    const { name, args } = parse(buffer);
    // complete command name
    if (args.length === 0 && !/\s$/.test(buffer) && buffer.length) {
      const hits = commandNames().filter((n) => n.startsWith(name));
      if (hits.length === 1) {
        buffer = hits[0] + " ";
        renderBuffer();
      } else if (hits.length > 1) {
        print(`<span class="dim">${hits.join("   ")}</span>`);
      }
      return;
    }
    // complete `projects <slug>`
    if (name === "projects") {
      getProjects().then((all) => {
        const frag = (args[args.length - 1] || "").toLowerCase();
        const hits = all.map((p) => p.slug).filter((s) => s.startsWith(frag));
        if (hits.length === 1) {
          buffer = "projects " + hits[0];
          renderBuffer();
        } else if (hits.length > 1) {
          print(`<span class="dim">${hits.join("   ")}</span>`);
        }
      });
    }
  }

  function focusInput() {
    // keep hidden input focused for mobile keyboards; harmless on desktop
    try { hiddenInput.focus({ preventScroll: true }); } catch (_) { hiddenInput.focus(); }
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      clear();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      if (promptQueue) {
        const q = promptQueue;
        promptQueue = null;
        buffer = "";
        renderBuffer();
        print(`<span class="dim">^C — cancelled</span>`);
        q.resolve(null);
        busy = false;
      } else {
        echoCommand(buffer + "^C");
        buffer = "";
        renderBuffer();
      }
      return;
    }

    // interactive prompt mode: route keys to the pending question
    if (promptQueue) {
      if (e.key === "Escape") {
        const q = promptQueue;
        promptQueue = null;
        buffer = "";
        renderBuffer();
        q.resolve(null);
        busy = false;
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const val = buffer.trim();
        echoCommand(val);
        const q = promptQueue;
        promptQueue = null;
        buffer = "";
        renderBuffer();
        q.resolve(val);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        buffer = buffer.slice(0, -1);
        renderBuffer();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        buffer += e.key;
        renderBuffer();
        return;
      }
      return;
    }

    if (busy) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const raw = buffer;
      buffer = "";
      renderBuffer();
      run(raw);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      buffer = buffer.slice(0, -1);
      renderBuffer();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length && historyIdx > 0) {
        historyIdx--;
        buffer = history[historyIdx];
        renderBuffer();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (history.length) {
        if (historyIdx < history.length - 1) {
          historyIdx++;
          buffer = history[historyIdx];
        } else {
          historyIdx = history.length;
          buffer = "";
        }
        renderBuffer();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Suppress the hidden input's native insert or every key types twice.
      e.preventDefault();
      buffer += e.key;
      renderBuffer();
    }
  });

  // Mobile/IME fallback: desktop keydown prevents native insert (see above),
  // but virtual keyboards bypass keydown, so sync from the input value here.
  hiddenInput.addEventListener("input", () => {
    if (busy && !promptQueue) return;
    if (hiddenInput.value === buffer) return; // already in sync, ignore echo
    buffer = hiddenInput.value;
    typedEl.textContent = buffer;
    scrollBottom();
  });

  // Click-to-run: .run-cmd elements execute their data-cmd.
  outputEl.addEventListener("click", (e) => {
    const el = e.target.closest(".run-cmd");
    if (!el || busy || promptQueue) return;
    e.stopPropagation();
    buffer = "";
    renderBuffer();
    run(el.dataset.cmd || el.textContent);
  });

  termEl.addEventListener("click", focusInput);
  windowEl.addEventListener("click", (e) => {
    if (e.target.closest("a,button")) return; // let links/buttons work
    focusInput();
  });

  document.querySelectorAll(".hint-cmd").forEach((btn) => {
    btn.addEventListener("click", () => {
      buffer = btn.dataset.cmd || "help";
      renderBuffer();
      const raw = buffer;
      buffer = "";
      renderBuffer();
      run(raw);
    });
  });

  try {
    const saved = localStorage.getItem("portfolio_theme");
    if (saved) document.body.dataset.theme = saved;
  } catch (_) { /* private mode — default theme */ }
  print(window.BANNER_HTML);
  renderBuffer();
  focusInput();

  // Titlebar pill: green "API - Online" vs dim "static".
  function setBackendStatus(online) {
    const pill = document.getElementById("backend-status");
    const label = document.getElementById("backend-status-text");
    if (!pill || !label) return;
    pill.classList.toggle("online", !!online);
    label.textContent = online ? "API - Online" : "static";
  }
  window.__setBackendStatus = setBackendStatus; // `api on|off` calls this

  // Auto-connect when the backend answers, else silent static fallback.
  // An explicit `api off` choice is always respected.
  (async () => {
    if (typeof BACKEND_CONFIG === "undefined") return;
    let explicitOff = false;
    try { explicitOff = localStorage.getItem("portfolio_use_api") === "0"; } catch (_) { /* ignore */ }
    if (explicitOff) {
      BACKEND_CONFIG.USE_API = false;
      setBackendStatus(false);
      return;
    }
    const base = BACKEND_CONFIG.API_BASE;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 3000);
      const res = await fetch(base + (BACKEND_CONFIG.ENDPOINTS.meta || "/meta/"), {
        headers: { Accept: "application/json" },
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      BACKEND_CONFIG.USE_API = true;
      try { localStorage.setItem("portfolio_use_api", "1"); } catch (_) { /* ignore */ }
      setBackendStatus(true);
    } catch (_) {
      BACKEND_CONFIG.USE_API = false; // silent fallback to static
      setBackendStatus(false);
    }
  })();
})();
