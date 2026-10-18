import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorHandler } from "./error-handler.js";
import { requestId } from "./request-id.js";
import { validate } from "./validate.js";

function buildApp() {
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.post(
    "/items/:id",
    validate({
      params: z.object({ id: z.string().min(3) }),
      body: z.object({ name: z.string().min(1) }),
    }),
    (req, res) => {
      res.json({ validated: req.validated });
    },
  );
  app.use(errorHandler);
  return app;
}

describe("validate", () => {
  it("deja pasar datos válidos", async () => {
    const res = await request(buildApp()).post("/items/abc").send({ name: "Corte" });
    expect(res.status).toBe(200);
    expect(res.body.validated.body).toEqual({ name: "Corte" });
  });

  it("elimina campos desconocidos como businessId", async () => {
    const res = await request(buildApp())
      .post("/items/abc")
      .send({ name: "Corte", businessId: "falso" });
    expect(res.status).toBe(200);
    expect(res.body.validated.body).toEqual({ name: "Corte" });
  });

  it("responde 422 con detalles cuando el body es inválido", async () => {
    const res = await request(buildApp()).post("/items/abc").send({ name: "" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].part).toBe("body");
  });

  it("valida también los params", async () => {
    const res = await request(buildApp()).post("/items/ab").send({ name: "Corte" });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].part).toBe("params");
  });
});
