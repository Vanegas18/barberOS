import Link from "next/link";

export default async function PanelPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const { businessSlug } = await params;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Panel de {businessSlug}</h1>
      <p className="text-ink-muted">El panel llega en la siguiente subfase.</p>
      <Link href="/negocios" className="font-semibold underline underline-offset-[3px]">
        Ver mis negocios
      </Link>
    </main>
  );
}