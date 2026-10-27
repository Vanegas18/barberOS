"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { registerSchema } from "@barberos/contracts";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { useRegister } from "./hooks";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser.mutateAsync(values);
      router.replace(next);
    } catch (err) {
      setError("root", {
        message: errorMessage(err, {
          409: "No pudimos crear la cuenta con ese correo. Si ya tienes una, ingresa.",
        }),
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={errors.root?.message} />

      <Field data-invalid={errors.name ? true : undefined}>
        <FieldLabel htmlFor="name">Tu nombre</FieldLabel>
        <Input
          id="name"
          autoComplete="name"
          className="h-12 lg:h-11"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      <Field data-invalid={errors.email ? true : undefined}>
        <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-12 lg:h-11"
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </Field>

      <Field data-invalid={errors.password ? true : undefined}>
        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
        <PasswordInput
          id="password"
          className="h-12 lg:h-11"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-hint"
          {...register("password")}
        />
        <FieldDescription id="password-hint">Mínimo 10 caracteres.</FieldDescription>
        <FieldError>{errors.password?.message}</FieldError>
      </Field>

      <Button
        type="submit"
        size="lg"
        className="mt-2 w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
