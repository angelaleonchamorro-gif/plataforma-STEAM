import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Carga masiva de estudiantes (patrón EDINUN Conecta): el sistema crea las
// cuentas con contraseña temporal y devuelve las credenciales para que el
// docente las reparta. Si la fila no trae correo, se genera uno.

const esquema = z.object({
  claseId: z.string().uuid(),
  estudiantes: z
    .array(
      z.object({
        nombres: z.string().min(2).max(80),
        apellidos: z.string().min(2).max(80),
        correo: z.string().email().optional().or(z.literal("")),
      }),
    )
    .min(1)
    .max(60),
});

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function generarPassword(): string {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const digitos = "23456789";
  let clave = "";
  for (let i = 0; i < 4; i++) clave += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 4; i++) clave += digitos[Math.floor(Math.random() * digitos.length)];
  return clave;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquema.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { mensaje: "Revisa el archivo: cada fila necesita nombres y apellidos (máximo 60 filas)." },
      { status: 400 },
    );
  }

  // Ownership: la RLS solo devuelve la clase a su docente.
  const { data: clase } = await supabase
    .from("clases")
    .select("id, institucion_id, docente_id")
    .eq("id", datos.data.claseId)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return NextResponse.json({ mensaje: "Solo el docente de la clase puede cargar estudiantes." }, { status: 403 });
  }

  const admin = createAdminClient();
  const resultados: {
    nombres: string;
    apellidos: string;
    correo: string;
    contrasena: string | null;
    error: string | null;
  }[] = [];

  for (const fila of datos.data.estudiantes) {
    const correo =
      fila.correo && fila.correo !== ""
        ? fila.correo.toLowerCase()
        : `${normalizar(fila.nombres.split(" ")[0])}.${normalizar(fila.apellidos.split(" ")[0])}${Math.floor(
            100 + Math.random() * 900,
          )}@estudiante.edinunsteam.com`;
    const contrasena = generarPassword();

    const { data: usuario, error: errorUsuario } = await admin.auth.admin.createUser({
      email: correo,
      password: contrasena,
      email_confirm: true,
    });
    if (errorUsuario || !usuario.user) {
      const yaExiste = errorUsuario?.message?.toLowerCase().includes("already");
      resultados.push({
        nombres: fila.nombres,
        apellidos: fila.apellidos,
        correo,
        contrasena: null,
        error: yaExiste ? "El correo ya está registrado" : "No se pudo crear la cuenta",
      });
      continue;
    }

    const { error: errorPerfil } = await admin.from("perfiles").insert({
      id: usuario.user.id,
      institucion_id: clase.institucion_id,
      rol: "estudiante",
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      email: correo,
    });
    if (errorPerfil) {
      await admin.auth.admin.deleteUser(usuario.user.id);
      resultados.push({
        nombres: fila.nombres,
        apellidos: fila.apellidos,
        correo,
        contrasena: null,
        error: "No se pudo crear el perfil",
      });
      continue;
    }

    await admin.from("clase_estudiantes").insert({
      clase_id: clase.id,
      estudiante_id: usuario.user.id,
    });

    resultados.push({
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      correo,
      contrasena,
      error: null,
    });
  }

  return NextResponse.json({ resultados });
}
