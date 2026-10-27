import type { ScheduleExceptionInput, WeeklySchedule } from "@barberos/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeKeys } from "@/features/employees/hooks";
import { schedulesApi } from "./api";

export const scheduleKeys = {
  exceptions: (businessId: string, employeeId: string, from: string, to: string) =>
    ["businesses", businessId, "employees", employeeId, "exceptions", from, to] as const,
  allExceptions: (businessId: string, employeeId: string) =>
    ["businesses", businessId, "employees", employeeId, "exceptions"] as const,
};

export function useSaveWeekly(businessId: string, employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekly: WeeklySchedule) => schedulesApi.putWeekly(businessId, employeeId, weekly),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.list(businessId) }),
  });
}

export function useExceptions(businessId: string, employeeId: string, from: string, to: string) {
  return useQuery({
    queryKey: scheduleKeys.exceptions(businessId, employeeId, from, to),
    queryFn: () => schedulesApi.exceptions(businessId, employeeId, from, to),
  });
}

export function useSaveException(businessId: string, employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, input }: { date: string; input: ScheduleExceptionInput }) =>
      schedulesApi.putException(businessId, employeeId, date, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.allExceptions(businessId, employeeId),
      }),
  });
}

export function useDeleteException(businessId: string, employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => schedulesApi.deleteException(businessId, employeeId, date),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.allExceptions(businessId, employeeId),
      }),
  });
}
