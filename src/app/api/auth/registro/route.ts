import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const esquemaRegistro = z.object({
  rol: z.enum(["directivo", "docente", "estudiante"]),
  nombres: z.string().min(2),
  apellidos: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  nombreInstitucion: z.string().min(3).optional(),
  codigoAmie: z.string().min(4).optional(),
  codigoClase: z.string().min(4).optional(),
});

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaRegistro.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { mensaje: "Datos de registro incompletos o inválidos." },
      { status: 400 },
    );
  }

  const { rol, nombres, apellidos, email, password, nombreInstitucion, codigoAmie, codigoClase } =
    datos.data;
  const admin = createAdminClient();

  // Resolver la institución/clase ANTES de crear el usuario (Zero Trust:
  // el rol y la pertenencia se validan en servidor, no se confía en el cliente).
  let institucionId: string | null = null;
  let claseId: string | null = null;

  if (rol === "directivo") {
    if (!nombreInstitucion || !codigoAmie) {
      return NextResponse.json(
        { mensaje: "El directivo debe indicar nombre de institución y código AMIE." },
        { status: 400 },
      );
    }
    const { data: existente } = await admin
      .from("instituciones")
      .select("id")
      .eq("codigo_amie", codigoAmie)
      .maybeSingle();
    if (existente) {
      return NextResponse.json(
        { mensaje: "Ya existe una institución registrada con ese código AMIE." },
        { status: 409 },
      );
    }
    const { data: institucion, error } = await admin
      .from("instituciones")
      .insert({ nombre: nombreInstitucion, codigo_amie: codigoAmie })
      .select("id")
      .single();
    if (error || !institucion) {
      return NextResponse.json({ mensaje: "No se pudo crear la institución." }, { status: 500 });
    }
    institucionId = institucion.id;
  }

  if (rol === "docente") {
    if (!codigoAmie) {
      return NextResponse.json({ mensaje: "Indica el código AMIE de tu institución." }, { status: 400 });
    }
    const { data: institucion } = await admin
      .from("instituciones")
      .select("id")
      .eq("codigo_amie", codigoAmie)
      .maybeSingle();
    if (!institucion) {
      return NextResponse.json(
        { mensaje: "No existe una institución con ese código AMIE. Pide a tu directivo que la registre primero." },
        { status: 404 },
      );
    }
    institucionId = institucion.id;
  }

  if (rol === "estudiante") {
    if (!codigoClase) {
      return NextResponse.json({ mensaje: "Indica el código de tu clase." }, { status: 400 });
    }
    const { data: clase } = await admin
      .from("clases")
      .select("id, institucion_id")
      .eq("codigo_invitacion", codigoClase)
      .maybeSingle();
    if (!clase) {
      return NextResponse.json(
        { mensaje: "El código de clase no es válido. Verifícalo con tu docente." },
        { status: 404 },
      );
    }
    claseId = clase.id;
    institucionId = clase.institucion_id;
  }

  // Crear el usuario en Supabase Auth (email confirmado: el acceso lo da el código).
  const { data: usuario, error: errorUsuario } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (errorUsuario || !usuario.user) {
    const yaExiste = errorUsuario?.message?.toLowerCase().includes("already");
    return NextResponse.json(
      { mensaje: yaExiste ? "Ya existe una cuenta con ese correo." : "No se pudo crear la cuenta." },
      { status: yaExiste ? 409 : 500 },
    );
  }

  const { error: errorPerfil } = await admin.from("perfiles").insert({
    id: usuario.user.id,
    institucion_id: institucionId,
    rol,
    nombres,
    apellidos,
    email,
  });
  if (errorPerfil) {
    // Rollback del usuario para no dejar cuentas huérfanas.
    await admin.auth.admin.deleteUser(usuario.user.id);
    return NextResponse.json({ mensaje: "No se pudo crear el perfil." }, { status: 500 });
  }

  if (rol === "directivo" && institucionId) {
    await admin.from("configuracion_institucional").insert({
      institucion_id: institucionId,
      actualizado_por: usuario.user.id,
    });
  }

  if (rol === "estudiante" && claseId) {
    await admin.from("clase_estudiantes").insert({
      clase_id: claseId,
      estudiante_id: usuario.user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
