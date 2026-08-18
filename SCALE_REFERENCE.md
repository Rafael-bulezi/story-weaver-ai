# 🏗️ LoreWeave / Story Canvas — Future Scale Reference

> **Purpose:** This document is the single source of truth for all architectural
> and scaling decisions. Every feature, refactor, and infrastructure choice should
> be evaluated against the milestones defined here. The goal is to serve
> **millions of concurrent users** with sub-second interactions.
>
> **Convention:** Each section states the **Current State**, what to do at
> **Phase 1 (1–10K users)**, **Phase 2 (10K–100K)**, and **Phase 3 (100K–1M+)**.
> Items marked ✅ are already implemented. Items marked 🔲 are deferred.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Storage & Persistence](#2-data-storage--persistence)
3. [AI / LLM Layer](#3-ai--llm-layer)
4. [Image Generation & Media](#4-image-generation--media)
5. [Authentication & User Management](#5-authentication--user-management)
6. [API Layer & Backend](#6-api-layer--backend)
7. [Real-Time & Collaboration](#7-real-time--collaboration)
8. [Caching Strategy](#8-caching-strategy)
9. [CDN & Static Assets](#9-cdn--static-assets)
10. [Performance & Bundle Optimization](#10-performance--bundle-optimization)
11. [Error Handling & Observability](#11-error-handling--observability)
12. [Security](#12-security)
13. [Testing Strategy](#13-testing-strategy)
14. [DevOps & CI/CD](#14-devops--cicd)
15. [Monetization & Rate Limiting](#15-monetization--rate-limiting)
16. [Mobile & Cross-Platform](#16-mobile--cross-platform)
17. [Data Export & Portability](#17-data-export--portability)
18. [Accessibility (a11y)](#18-accessibility-a11y)
19. [Internationalization (i18n)](#19-internationalization-i18n)
20. [Decision Log](#20-decision-log)

---

## 1. Architecture Overview

### Current State ✅
```
Browser (SPA)
  ├── React 19 + TanStack Router (client-side routing)
  ├── Tailwind CSS v4 (styling)
  ├── localStorage (all data)
  ├── Groq API (AI, direct from browser)
  └── Pollinations.ai (image gen, direct URL)
```

### Phase 1 — Local-First with Sync (1–10K users)
```
Browser (SPA)
  ├── React 19 + TanStack Router
  ├── IndexedDB via Dexie.js (replaces localStorage)
  ├── Optional: Supabase / Firebase for cloud sync
  ├── Backend Proxy (Edge Function) → Groq API
  └── Image CDN (Cloudflare R2 / S3)
```

### Phase 2 — Full Backend (10K–100K)
```
Browser (SPA) ──── API Gateway ──── Microservices
                      │                ├── Auth Service
                      │                ├── Book Service (CRUD)
                      │                ├── AI Proxy Service
                      │                ├── Image Service
                      │                └── Export Service
                      │
                    PostgreSQL + Redis + S3
```

### Phase 3 — Planetary Scale (100K–1M+)
```
Browser / Mobile / Desktop
   │
   CDN (Cloudflare / Vercel Edge)
   │
   Load Balancer
   │
   ├── API Cluster (auto-scaling containers)
   ├── AI Queue (Bull / BullMQ + workers)
   ├── WebSocket Cluster (real-time collab)
   ├── PostgreSQL (read replicas, partitioned)
   ├── Redis Cluster (sessions, cache, rate limits)
   ├── Object Storage (S3/R2 for images, exports)
   └── Search Index (Meilisearch / Typesense)
```

---

## 2. Data Storage & Persistence

### Current State ✅
- **Engine:** `localStorage` via `story-store.ts`
- **Key:** `sc:books:v4` — stores ALL books as a single JSON blob
- **Limit:** ~5–10 MB per origin (browser-dependent)
- **Risk:** Data loss on cache clear, no cross-device sync, no multi-tab safety

### Immediate Improvements (implement now) 🔲
```typescript
// 1. DEBOUNCED WRITES — prevent excessive localStorage writes
//    Currently every keystroke triggers JSON.stringify of the entire books array.
//    Add a 300ms debounce to the `write()` function in story-store.ts:
//
//    let writeTimer: ReturnType<typeof setTimeout>;
//    function debouncedWrite<T>(key: string, val: T) {
//      clearTimeout(writeTimer);
//      writeTimer = setTimeout(() => write(key, val), 300);
//    }

// 2. PER-BOOK STORAGE — split the single blob into per-book keys
//    Key pattern: `sc:book:<bookId>` instead of one giant `sc:books:v4`
//    This prevents the entire library from being serialized on every edit.
//    Migration: on first load, read sc:books:v4, split into per-book keys, delete old key.

// 3. STORAGE QUOTA CHECK — warn users before they hit the limit
//    if (navigator.storage && navigator.storage.estimate) {
//      const { usage, quota } = await navigator.storage.estimate();
//      if (usage / quota > 0.8) showWarning("Storage nearly full — export your books!");
//    }
```

### Phase 1 — IndexedDB (Dexie.js)
- Replace localStorage with **IndexedDB** via [Dexie.js](https://dexie.org/)
- Structured tables: `books`, `chapters`, `lore`, `cores`, `brainstorm`, `attachments`
- Each entity gets its own row → no more serializing the entire library
- Supports **100s of MBs** vs localStorage's ~5MB
- Enables offline-first with optional cloud sync via [Dexie Cloud](https://dexie.org/cloud/)
- **Migration path:** On app load, check for `sc:books:v4` in localStorage → import into IndexedDB → delete localStorage key

```typescript
// Proposed Dexie schema (Phase 1):
// db.version(1).stores({
//   books: 'id, name, updatedAt',
//   chapters: 'id, bookId, type, savedAt',
//   lore: 'id, bookId, type, name',
//   cores: 'id, bookId, title',
//   coreBlocks: 'id, coreId',
//   coreAttachments: 'id, coreId',
//   brainstorm: 'id, bookId, createdAt',
// });
```

### Phase 2 — PostgreSQL
- **Primary DB:** PostgreSQL (Supabase, Neon, or self-hosted)
- Tables mirror Dexie schema with proper foreign keys, indexes, and RLS policies
- **Conflict resolution:** Last-write-wins with vector clocks for collaborative editing
- Full-text search with `tsvector` columns on chapter content
- Row-Level Security (RLS) for multi-tenant isolation

### Phase 3 — Distributed
- Read replicas for geographic distribution
- Table partitioning by `user_id` for even data distribution
- CQRS pattern: separate read/write models for high-throughput
- Event sourcing for chapter edit history (every keystroke → event log → snapshot)

---

## 3. AI / LLM Layer

### Current State ✅
- **Provider:** Groq (via OpenAI-compatible API)
- **Model:** `llama-3.3-70b-versatile`
- **Call pattern:** Direct browser → Groq API (API key exposed in env vars, loaded client-side)
- **Location:** `src/lib/ai.functions.ts`

### CRITICAL Security Issue ⚠️
```
The API key is currently in VITE_GROQ_API_KEY which gets bundled into
the client-side JavaScript. Anyone can open DevTools → Sources and
extract it. This is acceptable for local development ONLY.

BEFORE any public deployment, the AI call MUST go through a backend proxy.
```

### Phase 1 — Backend Proxy
```typescript
// Deploy an edge function (Vercel, Cloudflare Workers, or Supabase Edge):
//
// export default async function handler(req: Request) {
//   const { mode, action, context, userPrompt } = await req.json();
//   const userId = await authenticate(req);       // validate session
//   await checkRateLimit(userId);                  // 20 req/min free tier
//   await deductCredits(userId, estimateTokens()); // if paid
//
//   const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.GROQ_API_KEY}`,  // server-side only
//     },
//     body: JSON.stringify({ model, messages, temperature, max_tokens }),
//   });
//
//   return new Response(res.body, { headers: { "Content-Type": "application/json" } });
// }
```

### Phase 1 — Streaming Responses
```typescript
// Current: await full response → display
// Better: stream tokens as they arrive for instant feedback
//
// In ai.functions.ts, add:
//   stream: true
// to the request body, then use ReadableStream to parse SSE chunks:
//
// const reader = res.body.getReader();
// const decoder = new TextDecoder();
// while (true) {
//   const { done, value } = await reader.read();
//   if (done) break;
//   const chunk = decoder.decode(value);
//   // Parse SSE: data: {"choices":[{"delta":{"content":"..."}}]}
//   onToken(parsedContent);
// }
```

### Phase 2 — Multi-Provider Routing
- Abstract the AI layer behind an interface:
  ```typescript
  interface AIProvider {
    id: string;
    name: string;
    chat(messages: Message[], opts: ChatOpts): AsyncIterable<string>;
    models: string[];
  }
  ```
- Support: Groq, OpenAI, Anthropic, Google Gemini, local Ollama
- User picks provider + model in settings
- **Fallback chain:** If primary provider fails (rate limit, outage), auto-retry with secondary

### Phase 2 — Context Window Management
```typescript
// Current: The entire book context is sent with every request.
// At scale, books can be 50K+ words → exceeds context window.
//
// Implement a context budget system:
// 1. Count tokens (use tiktoken-lite or approximation: words * 1.3)
// 2. Priority ranking: Cores > Selected Lore > Recent Brainstorm > Chapter excerpt
// 3. Truncate lowest-priority items first
// 4. For very large books: use embeddings + vector search to pull only relevant context
//
// const MAX_CONTEXT_TOKENS = 6000;  // leave room for system + response
// function buildBudgetedContext(book: Book, query: string): string {
//   // 1. Always include cores (highest priority)
//   // 2. Embed + vector-search lore items by relevance to query
//   // 3. Include only the current paragraph + surrounding 2 paragraphs
//   // 4. Include last 3 brainstorm messages
// }
```

### Phase 3 — AI Queue System
- Replace synchronous API calls with a job queue (BullMQ / AWS SQS)
- User submits request → gets job ID → polls for result (or receives via WebSocket)
- Enables: retry logic, priority queues (paid users first), cost tracking, audit logs
- Background jobs: auto-summarize chapters, generate lore suggestions, consistency checks

---

## 4. Image Generation & Media

### Current State ✅
- **Provider:** Pollinations.ai (free, no API key)
- **Method:** Direct URL embedding in `<img>` tags (no fetch, avoids CORS)
- **Storage:** URL string stored as `dataUrl` field (not actual base64)
- **Commented code:** Base64 fetch+convert preserved for future use

### Phase 1 — Server-Side Generation + CDN Storage
```
User Request → Backend Proxy → Pollinations / Replicate / DALL-E
                    ↓
              Generate Image
                    ↓
              Upload to S3 / Cloudflare R2
                    ↓
              Return CDN URL to client
                    ↓
              Store CDN URL in database
```
- **Why:** Pollinations URLs are ephemeral — they may change or expire. CDN URLs are permanent.
- **Uncomment** the base64 fetch code in `image.functions.ts` and run it server-side.
- Store the permanent CDN URL in the database, not the generation URL.

### Phase 2 — Image Pipeline
- **Thumbnails:** Auto-generate 64px, 256px, 512px variants on upload
- **Lazy loading:** Use `loading="lazy"` and `srcset` for responsive images
- **Format:** Convert all images to WebP (30% smaller than PNG)
- **Quota:** 50 images/book free tier, unlimited paid
- **Content moderation:** Run generated images through a safety classifier before storing

### Phase 3 — Advanced
- **Image editing:** In-app crop, filter, and annotation tools
- **Style consistency:** Fine-tune a LoRA on the user's uploaded art style → all generated images match
- **Batch generation:** "Generate portraits for all characters" → queue job

---

## 5. Authentication & User Management

### Current State ✅
- **Auth:** None. All data is anonymous, stored in the browser.
- **Identity:** No user accounts.

### Phase 1 — Basic Auth (Supabase / Firebase)
```typescript
// Supabase Auth (recommended — free tier is generous):
// - Email + password
// - Google OAuth
// - Magic link (passwordless email)
// - Row-Level Security ties data to auth.uid()
//
// Implementation:
// 1. npm install @supabase/supabase-js
// 2. Create AuthContext provider wrapping the app
// 3. Protect routes: redirect unauthenticated users to /login
// 4. Associate all books with user_id in the database
// 5. Migration: on first login, import localStorage books into the user's account
```

### Phase 2 — Teams & Sharing
- **Workspaces:** A user can create workspaces, invite collaborators
- **Roles:** Owner, Editor, Viewer
- **Sharing:** Generate a read-only link to share a book publicly
- **Permissions:** Per-book access control (who can edit which book)

### Phase 3 — Enterprise
- SSO (SAML / OIDC) for organizations
- Audit logs (who changed what, when)
- Admin dashboard for organization-wide settings
- GDPR/CCPA compliance: data export, account deletion, data residency

---

## 6. API Layer & Backend

### Current State ✅
- No backend. Everything runs client-side.

### Phase 1 — Edge Functions
- **Platform:** Vercel Edge Functions, Cloudflare Workers, or Supabase Edge Functions
- **Endpoints needed:**
  - `POST /api/ai/chat` — proxied AI calls (hides API key)
  - `POST /api/ai/image` — proxied image generation
  - `GET/POST /api/books` — CRUD (once we add a database)
  - `POST /api/export` — generate EPUB/PDF server-side
- **Why edge:** Sub-50ms cold starts, runs close to the user globally

### Phase 2 — API Gateway
- Rate limiting per user (token bucket algorithm)
- Request validation (zod schemas, same as client)
- API versioning: `/api/v1/`, `/api/v2/`
- OpenAPI/Swagger documentation
- Webhook support for integrations

### Phase 3 — Microservices
- Split into independent services: Auth, Books, AI, Media, Export, Search
- Inter-service communication via message queue (NATS, RabbitMQ)
- Independent scaling (AI service needs 10x the compute of Books service)
- Circuit breakers for fault tolerance

---

## 7. Real-Time & Collaboration

### Current State ✅
- Single-user, single-tab. No sync.

### Phase 1 — Multi-Tab Sync
```typescript
// Use BroadcastChannel API (free, no server needed):
// const channel = new BroadcastChannel('story-canvas');
// channel.onmessage = (e) => {
//   if (e.data.type === 'BOOK_UPDATED') reloadBook(e.data.bookId);
// };
// // After every write:
// channel.postMessage({ type: 'BOOK_UPDATED', bookId });
```

### Phase 2 — Real-Time Collaboration
- **Technology:** Yjs + WebSocket provider (or Supabase Realtime)
- **Scope:** Chapter editor gets real-time cursors and conflict-free merging (CRDT)
- **Presence:** See who's online, which chapter they're editing
- **Brainstorm:** Shared AI brainstorm sessions

### Phase 3 — Operational Transform at Scale
- Custom OT/CRDT engine optimized for narrative text
- Offline-first with automatic conflict resolution on reconnect
- Comment threads on specific text ranges (like Google Docs)
- Version history with visual diff

---

## 8. Caching Strategy

### Current State ✅
- No caching layer. Every read hits localStorage directly.

### Phase 1 — Client-Side Caching
```typescript
// React Query (TanStack Query) is already a dependency.
// Use it for:
// - Caching AI responses (same prompt → same result for 5 min)
// - Optimistic updates on book edits
// - Background refetching when tab regains focus
//
// const { data } = useQuery({
//   queryKey: ['book', bookId],
//   queryFn: () => fetchBook(bookId),
//   staleTime: 5 * 60 * 1000,  // 5 minutes
// });
```

### Phase 2 — Server-Side Caching
- **Redis** for:
  - Session storage (replaces JWT-only auth)
  - AI response cache (hash of prompt → cached response, TTL 1 hour)
  - Rate limit counters (sliding window)
  - Hot book metadata (frequently accessed books)
- **HTTP caching:** `Cache-Control` headers on static assets and read-only API responses

### Phase 3 — Multi-Layer Cache
```
Browser Cache → Service Worker Cache → CDN Edge Cache → Redis → Database
```
- Service Worker for offline support (cache API responses, serve stale while revalidating)
- CDN caching for public/shared books
- Database query cache (prepared statements, materialized views)

---

## 9. CDN & Static Assets

### Current State ✅
- Vite dev server serves everything locally.

### Phase 1 — Deploy to Edge
- **Platform:** Vercel, Cloudflare Pages, or Netlify
- Static SPA bundle → CDN edge nodes worldwide
- Automatic HTTPS, HTTP/2, Brotli compression
- `_headers` file for security headers (CSP, HSTS, X-Frame-Options)

### Phase 2 — Asset Optimization
- Font subsetting (only ship the glyphs actually used)
- Image optimization pipeline (Sharp / Cloudflare Image Resizing)
- Preload critical assets: `<link rel="preload" href="font.woff2" as="font">`
- Long-term caching with content-hash filenames (Vite does this by default)

---

## 10. Performance & Bundle Optimization

### Current State ✅
- Single bundle, no code splitting.
- All components loaded eagerly.

### Immediate Improvements (implement now)
```typescript
// 1. ROUTE-BASED CODE SPLITTING — already supported by TanStack Router
//    In routeTree, use lazy routes:
//    const storyRoute = createRoute({
//      path: '/story/$bookId',
//      component: lazyRouteComponent(() => import('./routes/story')),
//    });

// 2. VIRTUALIZED LISTS — for books with 100s of lore items or chapters
//    npm install @tanstack/react-virtual
//    Renders only visible items, O(1) DOM nodes regardless of list size.

// 3. MEMO HEAVY COMPONENTS — wrap ChatTab, LoreTab, CoresTab in React.memo()
//    to prevent re-renders when sibling tabs change.
```

### Phase 1 — Bundle Analysis
- Add `rollup-plugin-visualizer` to Vite config
- Target: < 200KB gzipped initial bundle
- Lazy-load: Recharts (heavy), date-fns (tree-shake), cmdk

### Phase 2 — Web Workers
- Move AI context building (`buildBookContext`) to a Web Worker
- Heavy text processing (word count, lore extraction parsing) off main thread
- Prevents UI jank during large book operations

### Phase 3 — WASM
- Text diffing (for version history) in Rust/WASM for 10x speed
- Local AI inference via WebLLM / ONNX Runtime Web for offline mode

---

## 11. Error Handling & Observability

### Current State ✅
- `reportLovableError` → `console.error` (stub)
- No error tracking, no analytics, no logging.

### Phase 1 — Error Tracking
```typescript
// Replace the stub in lovable-error-reporting.ts with Sentry:
// npm install @sentry/react
//
// Sentry.init({
//   dsn: process.env.VITE_SENTRY_DSN,
//   integrations: [Sentry.browserTracingIntegration()],
//   tracesSampleRate: 0.1,  // 10% of transactions
//   environment: import.meta.env.MODE,
// });
//
// export function reportError(error: unknown, context: Record<string, unknown> = {}) {
//   console.error("[Story Canvas]", error, context);
//   Sentry.captureException(error, { extra: context });
// }
```

### Phase 1 — Analytics
- **Privacy-first:** Plausible or PostHog (self-hostable)
- Track: books created, AI calls made, chapters saved, export count
- **No PII** in analytics events

### Phase 2 — Backend Observability
- Structured logging (JSON logs) via Pino or Winston
- Distributed tracing (OpenTelemetry)
- Dashboards: Grafana + Prometheus for API latency, error rates, AI costs
- Alerting: PagerDuty/Slack for error rate spikes

---

## 12. Security

### Current State ✅
- API key in client-side env var (DEVELOPMENT ONLY)
- No CSP headers
- No input sanitization beyond what React provides

### Immediate Improvements (implement now)
```typescript
// 1. ADD .env.local TO .gitignore (if not already)
//    echo ".env.local" >> .gitignore

// 2. SANITIZE AI RESPONSES — AI output is rendered as markdown/HTML
//    Use DOMPurify before inserting any AI-generated content:
//    npm install dompurify
//    import DOMPurify from 'dompurify';
//    const clean = DOMPurify.sanitize(aiResponse);

// 3. VALIDATE ALL INPUTS — the zod schemas in ai.functions.ts are good,
//    make sure they're used everywhere (they currently are ✅)
```

### Phase 1 — Security Headers
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' image.pollinations.ai data: blob:; connect-src 'self' api.groq.com;
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Phase 2 — Backend Security
- Move ALL API keys to server-side environment variables
- Rate limiting (per-user, per-IP)
- CSRF protection on mutation endpoints
- SQL injection prevention (parameterized queries only)
- Dependency scanning (npm audit, Snyk)
- Regular penetration testing

### Phase 3 — Compliance
- SOC 2 Type II certification
- GDPR compliance (data processing agreements, right to deletion)
- Data encryption at rest (AES-256) and in transit (TLS 1.3)
- Key rotation policies
- Bug bounty program

---

## 13. Testing Strategy

### Current State ✅
- No tests.

### Phase 1 — Foundation
```bash
# Unit tests for pure logic:
# - story-store.ts (migration, import lore parsing, context building)
# - ai.functions.ts (request formatting, error handling)
# Framework: Vitest (already compatible with Vite)
#
# npm install -D vitest @testing-library/react @testing-library/jest-dom

# E2E smoke test:
# - App loads
# - Create a book
# - Type in editor
# - Save chapter
# Framework: Playwright
#
# npm install -D @playwright/test
```

### Phase 2 — Comprehensive
- Component tests for all UI components (Testing Library)
- Integration tests for API endpoints
- AI response mocking for deterministic tests
- Visual regression tests (Chromatic / Percy)
- Performance benchmarks (Lighthouse CI in pipeline)

### Phase 3 — At Scale
- Load testing (k6 / Artillery): simulate 10K concurrent users
- Chaos engineering: randomly kill services, verify graceful degradation
- Canary deployments: roll out to 1% of users first, monitor errors
- A/B testing framework for UI experiments

---

## 14. DevOps & CI/CD

### Current State ✅
- Manual `npm run dev` locally. No CI/CD.

### Phase 1 — Basic Pipeline
```yaml
# GitHub Actions example:
# .github/workflows/ci.yml
# name: CI
# on: [push, pull_request]
# jobs:
#   build:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - uses: actions/setup-node@v4
#         with: { node-version: 20 }
#       - run: npm ci
#       - run: npm run build
#       - run: npx vitest run
#       - run: npx playwright test
```

### Phase 2 — Preview Deployments
- Every PR gets a preview URL (Vercel/Netlify do this automatically)
- Lighthouse score check in CI (fail if performance < 90)
- Bundle size check (fail if > 250KB gzipped)
- Automated dependency updates (Renovate / Dependabot)

### Phase 3 — Production Operations
- Blue/green deployments
- Database migration automation (Prisma Migrate / Drizzle Kit)
- Infrastructure as Code (Terraform / Pulumi)
- Multi-region deployment with geo-routing
- Automated rollback on error rate spike

---

## 15. Monetization & Rate Limiting

### Current State ✅
- Free, no limits, no accounts.

### Phase 1 — Freemium Model
```
Free Tier:
  - 3 books
  - 50 AI calls/day
  - 20 image generations/day
  - LocalStorage only (no cloud sync)

Pro Tier ($9/month):
  - Unlimited books
  - 500 AI calls/day
  - 100 image generations/day
  - Cloud sync + backup
  - Priority AI (faster model, higher token limit)
  - Export to EPUB/PDF

Team Tier ($19/user/month):
  - Everything in Pro
  - Real-time collaboration
  - Shared world-building workspaces
  - Admin controls
```

### Implementation — Token Bucket Rate Limiter
```typescript
// Redis-based rate limiter (server-side):
// class RateLimiter {
//   constructor(
//     private redis: Redis,
//     private key: string,
//     private maxTokens: number,
//     private refillRate: number, // tokens per second
//   ) {}
//
//   async consume(tokens: number = 1): Promise<boolean> {
//     const now = Date.now();
//     const bucket = await this.redis.get(this.key);
//     // ... token bucket algorithm
//   }
// }
```

---

## 16. Mobile & Cross-Platform

### Current State ✅
- Responsive web app (works on mobile browsers but not optimized)

### Phase 1 — PWA
```json
// Add a manifest.json and service worker:
// {
//   "name": "Story Canvas",
//   "short_name": "StoryCanvas",
//   "start_url": "/",
//   "display": "standalone",
//   "theme_color": "#1a1a2e",
//   "background_color": "#0f0f1a",
//   "icons": [...]
// }
```
- Installable on mobile home screens
- Offline support via service worker caching
- Push notifications for collaboration updates

### Phase 2 — Native Wrapper
- **Capacitor** or **Tauri** for app store distribution
- Native file system access for local book storage
- System-level keyboard shortcuts
- Native share sheet integration

### Phase 3 — Native Apps
- React Native or Flutter for true native mobile experience
- Desktop app via Tauri (Rust backend, tiny binary)
- Apple Pencil / stylus support for handwritten notes on lore

---

## 17. Data Export & Portability

### Current State ✅
- No export functionality.

### Phase 1 — Basic Export
```typescript
// Export formats:
// 1. JSON — full book data (lore, cores, chapters, brainstorm)
// 2. Markdown — chapters as .md files in a zip
// 3. Plain Text — just the chapter content
//
// function exportBookAsJSON(book: Book): Blob {
//   return new Blob([JSON.stringify(book, null, 2)], { type: 'application/json' });
// }
//
// function exportBookAsMarkdown(book: Book): Blob {
//   const chapters = book.chapters.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n---\n\n');
//   return new Blob([chapters], { type: 'text/markdown' });
// }
```

### Phase 2 — Rich Export
- **EPUB** generation (server-side, with cover image and ToC)
- **PDF** generation (via Puppeteer or WeasyPrint)
- **Scrivener** import/export (.scriv format)
- **Google Docs** integration (export as Google Doc)
- Scheduled auto-backup to Google Drive / Dropbox

### Phase 3 — Publishing Pipeline
- Direct submission to KDP (Amazon), Draft2Digital, IngramSpark
- Formatting presets for print (6x9, 5.5x8.5)
- ISBN management
- Cover design tool integration

---

## 18. Accessibility (a11y)

### Current State ✅
- Basic — Radix UI components provide some a11y out of the box

### Immediate Improvements (implement now)
```
1. Ensure all interactive elements have visible focus indicators
2. Add aria-labels to icon-only buttons (e.g., the brainstorm mode buttons)
3. Ensure color contrast ratio ≥ 4.5:1 for all text
4. Add skip-to-content link
5. Test with keyboard-only navigation
```

### Phase 1 — Full Compliance
- WCAG 2.1 AA compliance audit
- Screen reader testing (NVDA, VoiceOver)
- Reduced motion support: `prefers-reduced-motion` media query
- High contrast mode support
- Alt text for all generated images

---

## 19. Internationalization (i18n)

### Current State ✅
- English only. All strings hardcoded.

### Phase 1 — Extract Strings
```typescript
// Use react-intl or i18next:
// npm install react-i18next i18next
//
// Extract all user-facing strings to locale files:
// /locales/en.json: { "brainstorm.send": "Send", "lore.add": "Add Lore Item" }
// /locales/es.json: { "brainstorm.send": "Enviar", "lore.add": "Añadir Elemento" }
//
// AI responses are already in the user's language (LLMs handle this naturally)
// but system prompts should be localized for best results.
```

### Phase 2 — RTL Support
- Arabic, Hebrew, Farsi support
- CSS logical properties (`margin-inline-start` instead of `margin-left`)
- Bidirectional text handling in the editor

---

## 20. Decision Log

All major architectural decisions should be logged here with rationale.

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2025-07-11 | Use Groq as AI provider | Free tier, fast inference, OpenAI-compatible API | ✅ Active |
| 2025-07-11 | Use Pollinations.ai for images | Free, no API key, direct URL embedding | ✅ Active |
| 2025-07-11 | Strip Lovable.dev dependencies | Platform lock-in, SSR breaks SPA, proprietary API keys | ✅ Done |
| 2025-07-11 | Keep localStorage for MVP | Simplest possible storage, no backend needed | ✅ Active |
| 2025-07-11 | Direct browser → API calls | No backend proxy yet, acceptable for local dev | ⚠️ Dev only |
| TBD | Migrate to IndexedDB | localStorage ~5MB limit, no structured queries | 🔲 Phase 1 |
| TBD | Add authentication | Required before any cloud features | 🔲 Phase 1 |
| TBD | Deploy backend proxy | Required before public deployment (hides API keys) | 🔲 Phase 1 |
| TBD | Add streaming AI responses | Better UX, shows tokens as they arrive | 🔲 Phase 1 |
| TBD | PostgreSQL migration | Structured data, RLS, full-text search | 🔲 Phase 2 |
| TBD | Real-time collaboration | WebSocket + CRDT for shared editing | 🔲 Phase 2 |

---

> **How to use this document:**
> 1. Before building any new feature, check which phase it belongs to
> 2. Implement Phase 1 items first — they have the highest impact-to-effort ratio
> 3. Never skip security items (Section 12) regardless of phase
> 4. Update the Decision Log when making architectural choices
> 5. Review this document quarterly and adjust phases based on actual user growth
