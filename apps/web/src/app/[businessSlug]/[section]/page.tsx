import { ComingSoon } from "@/features/panel/coming-soon";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <ComingSoon segment={section} />;
}
