import { useQuery } from "@tanstack/react-query";
import { appointmentsApi } from "./api";

export const appointmentKeys = {
  all: (businessId: string) => ["businesses", businessId, "appointments"] as const,
  day: (businessId: string, date: string) =>
    [...appointmentKeys.all(businessId), "day", date] as const,
};

export function useDayAppointments(businessId: string, date: string, enabled = true) {
  return useQuery({
    queryKey: appointmentKeys.day(businessId, date),
    queryFn: () => appointmentsApi.day(businessId, date),
    enabled,
    refetchInterval: 30_000,
  });
}
