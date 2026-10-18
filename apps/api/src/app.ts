import express from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./shared/logger.js";
import { isDbConnected } from "./shared/db/connection.js";
import { requestId } from "./shared/middleware/request-id.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as express.Request).id }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/v1/health", (_req, res) => {
    const dbOk = isDbConnected();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
