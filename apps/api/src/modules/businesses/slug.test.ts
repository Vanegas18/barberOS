import { describe, expect, it } from "vitest";
import { createBusinessSchema } from "@barberos/contracts";
import { slugify } from "./slug.js";

describe("slugify", () => {
  it("quita tildes y pasa a minúsculas", () => {
    expect(slugify("Barbería Los Hermanos")).toBe("barberia-los-hermanos");
  });

  it("colapsa símbolos y espacios en un solo guion", () => {
    expect(slugify("  Corte & Estilo!!  ")).toBe("corte-estilo");
  });

  it("limita a 40 caracteres sin dejar guion final", () => {
    const slug = slugify("a".repeat(39) + " bbbbbb");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("devuelve cadena vacía si no queda ningún carácter válido", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("createBusinessSchema", () => {
  const base = { name: "Barbería Central", slug: "barberia-central" };

  it("aplica moneda y zona horaria por defecto", () => {
    const parsed = createBusinessSchema.parse(base);
    expect(parsed.currency).toBe("COP");
    expect(parsed.timezone).toBe("America/Bogota");
  });

  it("rechaza slugs reservados", () => {
    expect(createBusinessSchema.safeParse({ ...base, slug: "login" }).success).toBe(false);
  });

  it("rechaza slugs con mayúsculas internas inválidas o caracteres raros", () => {
    expect(createBusinessSchema.safeParse({ ...base, slug: "mi barberia" }).success).toBe(false);
    expect(createBusinessSchema.safeParse({ ...base, slug: "-mala" }).success).toBe(false);
  });

  it("rechaza una zona horaria inexistente", () => {
    expect(createBusinessSchema.safeParse({ ...base, timezone: "Marte/Olimpo" }).success).toBe(
      false,
    );
  });
});
