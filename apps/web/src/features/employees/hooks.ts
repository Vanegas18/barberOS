import type { CreateEmployeeInput, UpdateEmployeeInput } from "@barberos/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "./api";

export const employeeKeys = {
  list: (businessId: string) => ["businesses", businessId, "employees"] as const,
  me: (businessId: string) => ["businesses", businessId, "employees", "me"] as const,
};

export function useMyEmployee(businessId: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.me(businessId),
    queryFn: () => employeesApi.me(businessId),
    enabled,
  });
}

export function useEmployees(businessId: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.list(businessId),
    queryFn: () => employeesApi.list(businessId),
    enabled,
  });
}

export function useCreateEmployee(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => employeesApi.create(businessId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.list(businessId) }),
  });
}

export function useUpdateEmployee(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      employeesApi.update(businessId, id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.list(businessId) }),
  });
}
