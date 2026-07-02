import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil) redirect("/auth/login");

  switch (perfil.rol) {
    case "directivo":
      redirect("/panel/institucion");
    case "docente":
      redirect("/panel/clases");
    case "estudiante":
      redirect("/panel/estudiante");
  }
}
