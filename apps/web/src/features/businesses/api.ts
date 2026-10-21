import type { BusinessWithRole, CreateBusinessInput } from "@barberos/contracts";
import { api } from "@/lib/api/client";

export const businessesApi = {
  mine: () => api<{ businesses: BusinessWithRole[] }>("/me/businesses").then((r) => r.businesses),
  create: (input: CreateBusinessInput) =>
    api<{ business: BusinessWithRole }>("/businesses", { method: "POST", body: input }).then(
      (r) => r.business,
    ),
};
