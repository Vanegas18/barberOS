import { api, createBusinessAs, joinAs, signUp, type Actor } from "./actors.js";
import { EmployeeModel } from "../src/modules/employees/employee.model.js";
import { MembershipModel } from "../src/modules/memberships/membership.model.js";

export interface Agenda {
  owner: Actor;
  admin: Actor;
  barber: Actor;
  bizId: string;
  carlosId: string;
  luisId: string;
  corteId: string;
  barbaId: string;
}

export async function setupAgenda(slug: string): Promise<Agenda> {
  const owner = await signUp("dueno@ejemplo.com");
  const bizId = await createBusinessAs(owner, slug);
  const admin = await joinAs(bizId, "admin@ejemplo.com", "admin");
  const barber = await joinAs(bizId, "barbero@ejemplo.com", "barber");

  const services = `/businesses/${bizId}/services`;
  const corte = await api.post(services, owner, {
    name: "Corte",
    price: 30000,
    durationMinutes: 30,
  });
  const barba = await api.post(services, owner, {
    name: "Barba",
    price: 15000,
    durationMinutes: 15,
  });

  const employees = `/businesses/${bizId}/employees`;
  const carlos = await api.post(employees, owner, { displayName: "Carlos" });
  const luis = await api.post(employees, owner, { displayName: "Luis" });

  const membership = await MembershipModel.findOne({ businessId: bizId, userId: barber.userId });
  await EmployeeModel.updateOne(
    { businessId: bizId, _id: carlos.body.employee.id },
    { $set: { membershipId: membership!._id } },
  );

  return {
    owner,
    admin,
    barber,
    bizId,
    carlosId: carlos.body.employee.id,
    luisId: luis.body.employee.id,
    corteId: corte.body.service.id,
    barbaId: barba.body.service.id,
  };
}

export function countIn(model: { countDocuments: (f: object) => Promise<number> }) {
  return model.countDocuments({ businessId: { $exists: true } });
}
