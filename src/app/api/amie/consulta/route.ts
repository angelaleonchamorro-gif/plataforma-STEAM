import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Consulta pública del catálogo AMIE (se usa durante el registro, antes de
// que exista sesión). Devuelve solo datos públicos del registro oficial.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codigo = (searchParams.get("codigo") ?? "").trim().toUpperCase();
  if (codigo.length < 6 || codigo.length > 12) {
    return NextResponse.json({ mensaje: "Código inválido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("amie_catalogo")
    .select("codigo, nombre, provincia, canton, sostenimiento")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { mensaje: "No existe una institución con ese código AMIE." },
      { status: 404 },
    );
  }
  return NextResponse.json(data);
}
