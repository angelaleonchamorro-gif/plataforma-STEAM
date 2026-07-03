import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavbarPanel from "@/components/NavbarPanel";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombres, rol")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil) redirect("/auth/login");

  return (
    <>
      <NavbarPanel nombres={perfil.nombres} rol={perfil.rol} />
      {children}
    </>
  );
}
