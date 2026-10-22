import { Router } from "express";
import { z } from "zod";
import {
  calendarDateSchema,
  exceptionRangeQuerySchema,
  scheduleExceptionInputSchema,
  weeklyScheduleSchema,
} from "@barberos/contracts";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { validate } from "../../shared/middleware/validate.js";
import { list, put, putWeekly, remove } from "./schedule.controller.js";

const dateParams = z.object({ employeeId: z.string(), date: calendarDateSchema });

export const scheduleRouter = Router({ mergeParams: true });

scheduleRouter.put(
  "/schedule",
  requirePermission("employees:manage"),
  validate({ body: weeklyScheduleSchema }),
  putWeekly,
);
scheduleRouter.get(
  "/exceptions",
  requirePermission("business:read"),
  validate({ query: exceptionRangeQuerySchema }),
  list,
);
scheduleRouter.put(
  "/exceptions/:date",
  requirePermission("employees:manage"),
  validate({ params: dateParams, body: scheduleExceptionInputSchema }),
  put,
);
scheduleRouter.delete(
  "/exceptions/:date",
  requirePermission("employees:manage"),
  validate({ params: dateParams }),
  remove,
);
