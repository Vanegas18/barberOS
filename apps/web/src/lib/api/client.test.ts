import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./client";

const unauthorized = {
  error: { code: "UNAUTHORIZED", message: "No autenticado", requestId: "r1" },
};

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn<(input: string | URL | Request) => Promise<Response>>();
const urlOf = (call: unknown[]) => String(call[0]);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("navigator", {}); // sin Web Locks: se prueba la serialización en memoria
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("devuelve el JSON de una respuesta exitosa", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { user: { id: "1" } }));
    await expect(api("/auth/me")).resolves.toEqual({ user: { id: "1" } });
  });

  it("convierte el error de la API en ApiError", async () => {
    fetchMock.mockResolvedValueOnce(
      json(409, { error: { code: "CONFLICT", message: "Ya existe", requestId: "r2" } }),
    );
    const err = await api("/businesses", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Ya existe",
      requestId: "r2",
    });
  });

  it("ante un 401 refresca una vez y reintenta", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, unauthorized))
      .mockResolvedValueOnce(json(204))
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(api("/auth/me")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls.map(urlOf)).toEqual([
      "/api/v1/auth/me",
      "/api/v1/auth/refresh",
      "/api/v1/auth/me",
    ]);
  });

  it("dos 401 simultáneos comparten un único refresh", async () => {
    let refreshCalls = 0;
    const seen = new Map<string, number>();
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return json(204);
      }
      const n = (seen.get(url) ?? 0) + 1;
      seen.set(url, n);
      return n === 1 ? json(401, unauthorized) : json(200, { url });
    });

    const [a, b] = await Promise.all([api("/a"), api("/b")]);
    expect(a).toEqual({ url: "/api/v1/a" });
    expect(b).toEqual({ url: "/api/v1/b" });
    expect(refreshCalls).toBe(1);
  });

  it("no intenta refrescar cuando falla el login", async () => {
    fetchMock.mockResolvedValueOnce(json(401, unauthorized));
    await expect(api("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("si el refresh falla, propaga el 401 sin reintentar", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, unauthorized))
      .mockResolvedValueOnce(json(401, unauthorized));
    await expect(api("/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("un fallo de red se convierte en ApiError con status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(api("/auth/me")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });
});
