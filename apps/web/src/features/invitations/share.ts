const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });

export function inviteMessage({
  personName,
  businessName,
  role,
  url,
  expiresAt,
}: {
  personName: string | null;
  businessName: string;
  role: "admin" | "barber";
  url: string;
  expiresAt: string;
}): string {
  const greeting = personName ? `Hola ${personName}` : "Hola";
  const what =
    role === "barber"
      ? "para que veas tu agenda y tus ganancias desde el celular"
      : "como administrador";
  const until = dateFormat.format(new Date(expiresAt));
  return `${greeting}, te invito a ${businessName} en BarberOS ${what}. Entra aquí: ${url} (sirve una sola vez y vence el ${until}).`;
}

export function whatsappLink(message: string, phone: string | null): string {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
