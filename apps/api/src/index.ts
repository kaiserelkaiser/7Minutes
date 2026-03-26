import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import app from "./app";
import { serverConfig } from "./lib/config";
import { logger } from "./lib/logger";
import { ensureMongoIndexes } from "./lib/mongo";
import { setupSocketHandlers } from "./lib/socketHandler";

async function bootstrap(): Promise<void> {
  try {
    await ensureMongoIndexes();
  } catch (error) {
    logger.error({ err: error }, "MongoDB initialization failed; continuing without persistence");
  }

  const port = serverConfig.port;
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
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "Server bootstrap failed");
  process.exit(1);
});
