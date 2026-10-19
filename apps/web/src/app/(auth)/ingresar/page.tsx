import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function IngresarPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Ingresa a tu barbería</h1>
        <p className="text-sm text-ink-muted">Usa el correo y la contraseña de tu cuenta.</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-ink-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Crea una
        </Link>
      </p>
    </div>
  );
}
