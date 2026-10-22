import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { UserModel } from "./user.model.js";

useTestDatabase();

beforeEach(async () => {
  await UserModel.deleteMany({});
});

describe("UserModel", () => {
  it("guarda el email en minúsculas", async () => {
    const user = await UserModel.create({
      name: "Juan",
      email: "Juan@Ejemplo.COM",
      passwordHash: "hash",
    });
    expect(user.email).toBe("juan@ejemplo.com");
  });

  it("no permite dos usuarios con el mismo email, sin importar mayúsculas", async () => {
    await UserModel.create({ name: "A", email: "a@x.com", passwordHash: "h" });
    await expect(
      UserModel.create({ name: "B", email: "A@X.com", passwordHash: "h" }),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("no devuelve passwordHash en consultas normales", async () => {
    await UserModel.create({ name: "A", email: "a@x.com", passwordHash: "secreto" });
    const found = await UserModel.findOne({ email: "a@x.com" });
    expect(found?.passwordHash).toBeUndefined();
  });

  it("devuelve passwordHash solo si se pide explícitamente", async () => {
    await UserModel.create({ name: "A", email: "a@x.com", passwordHash: "secreto" });
    const found = await UserModel.findOne({ email: "a@x.com" }).select("+passwordHash");
    expect(found?.passwordHash).toBe("secreto");
  });
});
