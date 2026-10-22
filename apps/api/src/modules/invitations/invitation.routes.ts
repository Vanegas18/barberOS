import { Router } from "express";
import { z } from "zod";
import { createInvitationSchema, invitationTokenSchema } from "@barberos/contracts";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate } from "../auth/authenticate.middleware.js";
import { accept, create, list, preview, revoke } from "./invitation.controller.js";

export const invitationTenantRouter = Router({ mergeParams: true });

invitationTenantRouter.get("/", requirePermission("employees:manage", "members:manage"), list);
invitationTenantRouter.post(
  "/",
  requirePermission("employees:manage", "members:manage"),
  validate({ body: createInvitationSchema }),
  create,
);
invitationTenantRouter.post(
  "/:invitationId/revoke",
  requirePermission("employees:manage", "members:manage"),
  revoke,
);

export const invitationPublicRouter = Router();

const tokenParams = z.object({ token: invitationTokenSchema });

invitationPublicRouter.get("/:token", validate({ params: tokenParams }), preview);
invitationPublicRouter.post(
  "/:token/accept",
  authenticate,
  validate({ params: tokenParams }),
  accept,
);
