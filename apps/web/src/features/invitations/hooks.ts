import type { CreateInvitationInput } from "@barberos/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessKeys } from "@/features/businesses/hooks";
import { invitationsApi } from "./api";

export const invitationKeys = {
  pending: (businessId: string) => ["businesses", businessId, "invitations"] as const,
  preview: (token: string) => ["invitations", token] as const,
};

export function usePendingInvitations(businessId: string) {
  return useQuery({
    queryKey: invitationKeys.pending(businessId),
    queryFn: () => invitationsApi.pending(businessId),
  });
}

export function useCreateInvitation(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput) => invitationsApi.create(businessId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invitationKeys.pending(businessId) }),
  });
}

export function useRevokeInvitation(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => invitationsApi.revoke(businessId, invitationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invitationKeys.pending(businessId) }),
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: invitationKeys.preview(token),
    queryFn: () => invitationsApi.preview(token),
  });
}

export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invitationsApi.accept(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.mine }),
  });
}
