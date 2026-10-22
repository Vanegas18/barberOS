import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, inject } from "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export function useTestDatabase(): void {
  beforeAll(async () => {
    await mongoose.connect(inject("mongoUri"), { dbName: `test_${randomUUID()}` });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
}
