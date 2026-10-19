import { Router } from "express";
import { loginSchema, registerSchema } from "@barberos/contracts";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate } from "./authenticate.middleware.js";
import { login, logout, me, refresh, register } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", validate({ body: registerSchema }), register);
authRouter.post("/login", validate({ body: loginSchema }), login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, me);
