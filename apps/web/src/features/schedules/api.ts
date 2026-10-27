import type {
  Employee,
  ScheduleException,
  ScheduleExceptionInput,
  WeeklySchedule,
} from "@barberos/contracts";
import { api } from "@/lib/api/client";

const base = (businessId: string, employeeId: string) =>
  `/businesses/${businessId}/employees/${employeeId}`;

export const schedulesApi = {
  putWeekly: (businessId: string, employeeId: string, weekly: WeeklySchedule) =>
    api<{ employee: Employee }>(`${base(businessId, employeeId)}/schedule`, {
      method: "PUT",
      body: weekly,
    }).then((r) => r.employee),
  exceptions: (businessId: string, employeeId: string, from: string, to: string) =>
    api<{ exceptions: ScheduleException[] }>(
      `${base(businessId, employeeId)}/exceptions?from=${from}&to=${to}`,
    ).then((r) => r.exceptions),
  putException: (
    businessId: string,
    employeeId: string,
    date: string,
    input: ScheduleExceptionInput,
  ) =>
    api<{ exception: ScheduleException }>(`${base(businessId, employeeId)}/exceptions/${date}`, {
      method: "PUT",
      body: input,
    }).then((r) => r.exception),
  deleteException: (businessId: string, employeeId: string, date: string) =>
    api<void>(`${base(businessId, employeeId)}/exceptions/${date}`, { method: "DELETE" }),
};
