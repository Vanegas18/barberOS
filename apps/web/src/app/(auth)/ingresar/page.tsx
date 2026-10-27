import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";
import { safeNext, withNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Ingresar" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  const fromInvitation = next.startsWith("/invitacion/");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-7.5 font-bold tracking-[-0.02em] lg:text-[30px] lg:leading-9">
          {fromInvitation ? "Ingresa para aceptar la invitación" : "Ingresa a tu barbería"}
        </h1>
        <p className="text-[15px] text-ink-muted">Con el correo y la contraseña de tu cuenta.</p>
      </div>
      <LoginForm next={next} />
      <p className="text-center text-[15px] text-ink-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href={withNext("/registro", next)}
          className="font-semibold text-ink underline underline-offset-[3px] hover:no-underline"
        >
          Crea una
        </Link>
      </p>
    </>
  );
}
