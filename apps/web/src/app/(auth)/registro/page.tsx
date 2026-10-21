import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingSteps } from "@/components/brand/steps";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <>
      <OnboardingSteps current={1} />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-[30px] font-bold tracking-[-0.02em] lg:text-[30px] lg:leading-9">
          Crea tu cuenta
        </h1>
        <p className="text-[15px] text-ink-muted">
          Si eres barbero de un equipo, pídele a tu jefe que te invite.
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-[15px] text-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/ingresar"
          className="font-semibold text-ink underline underline-offset-[3px] hover:no-underline"
        >
          Ingresa
        </Link>
      </p>
    </>
  );
}
