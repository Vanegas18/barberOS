import type { Metadata } from "next";
import { MoreMenu } from "@/features/panel/more-menu";

export const metadata: Metadata = { title: "Más" };

export default function MorePage() {
  return <MoreMenu />;
}
