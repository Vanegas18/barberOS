import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function IngresarPage() {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-[30px] font-bold tracking-[-0.02em] lg:text-[30px] lg:leading-9">
          Ingresa a tu barbería
        </h1>
        <p className="text-[15px] text-ink-muted">Con el correo y la contraseña de tu cuenta.</p>
      </div>
      <LoginForm />
      <p className="text-center text-[15px] text-ink-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-ink underline underline-offset-[3px] hover:no-underline"
        >
          Crea una
        </Link>
      </p>
    </>
  );
}
