import type { BusinessWithRole } from "@barberos/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessesApi } from "./api";

export const businessKeys = {
  mine: ["businesses", "mine"] as const,
};

export function useMyBusinesses() {
  return useQuery({ queryKey: businessKeys.mine, queryFn: businessesApi.mine });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: businessesApi.create,
    onSuccess: (business) => {
      queryClient.setQueryData<BusinessWithRole[]>(businessKeys.mine, (current) =>
        [...(current ?? []).filter((b) => b.id !== business.id), business].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
    },
  });
}
