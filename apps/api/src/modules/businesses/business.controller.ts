import type { Request, Response } from "express";
import type { CreateBusinessInput } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import { createBusiness, listBusinessesForUser } from "./business.service.js";

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  const input = req.validated.body as CreateBusinessInput;
  const business = await createBusiness(req.auth.userId, input);
  res.status(201).json({ business });
}

export async function listMine(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  const businesses = await listBusinessesForUser(req.auth.userId);
  res.json({ businesses });
}
