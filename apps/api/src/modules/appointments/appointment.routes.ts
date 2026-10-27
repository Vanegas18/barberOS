import { Router } from "express";
import {
  appointmentDayQuerySchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  walkInSchema,
} from "@barberos/contracts";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { validate } from "../../shared/middleware/validate.js";
import { create, list, reschedule, show, walkIn } from "./appointment.controller.js";

export const appointmentRouter = Router({ mergeParams: true });

const canRead = requirePermission("appointments:read", "appointments:read_own");
const canWrite = requirePermission("appointments:manage", "appointments:manage_own");

appointmentRouter.get("/", canRead, validate({ query: appointmentDayQuerySchema }), list);
appointmentRouter.get("/:appointmentId", canRead, show);
appointmentRouter.post("/", canWrite, validate({ body: createAppointmentSchema }), create);
appointmentRouter.post("/walk-in", canWrite, validate({ body: walkInSchema }), walkIn);
appointmentRouter.patch(
  "/:appointmentId",
  canWrite,
  validate({ body: rescheduleAppointmentSchema }),
  reschedule,
);
