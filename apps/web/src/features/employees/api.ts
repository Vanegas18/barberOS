import type { CreateEmployeeInput, Employee, UpdateEmployeeInput } from "@barberos/contracts";
import { api } from "@/lib/api/client";

const base = (businessId: string) => `/businesses/${businessId}/employees`;

export const employeesApi = {
  list: (businessId: string) =>
    api<{ employees: Employee[] }>(base(businessId)).then((r) => r.employees),
  create: (businessId: string, input: CreateEmployeeInput) =>
    api<{ employee: Employee }>(base(businessId), { method: "POST", body: input }).then(
      (r) => r.employee,
    ),
  update: (businessId: string, employeeId: string, input: UpdateEmployeeInput) =>
    api<{ employee: Employee }>(`${base(businessId)}/${employeeId}`, {
      method: "PATCH",
      body: input,
    }).then((r) => r.employee),
};
