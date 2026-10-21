const raw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "") ?? "";

export const support = {
  phone: raw ? `+${raw}` : null,
  whatsappUrl(message: string): string | null {
    return raw ? `https://wa.me/${raw}?text=${encodeURIComponent(message)}` : null;
  },
};
