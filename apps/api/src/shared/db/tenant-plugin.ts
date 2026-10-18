import type { Schema } from "mongoose";
import { Types } from "mongoose";

declare module "mongoose" {
  interface QueryOptions {
    /** Salta la verificación de tenant. Úsalo solo en tareas de mantenimiento. */
    skipTenantCheck?: boolean;
  }
  interface AggregateOptions {
    skipTenantCheck?: boolean;
  }
}

const QUERY_OPERATIONS = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "countDocuments",
] as const;

function hasBusinessId(filter: unknown): boolean {
  if (!filter || typeof filter !== "object") return false;
  const f = filter as Record<string, unknown>;

  if ("businessId" in f && f.businessId !== undefined && f.businessId !== null) return true;

  // Acepta $and con businessId en alguna rama
  const and = f.$and;
  if (Array.isArray(and)) return and.some((part) => hasBusinessId(part));

  return false;
}

export function tenantPlugin(schema: Schema): void {
  schema.add({
    businessId: {
      type: Types.ObjectId,
      ref: "Business",
      required: true,
      immutable: true,
      index: true,
    },
  });

  for (const op of QUERY_OPERATIONS) {
    schema.pre(op, async function () {
      if (this.getOptions().skipTenantCheck) return;
      if (!hasBusinessId(this.getFilter())) {
        throw new Error(
          `[tenantPlugin] La operación "${op}" sobre "${this.model.modelName}" requiere businessId en el filtro`,
        );
      }
    });
  }

  schema.pre("aggregate", async function () {
    if (this.options?.skipTenantCheck) return;

    const first = this.pipeline()[0] as { $match?: unknown } | undefined;
    if (!first || !first.$match || !hasBusinessId(first.$match)) {
      throw new Error(
        "[tenantPlugin] aggregate requiere que la primera etapa sea $match con businessId",
      );
    }
  });
}
