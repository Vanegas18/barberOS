import type {
  AcceptedInvitation,
  CreateInvitationInput,
  CreatedInvitation,
  Invitation,
  InvitationPreview,
} from "@barberos/contracts";
import { api } from "@/lib/api/client";

const base = (businessId: string) => `/businesses/${businessId}/invitations`;

export const invitationsApi = {
  pending: (businessId: string) =>
    api<{ invitations: Invitation[] }>(base(businessId)).then((r) => r.invitations),
  create: (businessId: string, input: CreateInvitationInput) =>
    api<CreatedInvitation>(base(businessId), { method: "POST", body: input }),
  revoke: (businessId: string, invitationId: string) =>
    api<void>(`${base(businessId)}/${invitationId}/revoke`, { method: "POST" }),
  preview: (token: string) =>
    api<{ invitation: InvitationPreview }>(`/invitations/${token}`).then((r) => r.invitation),
  accept: (token: string) =>
    api<AcceptedInvitation>(`/invitations/${token}/accept`, { method: "POST" }),
};
