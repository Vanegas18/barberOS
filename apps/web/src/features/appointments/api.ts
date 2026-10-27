import type { Appointment } from "@barberos/contracts";
import { api } from "@/lib/api/client";

const base = (businessId: string) => `/businesses/${businessId}/appointments`;

export const appointmentsApi = {
  day: (businessId: string, date: string) =>
    api<{ appointments: Appointment[] }>(`${base(businessId)}?date=${date}`).then(
      (r) => r.appointments,
    ),
};
