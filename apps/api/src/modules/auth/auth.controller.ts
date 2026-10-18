import type { Request, Response } from "express";
import type { RegisterInput } from "@barberos/contracts";
import { setAuthCookies } from "./auth.cookies.js";
import { registerUser } from "./auth.service.js";

export async function register(req: Request, res: Response): Promise<void> {
  const input = req.validated.body as RegisterInput;
  const { user, tokens } = await registerUser(input, req.get("user-agent"));
  setAuthCookies(res, tokens);
  res.status(201).json({ user });
}
