"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { createBusinessSchema, slugify, type BusinessWithRole } from "@barberos/contracts";
import { OnboardingSteps } from "@/components/brand/steps";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { support } from "@/config/support";
import { ApiError, errorMessage } from "@/lib/api/client";
import { applyFieldErrors } from "@/lib/api/form-errors";
import { useCreateBusiness, useMyBusinesses } from "./hooks";
import { formatLongDate } from "./labels";

const CODE_MESSAGE =
  "Este código no sirve: ya se usó o venció. Pide uno nuevo a Vanegas Solutions.";

export function CreateBusiness() {
  const [created, setCreated] = useState<BusinessWithRole | null>(null);
  const businesses = useMyBusinesses();
  const isFirst = businesses.data?.length === 0;
  const backHref =
    businesses.data && businesses.data.length > 0
      ? businesses.data.length === 1
        ? `/${businesses.data[0]!.slug}`
        : "/negocios"
      : null;

  if (created) return <BusinessCreated business={created} />;

  return (
    <div className="flex w-full max-w-[980px] flex-wrap items-start gap-6">
      {backHref && (
        <div className="w-full">
          <Button asChild variant="ghost" className="-ml-3 px-3">
            <Link href={backHref}>
              <ArrowLeft aria-hidden="true" />
              Volver
            </Link>
          </Button>
        </div>
      )}
      <section className="flex min-w-0 flex-[999_1_480px] flex-col gap-6 rounded-lg border border-line bg-surface p-5 sm:p-8">
        {isFirst && <OnboardingSteps current={2} />}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] sm:text-[30px] sm:leading-9">
            Crea tu negocio
          </h1>
          <p className="text-[15px] text-ink-muted">
            Necesitas el código de activación que te entregó Vanegas Solutions.
          </p>
        </div>
        <CreateBusinessForm onCreated={setCreated} />
      </section>
      <AboutCreating />
    </div>
  );
}

function CreateBusinessForm({ onCreated }: { onCreated: (b: BusinessWithRole) => void }) {
  const create = useCreateBusiness();
  const slugEdited = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      name: "",
      slug: "",
      activationCode: "",
      currency: "COP",
      timezone: "America/Bogota",
    },
  });
  const slug = watch("slug");

  const onSubmit = handleSubmit(async (values) => {
    try {
      onCreated(await create.mutateAsync(values));
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_ACTIVATION_CODE") {
        setError("activationCode", { message: CODE_MESSAGE }, { shouldFocus: true });
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setError(
          "slug",
          { message: "Ese identificador ya lo usa otra barbería. Prueba con otro." },
          { shouldFocus: true },
        );
        return;
      }
      if (applyFieldErrors(err, setError, ["name", "slug", "activationCode"])) return;
      setError("root", {
        message: errorMessage(err, {
          429: "Demasiados intentos con códigos. Espera unos minutos e inténtalo de nuevo.",
        }),
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
      <FormAlert message={errors.root?.message} />

      <Field data-invalid={errors.name ? true : undefined}>
        <FieldLabel htmlFor="name">Nombre del negocio</FieldLabel>
        <Input
          id="name"
          autoComplete="organization"
          className="h-12 sm:h-11"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby="name-hint"
          {...register("name", {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              if (!slugEdited.current) {
                setValue("slug", slugify(e.target.value), { shouldValidate: isSubmitted });
              }
            },
          })}
        />
        <FieldDescription id="name-hint">
          Así lo verán tus clientes cuando reserven.
        </FieldDescription>
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      <Field data-invalid={errors.slug ? true : undefined}>
        <FieldLabel htmlFor="slug">Identificador del enlace</FieldLabel>
        <Input
          id="slug"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 sm:h-11"
          aria-invalid={errors.slug ? true : undefined}
          aria-describedby="slug-hint"
          {...register("slug", {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              // Si lo borra, volvemos a sugerirlo desde el nombre.
              slugEdited.current = e.target.value.length > 0;
            },
          })}
        />
        <FieldDescription id="slug-hint">
          Lo sugerimos a partir del nombre. Tu enlace de reservas usará{" "}
          <span className="font-semibold text-ink">{slug || "tu-barberia"}</span> y no se puede
          cambiar después.
        </FieldDescription>
        <FieldError>{errors.slug?.message}</FieldError>
      </Field>

      <Field data-invalid={errors.activationCode ? true : undefined}>
        <FieldLabel htmlFor="activationCode">Código de activación</FieldLabel>
        <Input
          id="activationCode"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="BRB-XXXX-XXXX-XXXX"
          className="h-12 text-[17px] font-semibold tracking-[0.04em] uppercase placeholder:font-normal placeholder:tracking-normal sm:h-11"
          aria-invalid={errors.activationCode ? true : undefined}
          aria-describedby="code-hint"
          {...register("activationCode")}
        />
        <FieldDescription id="code-hint">
          Puedes escribirlo en minúsculas o sin guiones.
        </FieldDescription>
        <FieldError>{errors.activationCode?.message}</FieldError>
      </Field>

      <p className="flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-ground px-4 py-3.5 text-sm">
        <span>
          <span className="text-ink-muted">Moneda </span>
          <span className="font-semibold">Pesos colombianos (COP)</span>
        </span>
        <span>
          <span className="text-ink-muted">Hora </span>
          <span className="font-semibold">Bogotá (UTC−5)</span>
        </span>
      </p>

      <Button
        type="submit"
        size="lg"
        className="mt-1.5 w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Creando negocio…" : "Crear negocio"}
      </Button>
    </form>
  );
}

function AboutCreating() {
  const whatsapp = support.whatsappUrl("Hola, quiero un código de activación para BarberOS.");
  return (
    <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg bg-brand p-6">
        <h2 className="text-[17px] font-semibold">Qué pasa al crearlo</h2>
        <ul className="flex flex-col gap-2.5 text-sm leading-5">
          {[
            "Quedas como dueño, con acceso a todo.",
            "Tu agenda queda lista para agregar a tu equipo.",
            "Si tu código trae días de prueba, empiezan a contar hoy.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <Check className="mt-px size-[18px] shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface px-6 py-5">
        <span className="text-[15px] font-semibold">¿No tienes código?</span>
        <span className="text-sm leading-5 text-ink-soft">
          Escríbele a Vanegas Solutions
          {support.phone ? (
            <>
              {" "}
              por WhatsApp al{" "}
              <span className="font-semibold text-ink select-all">{support.phone}</span>
            </>
          ) : null}{" "}
          y te lo enviamos.
        </span>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="mt-1 text-sm font-semibold underline underline-offset-[3px] hover:no-underline"
          >
            Escribir por WhatsApp
          </a>
        )}
      </div>
    </aside>
  );
}

function BusinessCreated({ business }: { business: BusinessWithRole }) {
  return (
    <section
      role="status"
      className="flex w-full max-w-[560px] flex-col gap-6 rounded-lg bg-brand p-6 sm:p-9"
    >
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-ink text-brand"
      >
        <Check className="size-8" strokeWidth={2.4} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] leading-8 font-bold tracking-[-0.025em] sm:text-[30px] sm:leading-9">
          {business.name} ya está lista
        </h1>
        <p className="text-base leading-6 text-ink-soft">
          Quedaste como dueño. Ahora arma tu equipo y tu agenda.
        </p>
      </div>
      <dl className="flex flex-col rounded-lg bg-surface px-4">
        <div className="flex min-h-[60px] flex-col justify-center gap-0.5 border-b border-line-soft py-2.5 last:border-b-0">
          <dt className="text-xs text-ink-muted">Identificador de tu enlace</dt>
          <dd className="text-[15px] font-semibold">{business.slug}</dd>
        </div>
        {business.status === "trial" && business.trialEndsAt && (
          <div className="flex min-h-[60px] flex-col justify-center gap-0.5 py-2.5">
            <dt className="text-xs text-ink-muted">Prueba gratis</dt>
            <dd className="text-[15px] font-semibold first-letter:uppercase">
              Hasta el {formatLongDate(business.trialEndsAt, business.timezone)}
            </dd>
          </div>
        )}
      </dl>
      <Button asChild size="lg" className="w-full">
        <Link href={`/${business.slug}`}>
          Ir a la agenda
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
