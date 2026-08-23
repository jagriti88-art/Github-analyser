# GitGrade

Score any public GitHub repository against a transparent rubric, then let an LLM explain what to fix first.

Most "AI repo analysers" ask a language model for a number. Ask twice, get two different numbers. GitGrade splits the job in half: **a deterministic rubric produces the score**, and the LLM only explains and prioritises what the rubric already found. Every one of the 100 points traces back to a check you can read.

```
Score: 92/100 (A+)

Documentation             94%   ####################
Testing & Quality         90%   ##################
Activity & Maintenance    90%   ##################
Project Structure         87%   #################
Collaboration & Community 93%   ###################
Security & Hygiene       100%   ####################
```

---

## Features

**Rubric scoring** — 6 categories, 25 weighted checks, 100 points. Same repository in, same score out, every time.

**Grounded AI review** — the model receives the metrics *and* the computed rubric, then returns a verdict, strengths, weaknesses, a prioritised roadmap, and a "60-second recruiter read". It cannot invent a score.

**Deep file inspection** — reads the full recursive git tree, so it detects tests in `__tests__/`, `spec/`, `*_test.go`, CI workflows, linter configs, lockfiles, and accidentally committed secrets — not just root-level filenames.

**Repository comparison** — put two repos head to head and see which wins each category, on a dual-series radar chart.

**Leaderboard and history** — every analysis is persisted, so you get a ranked board, a recently-analysed list, and a score-over-time sparkline per repository.

**Embeddable badges** — `GET /api/badge/owner/repo.svg` renders a shields-style SVG you can paste into your own README.

**Shareable permalinks** — `/r/owner/repo` loads a stored analysis; falls back to a fresh run if the repo has never been graded.

**Report export** — download any analysis as Markdown or JSON, or copy the Markdown straight to your clipboard.

**Degrades gracefully** — no Groq key means you still get the full rubric score, just without the AI commentary. A failed AI call never fails the request.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19, Vite 7 | Fast HMR, minimal config |
| Routing | React Router 7 | Permalinks and multi-page navigation |
| Styling | Tailwind CSS 4 | Design tokens defined in `@theme`, no config file |
| Animation | Framer Motion | Score ring, radar, staggered reveals |
| Icons | lucide-react | Tree-shakeable SVG set |
| Backend | Node 22+, Express 5 | Native ESM, async error handling |
| Database | libSQL / SQLite | One client for a local file and hosted Turso |
| AI | Groq SDK | JSON-mode structured output |
| HTTP | Axios | Interceptable, good timeout support |
| Security | Helmet, express-rate-limit, CORS allowlist | |
| Tests | `node:test` | Built in — no Jest, no Vitest |

---

## Getting started

### Prerequisites

- **Node.js 22 or newer** (`node:sqlite` is not available before 22)
- A free [Groq API key](https://console.groq.com/keys) — optional, but you lose the AI review without it
- A [GitHub token](https://github.com/settings/tokens) — optional but strongly recommended

### Install

```bash
git clone <your-repo-url>
cd Github-analyser
npm install
npm run setup
```

`npm run setup` copies `.env.example` into place without overwriting an existing `.env`, then reports what still needs a value.

### Configure

Edit `server/.env`:

```ini
GROQ_API_KEY=gsk_...          # AI review; omit to run rubric-only
GITHUB_TOKEN=ghp_...          # 60 req/hour without this, 5000 with it
GROQ_MODEL=openai/gpt-oss-120b
PORT=5000
CORS_ORIGIN=http://localhost:5173
CACHE_TTL_SECONDS=600
DATABASE_FILE=./data/gitgrade.db
```

> **Why the GitHub token matters:** each analysis costs about 8 GitHub API calls. Unauthenticated, you get roughly 7 analyses per hour before you are rate limited.

### Run

```bash
npm run dev
```

| | |
| --- | --- |
| App | http://localhost:5173 |
| API | http://localhost:5000 |

Vite proxies `/api` to port 5000, so there is no CORS configuration to do in development.

### Other commands

| Command | Does |
| --- | --- |
| `npm run dev` | Both servers, colour-coded output |
| `npm run dev:server` | API only, with nodemon |
| `npm run dev:client` | Web app only |
| `npm test` | Server test suite |
| `npm run lint` | ESLint over the client |
| `npm run build` | Production build to `client/dist` |
| `npm start` | Run the API in production mode |

---

## How scoring works

Six categories, weighted to 100 points:

| Category | Points | Looks at |
| --- | --- | --- |
| Documentation | 22 | README presence, depth, required sections, description, topics |
| Testing & Quality | 20 | Test files, CI workflows, linter config, containerisation |
| Activity & Maintenance | 18 | Days since last push, commit volume, cadence, releases |
| Project Structure | 15 | Source directories, root tidiness, manifest + lockfile, size |
| Collaboration & Community | 15 | Stars (log-scaled), contributors, PR usage, license, contribution guide |
| Security & Hygiene | 10 | `.gitignore`, committed secrets, commit message quality |

Each check returns points earned, a `pass`/`partial`/`fail` status, and a plain-English reason. The UI shows all of them.

A few deliberate design decisions:

- **Stars are log-scaled.** Going from 0 to 10 stars says far more about a project than going from 900 to 1000.
- **Flat layouts are not penalised below 15 files.** A single-file utility does not need a `src/` directory.
- **Committed secrets zero out that check entirely.** No partial credit for leaking a `.env`.
- **Commit quality is measured, not guessed** — median subject length, share of low-effort messages, share of conventional-commit prefixes.

Grades: `A+` ≥ 90, `A` ≥ 80, `B` ≥ 70, `C` ≥ 60, `D` ≥ 45, `E` below.

---

## API

Base URL `http://localhost:5000`.

### `POST /api/analyze`

Full pipeline: fetch, score, AI review, persist.

```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"expressjs/express"}'
```

Accepts a full URL, `github.com/owner/repo`, `owner/repo`, an SSH URL, or a deep link like `.../tree/main/src`. Add `?refresh=1` to bypass the cache.

### `POST /api/compare`

Two repositories, side by side. Skips the AI call, so it is fast.

```bash
curl -X POST http://localhost:5000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"left":"expressjs/express","right":"fastify/fastify"}'
```

### `GET /api/repos/:owner/:repo`

The stored analysis, with its score timeline. `404` if never analysed.

### `GET /api/history?limit=12`

Most recently analysed repositories, one row each.

### `GET /api/leaderboard?limit=20`

Highest scoring repositories seen by this instance.

### `GET /api/stats`

`{ totalAnalyses, uniqueRepos, averageScore, bestScore }`

### `GET /api/badge/:owner/:repo.svg`

An embeddable SVG badge. Never returns an error page — an ungraded repo renders "not analysed".

```markdown
[![GitGrade](http://localhost:5000/api/badge/expressjs/express.svg)](http://localhost:5173/r/expressjs/express)
```

Supports `?style=flat-square`, `?label=...`, and `?analyse=1` to grade on demand.

### `GET /health`

Liveness plus whether a GitHub token and AI key are configured.

### Rate limits

| Route | Limit |
| --- | --- |
| `POST /api/analyze`, `POST /api/compare` | 12/minute per IP |
| Everything else | 120/minute per IP |

---

## Project structure

```
Github-analyser/
├── client/
│   └── src/
│       ├── components/     ScoreCard, RadarChart, CategoryBreakdown,
│       │                   ReviewPanel, ShareTools, RepoSummaryList, Layout
│       ├── pages/          Home, Compare, Leaderboard
│       ├── lib/            api.js, format.js, report.js
│       └── index.css       Tailwind theme tokens
├── server/
│   ├── src/
│   │   ├── services/       githubService, scoring, aiService,
│   │   │                   analysisService, badgeService
│   │   ├── routes/         REST endpoints
│   │   ├── db/             SQLite schema and prepared statements
│   │   ├── middleware/     Error handling
│   │   ├── utils/          URL parsing, TTL cache, typed errors
│   │   ├── app.js          Express wiring
│   │   └── config.js       Environment
│   ├── test/               node:test suites
│   └── index.js            Entry point
└── scripts/setup.js        First-run onboarding
```

### Request flow

```
Browser → POST /api/analyze
            ↓
        parseRepoUrl        normalise any GitHub URL form
            ↓
        TTL cache           10-minute hit? return immediately
            ↓
        githubService       8 parallel GitHub calls, core call required,
                            the rest degrade gracefully
            ↓
        scoring             pure function → 0-100 with an audit trail
            ↓
        aiService           Groq, JSON mode, grounded in the rubric
            ↓
        SQLite              persist for history, leaderboard, badges
            ↓
        JSON response
```

---

## Testing

```bash
npm test
```

27 tests covering URL parsing (9 accepted forms, 6 rejected), scoring bounds and determinism, category weights summing to 100, secret detection, and badge rendering including XML-injection escaping.

Network calls are not mocked — the tested units are pure by design.

---

## Deployment

The repository is configured for **Vercel**, which serves the SPA and runs the API as a
serverless function on the same domain — so requests are same-origin and CORS never engages.

`api/index.js` exports the same Express app that `server/index.js` runs locally; only the
lifecycle differs.

### Database

Vercel's filesystem is read-only, so file-based SQLite cannot be used in production. The
data layer talks **libSQL**, which speaks SQLite either way:

| Environment | `TURSO_DATABASE_URL` | Storage |
| --- | --- | --- |
| Local | unset | `./data/gitgrade.db` file |
| Vercel | set | [Turso](https://turso.tech), over HTTP |

The schema is created on demand and memoised per instance, so cold starts do not re-run it.

### Steps

1. Create a free Turso database and copy its URL and auth token.
2. Import the repository on Vercel — the root `vercel.json` supplies the build and routing.
3. Set these environment variables in the Vercel project:

   ```
   GROQ_API_KEY         GITHUB_TOKEN
   TURSO_DATABASE_URL   TURSO_AUTH_TOKEN
   ```

   `CORS_ORIGIN` and `VITE_API_BASE_URL` are not needed — everything is same-origin.
4. Deploy.

### Serverless caveats

- The in-memory TTL cache and rate limiter are per-instance, so both are less effective than
  on a long-running server. Turso still prevents redundant GitHub calls for stored repositories.
- Analysis can take 15–30 seconds, so the function is configured with `maxDuration: 60`.

### Other hosts

Any platform that runs a long-lived Node process works unchanged — leave `TURSO_DATABASE_URL`
unset, point `DATABASE_FILE` at a persistent volume, and set `CORS_ORIGIN` plus
`VITE_API_BASE_URL` since the two origins will differ. Serve the SPA with a catch-all rewrite
to `index.html`, or `/r/owner/repo` will 404 on refresh.

---

## Limitations

- **Public repositories only.** Private repos would need OAuth.
- **Commit analysis samples the 100 most recent commits** on the default branch.
- **Very large repositories may truncate** — GitHub caps the recursive tree API, flagged as `files.truncated`.
- **The rubric encodes opinions.** A research script and a production service are judged by the same yardstick, and that is not always fair. Scores are a conversation starter, not a verdict.

---

## License

MIT
