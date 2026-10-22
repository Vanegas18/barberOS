import type { CreateServiceInput, UpdateServiceInput } from "@barberos/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "./api";

export const serviceKeys = {
  list: (businessId: string) => ["businesses", businessId, "services"] as const,
};

export function useServices(businessId: string) {
  return useQuery({
    queryKey: serviceKeys.list(businessId),
    queryFn: () => servicesApi.list(businessId),
  });
}

export function useCreateService(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceInput) => servicesApi.create(businessId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceKeys.list(businessId) }),
  });
}

export function useUpdateService(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateServiceInput }) =>
      servicesApi.update(businessId, id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceKeys.list(businessId) }),
  });
}
