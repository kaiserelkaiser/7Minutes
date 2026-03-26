import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { setupSocketHandlers } from "./lib/socketHandler";

const rawPort = process.env["PORT"] ?? "3001";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new IOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
  path: "/socket.io",
});

setupSocketHandlers(io);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening with Socket.io");
});
