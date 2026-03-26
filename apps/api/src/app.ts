import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import fs from "node:fs";
import path from "node:path";
import router from "./routes";
import { isAllowedOrigin, serverConfig } from "./lib/config";
import { logger } from "./lib/logger";

const app: Express = express();
const frontendDist = path.resolve(globalThis.__dirname, "../../web/dist/public");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );

  if (serverConfig.nodeEnv === "production") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data: blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com data:; " +
        "script-src 'self'; frame-ancestors 'none'; base-uri 'self';",
    );
  }

  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

app.use("/api", router);

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled application error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
