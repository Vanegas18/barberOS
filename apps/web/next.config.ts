import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN;

// En producción no hay valor por defecto: sin API_ORIGIN, el build falla de inmediato.
if (!apiOrigin && process.env.NODE_ENV === "production") {
  throw new Error("Falta la variable de entorno API_ORIGIN");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // contracts exporta TypeScript sin compilar; Next lo transpila.
  transpilePackages: ["@barberos/contracts"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin ?? "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
