# DevEther Technical AS-IS Report

## 1. Scope and Method
This report is based on direct inspection of the current monorepo implementation across backend, frontend, and shared packages.

Primary evidence sources:
- artifacts/api-server/src/index.ts
- artifacts/api-server/src/app.ts
- artifacts/api-server/src/lib/riftManager.ts
- artifacts/api-server/src/lib/socketHandler.ts
- artifacts/devether/src/pages/Landing.tsx
- artifacts/devether/src/pages/Rift.tsx
- artifacts/devether/src/hooks/use-socket.ts
- lib/api-spec/openapi.yaml
- lib/api-client-react/src/generated/api.ts
- lib/api-zod/src/generated/api.ts
- lib/db/src/index.ts

---

## 2. Executive AS-IS Summary
DevEther is an ephemeral, real-time discussion platform with:
- REST APIs for room discovery and join.
- Socket.io for live interaction and event-driven room state.
- In-memory room/session/message lifecycle on the backend.
- A highly animated React/Vite frontend optimized for transient conversation UX.
- Shared API contracts generated from OpenAPI into both React Query client hooks and Zod server validators.

Current core characteristic: the platform is intentionally non-persistent at runtime for rift activity. When backend process memory is lost or restarted, active rifts/messages are lost by design.

---

## 3. Monorepo and Build Architecture
Workspace is pnpm-based with applications and shared libraries.

### Root Structure
- artifacts/api-server: Node/Express + Socket.io backend
- artifacts/devether: React + Vite frontend
- lib/api-spec: OpenAPI source
- lib/api-client-react: generated React Query client
- lib/api-zod: generated runtime validators/types
- lib/db: Drizzle/PG integration scaffolding

### Build/Typecheck Flow
- Root build script chains typechecking and recursive package builds.
- Backend uses esbuild for bundled ESM output.
- Frontend uses Vite, outputting static assets into artifacts/devether/dist/public.
- Backend serves frontend static assets when build output exists.

---

## 4. Backend AS-IS (API + Realtime)

### 4.1 Process and Server Topology
- Single Node process hosts both HTTP (Express) and Socket.io.
- Socket handlers are registered during startup.
- Socket path is /socket.io.

### 4.2 HTTP Layer
- API mounted at /api.
- Endpoints:
  - GET /api/healthz
  - GET /api/rifts
  - POST /api/rifts/join
- CORS allowlist is environment-controlled via CORS_ORIGINS.
- Security headers are applied globally; CSP is enabled in production.
- Global error middleware returns HTTP 500 JSON payload.
- Static SPA fallback serves frontend index.html for non-API routes in production-style deployments.

### 4.3 Rift Domain Model and Lifecycle
All core runtime state is maintained in memory via a Map of rifts.

#### Key constraints and timings
- Rift duration: 5 minutes
- Max users per rift: 8
- Chaos mode threshold: temperature >= 75
- Message fade/expiry behavior changes in chaos mode
- Fragment expiry: 90 seconds
- Ghost trail expiry: 30 seconds

#### Core entities
- RiftUser
- Message
- Fragment
- GhostTrail
- Rift

#### Behavioral mechanics
- findOrCreateRift:
  - Reuses by riftId if viable
  - Else matches existing by topic/capacity
  - Else creates a new rift
- Quantum rifts:
  - Public topic initially masked
  - Actual prompt selected from predefined quantum topics
- addMessage:
  - Blocks radio/ghost users from posting
  - Applies simple sentiment scoring
  - Updates user vibe score and momentum
  - Updates room temperature and chaos mode
  - Computes room vibe color
  - Enforces in-memory message cap trimming
- Fragment flow:
  - User drops fragment
  - Another user can complete it
  - Completion turns into full message
- Burst mode:
  - One-time per user per rift enforced server-side
- Ghost mode:
  - User remains in room but hidden as active speaker

### 4.4 Socket Event Contract
#### Client -> Server
- join-rift
- send-message
- drop-fragment
- complete-fragment
- typing-start
- typing-stop
- ghost-mode

#### Server -> Client
- rift-state
- new-message
- message-decay
- message-faded
- user-joined
- user-left
- user-updated
- user-vibe-update
- typing-update
- vibe-update
- echo-moment
- new-fragment
- fragment-completed
- fragment-expired
- ghost-trail
- catalyst-drop
- rift-closing
- last-word-gambit
- rift-closed
- rift-error

### 4.5 Time-Based Scheduling
Per-rift schedule includes:
- 60-second closing warning
- 30-second last-word event
- hard close at expiry
- periodic catalyst drops (randomized interval)

Message-level timers emit staged decay events followed by final fade removal.

---

## 5. Frontend AS-IS (Web App)

### 5.1 App Shell, Routing, Session
- React entrypoint mounts app to root.
- Routes:
  - /
  - /rift/:id
  - fallback not-found route
- On browser hard reload, persisted session user is cleared.

### 5.2 Landing Experience
- Uses generated React Query hooks:
  - useListRifts
  - useJoinRift
- Polls rift list every 5 seconds.
- Join/create flow stores session payload in sessionStorage:
  - userId
  - username
  - color
  - riftId
  - isRadio
- Supports join modes:
  - participate
  - radio (listen-only)
- Supports predefined topics, custom topics, and quantum room creation.
- Includes interactive constellation canvas for visual room discovery and click-to-join.

### 5.3 Rift Experience
- Restores session from sessionStorage and validates route/rift alignment.
- Connects realtime channel via useSocketRift.
- Renders:
  - NeuralBackground
  - RiftHUD
  - FloatingInput
  - MessageOrb stream
  - FragmentOrbs
  - EchoMomentEffect
  - GhostTrailDisplay
  - CatalystDrop
  - LastWordGambit
  - ConversationMomentum
- On rift close:
  - shows implosion/collapse overlay
  - removes session
  - redirects user back to landing after delay

### 5.4 Realtime Hook Layer
The custom socket hook manages:
- Connection and reconnection
- Bootstrap state hydration from rift-state
- Incremental event updates for messages/users/fragments/vibe
- Countdown maintenance
- Error surface handling via socketError
- Emit APIs:
  - sendMessage
  - setTyping
  - toggleGhostMode
  - dropFragment
  - completeFragment

Also includes lightweight Web Audio and vibration cues for interaction feedback.

### 5.5 UI and Visual System
- Styling stack:
  - Tailwind CSS v4
  - Custom utility classes
  - Motion/animations via Framer Motion
- Visual language:
  - dark neon/cyberpunk palette
  - custom font set (Inter, JetBrains Mono, Orbitron)
  - glassmorphism and glow effects
- Message rendering:
  - drift/fade orbital behavior
  - decay stages with visual degradation
  - triple-backtick code blocks parsed and rendered in styled block component

---

## 6. Shared Contracts and Data Layer AS-IS

### 6.1 OpenAPI Source of Truth
OpenAPI 3.1 spec defines HTTP contract:
- /healthz
- /rifts
- /rifts/join

### 6.2 Generated Client and Validators
- lib/api-client-react: generated React Query hooks and request helpers
- lib/api-zod: generated Zod schemas used by backend route validation/serialization

This creates a mostly consistent REST contract between server and frontend.

### 6.3 Database Package Status
- lib/db enforces DATABASE_URL and exports configured Drizzle + pg pool.
- Current schema file is placeholder (no actual tables/models exported).

Conclusion:
- Persistent database infrastructure is scaffolded but not actively used for core rift runtime state.

---

## 7. End-to-End Runtime Data Flow (AS-IS)
1. User opens landing page.
2. Frontend calls GET /api/rifts and refreshes periodically.
3. User joins/creates via POST /api/rifts/join.
4. Frontend stores session token-like context in sessionStorage.
5. Rift page opens socket and emits join-rift.
6. Backend returns rift-state snapshot and starts schedules as needed.
7. Conversation events flow over socket (messages, typing, fragments, vibe, catalyst, decay).
8. At expiry backend emits rift-closed; frontend shows collapse UX and redirects.

---

## 8. Technical Risks and Gaps (Current State)

### 8.1 Scalability and State Durability
- Core room/message state is process-memory only.
- No built-in shared state layer for multi-instance horizontal scale.
- Restart/failure drops all active rooms and conversation history.

### 8.2 Identity and Trust Model
- Client stores userId/riftId in sessionStorage and reuses them.
- No authenticated user identity model in current flow.
- Socket events rely on provided IDs with limited trust boundary hardening.

### 8.3 Contract Coverage
- REST contract is formally specified via OpenAPI/codegen.
- Socket contract is implicit in code (not externally versioned/spec-documented).

### 8.4 Data Persistence Readiness
- DB adapter exists, but domain tables and persistence workflows are absent.
- No replay/history/audit model for conversations.

### 8.5 Operational/Quality Concerns
- Timer-heavy behavior (setTimeout per event) can become noisy under high throughput.
- No explicit automated test suite observed in inspected runtime paths.
- Frontend includes anti-copy/anti-contextmenu restrictions that may impact UX/accessibility expectations.

---

## 9. Architecture Maturity Snapshot
- Product concept implementation: strong and cohesive.
- Realtime feature completeness: high for ephemeral interaction use case.
- Contract discipline on REST: good (OpenAPI + generated client + generated validators).
- Production hardening: moderate; key next concerns are auth, persistence strategy, observability, and scale architecture.

---

## 10. Conclusion
DevEther in its present AS-IS state is a feature-rich ephemeral realtime platform with a clear experiential identity and well-implemented socket interaction model. The architecture is optimized for transient engagement rather than long-term durability. The monorepo and shared contract tooling provide a solid foundation for future evolution, but production-grade scale and persistence requirements will require deliberate architectural expansion.
