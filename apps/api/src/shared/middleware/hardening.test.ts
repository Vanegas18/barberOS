import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { errorHandler } from "./error-handler.js";
import { createLimiter } from "./rate-limit.js";
import { requestId } from "./request-id.js";

describe("helmet y CORS en la app real", () => {
  const app = createApp();

  it("añade encabezados de seguridad", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("permite el origen del frontend con credenciales", async () => {
    const res = await request(app).get("/api/v1/health").set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("no concede CORS a un origen ajeno", async () => {
    const res = await request(app).get("/api/v1/health").set("Origin", "http://evil.example");
    expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil.example");
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });
});

describe("originCheck", () => {
  const app = createApp();
  const body = { email: "a@x.com", password: "cualquiera" };

  it("rechaza un POST con Origin ajeno", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://evil.example")
      .send(body);
    expect(res.status).toBe(403);
  });

  it("deja pasar un POST con el Origin del frontend", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send(body);
    expect(res.status).not.toBe(403);
  });

  it("deja pasar un POST sin Origin (curl, servidor a servidor)", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(204);
  });
});

describe("rate limiting", () => {
  function buildApp() {
    const app = express();
    app.use(requestId);
    app.use(createLimiter(3));
    app.get("/x", (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);
    return app;
  }

  it("responde 429 al superar el límite", async () => {
    const app = buildApp();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await request(app).get("/x")).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });

  it("incluye el mensaje de error uniforme", async () => {
    const app = buildApp();
    for (let i = 0; i < 3; i++) await request(app).get("/x");
    const res = await request(app).get("/x");
    expect(res.body.error.code).toBe("TOO_MANY_REQUESTS");
  });
});
