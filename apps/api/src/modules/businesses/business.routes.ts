import { Router } from "express";
import { createBusinessSchema } from "@barberos/contracts";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate } from "../auth/authenticate.middleware.js";
import { create, listMine } from "./business.controller.js";

export const businessRouter = Router();
export const meRouter = Router();

businessRouter.post("/", authenticate, validate({ body: createBusinessSchema }), create);
meRouter.get("/businesses", authenticate, listMine);
