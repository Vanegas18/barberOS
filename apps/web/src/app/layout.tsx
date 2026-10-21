import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Schibsted_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "BarberOS", template: "%s · BarberOS" },
  description: "La agenda, las sillas y la caja de tu barbería, en orden.",
  applicationName: "BarberOS",
};

export const viewport: Viewport = {
  themeColor: "#ffd23f",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CO" className={schibsted.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
