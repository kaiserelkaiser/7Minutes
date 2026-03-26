# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + Socket.io
- **Database**: PostgreSQL + Drizzle ORM (in-memory for DevEther rifts)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Three.js (Canvas fallback) + Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server + Socket.io
│   └── devether/           # DevEther React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Applications

### DevEther (`artifacts/devether`)

Ephemeral AI/dev discussion platform with a radical interface.

**Features:**
- Rifts (rooms) for 3-5 minute conversations with max 8 users
- Messages appear as floating glowing orbs that drift and dissolve
- Canvas-based Neural Network background (2D Canvas with particle physics)
- Glassmorphism-cyberpunk-aurora visual style
- Socket.io real-time communication
- Ghost mode (invisible observer)
- Vibe meter (color shifts based on conversation tone)
- Code snippet detection with holographic-style rendering
- 5-minute countdown timer with rift implosion animation
- No persistence — session-only data
- Chromatic aberration text effects
- Web Audio API sound effects

**Frontend components:**
- `src/pages/Landing.tsx` — join/create rift screen
- `src/pages/Rift.tsx` — main rift experience
- `src/components/canvas/NeuralBackground.tsx` — 2D Canvas particle neural network
- `src/components/devether/MessageOrb.tsx` — floating message orb
- `src/components/devether/FloatingInput.tsx` — minimal input bar
- `src/components/devether/RiftHUD.tsx` — HUD with users, timer, vibe
- `src/components/devether/CodeBlock.tsx` — holographic code renderer
- `src/hooks/use-socket.ts` — Socket.io hook

### API Server (`artifacts/api-server`)

Express 5 + Socket.io backend with in-memory rift management.

**Key files:**
- `src/lib/riftManager.ts` — in-memory rift/user/message state
- `src/lib/socketHandler.ts` — Socket.io event handlers
- `src/routes/rifts.ts` — REST endpoints for listing/joining rifts

**Socket events:**
- Client: `join-rift`, `send-message`, `typing-start`, `typing-stop`, `ghost-mode`
- Server: `rift-state`, `new-message`, `message-fading`, `message-faded`, `user-joined`, `user-left`, `typing-update`, `vibe-update`, `rift-closing`, `rift-closed`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and schemas
