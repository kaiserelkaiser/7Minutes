# 7MINUTES Deployment

## Railway

Required environment variables:

- `NODE_ENV=production`
- `PORT=3001`
- `CORS_ORIGINS=https://<your-vercel-domain>`
- `MONGODB_URL=<your MongoDB connection string>`
- `JWT_SECRET=<long random secret>`

Deploy from the repository root. Railway uses [railway.json](./railway.json) and starts the API server with `pnpm run start:server`.

## Vercel

Required environment variables:

- `VITE_API_URL=https://<your-railway-domain>`
- `VITE_WS_URL=https://<your-railway-domain>`

Deploy from the repository root. Vercel uses [vercel.json](./vercel.json) to build the frontend workspace and output `apps/web/dist/public`.

## Notes

- Local development still works with same-origin API and Socket.io defaults.
- The MongoDB URL is prepared as an environment variable for the next backend persistence pass; the current runtime still uses in-memory room state.
- The repo is now organized with deployable apps in `apps/` and shared code in `lib/`.
