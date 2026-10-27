import express, { Router } from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./shared/logger.js";
import { isDbConnected } from "./shared/db/connection.js";
import { requestId } from "./shared/middleware/request-id.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.js";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth/auth.routes.js";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { originCheck } from "./shared/middleware/origin-check.js";
import {
  apiLimiter,
  authLimiter,
  activationLimiter,
  invitationLimiter,
} from "./shared/middleware/rate-limit.js";
import {
  businessRouter,
  meRouter,
  businessTenantRouter,
} from "./modules/businesses/business.routes.js";
import { authenticate } from "./modules/auth/authenticate.middleware.js";
import { tenantContext } from "./modules/memberships/tenant-context.middleware.js";
import { serviceRouter } from "./modules/services/service.routes.js";
import { employeeRouter } from "./modules/employees/employee.routes.js";
import { scheduleRouter } from "./modules/schedules/schedule.routes.js";
import { customerRouter } from "./modules/customers/customer.routes.js";
import {
  invitationPublicRouter,
  invitationTenantRouter,
} from "./modules/invitations/invitation.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as express.Request).id }));
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(apiLimiter);
  app.use(originCheck);
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/auth/register", authLimiter);
  app.use("/api/v1/auth", authRouter);
  app.post("/api/v1/businesses", activationLimiter);
  app.use("/api/v1/businesses", businessRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1/invitations", invitationLimiter, invitationPublicRouter);

  // Todas las rutas privadas de un negocio cuelgan de aquí y heredan la protección.
  const tenantRouter = Router({ mergeParams: true });
  tenantRouter.use("/services", serviceRouter);
  tenantRouter.use("/employees/:employeeId", scheduleRouter);
  tenantRouter.use("/employees", employeeRouter);
  tenantRouter.use("/invitations", invitationTenantRouter);
  tenantRouter.use("/customers", customerRouter);
  tenantRouter.use("/", businessTenantRouter);

  app.use("/api/v1/businesses/:businessId", authenticate, tenantContext, tenantRouter);
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
