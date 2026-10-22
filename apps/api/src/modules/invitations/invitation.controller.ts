import type { Request, Response } from "express";
import { hasPermission } from "@barberos/contracts";
import type { CreateInvitationInput, InvitableRole } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import {
  acceptInvitation,
  createInvitation,
  findPendingInvitationRole,
  listPendingInvitations,
  previewInvitation,
  revokeInvitation,
} from "./invitation.service.js";

function tenantOf(req: Request): TenantContext {
  if (!req.tenant) throw AppError.forbidden();
  return req.tenant;
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === "string" ? value : "";
}

function assertCanInvite(ctx: TenantContext, role: InvitableRole): void {
  const permission = role === "admin" ? "members:manage" : "employees:manage";
  if (!hasPermission(ctx.role, permission)) {
    throw AppError.forbidden(
      role === "admin"
        ? "Solo el dueño puede invitar administradores"
        : "No tienes permiso para invitar barberos",
    );
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const input = req.validated.body as CreateInvitationInput;
  assertCanInvite(ctx, input.role);
  const created = await createInvitation(ctx, input);
  res.status(201).json(created);
}

export async function list(req: Request, res: Response): Promise<void> {
  const invitations = await listPendingInvitations(tenantOf(req));
  res.json({ invitations });
}

export async function revoke(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const id = param(req, "invitationId");
  assertCanInvite(ctx, await findPendingInvitationRole(ctx, id));
  await revokeInvitation(ctx, id);
  res.status(204).end();
}

export async function preview(req: Request, res: Response): Promise<void> {
  const { token } = req.validated.params as { token: string };
  const invitation = await previewInvitation(token);
  res.json({ invitation });
}

export async function accept(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  const { token } = req.validated.params as { token: string };
  const accepted = await acceptInvitation(token, req.auth.userId);
  res.json(accepted);
}
