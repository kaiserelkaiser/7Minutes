# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Deployable applications live in `apps/` and shared code lives in `lib/`.

## Stack

- Monorepo tool: pnpm workspaces
- Node.js version: 24
- Package manager: pnpm
- TypeScript version: 5.9
- API framework: Express 5 + Socket.io
- Database: PostgreSQL + Drizzle ORM (in-memory for current 7MINUTES room state)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild for API, Vite for frontend
- Frontend: React + Vite + Three.js + Framer Motion

## Structure

```text
workspace/
|- apps/
|  |- api/               # Express API server + Socket.io
|  |- web/               # 7MINUTES React + Vite frontend
|  `- mockup-sandbox/    # isolated UI sandbox
|- lib/
|  |- api-spec/
|  |- api-client-react/
|  |- api-zod/
|  `- db/
|- scripts/
|- pnpm-workspace.yaml
|- tsconfig.base.json
|- tsconfig.json
`- package.json
```

## Applications

### Web App (`apps/web`)

Ephemeral conversation platform frontend with the living-organism 7MINUTES interface.

Key surfaces:
- `src/pages/Landing.tsx` - lobby and room entry
- `src/pages/Rift.tsx` - main room experience
- `src/components/canvas/*` - ambient room universe visuals
- `src/components/devether/*` - organism field, thought input, room UI
- `src/hooks/use-socket.ts` - realtime socket state

### API Server (`apps/api`)

Express 5 + Socket.io backend that manages rooms, users, decay timing, and realtime state.

Key files:
- `src/index.ts`
- `src/app.ts`
- `src/lib/riftManager.ts`
- `src/lib/socketHandler.ts`
- `src/routes/rifts.ts`

### Mockup Sandbox (`apps/mockup-sandbox`)

Separate experimental workspace for isolated UI exploration.

## Shared Packages

- `lib/api-spec` - OpenAPI definitions and generation config
- `lib/api-client-react` - generated React Query API hooks
- `lib/api-zod` - generated Zod schemas
- `lib/db` - database schema and connection helpers

## Root Scripts

- `pnpm run dev:web` - run the frontend app
- `pnpm run dev:api` - run the backend app
- `pnpm run build:web` - build the frontend app
- `pnpm run build:server` - build the backend app
- `pnpm run build` - typecheck and build the whole workspace
- `pnpm run typecheck` - typecheck apps, libs, and scripts
