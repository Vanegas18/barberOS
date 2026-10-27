import { Types } from "mongoose";
import type {
  AppointmentService,
  CreateServiceInput,
  Service,
  UpdateServiceInput,
} from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { isObjectIdString } from "../memberships/membership.service.js";
import { ServiceModel, type ServiceDoc } from "./service.model.js";

export function serviceNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toService(doc: ServiceDoc & { _id: Types.ObjectId }): Service {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? null,
    price: doc.price,
    durationMinutes: doc.durationMinutes,
    visibleOnline: doc.visibleOnline,
    active: doc.active,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

const duplicateName = () => AppError.conflict("Ya existe un servicio con ese nombre");

const scope = (ctx: TenantContext) => ({ businessId: new Types.ObjectId(ctx.businessId) });

interface Visibility {
  includeInactive: boolean;
}

export async function listServices(ctx: TenantContext, opts: Visibility): Promise<Service[]> {
  const docs = await ServiceModel.find({
    ...scope(ctx),
    ...(opts.includeInactive ? {} : { active: true }),
  })
    .collation({ locale: "es", strength: 1 })
    .sort({ active: -1, name: 1 })
    .lean();
  return docs.map(toService);
}

export async function getService(
  ctx: TenantContext,
  serviceId: string,
  opts: Visibility,
): Promise<Service> {
  if (!isObjectIdString(serviceId)) throw AppError.notFound("Servicio no encontrado");
  const doc = await ServiceModel.findOne({
    ...scope(ctx),
    _id: new Types.ObjectId(serviceId),
    ...(opts.includeInactive ? {} : { active: true }),
  }).lean();
  if (!doc) throw AppError.notFound("Servicio no encontrado");
  return toService(doc);
}

export async function createService(
  ctx: TenantContext,
  input: CreateServiceInput,
): Promise<Service> {
  try {
    const doc = await ServiceModel.create({
      ...scope(ctx),
      name: input.name,
      nameKey: serviceNameKey(input.name),
      description: input.description || null,
      price: input.price,
      durationMinutes: input.durationMinutes,
      visibleOnline: input.visibleOnline,
    });
    return toService(doc.toObject());
  } catch (err) {
    if (isDuplicateKeyError(err)) throw duplicateName();
    throw err;
  }
}

export async function updateService(
  ctx: TenantContext,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<Service> {
  if (!isObjectIdString(serviceId)) throw AppError.notFound("Servicio no encontrado");

  const set: Partial<ServiceDoc> = {};
  if (input.name !== undefined) {
    set.name = input.name;
    set.nameKey = serviceNameKey(input.name);
  }
  if (input.description !== undefined) set.description = input.description || null;
  if (input.price !== undefined) set.price = input.price;
  if (input.durationMinutes !== undefined) set.durationMinutes = input.durationMinutes;
  if (input.visibleOnline !== undefined) set.visibleOnline = input.visibleOnline;
  if (input.active !== undefined) set.active = input.active;

  try {
    const doc = await ServiceModel.findOneAndUpdate(
      { ...scope(ctx), _id: new Types.ObjectId(serviceId) },
      { $set: set },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!doc) throw AppError.notFound("Servicio no encontrado");
    return toService(doc);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw duplicateName();
    throw err;
  }
}

export async function findServicesForBooking(
  ctx: TenantContext,
  serviceIds: string[],
): Promise<AppointmentService[]> {
  const docs = await ServiceModel.find({
    ...scope(ctx),
    _id: { $in: serviceIds.map((id) => new Types.ObjectId(id)) },
    active: true,
  }).lean();
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));
  const missing = serviceIds.some((id) => !byId.has(id));
  if (missing) {
    throw AppError.validation([
      { part: "body", path: "serviceIds", message: "Algún servicio no existe o está desactivado" },
    ]);
  }
  return serviceIds.map((id) => {
    const doc = byId.get(id)!;
    return {
      serviceId: id,
      name: doc.name,
      price: doc.price,
      durationMinutes: doc.durationMinutes,
    };
  });
}
