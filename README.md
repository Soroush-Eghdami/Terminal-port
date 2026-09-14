# portfolio-terminal — Soroush Eghdami

Terminal-style backend-developer portfolio. **Static by default, Django-backed when you want it.**

```
portfolio-terminal/
├── index.html
├── css/terminal.css
├── js/
│   ├── data.js      # content layer — static now, fetch() when backend is on
│   ├── commands.js  # whoami, about, skills, projects, contact, …
│   └── terminal.js  # input, history, tab-complete, click-to-run
├── assets/          # put resume.pdf here
├── backend/         # Django + DRF API (profile/skills/projects/socials/contact)
└── .venv/           # python venv (gitignored)
```

## Run it (static, no backend needed)

```powershell
python -m http.server 8001
# → http://127.0.0.1:8001
```

## Run it with the backend

```powershell
# terminal 1 — API on :8000
.\.venv\Scripts\python backend\manage.py runserver
# terminal 2 — frontend on :8001
python -m http.server 8001 --directory .
```

The terminal auto-connects when the backend answers (titlebar shows
**API - Online**); otherwise it silently serves static content.
`api status` shows connection health + last GitHub sync, `api off` forces
static mode. You can also force live mode with `http://127.0.0.1:8001?api=1`.

First-time backend setup:

```powershell
.\.venv\Scripts\python backend\manage.py migrate
.\.venv\Scripts\python backend\manage.py seed_static   # offline starter data
.\.venv\Scripts\python backend\manage.py sync_github   # live GitHub data (needs net; GITHUB_TOKEN optional)
```

Contact mail: fill Gmail + app password in `backend/.env`
(`CONTACT_RECIPIENT_EMAIL` gets every message). Without them, mail prints to
console — messages are still saved to the DB either way.

## Commands

`help [command]` · `whoami` · `about` · `skills` · `projects [--featured] [--top] [--all] [--stack=X] [slug|number]` ·
`socials` · `github` · `resume` · `contact [--quick …]` · `api [on|off|status]` ·
`theme [green|amber|ice]` · `motd` · `neofetch` · `echo` · `date` · `ls` ·
`clear` · easter eggs: `sudo`, `vim`, `exit`, `coffee`

Aliases: `cv`→`resume`, `mail`→`contact`, `gh`→`github`, `h`→`help`, … plus
quickstart numbers `1`–`5` and did-you-mean suggestions.
