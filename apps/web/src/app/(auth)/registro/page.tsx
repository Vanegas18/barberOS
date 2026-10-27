import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingSteps } from "@/components/brand/steps";
import { RegisterForm } from "@/features/auth/register-form";
import { safeNext, withNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  const fromInvitation = next.startsWith("/invitacion/");

  return (
    <>
      {!fromInvitation && <OnboardingSteps current={1} />}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-7.5 font-bold tracking-[-0.02em] lg:text-[30px] lg:leading-9">
          {fromInvitation ? "Crea tu cuenta para unirte" : "Crea tu cuenta"}
        </h1>
        <p className="text-[15px] text-ink-muted">
          {fromInvitation
            ? "Después aceptas la invitación y verás tu agenda."
            : "Si eres barbero de un equipo, pídele a tu jefe que te invite."}
        </p>
      </div>
      <RegisterForm next={next} />
      <p className="text-center text-[15px] text-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={withNext("/ingresar", next)}
          className="font-semibold text-ink underline underline-offset-[3px] hover:no-underline"
        >
          Ingresa
        </Link>
      </p>
    </>
  );
}
