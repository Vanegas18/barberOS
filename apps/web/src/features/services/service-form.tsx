"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createServiceSchema, type Service } from "@barberos/contracts";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormAlert } from "@/components/forms/form-alert";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError, errorMessage } from "@/lib/api/client";
import { applyFieldErrors } from "@/lib/api/form-errors";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCreateService, useUpdateService } from "./hooks";

const formSchema = createServiceSchema.extend({ active: z.boolean() });
type FormValues = z.input<typeof formSchema>;

const QUICK_DURATIONS = [15, 20, 30, 45, 60, 90];

export function ServiceForm({
  businessId,
  service,
  onDone,
}: {
  businessId: string;
  service?: Service;
  onDone: () => void;
}) {
  const create = useCreateService(businessId);
  const update = useUpdateService(businessId);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      price: service?.price ?? (undefined as unknown as number),
      durationMinutes: service?.durationMinutes ?? 30,
      visibleOnline: service?.visibleOnline ?? true,
      active: service?.active ?? true,
    },
  });
  const duration = watch("durationMinutes");

  const onSubmit = handleSubmit(async ({ active, ...values }) => {
    try {
      if (service) {
        await update.mutateAsync({ id: service.id, input: { ...values, active } });
      } else {
        await create.mutateAsync(values);
      }
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          "name",
          { message: "Ya tienes un servicio con ese nombre. Si está desactivado, reactívalo." },
          { shouldFocus: true },
        );
        return;
      }
      if (applyFieldErrors(err, setError, ["name", "description", "price", "durationMinutes"])) {
        return;
      }
      setError("root", { message: errorMessage(err) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
      <FormAlert message={errors.root?.message} />

      <Field data-invalid={errors.name ? true : undefined}>
        <FieldLabel htmlFor="service-name">Nombre</FieldLabel>
        <Input
          id="service-name"
          placeholder="Corte clásico"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      <div className="grid gap-[18px] sm:grid-cols-2">
        <Field data-invalid={errors.price ? true : undefined}>
          <FieldLabel htmlFor="service-price">Precio</FieldLabel>
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <MoneyInput
                id="service-price"
                placeholder="30.000"
                aria-invalid={errors.price ? true : undefined}
                value={field.value}
                onChange={(v) => field.onChange(v ?? undefined)}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <FieldError>
            {/* Zod da el mismo texto para "vacío" y "no es número": vacío merece una instrucción. */}
            {errors.price?.message === "El precio debe ser un número"
              ? "Escribe el precio en pesos."
              : errors.price?.message}
          </FieldError>
        </Field>

        <Field data-invalid={errors.durationMinutes ? true : undefined}>
          <FieldLabel htmlFor="service-duration">Duración (minutos)</FieldLabel>
          <Input
            id="service-duration"
            type="number"
            inputMode="numeric"
            min={5}
            max={480}
            step={5}
            aria-invalid={errors.durationMinutes ? true : undefined}
            aria-describedby="service-duration-hint"
            {...register("durationMinutes", { valueAsNumber: true })}
          />
          <FieldDescription id="service-duration-hint">
            {typeof duration === "number" && !Number.isNaN(duration) && duration >= 5
              ? `${formatDuration(duration)} · en pasos de 5 minutos`
              : "En pasos de 5 minutos"}
          </FieldDescription>
          <FieldError>{errors.durationMinutes?.message}</FieldError>
        </Field>
      </div>

      <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label="Duraciones comunes">
        {QUICK_DURATIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setValue("durationMinutes", m, { shouldValidate: true })}
            aria-pressed={duration === m}
            className={cn(
              "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150",
              duration === m
                ? "border-ink bg-ink text-brand"
                : "border-line bg-surface hover:bg-sunken",
            )}
          >
            {formatDuration(m)}
          </button>
        ))}
      </div>

      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="service-description">
          Descripción <span className="font-normal text-ink-muted">(opcional)</span>
        </FieldLabel>
        <textarea
          id="service-description"
          rows={2}
          placeholder="Incluye lavado y peinado"
          className="w-full rounded-md border border-control bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-invalid:border-2 aria-invalid:border-danger"
          aria-invalid={errors.description ? true : undefined}
          {...register("description")}
        />
        <FieldError>{errors.description?.message}</FieldError>
      </Field>

      <SwitchRow
        id="service-online"
        label="Se puede reservar por internet"
        hint="Aparecerá en tu página de reservas cuando la actives."
        control={control}
        name="visibleOnline"
      />
      {service && (
        <SwitchRow
          id="service-active"
          label="Servicio activo"
          hint="Si lo desactivas, no se ofrece en citas nuevas. Su historial se conserva."
          control={control}
          name="active"
        />
      )}

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "Guardando…" : service ? "Guardar cambios" : "Agregar servicio"}
        </Button>
      </div>
    </form>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  control,
  name,
}: {
  id: string;
  label: string;
  hint: string;
  control: ReturnType<typeof useForm<FormValues, unknown, z.output<typeof formSchema>>>["control"];
  name: "visibleOnline" | "active";
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-line px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            id={id}
            aria-describedby={`${id}-hint`}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  );
}
