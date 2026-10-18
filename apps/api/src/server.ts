import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDb, disconnectDb } from "./shared/db/connection.js";

async function main() {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} recibido, cerrando...`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Error al iniciar la API:", err instanceof Error ? err.message : err);
  process.exit(1);
});
