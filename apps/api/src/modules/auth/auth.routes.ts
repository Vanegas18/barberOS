import { Router } from "express";
import { registerSchema } from "@barberos/contracts";
import { validate } from "../../shared/middleware/validate.js";
import { register } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", validate({ body: registerSchema }), register);
