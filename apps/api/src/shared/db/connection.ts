import mongoose from "mongoose";
import { env } from "../../config/env.js";

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });

  const { host, name } = mongoose.connection;
  console.log(`MongoDB conectado: ${host}/${name}`);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
