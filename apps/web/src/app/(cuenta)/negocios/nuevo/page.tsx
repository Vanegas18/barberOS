import type { Metadata } from "next";
import { CreateBusiness } from "@/features/businesses/create-business";

export const metadata: Metadata = { title: "Crear negocio" };

export default function NuevoNegocioPage() {
  return <CreateBusiness />;
}
