/* ============================================================================
 * data.js — CONTENT LAYER (static now, backend-ready later)
 * ----------------------------------------------------------------------------
 * Everything the terminal renders comes through the async getters below.
 * commands.js NEVER touches `_STATIC` directly — only these functions.
 *
 * TO PLUG IN DJANGO LATER (no rewrite needed):
 *   1. Set `USE_API = true` and `API_BASE = "http://127.0.0.1:8000/api"`.
 *   2. Implement the Django endpoints listed in ENDPOINTS (see backend/README).
 *   3. Done — the getters already try fetch() first and fall back to static.
 * ========================================================================== */

const BACKEND_CONFIG = {
  USE_API: false, // <-- flip to true when Django is running (or run `api on` in the terminal)
  API_BASE: "http://127.0.0.1:8000/api",
  ENDPOINTS: {
    profile: "/profile/",
    skills: "/skills/",
    projects: "/projects/",
    socials: "/socials/",
    contact: "/contact/", // POST {name, email, message}
    meta: "/meta/",
  },
};

// Auto-enable: ?api=1 / ?api=0 in the URL overrides, remembered in localStorage.
try {
  const q = new URLSearchParams(location.search);
  if (q.has("api")) {
    BACKEND_CONFIG.USE_API = q.get("api") !== "0";
    localStorage.setItem("portfolio_use_api", BACKEND_CONFIG.USE_API ? "1" : "0");
  } else if (localStorage.getItem("portfolio_use_api") === "1") {
    BACKEND_CONFIG.USE_API = true;
  }
} catch (_) { /* file:// or private mode — stay static */ }

const _STATIC = {
  profile: {
    name: "Soroush Eghdami",
    username: "soroush",
    role: "Python Backend Developer",
    tagline: "Django · REST APIs · Docker · AI-powered RAG systems",
    location: "404: Location Not Found",
    education: "Computer Engineering (Operating Systems, Computer Vision)",
    bio: [
      "Backend developer building real-world systems with Python, Django and REST APIs.",
      "Currently exploring AI/ML — RAG (Retrieval-Augmented Generation) systems and backend architecture.",
      "Studying Computer Engineering. Open to collaborating on impactful, well-engineered projects.",
    ],
    fun_fact: "needs_coffee() -> always True",
  },

  skills: {
    "Languages & Frameworks": ["Python", "Django", "Django REST Framework", "Flask", "JavaScript", "TypeScript", "C++", "Bash"],
    "Databases & Caching": ["PostgreSQL", "MongoDB", "MySQL", "Redis", "SQLite"],
    "DevOps & Tools": ["Docker", "Git", "Linux", "Postman", "Nginx (basics)", "CI/CD (basics)"],
    "AI / ML": ["RAG systems", "LangChain (basics)", "Transformers", "Groq API", "scikit-learn (spam classifier)"],
  },

  // slug = short id used by `projects <slug>`
  projects: [
    {
      slug: "rag",
      name: "R.A.G",
      desc: "Local, private RAG app for law students — upload cases, ask questions, get cited answers. CLI + web UI.",
      stack: ["Python", "RAG", "LLM", "Vector DB"],
      link: "https://github.com/Soroush-Eghdami/R.A.G",
      stars: 3,
      featured: true,
    },
    {
      slug: "tweeter",
      name: "Tweeter_Demo",
      desc: "Full-stack Twitter clone with Docker support and real-time features.",
      stack: ["TypeScript", "Django/DRF", "Docker", "Realtime"],
      link: "https://github.com/Soroush-Eghdami/Tweeter_Demo",
      stars: 5,
      featured: true,
    },
    {
      slug: "shop",
      name: "Online-shop-CBV",
      desc: "Full-featured Django e-commerce demo — clean class-based-view architecture, ready to deploy.",
      stack: ["Python", "Django", "CBV", "PostgreSQL"],
      link: "https://github.com/Soroush-Eghdami/Online-shop-CBV",
      stars: 2,
      featured: true,
    },
    {
      slug: "summerizer",
      name: "Summerizer",
      desc: "Modern Flask web app that summarizes text, PDFs and audio using transformer models + Groq API.",
      stack: ["Python", "Flask", "Transformers", "Groq API"],
      link: "https://github.com/Soroush-Eghdami/Summerizer",
      stars: 5,
      featured: true,
    },
    {
      slug: "spam",
      name: "Spam-classifire",
      desc: "ML-based spam classifier — predicts whether an email is spam using a trained model.",
      stack: ["Python", "scikit-learn", "Jupyter"],
      link: "https://github.com/Soroush-Eghdami/Spam-classifire",
      stars: 2,
      featured: false,
    },
    {
      slug: "organizer",
      name: "Organizer",
      desc: "Python file/task organizer utility — keep your filesystem and workflow tidy.",
      stack: ["Python", "CLI"],
      link: "https://github.com/Soroush-Eghdami/Organizer",
      stars: 1,
      featured: false,
    },
    {
      slug: "yt",
      name: "YT-Downloader",
      desc: "Simple YouTube downloader with a UI.",
      stack: ["Python", "UI"],
      link: "https://github.com/Soroush-Eghdami/YT-Downloader",
      stars: 0,
      featured: false,
    },
  ],

  socials: [
    { label: "GitHub", value: "Soroush-Eghdami", url: "https://github.com/Soroush-Eghdami" },
    { label: "Email", value: "Soroush.egh@gmail.com", url: "mailto:Soroush.egh@gmail.com" },
    { label: "Telegram", value: "@inairplanemode", url: "https://t.me/inairplanemode" },
    { label: "X / Twitter", value: "@Tha_Dead_Sheep", url: "https://twitter.com/Tha_Dead_Sheep" },
    { label: "Instagram", value: "@soroush_eghdami_", url: "https://www.instagram.com/soroush_eghdami_/" },
    { label: "Bluesky", value: "sorousheghdami.bsky.social", url: "https://bsky.app/profile/sorousheghdami.bsky.social" },
  ],

  resumeUrl: "#", // TODO: drop your PDF at assets/resume.pdf and change to "assets/resume.pdf"
};

/* ------------------------- internal fetch helper ------------------------ */

async function _fetchJson(path) {
  if (!BACKEND_CONFIG.USE_API) return null;
  try {
    const res = await fetch(BACKEND_CONFIG.API_BASE + path, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.warn("[data] API unreachable, using static fallback:", err.message);
    return null;
  }
}

/* ------------------------- public async getters -------------------------
 * Keep these async FOREVER — commands.js awaits them, so when they become
 * real fetch() calls later, nothing else changes.                              */

async function getProfile() {
  return (await _fetchJson(BACKEND_CONFIG.ENDPOINTS.profile)) || _STATIC.profile;
}

async function getSkills() {
  return (await _fetchJson(BACKEND_CONFIG.ENDPOINTS.skills)) || _STATIC.skills;
}

async function getProjects() {
  const remote = await _fetchJson(BACKEND_CONFIG.ENDPOINTS.projects);
  return remote || _STATIC.projects;
}

async function getProject(query) {
  const all = await getProjects();
  const q = String(query || "").toLowerCase();
  return all.find((p) => p.slug === q || p.name.toLowerCase() === q) || null;
}

async function getSocials() {
  return (await _fetchJson(BACKEND_CONFIG.ENDPOINTS.socials)) || _STATIC.socials;
}

async function getResumeUrl() {
  const profile = await getProfile();
  return profile.resumeUrl || _STATIC.resumeUrl;
}

/**
 * Submit the contact form. Static mode: queued locally (localStorage).
 * Backend mode: POSTs to Django (/api/contact/) and falls back to queue
 * if the server is unreachable.
 */
async function submitContact({ name, email, message }) {
  const payload = { name, email, message, at: new Date().toISOString() };

  if (BACKEND_CONFIG.USE_API) {
    try {
      const res = await fetch(BACKEND_CONFIG.API_BASE + BACKEND_CONFIG.ENDPOINTS.contact, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 400 && body && body.errors) {
        return { ok: false, mode: "api", errors: body.errors }; // validation — don't queue
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      return { ok: true, mode: "api", data: body };
    } catch (err) {
      if (err && err.message && err.message.startsWith("HTTP")) {
        return { ok: false, mode: "api", errors: { detail: ["Server error — try again in a bit."] } };
      }
      console.warn("[data] contact API unreachable, queueing locally:", err.message);
    }
  }

  try {
    const key = "portfolio_contact_queue";
    const queue = JSON.parse(localStorage.getItem(key) || "[]");
    queue.push(payload);
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (_) {
    /* private mode — ignore */
  }
  return { ok: true, mode: "local" };
}
