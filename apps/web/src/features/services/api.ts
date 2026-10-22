import type { CreateServiceInput, Service, UpdateServiceInput } from "@barberos/contracts";
import { api } from "@/lib/api/client";

const base = (businessId: string) => `/businesses/${businessId}/services`;

export const servicesApi = {
  list: (businessId: string) =>
    api<{ services: Service[] }>(base(businessId)).then((r) => r.services),
  create: (businessId: string, input: CreateServiceInput) =>
    api<{ service: Service }>(base(businessId), { method: "POST", body: input }).then(
      (r) => r.service,
    ),
  update: (businessId: string, serviceId: string, input: UpdateServiceInput) =>
    api<{ service: Service }>(`${base(businessId)}/${serviceId}`, {
      method: "PATCH",
      body: input,
    }).then((r) => r.service),
};
