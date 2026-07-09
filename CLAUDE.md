# AI短剧工坊 (AI Drama Studio)

AI-powered short drama script generation platform — public web app with user auth, credit system, and manual payment via WeChat.

---

## Tech Stack

- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 (via @tailwindcss/vite)
- **Backend**: Express 5 (ESM) + sql.js (pure JS SQLite)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **AI**: DeepSeek API via OpenAI SDK (`openai` npm package)
- **Deploy**: Railway (Nixpacks builder) + Railway Volume for DB persistence
- **Node**: >= 20.19.0

---

## Project Structure

```
ai-drama-studio/
├── server/                  # Backend (Express 5 ESM)
│   ├── index.js             # Entry: routes, DeepSeek client, static files
│   ├── auth.js              # JWT + bcrypt middleware
│   ├── store.js             # sql.js DB layer (users CRUD)
│   └── prompt.js            # AI prompt templates (framework/episode)
├── src/                     # Frontend (React 19)
│   ├── App.jsx              # Main app: auth state, routing, generate flow
│   ├── main.jsx             # Entry
│   ├── index.css            # Tailwind + custom .bg-film background
│   ├── components/
│   │   ├── Header.jsx       # Nav bar with hamburger menu (mobile)
│   │   ├── LoginPage.jsx    # Login/register
│   │   ├── GeneratorForm.jsx # Input form (genre, theme, episodes, etc.)
│   │   ├── LoadingState.jsx  # Generation progress (framework/episodes)
│   │   ├── ScriptResult.jsx  # Result viewer with tabs + retry button
│   │   ├── EpisodeList.jsx  # Episode accordion list
│   │   ├── EpisodeDetail.jsx # Single episode content viewer
│   │   ├── DramaOverview.jsx # Title, logline, genre overview
│   │   ├── CharacterCards.jsx # Character display
│   │   ├── KeyLines.jsx     # Highlight quotes
│   │   ├── TOPUpPage.jsx   # WeChat QR payment page
│   │   ├── HistoryList.jsx  # Saved scripts list with continue button
│   │   ├── AdminPage.jsx    # Admin: add/reduce credits, delete user
│   │   ├── HeroSection.jsx  # Landing hero
│   │   ├── Features.jsx     # Feature cards
│   │   └── Footer.jsx       # Footer
│   └── utils/
│       ├── auth.js          # localStorage auth: login/register/authFetch
│       ├── api.js           # API calls: generateFramework, generateEpisode
│       ├── export.js        # Copy all / download TXT
│       └── history.js       # localStorage history CRUD
├── public/
│   ├── wechat-qr.jpg        # WeChat payment QR code
│   ├── favicon.svg
│   └── icons.svg
├── data/                    # sql.js database file (gitignored)
│   └── app.db
├── dist/                    # Vite build output (gitignored)
├── railway.json             # Railway deploy config
├── vite.config.js           # Vite + React + Tailwind + API proxy
├── .env.example             # Environment template
├── start.bat                # Windows double-click launcher
└── package.json             # Dependencies & scripts
```

---

## Key Architecture

### Generation Flow (two-phase)
1. **Framework phase**: Call `/api/generate/framework` — gets title, characters, episode summaries. Deducts credit if enough remaining.
2. **Episode phase**: Call `/api/generate/episode` per episode — generates detailed content (dialogue + scenes). **One credit deducted per successful episode**. Auto-retries up to 3 times on failure.
3. Each episode success → `saveToHistory()` in localStorage for crash recovery.
4. Incomplete scripts (from stop/crash) can be resumed from History with `handleContinueGenerate`.

### Credit System
```js
remaining = max(0, 10 + paidExtraEpisodes - totalEpisodes)
```
- 10 free episodes per user
- `paidExtraEpisodes` incremented by admin via `/api/admin/add-episodes`
- `totalEpisodes` incremented each time a user generates (1 per episode in the new per-episode deduction mode)
- Admin can reduce remaining via `/api/admin/reduce-episodes` (deducts from `paidExtraEpisodes`)

### Database (sql.js)
- Pure JS SQLite, no native modules → works on Railway without build tools
- DB file stored at `data/app.db`
- Railway Volume (`/app/data`) persists DB across redeploys
- `saveDb()` called after every write to flush to disk

### Authentication
- JWT token with 7-day expiry, stored in localStorage
- `authMiddleware` sets `req.user` from Bearer token
- `adminMiddleware` checks `req.user.isAdmin`
- First user to register as "admin" gets `isAdmin = true`

### DeepSeek API
- OpenAI-compatible SDK: `baseURL: 'https://api.deepseek.com'`
- Model: `deepseek-v4-flash` (env: `DEEPSEEK_MODEL`)
- Key: `DEEPSEEK_API_KEY` env var (falls back to `CLAUDE_API_KEY`)
- Framework: non-streaming `callDeepSeek()`, ~4000 max_tokens
- Episode: non-streaming, ~4000 max_tokens
- Legacy one-shot: streaming `streamDeepSeek()`

---

## Environment Variables (.env)

```env
DEEPSEEK_API_KEY=sk-your-key   # Required: DeepSeek API key
DEEPSEEK_MODEL=deepseek-v4-flash  # Optional: model name
PORT=3001                      # Optional: server port (default 3001)
```

---

## Commands

```bash
# Development (two terminals)
npm run dev          # Vite dev server (frontend, :5173)
npm run dev:server   # Express backend (:3001)

# Production
npm run build        # Build frontend to dist/
npm start            # Serve frontend + API on :3001

# Lint
npm run lint         # oxlint

# Double-click (Windows)
start.bat            # Installs deps, starts backend + Vite dev
```

---

## Railway Deploy

- `railway.json`: Nixpacks builder, `npm run build` then `node server/index.js`
- Must add `DEEPSEEK_API_KEY` env var in Railway dashboard
- Must add Railway Volume mounted at `/app/data` for DB persistence
- Automatically deploys on push to GitHub `main` branch

---

## Conventions

- **ESM everywhere** (`"type": "module"` in package.json)
- **Express 5** — use `app.get('/{*path}')` for SPA fallback (Express 5 wildcard syntax, NOT `app.get('*')`)
- **Tailwind CSS v4** — uses `@import "tailwindcss"` syntax, `@theme` directive for custom colors (no `tailwind.config.js`)
- **Chinese UI text** — all labels, errors, prompts are in Chinese (targeting Chinese users)
- **Error handling**: all routes wrapped in try/catch; global `uncaughtException` / `unhandledRejection` handlers
- **Component state**: `loading`, `error`, `phase` (`framework`/`episodes`/`complete`/`incomplete`), `progress`, `failedEpisodes`
- **AbortController** pattern: each generation creates an AbortController, stored in `abortRef`, used by stop button

---

## Key Patterns to Maintain

| Pattern | Where | Why |
|---------|-------|-----|
| Per-episode credit deduction | `server/index.js:390-410` | Stop/crash only charges for generated episodes |
| Auto-retry 3x with backoff | `src/App.jsx:148-181` | Handle network fluctuations |
| saveToHistory on each episode | `src/App.jsx:174` | Crash recovery — reopen page and continue |
| Auth header via authFetch | `src/utils/auth.js:35-47` | Auto-attaches JWT Bearer token |
| JSON extraction from AI | `server/index.js:325,362` | `text.match(/\{[\s\S]*\}/)` handles markdown-wrapped JSON |
| Lightweight framework payload | `src/utils/api.js:54-63` | Only send summaries, not full content, to avoid token limit |
| Film-style .bg-film background | `src/index.css:21-57` | Dark warm gradient + film perforation texture |
