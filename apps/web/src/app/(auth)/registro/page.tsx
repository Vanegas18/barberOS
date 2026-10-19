import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Crea tu cuenta</h1>
        <p className="text-sm text-ink-muted">Después configuras tu barbería en un minuto.</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/ingresar"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Ingresa
        </Link>
      </p>
    </div>
  );
}
