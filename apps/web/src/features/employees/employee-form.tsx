"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeNameSchema,
  normalizePhone,
  type EarningRule,
  type Employee,
} from "@barberos/contracts";
import { Controller, useForm, type Control } from "react-hook-form";
import { z } from "zod";
import { FormAlert } from "@/components/forms/form-alert";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError, errorMessage } from "@/lib/api/client";
import { applyFieldErrors } from "@/lib/api/form-errors";
import { cn } from "@/lib/utils";
import { useCreateEmployee, useUpdateEmployee } from "./hooks";
import { bpToPercent, percentToBp } from "./labels";

const RULE_TYPES = [
  { value: "percentage", label: "Porcentaje" },
  { value: "fixed", label: "Monto fijo" },
  { value: "none", label: "Sin comisión" },
] as const;

const formSchema = z
  .object({
    displayName: employeeNameSchema,
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || normalizePhone(v) !== null, "Celular inválido. Ej.: 300 123 4567"),
    acceptsOnlineBookings: z.boolean(),
    active: z.boolean(),
    ruleType: z.enum(["percentage", "fixed", "none"]),
    ratePercent: z.number().or(z.nan()).optional(),
    fixedAmount: z.number().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.ruleType === "percentage") {
      const p = v.ratePercent;
      if (p === undefined || Number.isNaN(p) || p < 0 || p > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["ratePercent"],
          message: "Escribe un porcentaje entre 0 y 100",
        });
      }
    }
    if (v.ruleType === "fixed" && (v.fixedAmount === undefined || v.fixedAmount < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["fixedAmount"],
        message: "Escribe cuánto gana por servicio",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

function toRule(v: FormValues): EarningRule {
  if (v.ruleType === "percentage") {
    return { type: "percentage", rateBp: percentToBp(v.ratePercent ?? 0) };
  }
  if (v.ruleType === "fixed") return { type: "fixed", amount: v.fixedAmount ?? 0 };
  return { type: "none" };
}

export function EmployeeForm({
  businessId,
  employee,
  canConfigureEarnings,
  linkSelf = false,
  defaultName = "",
  onDone,
}: {
  businessId: string;
  employee?: Employee;
  canConfigureEarnings: boolean;
  linkSelf?: boolean;
  defaultName?: string;
  onDone: () => void;
}) {
  const create = useCreateEmployee(businessId);
  const update = useUpdateEmployee(businessId);
  const rule = employee?.earningRule;

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: employee?.displayName ?? defaultName,
      phone: employee?.phone ?? "",
      acceptsOnlineBookings: employee?.acceptsOnlineBookings ?? true,
      active: employee?.active ?? true,
      ruleType: rule?.type ?? (linkSelf ? "none" : "percentage"),
      ratePercent: rule?.type === "percentage" ? bpToPercent(rule.rateBp) : 50,
      fixedAmount: rule?.type === "fixed" ? rule.amount : undefined,
    },
  });
  const ruleType = watch("ruleType");

  const onSubmit = handleSubmit(async (values) => {
    const common = {
      displayName: values.displayName,
      phone: values.phone === "" ? null : values.phone,
      acceptsOnlineBookings: values.acceptsOnlineBookings,
      ...(canConfigureEarnings ? { earningRule: toRule(values) } : {}),
    };
    try {
      if (employee) {
        await update.mutateAsync({ id: employee.id, input: { ...common, active: values.active } });
      } else {
        await create.mutateAsync({ ...common, linkSelf });
      }
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.message.includes("registrado")) {
          setError("root", { message: "Ya estás registrado como empleado de esta barbería." });
        } else {
          setError(
            "displayName",
            { message: "Ya hay alguien con ese nombre. Agrega una inicial, ej. Carlos M." },
            { shouldFocus: true },
          );
        }
        return;
      }
      if (applyFieldErrors(err, setError, ["displayName", "phone"])) return;
      setError("root", { message: errorMessage(err) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4.5">
      <FormAlert message={errors.root?.message} />

      <Field data-invalid={errors.displayName ? true : undefined}>
        <FieldLabel htmlFor="employee-name">Nombre en la agenda</FieldLabel>
        <Input
          id="employee-name"
          placeholder="Carlos"
          autoComplete="off"
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby="employee-name-hint"
          {...register("displayName")}
        />
        <FieldDescription id="employee-name-hint">
          Así lo verán en la agenda y los clientes al reservar.
        </FieldDescription>
        <FieldError>{errors.displayName?.message}</FieldError>
      </Field>

      <Field data-invalid={errors.phone ? true : undefined}>
        <FieldLabel htmlFor="employee-phone">
          Celular <span className="font-normal text-ink-muted">(opcional)</span>
        </FieldLabel>
        <Input
          id="employee-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="300 123 4567"
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby="employee-phone-hint"
          {...register("phone")}
        />
        <FieldDescription id="employee-phone-hint">
          Para enviarle la invitación por WhatsApp.
        </FieldDescription>
        <FieldError>{errors.phone?.message}</FieldError>
      </Field>

      {canConfigureEarnings && (
        <fieldset className="flex flex-col gap-3 rounded-md border border-line p-4">
          <legend className="px-1 text-sm font-semibold">¿Cuánto gana por servicio?</legend>
          <Controller
            control={control}
            name="ruleType"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label="Tipo de ganancia"
                className="grid grid-cols-3 gap-1.5"
              >
                {RULE_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.value}
                    onClick={() => field.onChange(option.value)}
                    className={cn(
                      "h-10 rounded-full border px-2 text-[13px] font-semibold transition-colors duration-150",
                      field.value === option.value
                        ? "border-ink bg-ink text-brand"
                        : "border-line bg-surface hover:bg-sunken",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          />

          {ruleType === "percentage" && (
            <Field data-invalid={errors.ratePercent ? true : undefined}>
              <FieldLabel htmlFor="employee-rate">Porcentaje del precio</FieldLabel>
              <div className="relative">
                <Input
                  id="employee-rate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.5}
                  className="pr-9 tabular-nums"
                  aria-invalid={errors.ratePercent ? true : undefined}
                  {...register("ratePercent", { valueAsNumber: true })}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-muted"
                >
                  %
                </span>
              </div>
              <FieldError>{errors.ratePercent?.message}</FieldError>
            </Field>
          )}

          {ruleType === "fixed" && (
            <Field data-invalid={errors.fixedAmount ? true : undefined}>
              <FieldLabel htmlFor="employee-fixed">Monto por cada servicio</FieldLabel>
              <Controller
                control={control}
                name="fixedAmount"
                render={({ field }) => (
                  <MoneyInput
                    id="employee-fixed"
                    placeholder="15.000"
                    aria-invalid={errors.fixedAmount ? true : undefined}
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? undefined)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              <FieldError>{errors.fixedAmount?.message}</FieldError>
            </Field>
          )}

          {ruleType === "none" && (
            <p className="text-[13px] text-ink-muted">
              No gana por servicio. Úsalo para el dueño, que se queda con todo.
            </p>
          )}
        </fieldset>
      )}

      <SwitchRow
        id="employee-online"
        label="Se le puede reservar por internet"
        hint="Aparecerá en tu página de reservas cuando la actives."
        control={control}
        name="acceptsOnlineBookings"
      />
      {employee && (
        <SwitchRow
          id="employee-active"
          label="Activo"
          hint="Si lo desactivas, sale de la agenda. Su historial se conserva."
          control={control}
          name="active"
        />
      )}

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "Guardando…" : employee ? "Guardar cambios" : "Agregar al equipo"}
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
  control: Control<FormValues>;
  name: "acceptsOnlineBookings" | "active";
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
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  );
}
