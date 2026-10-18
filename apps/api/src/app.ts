import express from "express";
import { isDbConnected } from "./shared/db/connection.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/v1/health", (_req, res) => {
    const dbOk = isDbConnected();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
