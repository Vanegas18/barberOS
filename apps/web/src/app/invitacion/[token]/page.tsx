import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { InvitationLanding } from "@/features/invitations/invitation-landing";

export const metadata: Metadata = {
  title: "Invitación",
  robots: { index: false, follow: false },
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const hasSession = (await cookies()).has("bo_session");

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="flex h-16 shrink-0 items-center rounded-b-[24px] bg-brand px-4 sm:rounded-none sm:px-8">
        <Link href="/" aria-label="BarberOS" className="rounded-md">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <InvitationLanding token={token} hasSession={hasSession} />
      </main>
    </div>
  );
}
